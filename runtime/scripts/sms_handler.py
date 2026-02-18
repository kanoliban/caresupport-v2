"""
CareSupport SMS Handler
=======================
Processes an inbound SMS and generates a response using the CareSupport agent.

Usage:
    python sms_handler.py --from "+16517037981" --body "Can someone take auntie to work tomorrow at 8am?"

Pipeline:
    1. Resolve phone → family → member → role → access level
    2. Load family.md context
    3. ENFORCEMENT: Filter context by access level (pre-filter)
    4. ENFORCEMENT: Log PHI access (audit trail)
    5. Call the AI agent to generate a response
    6. ENFORCEMENT: Scan response for leakage (post-check)
    7. PERSISTENCE: Apply family_file_updates (backup → edit → validate)
    8. Log the interaction
    9. Return the response

It does NOT send the SMS — the caller (cron or bridge) handles delivery.
"""

import argparse
import json
import asyncio
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Use shared config — no hardcoded paths
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths, ensure_sdk_path
ensure_sdk_path()

# Enforcement layer — mechanical, not optional
from enforcement.role_filter import (
    filter_family_context,
    check_outbound_message,
    get_filtered_sections,
    can_approve,
)
from enforcement.phi_audit import PHIAuditLogger
from enforcement.family_editor import (
    apply_updates,
    parse_update_instructions,
    FileUpdate,
)

# Initialize audit logger with config path
_audit = PHIAuditLogger(log_dir=paths.logs)


# ─── Phone → Family Resolution ───────────────────────────────────────────

def resolve_phone(phone: str) -> dict | None:
    """Look up phone number in all family routing tables."""
    families_dir = paths.families
    if not families_dir.exists():
        return None
    for family_dir in families_dir.iterdir():
        if not family_dir.is_dir():
            continue
        routing_file = family_dir / "phone_routing.json"
        if routing_file.exists():
            with open(routing_file) as f:
                routing = json.load(f)
            for member in routing["members"]:
                if member["phone"] == phone:
                    return {
                        "family_id": routing["family_id"],
                        "family_name": routing["family_name"],
                        "family_dir": str(family_dir),
                        **member
                    }
    return None


def resolve_phone_from_routing(phone: str, routing: dict) -> dict | None:
    """Look up phone number in a specific routing table."""
    for member in routing["members"]:
        if member["phone"] == phone:
            return {
                "family_id": routing["family_id"],
                "family_name": routing["family_name"],
                **member
            }
    return None


# ─── Context Loading ─────────────────────────────────────────────────────

def load_family_context(family_dir: str) -> str:
    """Load the family.md file."""
    family_file = Path(family_dir) / "family.md"
    if family_file.exists():
        return family_file.read_text()
    return "[No family file found]"


def load_recent_conversations(phone: str, limit: int = 20) -> str:
    """Load recent conversation history for this phone number."""
    conv_dir = paths.conversations / phone
    if not conv_dir.exists():
        return "[No conversation history]"

    # Find the most recent log file
    log_files = sorted(conv_dir.glob("*.log"), reverse=True)
    if not log_files:
        return "[No conversation history]"

    # Read last N lines from most recent file
    lines = log_files[0].read_text().strip().split("\n")
    recent = lines[-limit:] if len(lines) > limit else lines
    return "\n".join(recent) if recent else "[No conversation history]"


# ─── Conversation Logging ────────────────────────────────────────────────

def log_message(phone: str, direction: str, body: str, family_id: str = ""):
    """Log a message to the conversation history."""
    now = datetime.now(timezone.utc)
    month_file = paths.conversation_log(phone, now.strftime('%Y-%m'))
    month_file.parent.mkdir(parents=True, exist_ok=True)

    timestamp = now.strftime("%Y-%m-%d %H:%M:%S UTC")
    entry = f"[{timestamp}] [{direction}] {body}\n"

    with open(month_file, "a") as f:
        f.write(entry)

    # Also log to family timeline if family_id is known
    if family_id:
        timeline_file = paths.family_timeline(family_id, now.strftime('%Y-%m'))
        timeline_file.parent.mkdir(parents=True, exist_ok=True)

        # Resolve name from phone
        member = resolve_phone(phone)
        name = member["name"] if member else phone

        with open(timeline_file, "a") as f:
            f.write(f"[{timestamp}] [{direction}] [{name}] {body}\n")


# ─── System Prompt ────────────────────────────────────────────────────────

