"""
Role Filter — Mechanical enforcement of access-level scoping.

Two layers of defense:
  1. PRE-FILTER:  Strip sections from family.md before the agent sees them.
                  The agent can't share what it never received.
  2. POST-CHECK:  Scan outbound messages for medication/condition keywords
                  that a restricted member shouldn't see. Blocks if detected.

This is the harness, not the agent. The agent is ALSO told to scope responses
by access level (in the system prompt). This filter catches what the agent misses.
"""

import re
from dataclasses import dataclass


# ─── Access Matrix ────────────────────────────────────────────────────────

ACCESS_MATRIX = {
    "full": {
        "sections": ["*"],
        "can_approve_changes": True,
    },
    "schedule+meds": {
        "sections": [
            "members", "care_recipient", "schedule", "medications",
            "appointments", "availability", "active_issues",
        ],
        "can_approve_changes": False,
    },
    "schedule": {
        "sections": [
            "members", "schedule", "availability", "active_issues",
        ],
        "can_approve_changes": False,
    },
    "provider": {
        "sections": [
            "care_recipient", "medications", "appointments",
            "members",
        ],
        "can_approve_changes": False,
    },
}

# Map markdown ## headers to access matrix keys
SECTION_KEY_MAP = {
    "members":          "members",
    "care recipient":   "care_recipient",
    "schedule":         "schedule",
    "medications":      "medications",
    "active medications": "medications",
    "appointments":     "appointments",
    "availability":     "availability",
    "active issues":    "active_issues",
    "recent events":    "recent_events",
    "patterns":         "patterns",
    "insurance":        "insurance",
    "care preferences": "care_preferences",
}


# ─── Section Parser ───────────────────────────────────────────────────────

@dataclass
class Section:
    """A parsed section of family.md."""
    header: str       # Original markdown header (e.g., "## Medications")
    key: str          # Normalized key (e.g., "medications")
    content: str      # Full text including header


def parse_family_sections(family_md: str) -> tuple[str, list[Section]]:
    """Parse family.md into header block + typed sections.

    Returns:
        (header_text, list_of_sections)
        header_text is everything before the first ## header.
    """
    lines = family_md.split("\n")
    header_lines = []
    sections = []
    current_header = None
    current_lines = []

    for line in lines:
        if line.startswith("## "):
            # Save previous section
            if current_header is not None:
                raw = current_header.lstrip("# ").strip().lower()
                key = SECTION_KEY_MAP.get(raw, raw.replace(" ", "_"))
                sections.append(Section(
                    header=current_header,
                    key=key,
                    content="\n".join(current_lines),
                ))
            current_header = line
            current_lines = [line]
        elif current_header is None:
            header_lines.append(line)
        else:
            current_lines.append(line)

    # Don't forget the last section
    if current_header is not None:
        raw = current_header.lstrip("# ").strip().lower()
        key = SECTION_KEY_MAP.get(raw, raw.replace(" ", "_"))
        sections.append(Section(
            header=current_header,
            key=key,
            content="\n".join(current_lines),
        ))

    return "\n".join(header_lines), sections


# ─── Pre-Filter: Context Scoping ─────────────────────────────────────────

def filter_family_context(family_md: str, access_level: str) -> str:
    """Filter family.md content based on access level.

    BEFORE the agent sees any data. This is the primary defense.
    The agent receives only the sections the member is allowed to see.

    Args:
        family_md: Raw family.md content
        access_level: Member's access level (full, schedule+meds, schedule, provider)

    Returns:
        Filtered family.md content with restricted sections removed.
    """
    config = ACCESS_MATRIX.get(access_level)
    if config is None:
        # Unknown access level — return header only (zero PHI)
        header, _ = parse_family_sections(family_md)
        return header + "\n\n[Access level not recognized. No care data loaded.]\n"

    allowed = config["sections"]
    if "*" in allowed:
        return family_md  # Full access, no filtering

    header, sections = parse_family_sections(family_md)

    # Keep only allowed sections
    filtered_parts = [header.rstrip()]
    for section in sections:
        if section.key in allowed:
            filtered_parts.append(section.content.rstrip())

    return "\n\n".join(filtered_parts) + "\n"


