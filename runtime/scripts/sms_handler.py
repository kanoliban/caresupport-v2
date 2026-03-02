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
import re
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

import anthropic
# Monkey-patch: Anthropic SDK v0.77.0 passes by_alias=None to Pydantic v2's
# model_dump(), which requires a bool.  The SDK's _compat.model_dump wrapper
# passes None through to model.model_dump() which hits Pydantic's Rust core.
# Patch at the Pydantic level since SDK callers bypass _compat in some paths.
import pydantic as _pyd
_orig_pyd_model_dump = _pyd.BaseModel.model_dump
def _safe_model_dump(self, **kwargs):
    if 'by_alias' in kwargs and kwargs['by_alias'] is None:
        kwargs['by_alias'] = False
    return _orig_pyd_model_dump(self, **kwargs)
_pyd.BaseModel.model_dump = _safe_model_dump

_anthropic_client = anthropic.Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
)

_AI_BACKEND = os.environ.get("CARESUPPORT_AI_BACKEND", "openrouter")

from care_router import route as care_route, fallback_chain as _fallback_chain, MODELS as _CARE_MODELS

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
    resolve_target_file,
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
    """Load family context from family.md + split files (schedule.md, medications.md)."""
    fdir = Path(family_dir)
    parts = []

    family_file = fdir / "family.md"
    if family_file.exists():
        parts.append(family_file.read_text())
    else:
        return "[No family file found]"

    for extra in ("schedule.md", "medications.md"):
        extra_path = fdir / extra
        if extra_path.exists():
            parts.append(extra_path.read_text())

    return "\n\n".join(parts)


_ENTRY_START_RE = re.compile(r"^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC\] \[(INBOUND|OUTBOUND)")

def load_recent_conversations(phone: str, limit: int = 50) -> str:
    """Load recent conversation history for this phone number.

    If the conversation exceeds 20 log entries and a summary exists,
    returns the summary + last 10 log entries instead of last 50.
    Counts actual log entries (not raw lines) so multi-line responses
    don't consume the window.
    """
    conv_dir = paths.conversations / phone
    if not conv_dir.exists():
        return "[No conversation history]"

    log_files = sorted(conv_dir.glob("*.log"), reverse=True)
    if not log_files:
        return "[No conversation history]"

    lines = log_files[0].read_text().strip().split("\n")

    # Reassemble multi-line log entries so each entry = one message
    entries: list[str] = []
    for line in lines:
        if _ENTRY_START_RE.match(line):
            entries.append(line)
        elif entries:
            entries[-1] += "\n" + line

    summary_path = conv_dir / "summary.md"
    if summary_path.exists():
        raw = summary_path.read_text().strip()
        summary = raw.split("\n", 1)[1].strip() if raw.startswith("<!--") else raw
        recent = entries[-10:]
        return f"[Previous conversation summary]\n{summary}\n\n[Recent messages]\n" + "\n".join(recent)

    recent = entries[-limit:] if len(entries) > limit else entries
    return "\n".join(recent) if recent else "[No conversation history]"


async def _summarize_conversation(phone: str) -> None:
    """Summarize older messages when conversation exceeds threshold.

    Called as fire-and-forget after message processing. Uses Haiku for
    cheap summarization. Only re-summarizes when the log has grown.
    """
    try:
        conv_dir = paths.conversations / phone
        log_files = sorted(conv_dir.glob("*.log"), reverse=True)
        if not log_files:
            return

        current_lines = log_files[0].read_text().strip().split("\n")
        lines = current_lines
        if len(current_lines) <= 20 and len(log_files) > 1:
            prev_lines = log_files[1].read_text().strip().split("\n")
            lines = prev_lines + current_lines
        if len(lines) <= 20:
            return

        summary_path = conv_dir / "summary.md"
        if summary_path.exists():
            header = summary_path.read_text().split("\n", 1)[0]
            if header.startswith("<!--"):
                parts = {}
                for token in header.strip("<!- >").split():
                    if ":" in token:
                        k, v = token.split(":", 1)
                        parts[k] = v
                watermark_file = parts.get("file", "")
                summarized_count = int(parts.get("lines", "0"))
                if watermark_file == log_files[0].name and summarized_count >= len(current_lines):
                    return

        older = "\n".join(lines[:-10])

        summary_response = await asyncio.wait_for(
            asyncio.to_thread(lambda: _anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=500,
                system="Summarize this conversation history into a compact context block. "
                       "Focus on: key decisions made, unresolved topics, important facts shared, "
                       "and the relationship dynamic. Keep under 300 words.",
                messages=[{"role": "user", "content": older}],
            )),
            timeout=15,
        )
        summary_text = summary_response.content[0].text.strip()
        summary_path.write_text(f"<!-- file:{log_files[0].name} lines:{len(current_lines)} -->\n{summary_text}")
    except Exception as e:
        print(f"[CareSupport] ⚠ Conversation summarization failed: {e}")


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
CAN: Generate SMS responses, apply family_file_updates (append/prepend/replace to sections that EXIST in the family file above — the system writes them immediately), flag needs_outreach (requests to text anyone whose phone number you know — team members or not), persist self_corrections to lessons.md (loaded into every future prompt).
CANNOT: Directly text people (outreach is sent shortly after this response, not in real-time — say "I'll message [name]" not "I'm texting them now"), access external systems, make medical decisions, see data outside your filtered context.
CRITICAL: Never claim you did something unless the family file above confirms it. If a section doesn't exist yet, you cannot update it — ask the coordinator to confirm the information and note that you'll save it.