def build_system_context(member: dict, family_context: str, conversation_history: str) -> str:
    """Build the context for the AI agent.

    NOTE: family_context should already be filtered by role_filter before
    reaching this function. The agent only sees what the member is allowed to see.
    """

    now = datetime.now(timezone.utc)

    return f"""You are CareSupport, a care coordination assistant for the {member['family_name']} family.
You communicate via SMS. Keep responses concise and warm — these are real people
coordinating care for their family member.

CURRENT DATE/TIME: {now.strftime("%A, %B %d, %Y at %I:%M %p")} CT

YOU ARE TEXTING WITH: {member['name']} ({member['role']})
Their phone: {member['phone']}
Their access level: {member['access_level']}
Their relationship to care recipient: {member['relationship']}

── FAMILY FILE (scoped to {member['name']}'s access level) ──
{family_context}

── RECENT CONVERSATION WITH {member['name'].upper()} ──
{conversation_history}

── YOUR GUIDELINES ──

1. You are {member['name']}'s care coordination assistant. Be warm, brief, and actionable.
2. SMS messages should be SHORT — ideally under 320 characters (2 SMS segments).
   Only go longer if the information genuinely requires it.
3. When someone offers to help or commits to a task, CONFIRM it clearly and note
   who, what, and when.
4. When a task needs to be assigned, suggest who might be available based on the
   family file, but always confirm before committing someone.
5. If you need to coordinate with other family members (e.g., "Can someone take
   Degitu to work tomorrow?"), note that you'll text them — don't assume their answer.
6. Update the family file when you learn new information. Use structured updates:
   - "append" to add entries to Schedule, Recent Events, Patterns, etc.
   - "prepend" to add urgent items at the top of a section.
   - "replace" to change specific text (provide exact old_content + new content).
   - "resolve_issue" to mark an Active Issues item as done (provide identifying text).
   Always log what happened to Recent Events (prepend with timestamp and description).
7. If the care recipient (Degitu) texts you directly, respond to HER — she is
   cognitively intact and can advocate for her own needs.
8. The coordinator (Liban) gets summaries and escalations. Don't overwhelm others
   with information they don't need.
9. For medical concerns or emergencies, always escalate to the coordinator immediately.
10. Never fabricate information. If you don't know something, say so and offer to find out.
11. You can ONLY see the family data that matches {member['name']}'s access level.
    Do not reference or speculate about information not shown in the family file above.

── TONE ──
You are family. Not a corporate assistant. Not a medical robot. You know these
people and you care about Degitu's recovery. Be the kind of coordinator that
makes everyone feel like they're part of something, not burdened by it.

Respond with ONLY the SMS text to send back. No metadata, no explanations,
no "Here's my response:" — just the message itself.
"""


# ─── AI Agent Call ────────────────────────────────────────────────────────

async def generate_response(system_context: str, user_message: str) -> str:
    """Call the AI to generate a response."""
    from sdk.tools.utils_tools import ai_structured_output

    result = await ai_structured_output(
        prompt=system_context + f"\n\nINBOUND SMS:\n{user_message}",
        output_schema={
            "type": "object",
            "properties": {
                "sms_response": {
                    "type": "string",
                    "description": "The SMS text to send back to the user"
                },
                "internal_notes": {
                    "type": "string",
                    "description": "Any internal notes about actions to take (coordinate with others, update family file, etc.)"
                },
                "needs_outreach": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "phone": {"type": "string"},
                            "name": {"type": "string"},
                            "message": {"type": "string"}
                        }
                    },
                    "description": "Other family members who need to be texted as part of this coordination"
                },
                "family_file_updates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "section": {
                                "type": "string",
                                "enum": ["schedule", "medications", "appointments",
                                         "availability", "active_issues", "recent_events",
                                         "patterns", "members", "care_recipient"],
                                "description": "Which section of the family file to update"
                            },
                            "operation": {
                                "type": "string",
                                "enum": ["append", "prepend", "replace", "resolve_issue"],
                                "description": "append: add to end. prepend: add after header. replace: swap old_content for content. resolve_issue: mark a [ ] item as [x]."
                            },
                            "content": {
                                "type": "string",
                                "description": "The text to add, or the new text for replacements"
                            },
                            "old_content": {
                                "type": "string",
                                "description": "For replace operations only: the exact text being replaced"
                            }
                        },
                        "required": ["section", "operation", "content"]
                    },
                    "description": "Structured updates to apply to the family file. Each entry targets a specific section with a specific operation."
                }
            },
            "required": ["sms_response"]
        },
        input_text=user_message,
        intelligence_level="smart"
    )

    if result.error:
        return json.dumps({"sms_response": "I'm having trouble right now. Liban has been notified.", "error": result.error})

    return json.dumps(result.result)


# ─── Main Handler ─────────────────────────────────────────────────────────

BLOCKED_RESPONSE = (
    "I'm sorry, I can't share that information with your access level. "
    "Please contact the care coordinator if you need more details."
)


