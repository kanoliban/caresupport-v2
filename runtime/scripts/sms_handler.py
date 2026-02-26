from __future__ import annotations

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

# Load .env BEFORE config so CARESUPPORT_ROOT is available
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / ".env")

# Use shared config — no hardcoded paths
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths

from openai import OpenAI
_ai_client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY", ""),
)

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
from enforcement.approval_pipeline import (
    classify_updates,
    create_pending,
    get_pending_for_approver,
    resolve_approval,
    detect_approval_response,
    format_confirmation_sms,
    expire_stale,
)
from enforcement.message_lock import family_lock

# Initialize audit logger with config path
_audit = PHIAuditLogger(log_dir=paths.logs)


# ─── Phone/Chat → Family Resolution ──────────────────────────────────────

def _load_routing(family_dir: Path) -> dict | None:
    """Load routing file from a family directory. Supports both formats."""
    for name in ("routing.json", "phone_routing.json"):
        routing_file = family_dir / name
        if routing_file.exists():
            with open(routing_file) as f:
                return json.load(f)
    return None


def _iter_members(routing: dict):
    """Yield (phone, member_dict) from routing, handling both formats.

    Dict format:  {"members": {"+1...": {"name": "Liban", ...}}}
    Array format:  {"members": [{"phone": "+1...", "name": "Liban", ...}]}
    """
    members = routing.get("members", {})
    if isinstance(members, dict):
        for phone, member in members.items():
            yield phone, {**member, "phone": phone}
    elif isinstance(members, list):
        for member in members:
            yield member.get("phone", ""), member


def _routing_meta(routing: dict, family_dir: Path) -> dict:
    """Extract family-level metadata from routing."""
    return {
        "family_id": routing.get("family_id", family_dir.name),
        "family_name": routing.get("family_name", routing.get("care_recipient", family_dir.name)),
        "family_dir": str(family_dir),
    }


def resolve_phone(phone: str) -> dict | None:
    """Look up phone number in all family routing tables."""
    families_dir = paths.families
    if not families_dir.exists():
        return None
    for family_dir in families_dir.iterdir():
        if not family_dir.is_dir():
            continue
        routing = _load_routing(family_dir)
        if not routing:
            continue
        for member_phone, member in _iter_members(routing):
            if member_phone == phone:
                return {**_routing_meta(routing, family_dir), **member}
    return None


def resolve_chat_id(chat_id: str) -> dict | None:
    """Look up a Linq chat_id in all family routing tables.

    Preferred for Linq/iMessage: chat_ids are persistent per conversation
    and more reliable than phone number matching.
    """
    families_dir = paths.families
    if not families_dir.exists():
        return None
    for family_dir in families_dir.iterdir():
        if not family_dir.is_dir():
            continue
        routing = _load_routing(family_dir)
        if not routing:
            continue
        for _, member in _iter_members(routing):
            if member.get("chat_id") == chat_id:
                return {**_routing_meta(routing, family_dir), **member}
    return None


def resolve_member(chat_id: str = "", phone: str = "") -> dict | None:
    """Resolve a member by chat_id (preferred) or phone (fallback)."""
    if chat_id:
        member = resolve_chat_id(chat_id)
        if member:
            return member
    if phone:
        return resolve_phone(phone)
    return None


