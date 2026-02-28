"""
Prompt Builder — Cache-aware system prompt assembly for CareSupport.

Produces structured content blocks (static-first, dynamic-last) and a proper
messages array, enabling Claude's prefix caching.

Block ordering:
  1. SOUL.md (identity, reasoning framework)        — never changes
  2. Routing + Capabilities + Skills                 — rarely changes
  3. Response format + channel guidance + enforcement — never changes
  4. Lessons (global + family)                       — changes weekly
  5. Member identity + member context                — changes per member
     ── CACHE BREAKPOINT ──  (~4,987 tokens, clears 4,096 minimum)
  6. Family context (filtered by role)               — intent-driven: full/partial/none
  7. Current datetime + member metadata              — changes every call

Intent-driven loading (Phase 1 of interaction/execution separation):
  CareRouter classifies intent → prompt builder loads only relevant family sections.
  EMERGENCY/ESCALATION get full context. GENERAL gets slim. GREETING gets none.
"""

from __future__ import annotations

import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths


def _load_text(path: Path, fallback: str = "") -> str:
    if path.exists():
        return path.read_text().strip()
    return fallback


def _channel_guidance(service: str) -> str:
    if service.upper() == "SMS":
        return (
            "── CHANNEL: SMS ──\n"
            "No read receipts or typing indicators. Keep messages under 320 characters\n"
            "(2 SMS segments) when possible. Use \"Reply YES to confirm\" for confirmations."
        )
    return ""


_RESPONSE_FORMAT = """\
── WHAT YOU CAN AND CANNOT DO ──
CAN: Generate SMS responses, apply family_file_updates (append/prepend/replace to sections that EXIST in the family file above — the system writes them immediately), flag needs_outreach (requests to text anyone whose phone number you know — team members or not), persist self_corrections to lessons.md (loaded into every future prompt).
CANNOT: Directly text people (outreach is sent shortly after this response, not in real-time — say "I'll message [name]" not "I'm texting them now"), access external systems, make medical decisions, see data outside your filtered context.
CRITICAL: Never claim you did something unless the family file above confirms it. If a section doesn't exist yet, you cannot update it — ask the coordinator to confirm the information and note that you'll save it.

── WHEN THINGS GO WRONG ──
If you previously sent an error message or glitch occurred, acknowledge it directly: "I hit a technical glitch — [what happened]. Here's what I was working on: [resume]." Never deflect or pretend it didn't happen. The coordinator can see everything.

── RESPONSE FORMAT ──
Respond with ONLY valid JSON matching the required schema. No markdown fencing, no explanation.

FIELD GUIDE:
- sms_response: The text message to send back. Keep under 320 chars when possible.
- internal_notes: Your reasoning (not shown to user).
- needs_outreach: Array of objects with phone (E.164 format: +1 then 10 digits, no dashes — e.g. +16514109390), name, message for people to contact. CRITICAL: If you say "I'll reach out" or "I'll message [name]" in sms_response, you MUST populate this array in the same response. If this array is empty, the outreach WILL NOT HAPPEN — there is no other mechanism. Say "I'll message [name]" in sms_response — never "I'm texting them now."
- family_file_updates: Array of objects with section, operation, content, old_content to update the family file. Operations: append, prepend, replace, resolve_issue. Only target sections that EXIST above.
- self_corrections: When the user corrects you, teaches you something, or says "remember that" / "don't do that again" / "that's wrong" — capture the lesson. The system writes these to lessons.md immediately; you will see them in your context on the next message. Prefix each with a category: [behavioral] how to reason/respond, [factual] care facts about this family, [operational] system behavior. Empty array if no correction this message.
- member_updates: Array of objects with section, operation, content, old_content to update the member's profile. Same format as family_file_updates. Use for personal preferences, communication style, etc. Empty array if nothing to update.
- routing_updates: Array of objects to register new family members. Only use when the COORDINATOR explicitly asks to add someone AND provides name + phone. Each object: action ("add"), phone (E.164), name, role (family_caregiver/professional_caregiver/community_supporter), relationship (to care recipient), access_level (full/limited). Empty array unless adding a member. REQUIRES coordinator confirmation before you populate this.

BEFORE YOU PROMISE TO CONTACT SOMEONE:
- Do you have their phone number? (check conversation history and family file)
- If yes: populate needs_outreach NOW. Don't just say you will — do it in this response.
- If no: tell the user you don't have the number and ask for it.
- Never say "I'll reach out" with an empty needs_outreach. That's a broken promise."""