async def handle_sms(from_phone: str, body: str, dry_run: bool = False) -> dict:
    """
    Main entry point: process an inbound SMS and return the response.

    Enforcement pipeline:
        1. Phone resolution
        2. PHI audit: log unknown number if unresolved
        3. Load context → PRE-FILTER by access level
        4. PHI audit: log context load
        5. Generate response
        6. POST-CHECK: scan for leakage
        7. PHI audit: log response sent (or blocked)

    Returns:
        {
            "success": bool,
            "response": str,           # SMS text to send back
            "needs_outreach": [...],   # Other people to text
            "family_file_updates": str, # Updates for family.md
            "internal_notes": str,     # Agent notes
            "member": {...},           # Resolved member info
            "enforcement": {...},      # Enforcement metadata
        }
    """

    # 1. Resolve phone number
    member = resolve_phone(from_phone)
    if not member:
        # ENFORCEMENT: Log unknown number attempt
        _audit.log_unknown_number(from_phone)
        return {
            "success": False,
            "response": "Sorry, this number isn't set up to receive messages. If you think this is an error, please check with whoever gave you this number.",
            "member": None,
            "error": f"Unknown phone: {from_phone}",
            "enforcement": {"unknown_number_logged": True},
        }

    family_id = member["family_id"]
    access_level = member.get("access_level", "schedule")

    # 2. Log inbound message
    log_message(from_phone, "INBOUND", body, family_id)

    # 3. Load context
    raw_family_context = load_family_context(member.get("family_dir", ""))
    conversation_history = load_recent_conversations(from_phone)

    # 4. ENFORCEMENT: Pre-filter context by access level
    filtered_context = filter_family_context(raw_family_context, access_level)
    visible_sections = get_filtered_sections(access_level)

    # 5. ENFORCEMENT: Log PHI access (context load)
    _audit.log_context_load(
        family_id=family_id,
        accessor_phone=from_phone,
        accessor_role=member.get("role", "unknown"),
        access_level=access_level,
        sections_loaded=visible_sections,
        trigger_message=body,
    )

    # 6. Build system context with FILTERED family data
    system_context = build_system_context(member, filtered_context, conversation_history)

    # 7. Generate response
    if dry_run:
        return {
            "success": True,
            "response": "[DRY RUN — would call AI agent here]",
            "member": member,
            "context_length": len(system_context),
            "enforcement": {
                "access_level": access_level,
                "sections_visible": visible_sections,
                "context_filtered": access_level != "full",
                "phi_access_logged": True,
            },
        }

    result_json = await generate_response(system_context, body)
    result = json.loads(result_json)

    sms_response = result.get("sms_response", "")

    # 8. ENFORCEMENT: Post-check outbound message for leakage
    leakage = check_outbound_message(sms_response, access_level)

    if not leakage.is_clean:
        # BLOCKED — the agent tried to share restricted information
        _audit.log_response_blocked(
            family_id=family_id,
            recipient_phone=from_phone,
            access_level=access_level,
            leaked_categories=leakage.leaked_categories,
            leaked_terms=leakage.leaked_terms,
        )
        # Replace with safe response
        sms_response = BLOCKED_RESPONSE
        log_message(from_phone, "OUTBOUND_BLOCKED", sms_response, family_id)

        return {
            "success": True,
            "response": sms_response,
            "needs_outreach": [],
            "family_file_updates": "",
            "internal_notes": f"BLOCKED: leakage detected ({leakage.leaked_categories})",
            "member": member,
            "enforcement": {
                "access_level": access_level,
                "sections_visible": visible_sections,
                "context_filtered": access_level != "full",
                "leakage_detected": True,
                "leaked_categories": leakage.leaked_categories,
                "leaked_terms": leakage.leaked_terms,
                "response_blocked": True,
                "phi_access_logged": True,
            },
        }

    # 9. ENFORCEMENT: Log clean response sent
    _audit.log_response_sent(
        family_id=family_id,
        recipient_phone=from_phone,
        recipient_role=member.get("role", "unknown"),
        access_level=access_level,
        response_length=len(sms_response),
        leakage_clean=True,
    )

    # 10. PERSISTENCE: Apply family_file_updates (backup → edit → validate)
    file_update_result = None
    raw_updates = result.get("family_file_updates", [])
    if raw_updates and isinstance(raw_updates, list) and len(raw_updates) > 0:
        family_md_path = Path(member.get("family_dir", "")) / "family.md"
        if family_md_path.exists():
            updates = parse_update_instructions(raw_updates)
            if updates:
                edit_result = apply_updates(family_md_path, updates)
                file_update_result = {
                    "success": edit_result.success,
                    "backup_path": edit_result.backup_path,
                    "updates_applied": edit_result.updates_applied,
                    "updates_skipped": edit_result.updates_skipped,
                    "sections_modified": edit_result.sections_modified,
                    "errors": edit_result.errors,
                }

    # 11. Log outbound response
    if sms_response:
        log_message(from_phone, "OUTBOUND", sms_response, family_id)

    return {
        "success": True,
        "response": sms_response,
        "needs_outreach": result.get("needs_outreach", []),
        "family_file_updates": file_update_result,
        "internal_notes": result.get("internal_notes", ""),
        "member": member,
        "enforcement": {
            "access_level": access_level,
            "sections_visible": visible_sections,
            "context_filtered": access_level != "full",
            "leakage_detected": False,
            "response_blocked": False,
            "phi_access_logged": True,
        },
    }


# ─── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CareSupport SMS Handler")
    parser.add_argument("--from", dest="from_phone", required=True, help="Sender phone in E.164")
    parser.add_argument("--body", required=True, help="SMS message body")
    parser.add_argument("--dry-run", action="store_true", help="Test resolution without AI call")

    args = parser.parse_args()

    result = asyncio.run(handle_sms(args.from_phone, args.body, args.dry_run))
    print(json.dumps(result, indent=2))
