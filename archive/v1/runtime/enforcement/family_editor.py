from __future__ import annotations

"""
Family File Editor — Mechanical enforcement of edit-not-write semantics.

The family.md file IS the database. Every edit must be:
  1. Atomic — either the whole edit succeeds or nothing changes
  2. Backed up — timestamped copy before any modification
  3. Surgical — only the target section changes; everything else untouched
  4. Auditable — what changed, logged via phi_audit
  5. Validated — the result still parses into valid sections

This editor does NOT rewrite the file. It:
  - Parses family.md into sections
  - Applies targeted operations to specific sections
  - Reassembles the file with only the target section changed

If anything goes wrong, the backup is intact and the original file is unchanged.
"""

import re
import shutil
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from enforcement.role_filter import parse_family_sections, Section, SECTION_KEY_MAP

SECTION_FILE_MAP = {
    "schedule": "schedule.md",
    "this_week": "schedule.md",
    "medications": "medications.md",
    "active_medications": "medications.md",
    "medication_hold_log": "medications.md",
}


def resolve_target_file(family_dir: Path, section_key: str) -> Path:
    """Resolve which file a section update should target.

    Sections listed in SECTION_FILE_MAP go to their split file.
    Everything else targets family.md.
    """
    filename = SECTION_FILE_MAP.get(section_key, "family.md")
    return family_dir / filename


# ─── Update Operations ───────────────────────────────────────────────────

@dataclass
class FileUpdate:
    """A single structured update to apply to family.md."""
    section: str       # Section key (e.g., "schedule", "recent_events", "active_issues")
    operation: str     # "append" | "prepend" | "replace" | "resolve_issue"
    content: str       # Text to add, or new text for replacement
    old_content: str = ""  # For "replace" — the text being replaced


@dataclass
class EditResult:
    """Result of attempting to edit family.md."""
    success: bool
    backup_path: str = ""
    updates_applied: int = 0
    updates_skipped: int = 0
    errors: list[str] = field(default_factory=list)
    sections_modified: list[str] = field(default_factory=list)


VALID_OPERATIONS = {"append", "prepend", "replace", "resolve_issue"}


# ─── Backup ───────────────────────────────────────────────────────────────

def backup_family_file(family_md_path: Path, backup_dir: Path | None = None) -> Path:
    """Create a timestamped backup of family.md before editing.

    Returns the path to the backup file.
    """
    if backup_dir is None:
        backup_dir = family_md_path.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"family_{timestamp}.md"

    shutil.copy2(family_md_path, backup_path)
    return backup_path


# ─── Section Editing ──────────────────────────────────────────────────────

def _apply_append(section: Section, content: str) -> Section:
    """Append content to the end of a section."""
    new_content = section.content.rstrip() + "\n" + content.rstrip() + "\n"
    return Section(header=section.header, key=section.key, content=new_content)


def _apply_prepend(section: Section, content: str) -> Section:
    """Prepend content after the section header."""
    lines = section.content.split("\n", 1)
    header_line = lines[0]
    rest = lines[1] if len(lines) > 1 else ""
    new_content = header_line + "\n\n" + content.rstrip() + "\n" + rest
    return Section(header=section.header, key=section.key, content=new_content)


def _apply_replace(section: Section, old_content: str, new_content: str) -> Section | None:
    """Replace specific text within a section. Returns None if old_content not found."""
    if old_content not in section.content:
        return None
    replaced = section.content.replace(old_content, new_content, 1)
    return Section(header=section.header, key=section.key, content=replaced)


def _apply_resolve_issue(section: Section, content: str) -> Section | None:
    """Mark an active issue as resolved (change [ ] to [x]).

    `content` should be a substring that uniquely identifies the issue.
    """
    # Find the issue line
    lines = section.content.split("\n")
    found = False
    for i, line in enumerate(lines):
        if content.lower() in line.lower() and "- [ ]" in line:
            lines[i] = line.replace("- [ ]", "- [x]", 1)
            found = True
            break

    if not found:
        return None

    return Section(
        header=section.header,
        key=section.key,
        content="\n".join(lines),
    )


# ─── Header Update ───────────────────────────────────────────────────────

