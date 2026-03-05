"""
Family Reader — Parse and manage family.md files.

Viktor equivalent: sdk/utils/workspace_tree.py — generates directory tree of
the workspace. Our version reads the specific family.md file.

The key architectural decision: family.md has two sections:
1. Current (always loaded, kept under 2000 tokens)
2. Reference (loaded on demand, by specific sub-section)

This reader handles that progressive disclosure.
"""

import os
import yaml


class FamilyReader:
    """Read and parse family.md files with progressive disclosure."""

    def __init__(self, families_dir: str = "/care/families"):
        self.families_dir = families_dir

    def load_current(self, family_id: str) -> dict:
        """Load the Current section of a family's file.

        This is called on EVERY message. It must be fast and return
        structured data the agent can use immediately.

        Returns:
            {
                "metadata": {...},           # YAML frontmatter
                "care_recipient": {...},     # Parsed care recipient info
                "care_team": [...],          # List of team members
                "this_week": str,            # This week's schedule
                "active_medications": [...], # Parsed medication list
                "urgent_notes": [str],       # Active concerns
                "recent_updates": [str],     # Last 10 updates
            }
        """
        path = os.path.join(self.families_dir, family_id, "family.md")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Family {family_id} not found")

        with open(path, "r") as f:
            content = f.read()

        # Split at the Reference marker
        parts = content.split("# Reference")
        current_section = parts[0]

        # Parse YAML frontmatter
        if current_section.startswith("---"):
            fm_end = current_section.index("---", 3)
            frontmatter = yaml.safe_load(current_section[3:fm_end])
            body = current_section[fm_end + 3:]
        else:
            frontmatter = {}
            body = current_section

        return {
            "metadata": frontmatter,
            "raw_current": body.strip(),
            "has_reference": len(parts) > 1,
        }

    def load_reference_section(self, family_id: str, section: str) -> str:
        """Load a specific section from the Reference portion of family.md.

        Only call this when the conversation requires historical or detailed
        context. Most messages should be answerable from Current alone.

        Args:
            family_id: The family
            section: Section header to find (e.g., "Full Medication History",
                    "Insurance & Coverage", "Care Preferences & Personality")

        Returns:
            The content of that section as a string
        """
        path = os.path.join(self.families_dir, family_id, "family.md")
        with open(path, "r") as f:
            content = f.read()

        # Find the Reference section
        ref_start = content.find("# Reference")
        if ref_start == -1:
            return ""

        reference = content[ref_start:]

        # Find the requested subsection
        section_header = f"## {section}"
        sec_start = reference.find(section_header)
        if sec_start == -1:
            return ""

        # Find the end (next ## header or end of file)
        sec_body_start = sec_start + len(section_header)
        next_section = reference.find("\n## ", sec_body_start)
        if next_section == -1:
            return reference[sec_body_start:].strip()
        else:
            return reference[sec_body_start:next_section].strip()

    def update_section(self, family_id: str, section: str,
                       content: str, append: bool = False) -> None:
        """Update a section of family.md.

        IMPORTANT: This function is called AFTER confirmation is received.
        The care-plan-updates protocol handles the approval flow.

        Args:
            family_id: The family
            section: Section header to update
            content: New content for the section
            append: If True, append to section. If False, replace.
        """
        # Implementation: read file, find section, replace/append, write back
        raise NotImplementedError("Platform implements atomic file updates")