── WHEN THINGS GO WRONG ──
If the conversation history shows the system sent an error message on your behalf, acknowledge it: "Sorry about that — [resume what you were working on]." Never deflect or pretend it didn't happen. The coordinator can see everything.
CRITICAL: Never claim a technical error occurred unless the conversation history explicitly shows one. Saying "I hit a glitch" when no glitch happened is fabrication. If you don't know the answer, say so — don't invent a system error as an excuse.

── RESPONSE FORMAT ──
Respond with ONLY valid JSON matching the required schema. No markdown fencing, no explanation.

FIELD GUIDE:
- sms_response: The text message to send back. To send multiple message bubbles, separate paragraphs with a double newline (\\n\\n in JSON). Each \\n\\n-separated paragraph becomes its own iMessage bubble. Keep each paragraph under 450 chars. A single \\n does NOT create a new bubble. For short responses (greetings, confirmations), a single paragraph is fine.
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

    fallback_msg = f"Sorry {member_name}, I wasn't able to process that. Can you send it again?"

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

            if not result.get("sms_response", "").strip():
                result["sms_response"] = fallback_msg
                print(f"[CareSupport] ⚠️ AI returned empty sms_response — using fallback", file=sys.stderr)
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


def _extract_json(raw: str | None) -> dict:
    """Extract structured JSON from model response, handling fences and natural language.

    Strategies (in order):
    1. Direct parse
    2. Strip markdown fences, parse
    3. Find outermost { ... } substring, parse
    4. Regex extract sms_response from natural language, construct JSON
    """
    if not raw:
        raise json.JSONDecodeError("Empty model response", "", 0)

    text = raw.strip()

    # Strategy 1: direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: strip markdown fences
    if text.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*\n?", "", text)
        stripped = re.sub(r"\n?```\s*$", "", stripped)
        try:
            return json.loads(stripped.strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: find outermost JSON object
    start = text.find("{")
    if start >= 0:
        end = text.rfind("}")
        if end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass

    # Strategy 4: natural language — model ignored JSON instruction, extract what we can
    sms_match = re.search(r'"sms_response"\s*:\s*"((?:[^"\\]|\\.)*)"', text)
    if sms_match:
        return {
            "sms_response": sms_match.group(1),
            "internal_notes": "Extracted from malformed response",
            "needs_outreach": [],
            "family_file_updates": [],
            "self_corrections": [],
            "member_updates": [],
            "routing_updates": [],
        }

    # Strategy 5: treat entire text as the SMS response (model responded conversationally)
    if not text.startswith("{"):
        print(f"[CareSupport] Model returned plain text, wrapping as sms_response", file=sys.stderr)
        return {
            "sms_response": text,
            "internal_notes": "Model responded with plain text instead of JSON",
            "needs_outreach": [],
            "family_file_updates": [],
            "self_corrections": [],
            "member_updates": [],
            "routing_updates": [],
        }

    raise json.JSONDecodeError(
        f"No valid JSON found in response",
        text[:200],
        0,
    )


async def _generate_response_anthropic(
    system_blocks: list[dict],
    messages: list[dict],
    member_name: str = "there",
    model: str = "claude-haiku-4-5-20251001",
    family_id: str = "",
    tools: list[dict] | None = None,
    filtered_context: str = "",
    conversation_log: str = "",
    access_level: str = "full",
) -> str:
    """Call Anthropic API directly with cache-aware system blocks.

    Uses CareRouter model selection with upward fallback on 429/529/timeout.
    Extended thinking enabled for improved reasoning quality.
    Supports tool use for on-demand family context retrieval.
    """
    from prompt_builder import system_blocks_to_string

    fallback_msg = f"Sorry {member_name}, I wasn't able to process that. Can you send it again?"

    system_content = [
        {
            "type": "text",
            "text": b["text"],
            **({"cache_control": {"type": "ephemeral"}} if b.get("cache_breakpoint") else {}),
        }
        for b in system_blocks
    ]

    last_error = None
    models_to_try = _fallback_chain(model)
    for current_model in models_to_try:
        for attempt in range(2):
            try:
                loop_messages = list(messages)

                raw = None
                thinking_text = None

                for tool_round in range(4):
                    def _sync_call(_m=current_model, _msgs=loop_messages):
                        kwargs = {
                            "model": _m,
                            "max_tokens": 16000,
                            "system": system_content,
                            "messages": _msgs,
                            "thinking": {
                                "type": "enabled",
                                "budget_tokens": 10000,
                            },
                        }
                        if tools:
                            kwargs["tools"] = tools
                        return _anthropic_client.messages.create(**kwargs)

                    response = await asyncio.wait_for(
                        asyncio.to_thread(_sync_call),
                        timeout=60,
                    )

                    # Log cache/usage for every call (including tool rounds)
                    usage = response.usage
                    cache_write = getattr(usage, "cache_creation_input_tokens", 0)
                    cache_read = getattr(usage, "cache_read_input_tokens", 0)
                    if cache_write or cache_read:
                        print(
                            f"[CareSupport] Cache: write={cache_write} read={cache_read} "
                            f"input={usage.input_tokens} model={current_model}",
                            file=sys.stderr,
                        )

                    try:
                        ledger_dir = Path(__file__).parent.parent.parent / "fork" / "workspace" / "logs"
                        ledger_dir.mkdir(parents=True, exist_ok=True)
                        ledger_entry = {
                            "ts": datetime.now(timezone.utc).isoformat(),
                            "family": family_id or "unknown",
                            "member": member_name,
                            "model": current_model,
                            "input": usage.input_tokens,
                            "output": usage.output_tokens,
                            "cache_read": cache_read,
                            "cache_write": cache_write,
                            "tool_round": tool_round if tools else None,
                        }
                        with open(ledger_dir / "token_ledger.jsonl", "a") as lf:
                            lf.write(json.dumps(ledger_entry) + "\n")
                    except Exception:
                        pass

                    # Handle tool use: execute tools and continue loop
                    if response.stop_reason == "tool_use" and tools and tool_round < 3:
                        from agent_tools import execute_tool
                        tool_results = []
                        for block in response.content:
                            if block.type == "tool_use":
                                result_text = execute_tool(
                                    tool_name=block.name,
                                    tool_input=block.input,
                                    filtered_context=filtered_context,
                                    conversation_log=conversation_log,
                                    family_id=family_id,
                                    access_level=access_level,
                                    requesting_member=member_name,
                                )
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": block.id,
                                    "content": result_text,
                                })
                                print(
                                    f"[CareSupport] Tool: {block.name}({json.dumps(block.input)[:80]}) → {len(result_text)} chars",
                                    file=sys.stderr,
                                )
                        loop_messages.append({"role": "assistant", "content": response.content})
                        loop_messages.append({"role": "user", "content": tool_results + [{
                            "type": "text",
                            "text": "Respond with ONLY valid JSON. No markdown, no explanation outside the JSON.",
                        }]})
                        continue

                    # Final response: extract thinking + text
                    for block in response.content:
                        if block.type == "thinking":
                            thinking_text = block.thinking
                        elif block.type == "text":
                            raw = block.text.strip()
                    if raw is None:
                        # Last block may be ToolUseBlock (no .text attr) — skip gracefully
                        for block in reversed(response.content):
                            if hasattr(block, "text"):
                                raw = block.text.strip()
                                break
                        if raw is None:
                            block_types = [b.type for b in response.content]
                            print(f"[CareSupport] Anthropic {current_model}: no text block in response (blocks: {block_types})", file=sys.stderr)
                    break

                if thinking_text:
                    print(
                        f"[CareSupport] Thinking ({current_model}): {thinking_text[:200]}...",
                        file=sys.stderr,
                    )

                result = _extract_json(raw)

                if not result.get("sms_response", "").strip():
                    result["sms_response"] = fallback_msg
                    print("[CareSupport] ⚠️ AI returned empty sms_response — using fallback", file=sys.stderr)
                return json.dumps(result)

            except asyncio.TimeoutError:
                last_error = f"{current_model} timed out after 60s"
                print(f"[CareSupport] Anthropic {current_model} attempt {attempt+1}/2: TimeoutError (60s)", file=sys.stderr)
            except anthropic.RateLimitError as e:
                last_error = e
                print(f"[CareSupport] Anthropic {current_model}: rate limited, trying next model", file=sys.stderr)
                break
            except anthropic.InternalServerError as e:
                last_error = e
                print(f"[CareSupport] Anthropic {current_model}: 5xx, trying next model", file=sys.stderr)
                break
            except json.JSONDecodeError as e:
                last_error = e
                raw_preview = (raw or "")[:300].replace("\n", "\\n")
                print(f"[CareSupport] Anthropic {current_model}: invalid JSON response, retrying. Raw: {raw_preview}", file=sys.stderr)
            except Exception as e:
                last_error = e
                print(f"[CareSupport] Anthropic {current_model} attempt {attempt+1}/2: {type(e).__name__}: {str(e)[:150]}", file=sys.stderr)

            if attempt < 1:
                await asyncio.sleep(3)

    return json.dumps({"sms_response": fallback_msg, "error": str(last_error)})