_SECTION_RE = re.compile(r"^## ", re.MULTILINE)

# Sections to include per family context mode
_FAMILY_SECTIONS = {
    "family_full": None,  # None = include everything
    "family_meds": {
        "Active Medications", "Medication Hold Log", "Full Medication History",
        "Urgent Notes", "Care Recipient",
    },
    "family_team": {
        "Care Team", "This Week", "Urgent Notes", "Care Recipient",
    },
    "family_slim": "_slim",  # special: first 500 chars only
}

# Intent → which family context mode to use
_INTENT_FAMILY_MODE = {
    "EMERGENCY": "family_full",
    "ESCALATION": "family_full",
    "MEDICATION_CHANGE": "family_meds",
    "ONBOARDING": "family_team",
    "MULTI_MEMBER": "family_team",
    "GENERAL": "family_slim",
}


def _extract_family_sections(family_text: str, sections: set[str]) -> str:
    """Extract specific ## sections from family.md text by header name."""
    if not family_text or not sections:
        return ""

    parts = _SECTION_RE.split(family_text)
    # parts[0] is the preamble (before first ##), rest start with section name
    result = [parts[0].strip()] if parts[0].strip() else []

    for part in parts[1:]:
        lines = part.split("\n", 1)
        header = lines[0].strip()
        if header in sections:
            result.append(f"## {part.rstrip()}")

    return "\n\n".join(result)


