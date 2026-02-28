"""
Agent Tools — Scoped retrieval tools for CareSupport's agentic loop.

Gives the AI agent tools to retrieve context on demand instead of
pre-loading everything into the system prompt. Medium agentic depth:
max 5 tool calls per message, with self-check before final response.
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

def _grep_file(path: Path, query: str, context_lines: int = 2) -> list[str]:
    """Search a file for lines matching query, return matches with context."""
    if not path.exists():
        return []
    lines = path.read_text().splitlines()
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
    family_id: str = "",
    conversation_log: str = "",
) -> str:
    """Execute search_context tool."""
    results = []

    if scope in ("family", "all") and family_id:
        family_dir = paths.family_dir(family_id)
        for fname in ["family.md", "schedule.md", "medications.md"]:
            fpath = family_dir / fname
            hits = _grep_file(fpath, query)
            if hits:
                results.append(f"── {fname} ──")
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


def execute_read_member(name: str, family_id: str = "") -> str:
    """Execute read_member tool."""
    if not family_id:
        return "No family context available."

    members_dir = paths.family_dir(family_id) / "members"
    if not members_dir.exists():
        return f"No member profiles found for family {family_id}."

    name_lower = name.lower().strip()
    for member_file in members_dir.glob("*.md"):
        if member_file.stem.lower() == name_lower:
            return member_file.read_text().strip()

    available = [f.stem for f in members_dir.glob("*.md")]
    return f"No profile found for '{name}'. Available members: {', '.join(available)}"


def execute_check_schedule(day: str, family_id: str = "") -> str:
    """Execute check_schedule tool."""
    if not family_id:
        return "No family context available."

    schedule_path = paths.family_dir(family_id) / "schedule.md"
    if not schedule_path.exists():
        return "No schedule file found."

    content = schedule_path.read_text().strip()

    day_lower = day.lower().strip()

    # Resolve 'today' / 'tomorrow' to day names
    now = datetime.now(timezone.utc)
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    if day_lower == "today":
        day_lower = day_names[now.weekday()]
    elif day_lower == "tomorrow":
        day_lower = day_names[(now.weekday() + 1) % 7]

    # Match day abbreviations
    day_abbrevs = {"mon": "monday", "tue": "tuesday", "wed": "wednesday",
                   "thu": "thursday", "fri": "friday", "sat": "saturday", "sun": "sunday"}
    for abbrev, full in day_abbrevs.items():
        if day_lower.startswith(abbrev):
            day_lower = full
            break

    # Search for the day in schedule
    lines = content.splitlines()
    matches = []
    for line in lines:
        if day_lower[:3] in line.lower():
            matches.append(line.strip())

    # Always include the header/comments for context
    header = [l for l in lines if l.startswith("#") or l.startswith("<!--")]

    if matches:
        return "\n".join(header + [""] + matches)
    return f"No schedule entries found for '{day}'.\n\nFull schedule:\n{content}"


# ─── Dispatcher ──────────────────────────────────────────────────────────

def execute_tool(
    tool_name: str,
    tool_input: dict,
    family_id: str = "",
    conversation_log: str = "",
) -> str:
    """Route tool call to the right executor."""
    if tool_name == "search_context":
        return execute_search_context(
            query=tool_input.get("query", ""),
            scope=tool_input.get("scope", "all"),
            family_id=family_id,
            conversation_log=conversation_log,
        )
    elif tool_name == "read_member":
        return execute_read_member(
            name=tool_input.get("name", ""),
            family_id=family_id,
        )
    elif tool_name == "check_schedule":
        return execute_check_schedule(
            day=tool_input.get("day", ""),
            family_id=family_id,
        )
    else:
        return f"Unknown tool: {tool_name}"