def get_filtered_sections(access_level: str) -> list[str]:
    """Return which section keys are visible for an access level."""
    config = ACCESS_MATRIX.get(access_level, {})
    allowed = config.get("sections", [])
    if "*" in allowed:
        return ["*"]
    return list(allowed)


def can_approve(access_level: str) -> bool:
    """Check if a member can approve care plan changes."""
    config = ACCESS_MATRIX.get(access_level, {})
    return config.get("can_approve_changes", False)


# ─── Post-Check: Outbound Leakage Detection ──────────────────────────────

@dataclass
class LeakageResult:
    """Result of scanning an outbound message for PHI leakage."""
    is_clean: bool
    leaked_categories: list[str]  # e.g., ["medications", "conditions"]
    leaked_terms: list[str]       # actual terms found


# Common medication suffixes and patterns
_MED_PATTERNS = [
    r'\b\w+pril\b',       # ACE inhibitors (lisinopril, enalapril)
    r'\b\w+sartan\b',     # ARBs (losartan, valsartan)
    r'\b\w+statin\b',     # Statins (atorvastatin)
    r'\b\w+formin\b',     # Metformin
    r'\b\w+olol\b',       # Beta blockers (metoprolol)
    r'\b\w+pine\b',       # Calcium channel blockers (amlodipine)
    r'\b\w+azole\b',      # Antifungals
    r'\b\w+cycline\b',    # Antibiotics
    r'\b\w+mycin\b',      # Antibiotics
    r'\b\d+\s*mg\b',      # Dosage patterns (10mg, 500 mg)
    r'\b\d+\s*mcg\b',     # Microgram dosages
    r'\b\d+\s*ml\b',      # Liquid dosages
]

_CONDITION_PATTERNS = [
    r'\bdiabet\w*\b',
    r'\bhypertens\w*\b',
    r'\balzheimer\w*\b',
    r'\bdementia\b',
    r'\bdiagnos\w*\b',
    r'\bprescri\w*\b',
    r'\bA1[Cc]\b',
    r'\bblood\s+(?:pressure|sugar|glucose)\b',
    r'\bcholesterol\b',
    r'\binsulin\b',
]


def scan_for_medication_leakage(text: str) -> list[str]:
    """Find medication-related terms in text."""
    found = []
    text_lower = text.lower()
    for pattern in _MED_PATTERNS:
        matches = re.findall(pattern, text_lower)
        found.extend(matches)
    return list(set(found))


def scan_for_condition_leakage(text: str) -> list[str]:
    """Find medical condition terms in text."""
    found = []
    text_lower = text.lower()
    for pattern in _CONDITION_PATTERNS:
        matches = re.findall(pattern, text_lower)
        found.extend(matches)
    return list(set(found))


def check_outbound_message(message: str, access_level: str) -> LeakageResult:
    """Scan an outbound SMS for PHI that this access level shouldn't see.

    This is the SAFETY NET. It runs after the agent generates a response.
    If leakage is detected, the message should be blocked.

    Args:
        message: The SMS text about to be sent
        access_level: Recipient's access level

    Returns:
        LeakageResult indicating whether the message is safe to send.
    """
    config = ACCESS_MATRIX.get(access_level, {})
    allowed = config.get("sections", [])

    if "*" in allowed:
        return LeakageResult(is_clean=True, leaked_categories=[], leaked_terms=[])

    leaked_categories = []
    leaked_terms = []

    # Check medication leakage for members who can't see medications
    if "medications" not in allowed:
        med_terms = scan_for_medication_leakage(message)
        if med_terms:
            leaked_categories.append("medications")
            leaked_terms.extend(med_terms)

    # Check condition leakage for members who can't see care_recipient
    if "care_recipient" not in allowed:
        condition_terms = scan_for_condition_leakage(message)
        if condition_terms:
            leaked_categories.append("conditions")
            leaked_terms.extend(condition_terms)

    return LeakageResult(
        is_clean=len(leaked_categories) == 0,
        leaked_categories=leaked_categories,
        leaked_terms=leaked_terms,
    )