# ─── Learning Persistence ────────────────────────────────────────────────

MAX_FAMILY_LESSONS = 30


def _stage_corrections(
    corrections: list[str],
    family_dir: str,
    member: dict | None = None,
    trigger_msg: str = "",
    agent_response: str = "",
) -> None:
    """Write corrections to staging/reviews/ for audit and potential retraction."""
    staging_dir = Path(family_dir) / "staging" / "reviews"
    staging_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    ts = now.strftime("%Y%m%d_%H%M%S")
    family_id = Path(family_dir).name

    record = {
        "timestamp": now.isoformat(),
        "family_id": family_id,
        "source": "live",
        "member": member.get("name", "unknown") if member else "unknown",
        "trigger_message": trigger_msg[:500],
        "agent_response": agent_response[:500],
        "corrections": corrections,
        "lessons_written_to": f"families/{family_id}/lessons.md",
    }

    out_path = staging_dir / f"corrections_{ts}.json"
    with open(out_path, "w") as f:
        json.dump(record, f, indent=2)


def _persist_lessons(
    corrections: list[str],
    family_dir: str = "",
    member: dict | None = None,
    trigger_msg: str = "",
    agent_response: str = "",
) -> None:
    """Append self-corrections to the family's lessons.md (local) and stage for review.

    Falls back to global lessons.md if no family_dir provided.
    """
    if not corrections:
        return
    from learning import append_lessons
    if family_dir:
        family_lessons_path = Path(family_dir) / "lessons.md"
        append_lessons(family_lessons_path, corrections, max_entries=MAX_FAMILY_LESSONS)
        _stage_corrections(corrections, family_dir, member, trigger_msg, agent_response)
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