def resolve_phone_from_routing(phone: str, routing: dict) -> dict | None:
    """Look up phone number in a specific routing table."""
    for member_phone, member in _iter_members(routing):
        if member_phone == phone:
            return {
                "family_id": routing.get("family_id", ""),
                "family_name": routing.get("family_name", routing.get("care_recipient", "")),
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


def load_recent_conversations(phone: str, limit: int = 50) -> str:
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


def load_member_context(family_dir: str, member_name: str) -> str:
    """Load member profile from the members/ directory."""
    members_dir = Path(family_dir) / "members"
    if not members_dir.exists():
        return ""
    candidate = f"{member_name.split()[0].lower()}.md"
    path = members_dir / candidate
    if path.exists():
        return path.read_text().strip()
    return ""


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

def _channel_guidance(service: str) -> str:
    """Return channel-specific guidance for the system prompt.

    The agent adapts its tone and mechanics to the channel: iMessage supports
    tapbacks and read receipts; SMS does not.
    """
    if service == "iMessage":
        return """
── CHANNEL: iMessage (blue bubble) ──
The recipient can see when you're typing and when you've read their message.
They can react with tapbacks (👍, ❤️, ❓, etc.) instead of typing a reply.
For confirmations, you can say "React with 👍 to confirm" instead of "Reply YES."
Keep messages warm and concise — this feels like texting a friend, not a system.
"""
    elif service == "RCS":
        return """
── CHANNEL: RCS ──
The recipient has read receipts and delivery confirmation. Keep messages concise.
"""
    else:
        return """
── CHANNEL: SMS ──
No read receipts or typing indicators. Keep messages under 320 characters
(2 SMS segments) when possible. Use "Reply YES to confirm" for confirmations.
"""


def build_system_context(member: dict, family_context: str,
                         conversation_history: str, service: str = "SMS",
                         member_context: str = "") -> str:
    """Build the context for the AI agent.

    NOTE: family_context should already be filtered by role_filter before
    reaching this function. The agent only sees what the member is allowed to see.
    """

    now = datetime.now(timezone.utc)
    channel = _channel_guidance(service)

    # Load externalized identity (SOUL.md at repo root)
    soul_path = Path(__file__).parent.parent.parent / "SOUL.md"
    if soul_path.exists():
        soul_text = soul_path.read_text().strip()
    else:
        print(f"[CareSupport] WARNING: SOUL.md not found at {soul_path}. Agent running without identity constraints.", file=sys.stderr)
        soul_text = "You are CareSupport — a care coordination agent."

    # Load per-family lessons (local corrections — takes precedence)
    family_lessons_text = ""
    family_dir = member.get("family_dir", "")
    if family_dir:
        family_lessons_path = Path(family_dir) / "lessons.md"
        if family_lessons_path.exists():
            entries = [l for l in family_lessons_path.read_text().split("\n") if l.startswith("- [")]
            if entries:
                family_lessons_text = "\n── FAMILY LESSONS (this family's corrections) ──\n" + "\n".join(entries)

    # Load global lessons (universal corrections)
    lessons_text = ""
    if paths.lessons.exists():
        entries = [l for l in paths.lessons.read_text().split("\n") if l.startswith("- [")]
        if entries:
            lessons_text = "\n── GLOBAL LESSONS (corrections from all conversations) ──\n" + "\n".join(entries)

    # Load agent routing doc
    agent_root_text = ""
    if paths.agent_root.exists():
        agent_root_text = "\n── ROUTING ──\n" + paths.agent_root.read_text().strip()

    # Load capabilities
    capabilities_text = ""
    if paths.capabilities.exists():
        capabilities_text = "\n── CAPABILITIES ──\n" + paths.capabilities.read_text().strip()

    # Load skills from runtime/learning/skills/
    skills_text = ""
    if paths.skills_dir.exists():
        skill_parts = []
        for skill_file in sorted(paths.skills_dir.glob("*.md")):
            skill_parts.append(skill_file.read_text().strip())
        if skill_parts:
            skills_text = "\n── SKILLS ──\n" + "\n\n".join(skill_parts)

    # Load member-specific context
    member_context_block = ""
    if member_context:
        member_context_block = f"\n── WHAT YOU KNOW ABOUT {member['name'].upper()} ──\n{member_context}"

    return f"""{soul_text}
{agent_root_text}

CURRENT DATE/TIME: {now.strftime("%A, %B %d, %Y at %I:%M %p")} CT

YOU ARE TEXTING WITH: {member['name']} ({member['role']})
Their phone: {member['phone']}
Their access level: {member['access_level']}
Their relationship to care recipient: {member.get('relationship', member.get('role', 'unknown'))}
{channel}
{capabilities_text}
{skills_text}
{family_lessons_text}
{lessons_text}
{member_context_block}

── FAMILY FILE (scoped to {member['name']}'s access level) ──
{family_context}

── RECENT CONVERSATION WITH {member['name'].upper()} ──
{conversation_history}

── WHAT YOU CAN AND CANNOT DO ──
CAN: Generate SMS responses, suggest family_file_updates (append/prepend/replace to sections that EXIST in the family file above), flag needs_outreach (requests to text anyone whose phone number you know — team members or not).
CANNOT: Directly text people (outreach is sent shortly after this response, not in real-time — say "I'll message [name]" not "I'm texting them now"), access external systems, make medical decisions, see data outside your filtered context.
CRITICAL: Never claim you did something unless the family file above confirms it. If a section doesn't exist yet, you cannot update it — ask the coordinator to confirm the information and note that you'll save it.

── WHEN THINGS GO WRONG ──
If you previously sent an error message or glitch occurred, acknowledge it directly: "I hit a technical glitch — [what happened]. Here's what I was working on: [resume]." Never deflect or pretend it didn't happen. The coordinator can see everything.

── RESPONSE FORMAT ──
Respond with ONLY valid JSON matching the required schema. No markdown fencing, no explanation.

FIELD GUIDE:
- sms_response: The text message to send back. Keep under 320 chars when possible.
- internal_notes: Your reasoning (not shown to user).
- needs_outreach: Array of objects with phone, name, message for people to contact. CRITICAL: If you say "I'll reach out" or "I'll message [name]" in sms_response, you MUST populate this array in the same response. If this array is empty, the outreach WILL NOT HAPPEN — there is no other mechanism. Say "I'll message [name]" in sms_response — never "I'm texting them now."
- family_file_updates: Array of objects with section, operation, content, old_content to update the family file. Operations: append, prepend, replace, resolve_issue. Only target sections that EXIST above.
- self_corrections: When the user corrects you, teaches you something, or says "remember that" / "don't do that again" / "that's wrong" — capture the lesson as "[What to do or not do]". Empty array if no correction this message.
- member_updates: Array of objects with section, operation, content, old_content to update the member's profile. Same format as family_file_updates. Use for personal preferences, communication style, etc. Empty array if nothing to update.
- routing_updates: Array of objects to register new family members. Only use when the COORDINATOR explicitly asks to add someone AND provides name + phone. Each object: action ("add"), phone (E.164), name, role (family_caregiver/professional_caregiver/community_supporter), relationship (to care recipient), access_level (full/limited). Empty array unless adding a member. REQUIRES coordinator confirmation before you populate this.

BEFORE YOU PROMISE TO CONTACT SOMEONE:
- Do you have their phone number? (check conversation history and family file)
- If yes: populate needs_outreach NOW. Don't just say you will — do it in this response.
- If no: tell the user you don't have the number and ask for it.
- Never say "I'll reach out" with an empty needs_outreach. That's a broken promise.
"""


# ─── AI Agent Call ────────────────────────────────────────────────────────

_RESPONSE_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "caresupport_response",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "sms_response": {"type": "string"},
                "internal_notes": {"type": "string"},
                "needs_outreach": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "phone": {"type": "string"},
                            "name": {"type": "string"},
                            "message": {"type": "string"},
                        },
                        "required": ["phone", "name", "message"],
                        "additionalProperties": False,
                    },
                },
                "family_file_updates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "section": {"type": "string"},
                            "operation": {"type": "string"},
                            "content": {"type": "string"},
                            "old_content": {"type": "string"},
                        },
                        "required": ["section", "operation", "content", "old_content"],
                        "additionalProperties": False,
                    },
                },
                "self_corrections": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "member_updates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "section": {"type": "string"},
                            "operation": {"type": "string"},
                            "content": {"type": "string"},
                            "old_content": {"type": "string"},
                        },
                        "required": ["section", "operation", "content", "old_content"],
                        "additionalProperties": False,
                    },
                },
                "routing_updates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string"},
                            "phone": {"type": "string"},
                            "name": {"type": "string"},
                            "role": {"type": "string"},
                            "relationship": {"type": "string"},
                            "access_level": {"type": "string"},
                        },
                        "required": ["action", "phone", "name", "role", "relationship", "access_level"],
                        "additionalProperties": False,
                    },
                },
            },
            "required": ["sms_response", "internal_notes", "needs_outreach", "family_file_updates", "self_corrections", "member_updates", "routing_updates"],
            "additionalProperties": False,
        },
    },
}

