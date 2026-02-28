"""
Care Tools — Family context tool shims for on-demand data retrieval.

Instead of stuffing all family data into every prompt, these tools let the agent
request specific sections when needed. Tools are stateless readers that extract
from pre-filtered family context (access level enforcement already applied).

Used for GENERAL intent where the agent gets a slim prompt and calls tools
only if the conversation requires family data.
"""

from __future__ import annotations

import re

_SECTION_RE = re.compile(r"^## ", re.MULTILINE)


CARE_TOOLS = [
    {
        "name": "get_schedule",
        "description": "Get this week's care schedule, coverage windows, and upcoming appointments.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_medications",
        "description": "Get active medications, dosages, schedules, and medication hold log.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_care_team",
        "description": "Get care team members, roles, contact info, and availability.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_family_notes",
        "description": "Get recent family notes, urgent items, condition tracking, and care observations.",
        "input_schema": {"type": "object", "properties": {}},
    },
]

_TOOL_SECTIONS: dict[str, set[str]] = {
    "get_schedule": {"This Week", "Care Team"},
    "get_medications": {
        "Active Medications", "Medication Hold Log", "Full Medication History",
    },
    "get_care_team": {"Care Team", "Care Recipient"},
    "get_family_notes": {
        "Urgent Notes", "For Next Visit", "Recent Updates", "Condition Tracking",
    },
}

TOOL_NAMES = {t["name"] for t in CARE_TOOLS}


def _extract_sections(text: str, sections: set[str]) -> str:
    """Extract specific ## sections from markdown text."""
    if not text or not sections:
        return ""

    parts = _SECTION_RE.split(text)
    result = []

    for part in parts[1:]:
        lines = part.split("\n", 1)
        header = lines[0].strip()
        if header in sections:
            result.append(f"## {part.rstrip()}")

    return "\n\n".join(result)


def handle_tool_call(tool_name: str, family_context: str) -> str:
    """Execute a care tool against pre-filtered family context.

    Args:
        tool_name: One of the CARE_TOOLS names.
        family_context: Already access-level-filtered family.md content.

    Returns:
        Extracted section text, or a "not available" message.
    """
    sections = _TOOL_SECTIONS.get(tool_name)
    if not sections:
        return f"Unknown tool: {tool_name}"

    result = _extract_sections(family_context, sections)
    if not result.strip():
        label = tool_name.replace("get_", "").replace("_", " ")
        return f"No {label} information available for this family."
    return result