async def handle_sms(from_phone: str, body: str, dry_run: bool = False, service: str = "SMS", cli_mode: bool = False) -> dict:
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
        return await _process_message(member, family_id, family_dir, access_level, from_phone, body, dry_run, service, cli_mode=cli_mode)


async def _process_message(member: dict, family_id: str, family_dir: Path,
                           access_level: str, from_phone: str, body: str,
                           dry_run: bool, service: str = "SMS",
                           cli_mode: bool = False) -> dict:
    """Process a message under the family lock. All family.md reads/writes are serialized."""

    log_prefix = "[CareSupport]"

    # 2. Log inbound message (skip for CLI — poller logs the real inbound)
    if not cli_mode:
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

    # 6. Classify intent (needed before prompt building for selective context loading)
    route_result = care_route(body, member) if _AI_BACKEND == "anthropic" else None

    # 7. Build system context with FILTERED family data (intent-driven)
    if _AI_BACKEND == "anthropic":
        from prompt_builder import build_system_blocks, build_messages, system_blocks_to_string
        _use_tools = route_result and route_result.intent in ("GENERAL", "MULTI_MEMBER")
        system_blocks = build_system_blocks(
            member, filtered_context, service=service, member_context=member_context,
            intent=route_result.intent if route_result else "",
            tools_active=bool(_use_tools),
            conversation_history=conversation_history,
        )
        messages = build_messages(body, conversation_history)
    else:
        system_blocks = None
        messages = None

    system_context = build_system_context(
        member, filtered_context, conversation_history,
        service=service, member_context=member_context,
    )

    if dry_run:
        from prompt_builder import system_blocks_to_string as _flatten
        ctx_len = len(system_blocks_to_string(system_blocks)) if system_blocks else len(system_context)
        dry_run_result = {
            "success": True,
            "response": "[DRY RUN — would call AI agent here]",
            "member": member,
            "context_length": ctx_len,
            "backend": _AI_BACKEND,
            "enforcement": {
                "access_level": access_level,
                "sections_visible": visible_sections,
                "context_filtered": access_level != "full",
                "phi_access_logged": True,
            },
        }
        if route_result:
            dry_run_result["routing"] = {
                "tier": route_result.tier,
                "model": route_result.model,
                "intent": route_result.intent,
                "reason": route_result.reason,
            }
        return dry_run_result

    if _AI_BACKEND == "anthropic" and system_blocks is not None:
        print(
            f"[CareSupport] Route: {route_result.intent} → {route_result.tier} ({route_result.reason})",
            file=sys.stderr,
        )

        api_tools = None
        if _use_tools:
            from agent_tools import TOOL_DEFINITIONS
            api_tools = TOOL_DEFINITIONS

        result_json = await _generate_response_anthropic(
            system_blocks, messages,
            member_name=member.get("name", "there"),
            model=route_result.model,
            family_id=Path(member.get("family_dir", "")).name,
            tools=api_tools,
            filtered_context=filtered_context,
            conversation_log=conversation_history,
            access_level=access_level,
        )
        # If Anthropic failed entirely, fall back to OpenRouter (cross-provider resilience)
        result_check = json.loads(result_json)
        if result_check.get("error"):
            print("[CareSupport] Anthropic failed — falling back to OpenRouter", file=sys.stderr)
            result_json = await generate_response(system_context, body, member_name=member.get("name", "there"))
    else:
        result_json = await generate_response(system_context, body, member_name=member.get("name", "there"))
    result = json.loads(result_json)
    if route_result:
        result["_routed_tier"] = route_result.tier

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
        updates = parse_update_instructions(raw_updates)
        if updates:
            # ENFORCEMENT: classify into auto-apply vs. needs-approval
            classified = classify_updates(updates)

            # Auto-apply safe updates — route each update to the correct file
            if classified.auto_apply:
                from collections import defaultdict
                updates_by_file: dict[Path, list[FileUpdate]] = defaultdict(list)
                for upd in classified.auto_apply:
                    target = resolve_target_file(family_dir, upd.section)
                    updates_by_file[target].append(upd)

                all_applied = 0
                all_skipped = 0
                all_sections: list[str] = []
                all_errors: list[str] = []
                last_backup = ""
                for target_path, target_updates in updates_by_file.items():
                    if not target_path.exists():
                        all_errors.append(f"Target file not found: {target_path.name}")
                        all_skipped += len(target_updates)
                        continue
                    edit_result = apply_updates(target_path, target_updates)
                    all_applied += edit_result.updates_applied
                    all_skipped += edit_result.updates_skipped
                    all_sections.extend(edit_result.sections_modified)
                    all_errors.extend(edit_result.errors)
                    if edit_result.backup_path:
                        last_backup = edit_result.backup_path

                file_update_result = {
                    "success": all_applied > 0 or not all_errors,
                    "backup_path": last_backup,
                    "updates_applied": all_applied,
                    "updates_skipped": all_skipped,
                    "sections_modified": all_sections,
                    "errors": all_errors,
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
        _persist_lessons(
            raw_corrections,
            family_dir=member.get("family_dir", ""),
            member=member,
            trigger_msg=body,
            agent_response=result.get("sms_response", ""),
        )
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

    final = {
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
    if route_result:
        final["_routed_tier"] = route_result.tier

    asyncio.create_task(_summarize_conversation(from_phone))

    return final


# ─── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CareSupport SMS Handler")
    parser.add_argument("--from", dest="from_phone", required=True, help="Sender phone in E.164")
    parser.add_argument("--body", required=True, help="SMS message body")
    parser.add_argument("--dry-run", action="store_true", help="Test resolution without AI call")

    args = parser.parse_args()

    result = asyncio.run(handle_sms(args.from_phone, args.body, args.dry_run, cli_mode=True))
    print(json.dumps(result, indent=2))