_MODEL_FALLBACK = [
    "anthropic/claude-haiku-4-5",
    "google/gemini-2.5-flash",
    "openai/gpt-4o-mini",
]


async def generate_response(system_context: str, user_message: str, member_name: str = "there") -> str:
    """Call OpenRouter to generate a structured response.

    Uses asyncio.to_thread to avoid blocking the event loop, with a 45s timeout
    per attempt to prevent indefinite hangs.
    """

    fallback_msg = f"I hit a technical glitch processing your last message, {member_name}. Can you send it again?"

    def _sync_openrouter_call():
        return _ai_client.chat.completions.create(
            model=_MODEL_FALLBACK[0],
            extra_body={"models": _MODEL_FALLBACK},
            messages=[
                {"role": "system", "content": system_context},
                {"role": "user", "content": user_message},
            ],
            response_format=_RESPONSE_SCHEMA,
            temperature=0.7,
            max_tokens=4096,
        )

    last_error = None
    for attempt in range(3):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(_sync_openrouter_call),
                timeout=45,
            )

            raw = response.choices[0].message.content.strip()
            result = json.loads(raw)

            if "sms_response" not in result:
                result["sms_response"] = fallback_msg
            return json.dumps(result)

        except asyncio.TimeoutError:
            last_error = "OpenRouter API timed out after 45s"
            print(f"[CareSupport] AI attempt {attempt+1}/3: TimeoutError: {last_error}", file=sys.stderr)
        except Exception as e:
            last_error = e
            print(f"[CareSupport] AI attempt {attempt+1}/3: {type(e).__name__}: {str(e)[:150]}", file=sys.stderr)

        if attempt < 2:
            await asyncio.sleep(3 * (attempt + 1))

    return json.dumps({"sms_response": fallback_msg, "error": str(last_error)})


