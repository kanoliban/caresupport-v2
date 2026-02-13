"""
CareSupport SMS Handler
=======================
Processes an inbound SMS and generates a response using the CareSupport agent.

Usage:
    python sms_handler.py --from "+16517037981" --body "Can someone take auntie to work tomorrow at 8am?"

This script:
1. Resolves phone → family → member → role → access level
2. Loads the family.md context
3. Reads recent conversation history
4. Calls the AI agent to generate a response
5. Logs the interaction
6. Returns the response text

It does NOT send the SMS — the caller (cron or bridge) handles delivery.
"""

import argparse
import json
import asyncio
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, '/work/sdk')

# ─── Phone → Family Resolution ───────────────────────────────────────────

def resolve_phone(phone: str) -> dict | None:
    """Look up phone number in all family routing tables."""
    families_dir = Path("/work/families")
    for family_dir in families_dir.iterdir():
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
    conv_dir = Path(f"/work/conversations/{phone}")
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
    month_file = Path(f"/work/conversations/{phone}/{now.strftime('%Y-%m')}.log")
    month_file.parent.mkdir(parents=True, exist_ok=True)
    
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S UTC")
    entry = f"[{timestamp}] [{direction}] {body}\n"
    
    with open(month_file, "a") as f:
        f.write(entry)
    
    # Also log to family timeline if family_id is known
    if family_id:
        timeline_dir = Path(f"/work/families/{family_id}/timeline")
        timeline_dir.mkdir(parents=True, exist_ok=True)
        timeline_file = timeline_dir / f"{now.strftime('%Y-%m')}.log"
        
        # Resolve name from phone
        member = resolve_phone(phone)
        name = member["name"] if member else phone
        
        with open(timeline_file, "a") as f:
            f.write(f"[{timestamp}] [{direction}] [{name}] {body}\n")


# ─── System Prompt ────────────────────────────────────────────────────────

def build_system_context(member: dict, family_context: str, conversation_history: str) -> str:
    """Build the context for the AI agent."""
    
    now = datetime.now(timezone.utc)
    
    return f"""You are CareSupport, a care coordination assistant for the {member['family_name']} family.
You communicate via SMS. Keep responses concise and warm — these are real people 
coordinating care for their family member.

CURRENT DATE/TIME: {now.strftime("%A, %B %d, %Y at %I:%M %p")} CT

YOU ARE TEXTING WITH: {member['name']} ({member['role']})
Their phone: {member['phone']}
Their access level: {member['access_level']}
Their relationship to care recipient: {member['relationship']}

── FAMILY FILE ──
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
6. Update the family file when you learn new information (schedules, preferences, 
   medical updates). Express this as what you've noted, not technical details.
7. If the care recipient (Degitu) texts you directly, respond to HER — she is 
   cognitively intact and can advocate for her own needs.
8. The coordinator (Liban) gets summaries and escalations. Don't overwhelm others 
   with information they don't need.
9. For medical concerns or emergencies, always escalate to the coordinator immediately.
10. Never fabricate information. If you don't know something, say so and offer to find out.

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
                    "type": "string",
                    "description": "Any updates that should be made to the family file based on this interaction"
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

async def handle_sms(from_phone: str, body: str, dry_run: bool = False) -> dict:
    """
    Main entry point: process an inbound SMS and return the response.
    
    Returns:
        {
            "success": bool,
            "response": str,           # SMS text to send back
            "needs_outreach": [...],    # Other people to text
            "family_file_updates": str, # Updates for family.md
            "internal_notes": str,      # Agent notes
            "member": {...},            # Resolved member info
        }
    """
    
    # 1. Resolve phone number
    member = resolve_phone(from_phone)
    if not member:
        return {
            "success": False,
            "response": "Hi! I don't recognize this number. If you're part of a CareSupport family, ask your coordinator to add you.",
            "member": None,
            "error": f"Unknown phone: {from_phone}"
        }
    
    # 2. Log inbound message
    log_message(from_phone, "INBOUND", body, member["family_id"])
    
    # 3. Load context
    family_context = load_family_context(member["family_dir"])
    conversation_history = load_recent_conversations(from_phone)
    
    # 4. Build system context
    system_context = build_system_context(member, family_context, conversation_history)
    
    # 5. Generate response
    if dry_run:
        return {
            "success": True,
            "response": "[DRY RUN — would call AI agent here]",
            "member": member,
            "context_length": len(system_context)
        }
    
    result_json = await generate_response(system_context, body)
    result = json.loads(result_json)
    
    # 6. Log outbound response
    sms_response = result.get("sms_response", "")
    if sms_response:
        log_message(from_phone, "OUTBOUND", sms_response, member["family_id"])
    
    return {
        "success": True,
        "response": sms_response,
        "needs_outreach": result.get("needs_outreach", []),
        "family_file_updates": result.get("family_file_updates", ""),
        "internal_notes": result.get("internal_notes", ""),
        "member": member
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