def _update_last_updated(header: str) -> str:
    """Update the 'Last Updated' field in the file header."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    pattern = r"Last Updated:.*"
    if re.search(pattern, header):
        return re.sub(pattern, f"Last Updated: {now}", header)
    return header


# ─── Reassembly ───────────────────────────────────────────────────────────

def _reassemble(header: str, sections: list[Section]) -> str:
    """Reassemble family.md from header + sections."""
    parts = [header.rstrip()]
    for section in sections:
        parts.append(section.content.rstrip())
    return "\n\n".join(parts) + "\n"


# ─── Validation ───────────────────────────────────────────────────────────

def validate_family_file(content: str) -> tuple[bool, list[str]]:
    """Validate that family.md content is structurally sound.

    Checks:
      - Has a top-level # header
      - Has at least one ## section
      - All sections parse correctly
      - No empty sections (header with no content)

    Returns:
        (is_valid, list_of_issues)
    """
    issues = []

    if not content.strip():
        return False, ["File is empty"]

    lines = content.strip().split("\n")
    if not lines[0].startswith("# "):
        issues.append("Missing top-level # header")

    header, sections = parse_family_sections(content)

    if not header.strip():
        issues.append("Header block is empty")

    if len(sections) == 0:
        issues.append("No ## sections found")

    for section in sections:
        # Check section has content beyond just the header
        content_without_header = section.content.replace(section.header, "", 1).strip()
        if not content_without_header:
            issues.append(f"Section '{section.key}' is empty")

    return len(issues) == 0, issues


# ─── Main Editor ──────────────────────────────────────────────────────────

def apply_updates(
    family_md_path: Path,
    updates: list[FileUpdate],
    backup_dir: Path | None = None,
) -> EditResult:
    """Apply structured updates to family.md.

    This is the main entry point. It:
      1. Reads the current file
      2. Creates a backup
      3. Parses into sections
      4. Applies each update to the target section
      5. Updates the "Last Updated" timestamp
      6. Validates the result
      7. Writes only if validation passes

    If any update fails, it's skipped (logged in errors) but other updates proceed.
    If the final validation fails, NOTHING is written (backup stays, file unchanged).
    """
    result = EditResult(success=False)

    # Read current content
    if not family_md_path.exists():
        result.errors.append(f"File not found: {family_md_path}")
        return result

    original_content = family_md_path.read_text()

    # Backup before any changes
    backup_path = backup_family_file(family_md_path, backup_dir)
    result.backup_path = str(backup_path)

    # Parse into sections
    header, sections = parse_family_sections(original_content)

    # Build a lookup by section key
    section_index = {s.key: i for i, s in enumerate(sections)}

    # Apply each update
    any_changes = False
    for update in updates:
        # Validate operation
        if update.operation not in VALID_OPERATIONS:
            result.errors.append(
                f"Invalid operation '{update.operation}' for section '{update.section}'"
            )
            result.updates_skipped += 1
            continue

        # Find the target section
        if update.section not in section_index:
            result.errors.append(
                f"Section '{update.section}' not found in family.md"
            )
            result.updates_skipped += 1
            continue

        idx = section_index[update.section]
        section = sections[idx]

        # Apply the operation
        new_section = None
        if update.operation == "append":
            new_section = _apply_append(section, update.content)
        elif update.operation == "prepend":
            new_section = _apply_prepend(section, update.content)
        elif update.operation == "replace":
            new_section = _apply_replace(section, update.old_content, update.content)
            if new_section is None:
                result.errors.append(
                    f"Replace failed: old_content not found in section '{update.section}'"
                )
                result.updates_skipped += 1
                continue
        elif update.operation == "resolve_issue":
            new_section = _apply_resolve_issue(section, update.content)
            if new_section is None:
                result.errors.append(
                    f"Resolve failed: issue not found in section '{update.section}'"
                )
                result.updates_skipped += 1
                continue

        if new_section is not None:
            sections[idx] = new_section
            result.updates_applied += 1
            result.sections_modified.append(update.section)
            any_changes = True

    if not any_changes:
        result.success = True  # No changes needed, that's fine
        return result

    # Update the "Last Updated" timestamp
    header = _update_last_updated(header)

    # Reassemble
    new_content = _reassemble(header, sections)

    # Validate the result BEFORE writing
    is_valid, issues = validate_family_file(new_content)
    if not is_valid:
        result.errors.append(f"Validation failed after edits: {issues}")
        result.success = False
        return result

    # Write only if valid
    family_md_path.write_text(new_content)
    result.success = True
    return result


# ─── Parse AI Updates ─────────────────────────────────────────────────────

def parse_update_instructions(raw_updates: list[dict]) -> list[FileUpdate]:
    """Parse the AI's structured update instructions into FileUpdate objects.

    Handles malformed entries gracefully — skips and logs rather than crash.
    """
    updates = []
    for entry in raw_updates:
        if not isinstance(entry, dict):
            continue
        section = entry.get("section", "")
        operation = entry.get("operation", "")
        content = entry.get("content", "")
        old_content = entry.get("old_content", "")
        if not isinstance(section, str) or not isinstance(operation, str) or not isinstance(content, str):
            continue
        if not isinstance(old_content, str):
            old_content = ""
        section = section.strip().lower()
        operation = operation.strip().lower()
        content = content.strip()
        old_content = old_content.strip()

        if not section or not operation or not content:
            continue

        # Normalize section name to key
        section_key = SECTION_KEY_MAP.get(section, section.replace(" ", "_"))

        updates.append(FileUpdate(
            section=section_key,
            operation=operation,
            content=content,
            old_content=old_content,
        ))

    return updates


def rollback(family_md_path: Path, backup_path: Path) -> bool:
    """Restore family.md from a backup file.

    Returns True if rollback succeeded.
    """
    if not backup_path.exists():
        return False
    shutil.copy2(backup_path, family_md_path)
    return True