# ─── Learning Persistence ────────────────────────────────────────────────

MAX_FAMILY_LESSONS = 10


def _persist_lessons(corrections: list[str], family_dir: str = "") -> None:
    """Append self-corrections to the family's lessons.md (local).

    Falls back to global lessons.md if no family_dir provided.
    """
    if not corrections:
        return
    from learning import append_lessons
    if family_dir:
        family_lessons_path = Path(family_dir) / "lessons.md"
        append_lessons(family_lessons_path, corrections, max_entries=MAX_FAMILY_LESSONS)
    else:
        append_lessons(paths.lessons, corrections)


def _persist_member_updates(member: dict, raw_updates: list[dict]) -> dict | None:
    """Apply member_updates to the member's profile file."""
    if not raw_updates or not isinstance(raw_updates, list):
        return None

    family_dir = Path(member.get("family_dir", ""))
    member_name = member.get("name", "")
    if not family_dir.exists() or not member_name:
        return None

    members_dir = family_dir / "members"
    candidate = f"{member_name.split()[0].lower()}.md"
    member_path = members_dir / candidate
    if not member_path.exists():
        return None

    updates = parse_update_instructions(raw_updates)
    if not updates:
        return None

    edit_result = apply_updates(member_path, updates)
    return {
        "success": edit_result.success,
        "updates_applied": edit_result.updates_applied,
        "updates_skipped": edit_result.updates_skipped,
        "sections_modified": edit_result.sections_modified,
        "errors": edit_result.errors,
    }


def _persist_routing_updates(member: dict, raw_updates: list[dict]) -> list[dict]:
    """Add new members to routing.json and create their profile files.

    Only processes "add" actions. Only coordinators (full access) can trigger this.
    Returns a list of result dicts, one per update attempted.
    """
    if not raw_updates or not isinstance(raw_updates, list):
        return []

    if member.get("access_level") != "full":
        return [{"success": False, "error": "Only full-access members can add new members"}]

    family_dir = Path(member.get("family_dir", ""))
    if not family_dir.exists():
        return [{"success": False, "error": "Family directory not found"}]

    routing = _load_routing(family_dir)
    if not routing:
        return [{"success": False, "error": "No routing file found"}]

    routing_path = family_dir / "routing.json"
    if not routing_path.exists():
        routing_path = family_dir / "phone_routing.json"

    results = []
    modified = False

    for update in raw_updates:
        if not isinstance(update, dict):
            continue
        action = update.get("action", "")
        phone = update.get("phone", "").strip()
        name = update.get("name", "").strip()

        if action != "add" or not phone or not name:
            results.append({"success": False, "phone": phone, "error": "Invalid action or missing phone/name"})
            continue

        # Check for duplicate phone
        existing = [p for p, _ in _iter_members(routing)]
        if phone in existing:
            results.append({"success": False, "phone": phone, "error": f"Phone {phone} already registered"})
            continue

        new_entry = {
            "name": name,
            "role": update.get("role", "family_caregiver"),
            "access_level": update.get("access_level", "limited"),
            "active": True,
        }
        relationship = update.get("relationship", "")
        if relationship:
            new_entry["relationship"] = relationship

        # Add to routing dict
        members = routing.get("members", {})
        if isinstance(members, dict):
            members[phone] = new_entry
        elif isinstance(members, list):
            members.append({"phone": phone, **new_entry})
        routing["members"] = members
        modified = True

        # Create member profile
        members_dir = family_dir / "members"
        members_dir.mkdir(exist_ok=True)
        profile_name = name.split()[0].lower()
        profile_path = members_dir / f"{profile_name}.md"
        care_recipient = routing.get("care_recipient", "the care recipient")

        if not profile_path.exists():
            from datetime import date
            profile_path.write_text(
                f"# {name} — Member Profile\n\n"
                f"## Identity\n"
                f"- Name: {name}\n"
                f"- Phone: {phone}\n"
                f"- Role: {new_entry['role']}\n"
                f"- Relationship to care recipient: {relationship or 'unknown'}\n"
                f"- Access level: {new_entry['access_level']}\n\n"
                f"## Communication Preferences\n"
                f"- Preferred channel:\n"
                f"- Language:\n\n"
                f"## Care Responsibilities\n\n"
                f"## Personal Context\n\n"
                f"## Interaction History\n"
                f"- {date.today().isoformat()}: Added to {care_recipient}'s care team by {member.get('name', 'coordinator')}.\n"
            )

        results.append({"success": True, "phone": phone, "name": name, "profile": str(profile_path)})

    if modified:
        with open(routing_path, "w") as f:
            json.dump(routing, f, indent=2)
            f.write("\n")

    return results


