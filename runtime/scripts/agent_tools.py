"""
Agent Tools — Scoped retrieval tools for CareSupport's agentic loop.

All tools operate on pre-filtered family context (access level enforcement
already applied by role_filter.py). Tools NEVER read raw files from disk
for family data — the filtered_context string is the only data source.

Exception: read_member reads member profiles from disk but enforces
access_level checks before returning data.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths


# ─── Tool Schemas (Anthropic format) ─────────────────────────────────────

TOOL_DEFINITIONS = [
    {
        "name": "search_context",
        "description": (
            "Search the family file, schedule, medications, and conversation history "
            "for information matching a query. Use this when you need to look up "
            "specific details before responding. Returns matching lines with context."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "What to search for (name, topic, keyword)",
                },
                "scope": {
                    "type": "string",
                    "enum": ["family", "conversation", "all"],
                    "description": "Where to search: 'family' (family.md + schedule + meds), 'conversation' (recent messages), 'all' (both)",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "read_member",
        "description": (
            "Read a care team member's profile. Returns their identity, "
            "communication preferences, care responsibilities, and personal context. "
            "Use when you need details about a specific person."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "First name of the member (case-insensitive)",
                },
            },
            "required": ["name"],
        },
    },
    {
        "name": "check_schedule",
        "description": (
            "Check the care schedule for specific days. Returns schedule entries "
            "and any driver assignments. Use when asked about 'today', 'Monday', "
            "'this week', or specific dates."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "day": {
                    "type": "string",
                    "description": "Day to check: 'today', 'tomorrow', day name ('Monday'), or date ('2026-03-01')",
                },
            },
            "required": ["day"],
        },
    },
]


# ─── Tool Executors ──────────────────────────────────────────────────────

def _grep_text(text: str, query: str, context_lines: int = 2) -> list[str]:
    """Search text for lines matching query, return matches with context."""
    if not text:
        return []
    lines = text.splitlines()
    query_lower = query.lower()
    matches = []
    for i, line in enumerate(lines):
        if query_lower in line.lower():
            start = max(0, i - context_lines)
            end = min(len(lines), i + context_lines + 1)
            chunk = "\n".join(lines[start:end])
            if chunk not in matches:
                matches.append(chunk)
    return matches[:10]


def execute_search_context(
    query: str,
    scope: str = "all",
    filtered_context: str = "",
    conversation_log: str = "",
) -> str:
    """Search pre-filtered family context and/or conversation history."""
    results = []

    if scope in ("family", "all") and filtered_context:
        hits = _grep_text(filtered_context, query)
        if hits:
            results.append("── Family context ──")
            results.extend(hits)

    if scope in ("conversation", "all") and conversation_log:
        conv_lines = conversation_log.splitlines()
        query_lower = query.lower()
        matching = [l for l in conv_lines if query_lower in l.lower()]
        if matching:
            results.append("── Recent conversation ──")
            results.extend(matching[-10:])

    if not results:
        return f"No results found for '{query}' in {scope} scope."
    return "\n".join(results)


def execute_read_member(
    name: str,
    family_id: str = "",
    access_level: str = "full",
    requesting_member: str = "",
) -> str:
    """Read a member profile from disk with access-level enforcement."""
    if not family_id:
        return "No family context available."

    if access_level not in ("full", "schedule+meds"):
        req_first = requesting_member.lower().strip().split()[0] if requesting_member else ""
        if name.lower().strip() != req_first:
            return "You don't have access to other members' profiles."

    members_dir = paths.family_dir(family_id) / "members"
    if not members_dir.exists():
        return f"No member profiles found for family {family_id}."

    name_lower = name.lower().strip()
    for member_file in members_dir.glob("*.md"):
        if member_file.stem.lower() == name_lower:
            return member_file.read_text().strip()

    available = [f.stem for f in members_dir.glob("*.md")]
    return f"No profile found for '{name}'. Available members: {', '.join(available)}"


def execute_check_schedule(day: str, filtered_context: str = "") -> str:
    """Extract schedule entries from pre-filtered context for a specific day."""
    if not filtered_context:
        return "No schedule data available."

    day_lower = day.lower().strip()

    now = datetime.now(timezone.utc)
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    if day_lower == "today":
        day_lower = day_names[now.weekday()]
    elif day_lower == "tomorrow":
        day_lower = day_names[(now.weekday() + 1) % 7]

    day_abbrevs = {"mon": "monday", "tue": "tuesday", "wed": "wednesday",
                   "thu": "thursday", "fri": "friday", "sat": "saturday", "sun": "sunday"}
    for abbrev, full in day_abbrevs.items():
        if day_lower.startswith(abbrev):
            day_lower = full
            break

    lines = filtered_context.splitlines()
    matches = []
    header = []
    for line in lines:
        if line.startswith("#") or line.startswith("<!--"):
            header.append(line)
        if day_lower[:3] in line.lower():
            matches.append(line.strip())

    if matches:
        return "\n".join(header[:3] + [""] + matches)
    return f"No schedule entries found for '{day}'."


# ─── Dispatcher ──────────────────────────────────────────────────────────

def execute_tool(
    tool_name: str,
    tool_input: dict,
    filtered_context: str = "",
    conversation_log: str = "",
    family_id: str = "",
    access_level: str = "full",
    requesting_member: str = "",
) -> str:
    """Route tool call to the right executor."""
    if tool_name == "search_context":
        return execute_search_context(
            query=tool_input.get("query", ""),
            scope=tool_input.get("scope", "all"),
            filtered_context=filtered_context,
            conversation_log=conversation_log,
        )
    elif tool_name == "read_member":
        return execute_read_member(
            name=tool_input.get("name", ""),
            family_id=family_id,
            access_level=access_level,
            requesting_member=requesting_member,
        )
    elif tool_name == "check_schedule":
        return execute_check_schedule(
            day=tool_input.get("day", ""),
            filtered_context=filtered_context,
        )
    else:
        return f"Unknown tool: {tool_name}"