def build_system_blocks(
    member: dict,
    family_context: str,
    service: str = "SMS",
    member_context: str = "",
    intent: str = "",
    tools_active: bool = False,
) -> list[dict]:
    """Build system prompt as ordered content blocks for cache-aware API calls.

    Returns list of dicts: {"type": "text", "text": str, "cache_breakpoint": bool}.
    Blocks 1-5 form the cached prefix (~4,987 tokens). Blocks 6-7 are dynamic.
    """
    blocks = []

    # Block 1: SOUL.md — agent identity (NEVER changes)
    soul_path = Path(__file__).parent.parent.parent / "SOUL.md"
    soul_text = _load_text(soul_path, "You are CareSupport — a care coordination agent.")
    blocks.append({"type": "text", "text": soul_text, "cache_breakpoint": False})

    # Block 2: Routing + Capabilities + Skills (rarely changes)
    parts = []
    agent_root = _load_text(paths.agent_root)
    if agent_root:
        parts.append(f"── ROUTING ──\n{agent_root}")

    capabilities = _load_text(paths.capabilities)
    if capabilities:
        parts.append(f"── CAPABILITIES ──\n{capabilities}")

    if paths.skills_dir.exists():
        skill_parts = []
        for skill_file in sorted(paths.skills_dir.glob("*.md")):
            skill_parts.append(skill_file.read_text().strip())
        if skill_parts:
            parts.append("── SKILLS ──\n" + "\n\n".join(skill_parts))

    if parts:
        blocks.append({"type": "text", "text": "\n\n".join(parts), "cache_breakpoint": False})

    # Block 3: Response format + channel guidance (NEVER changes)
    channel = _channel_guidance(service)
    block3_text = channel + "\n\n" + _RESPONSE_FORMAT if channel else _RESPONSE_FORMAT
    if tools_active:
        block3_text += (
            "\n\n── TOOLS ──\n"
            "You have tools to look up family information on demand. "
            "For greetings and simple conversation, respond directly without tools. "
            "For questions about schedule, medications, care team, or family notes, "
            "call the relevant tool first, then use the returned data in your response."
        )
    blocks.append({"type": "text", "text": block3_text, "cache_breakpoint": False})

    # Block 4: Lessons — global + family (changes weekly)
    lesson_parts = []
    family_dir = member.get("family_dir", "")
    if family_dir:
        family_lessons_path = Path(family_dir) / "lessons.md"
        if family_lessons_path.exists():
            entries = [l for l in family_lessons_path.read_text().split("\n") if l.startswith("- [")]
            if entries:
                lesson_parts.append("── FAMILY LESSONS (this family's corrections) ──\n" + "\n".join(entries))

    if paths.lessons.exists():
        entries = [l for l in paths.lessons.read_text().split("\n") if l.startswith("- [")]
        if entries:
            lesson_parts.append("── GLOBAL LESSONS (corrections from all conversations) ──\n" + "\n".join(entries))

    if lesson_parts:
        blocks.append({"type": "text", "text": "\n\n".join(lesson_parts), "cache_breakpoint": False})

    # Block 5: Member identity + member context (changes per member)
    # This is the LAST block in the cached prefix — cache_breakpoint=True
    member_lines = [
        f"YOU ARE TEXTING WITH: {member['name']} ({member['role']})",
        f"Their phone: {member['phone']}",
        f"Their access level: {member['access_level']}",
        f"Their relationship to care recipient: {member.get('relationship', member.get('role', 'unknown'))}",
    ]
    member_block = "\n".join(member_lines)
    if member_context:
        member_block += f"\n\n── WHAT YOU KNOW ABOUT {member['name'].upper()} ──\n{member_context}"

    blocks.append({"type": "text", "text": member_block, "cache_breakpoint": True})

    # Block 6: Family context — intent-driven loading
    family_mode = _INTENT_FAMILY_MODE.get(intent, "family_full")
    section_filter = _FAMILY_SECTIONS.get(family_mode)

    if family_context:
        if section_filter is None:
            # Full context (EMERGENCY, ESCALATION, or unknown intent)
            ctx = family_context
        elif section_filter == "_slim":
            # Slim: preamble only (name, overview, urgent notes snippet)
            ctx = family_context[:500].rsplit("\n", 1)[0]
        elif isinstance(section_filter, set):
            ctx = _extract_family_sections(family_context, section_filter)
        else:
            ctx = family_context

        if ctx.strip():
            blocks.append({
                "type": "text",
                "text": f"── FAMILY FILE (scoped to {member['name']}'s access level) ──\n{ctx}",
                "cache_breakpoint": False,
            })

    # Block 7: Current datetime (changes EVERY call — must be last)
    now = datetime.now(timezone.utc)
    blocks.append({
        "type": "text",
        "text": f"CURRENT DATE/TIME: {now.strftime('%A, %B %d, %Y at %I:%M %p')} CT",
        "cache_breakpoint": False,
    })

    return blocks


_LOG_LINE_RE = re.compile(
    r"^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC)\] \[(INBOUND|OUTBOUND)\] (.+)$",
    re.DOTALL,
)


def build_messages(user_message: str, conversation_history: str) -> list[dict]:
    """Parse flat conversation log into proper message turns, then append the new message.

    Log format: [2026-02-26 03:55:32 UTC] [INBOUND] Hello
    INBOUND → role: user, OUTBOUND → role: assistant.

    Multi-line messages (user sent a list of names, etc.) are joined back together.
    """
    messages: list[dict] = []

    if conversation_history and conversation_history != "[No conversation history]":
        # Reassemble multi-line log entries: lines not starting with [ belong to the previous entry
        raw_entries: list[str] = []
        for line in conversation_history.split("\n"):
            if line.startswith("[") and _LOG_LINE_RE.match(line):
                raw_entries.append(line)
            elif raw_entries:
                raw_entries[-1] += "\n" + line

        for entry in raw_entries:
            m = _LOG_LINE_RE.match(entry)
            if not m:
                continue
            direction = m.group(2)
            text = m.group(3).strip()
            if not text:
                continue
            role = "user" if direction == "INBOUND" else "assistant"

            # Collapse consecutive same-role messages
            if messages and messages[-1]["role"] == role:
                messages[-1]["content"] += "\n" + text
            else:
                messages.append({"role": role, "content": text})

    messages.append({"role": "user", "content": user_message})
    return messages


def system_blocks_to_string(blocks: list[dict]) -> str:
    """Flatten blocks back into a single string (for legacy/dry-run compatibility)."""
    return "\n\n".join(b["text"] for b in blocks)