# ─── Approval Helpers ─────────────────────────────────────────────────────

def _get_approver_phones(family_dir: Path) -> list[str]:
    """Get phone numbers of members who can approve changes (full access)."""
    routing = _load_routing(family_dir)
    if not routing:
        return []
    return [
        phone for phone, m in _iter_members(routing)
        if can_approve(m.get("access_level", ""))
    ]


def _handle_approval_response(member: dict, body: str, family_dir: Path) -> dict | None:
    """Check if this inbound SMS is a YES/NO approval response.

    Returns a handler result dict if it is, or None to continue normal flow.
    """
    is_approved, approval_id_hint = detect_approval_response(body)
    if is_approved is None:
        return None  # Not an approval response

    # Check if this member has pending approvals
    pending = get_pending_for_approver(family_dir, member["phone"])
    if not pending:
        return None  # No pending approvals — treat as normal message

    # Find the right approval
    target = None
    if approval_id_hint:
        # Try matching by ID hint
        for a in pending:
            if a.id.startswith(approval_id_hint) or a.id == approval_id_hint:
                target = a
                break
    if target is None and len(pending) == 1:
        # Only one pending — assume it's about this one
        target = pending[0]
    if target is None:
        # Multiple pending, no clear match — can't resolve
        return None

    # Resolve the approval
    result = resolve_approval(
        family_dir=family_dir,
        approval_id=target.id,
        approved=is_approved,
        by_phone=member["phone"],
    )

    # Build the response SMS
    if result["action"] == "approved":
        response = f"✅ Approved: {target.description[:150]}. Change applied."
    elif result["action"] == "rejected":
        response = f"❌ Rejected: {target.description[:150]}. No changes made."
    elif result["action"] == "expired":
        response = f"⏰ That approval has expired. Please ask to resubmit."
    else:
        response = f"Could not process approval: {result['action']}."

    # Log
    log_message(member["phone"], "INBOUND_APPROVAL", body, member.get("family_id", ""))
    log_message(member["phone"], "OUTBOUND", response, member.get("family_id", ""))

    # Audit
    _audit.log_response_sent(
        family_id=member.get("family_id", ""),
        recipient_phone=member["phone"],
        recipient_role=member.get("role", "unknown"),
        access_level=member.get("access_level", "full"),
        response_length=len(response),
        leakage_clean=True,
    )

    return {
        "success": True,
        "response": response,
        "needs_outreach": [],
        "family_file_updates": result.get("edit_result"),
        "pending_confirmations": [],
        "internal_notes": f"Approval {result['action']}: {target.id}",
        "member": member,
        "enforcement": {
            "approval_response": True,
            "action": result["action"],
            "approval_id": target.id,
            "phi_access_logged": True,
        },
    }


# ─── Main Handler ─────────────────────────────────────────────────────────

BLOCKED_RESPONSE = (
    "I'm sorry, I can't share that information with your access level. "
    "Please contact the care coordinator if you need more details."
)


async def handle_sms(from_phone: str, body: str, dry_run: bool = False, service: str = "SMS") -> dict:
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
    family_dir = Path(member.get("family_dir", ""))
    access_level = member.get("access_level", "schedule")

    # SERIALIZATION: Acquire per-family lock before touching family.md
    # Prevents race conditions when two messages arrive for the same family
    with family_lock(family_id, phone=from_phone):
        return await _process_message(member, family_id, family_dir, access_level, from_phone, body, dry_run, service)


async def _process_message(member: dict, family_id: str, family_dir: Path,
                           access_level: str, from_phone: str, body: str,
                           dry_run: bool, service: str = "SMS") -> dict:
    """Process a message under the family lock. All family.md reads/writes are serialized."""

    log_prefix = "[CareSupport]"

    # 2. Log inbound message
    log_message(from_phone, "INBOUND", body, family_id)

    # 2.5 ENFORCEMENT: Check if this is an approval response (early return)
    approval_response = _handle_approval_response(member, body, family_dir)
    if approval_response is not None:
        return approval_response

    # 3. Load context
    raw_family_context = load_family_context(member.get("family_dir", ""))
    conversation_history = load_recent_conversations(from_phone)
    member_context = load_member_context(member.get("family_dir", ""), member.get("name", ""))

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
    system_context = build_system_context(
        member, filtered_context, conversation_history,
        service=service, member_context=member_context,
    )

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

    result_json = await generate_response(system_context, body, member_name=member.get("name", "there"))
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

    # 10. PERSISTENCE: Apply family_file_updates (with approval gating)
    file_update_result = None
    pending_confirmations = []
    raw_updates = result.get("family_file_updates", [])
    if raw_updates and isinstance(raw_updates, list):
        family_md_path = family_dir / "family.md"
        if family_md_path.exists():
            updates = parse_update_instructions(raw_updates)
            if updates:
                # ENFORCEMENT: classify into auto-apply vs. needs-approval
                classified = classify_updates(updates)

                # Auto-apply safe updates immediately
                if classified.auto_apply:
                    edit_result = apply_updates(family_md_path, classified.auto_apply)
                    file_update_result = {
                        "success": edit_result.success,
                        "backup_path": edit_result.backup_path,
                        "updates_applied": edit_result.updates_applied,
                        "updates_skipped": edit_result.updates_skipped,
                        "sections_modified": edit_result.sections_modified,
                        "errors": edit_result.errors,
                    }

                # Create pending approvals for gated updates
                if classified.needs_approval:
                    approver_phones = _get_approver_phones(family_dir)
                    for update, reason in classified.needs_approval:
                        desc = f"{reason}: {update.content[:120]}"
                        approval = create_pending(
                            family_dir=family_dir,
                            update=update,
                            description=desc,
                            requester_phone=from_phone,
                            requester_name=member.get("name", "Unknown"),
                            approver_phones=approver_phones,
                        )
                        pending_confirmations.append({
                            "approval_id": approval.id,
                            "description": approval.description,
                            "confirmation_sms": format_confirmation_sms(approval),
                            "approver_phones": approver_phones,
                        })

    # 11. PERSISTENCE: Apply self_corrections to family lessons.md (local)
    raw_corrections = result.get("self_corrections", [])
    if raw_corrections and isinstance(raw_corrections, list):
        _persist_lessons(raw_corrections, family_dir=member.get("family_dir", ""))
        print(f"{log_prefix} 📝 Learned {len(raw_corrections)} lesson(s) (family)")

    # 12. PERSISTENCE: Apply member_updates to member profile
    raw_member_updates = result.get("member_updates", [])
    member_update_result = None
    if raw_member_updates and isinstance(raw_member_updates, list):
        member_update_result = _persist_member_updates(member, raw_member_updates)
        if member_update_result and member_update_result.get("updates_applied", 0) > 0:
            print(f"{log_prefix} 📝 Updated member profile ({member_update_result['updates_applied']} change(s))")

    # 13. PERSISTENCE: Apply routing_updates (add new family members)
    raw_routing_updates = result.get("routing_updates", [])
    routing_update_results = []
    if raw_routing_updates and isinstance(raw_routing_updates, list):
        routing_update_results = _persist_routing_updates(member, raw_routing_updates)
        added = [r for r in routing_update_results if r.get("success")]
        if added:
            print(f"{log_prefix} 👤 Registered {len(added)} new member(s): {', '.join(r['name'] for r in added)}")

    # 14. Log outbound response
    if sms_response:
        log_message(from_phone, "OUTBOUND", sms_response, family_id)

    return {
        "success": True,
        "response": sms_response,
        "needs_outreach": result.get("needs_outreach", []),
        "family_file_updates": file_update_result,
        "routing_updates": routing_update_results,
        "pending_confirmations": pending_confirmations,
        "internal_notes": result.get("internal_notes", ""),
        "member": member,
        "enforcement": {
            "access_level": access_level,
            "sections_visible": visible_sections,
            "context_filtered": access_level != "full",
            "leakage_detected": False,
            "response_blocked": False,
            "phi_access_logged": True,
            "approvals_required": len(pending_confirmations),
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
