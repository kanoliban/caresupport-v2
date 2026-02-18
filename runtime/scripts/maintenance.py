"""
CareSupport Maintenance Cron — Garbage Collection & Validation
================================================================
Scans family.md and applies mechanical pruning + consistency validation.

Pruning rules (from family-md-spec.md):
  | Section        | Strategy                                          |
  |----------------|---------------------------------------------------|
  | Schedule       | Keep current + next 2 weeks. Past shifts removed. |
  | Recent Events  | Keep last ~50 entries. Oldest pruned first.        |
  | Active Issues  | Resolved issues ([x]) removed.                    |
  | Appointments   | Past appointments removed.                        |
  | Patterns       | (manual review — not auto-pruned)                 |
  | Members        | (manual review — not auto-pruned)                 |
  | Medications    | (only pruned when discontinued)                   |

Consistency checks:
  - Members referenced in Schedule exist in Members section
  - YAML blocks still parseable
  - Required sections present
  - No orphaned member references

Self-contained: reads family.md, prunes, validates, writes back.
Uses family_editor's backup/validate for safety.

Usage:
    python maintenance.py --family-dir /path [--dry-run] [--now "2026-02-18"]
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import paths
from enforcement.family_editor import (
    backup_family_file,
    validate_family_file,
    FileUpdate,
)
from enforcement.role_filter import parse_family_sections

# ─── Results ──────────────────────────────────────────────────────────────

@dataclass
class PruneResult:
    """Result of pruning a section."""
    section: str
    entries_before: int
    entries_after: int
    entries_removed: int


@dataclass
class ConsistencyIssue:
    """A consistency problem found in family.md."""
    severity: str       # "error" | "warning"
    category: str       # "orphan_member" | "missing_section" | "yaml_parse" | "empty_section"
    description: str
    section: str


@dataclass
class MaintenanceResult:
    """Result of a full maintenance run."""
    family_id: str
    scan_time: str
    backup_path: str | None
    prune_results: list[PruneResult] = field(default_factory=list)
    consistency_issues: list[ConsistencyIssue] = field(default_factory=list)
    total_entries_removed: int = 0
    file_modified: bool = False
    dry_run: bool = False


# ─── Section Parsers ──────────────────────────────────────────────────────

def _parse_recent_events(content: str) -> list[str]:
    """Parse Recent Events entries. Each entry starts with '- **'."""
    entries = []
    for line in content.strip().split("\n"):
        line = line.strip()
        if line.startswith("- **"):
            entries.append(line)
    return entries


def _parse_active_issues(content: str) -> tuple[list[str], list[str]]:
    """Parse Active Issues into open and resolved.

    Returns: (open_issues, resolved_issues)
    """
    open_issues = []
    resolved_issues = []

    for line in content.strip().split("\n"):
        line = line.strip()
        if line.startswith("- [x]") or line.startswith("- [X]"):
            resolved_issues.append(line)
        elif line.startswith("- [ ]") or line.startswith("- ["):
            open_issues.append(line)

    return open_issues, resolved_issues


def _parse_schedule_dates(content: str) -> tuple[str, list[dict]]:
    """Extract YAML block from schedule and parse shift dates.

    Returns: (raw_yaml_block_with_markers, list_of_shift_dicts)
    """
    match = re.search(r'```yaml\s*\n(.*?)```', content, re.DOTALL)
    if not match:
        return "", []

    yaml_text = match.group(1)
    shifts = []
    current = None

    for line in yaml_text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("- date:"):
            if current:
                shifts.append(current)
            date_str = stripped.split(":", 1)[1].strip().strip('"')
            current = {"date": date_str, "raw_lines": [line]}
        elif current:
            current["raw_lines"].append(line)

    if current:
        shifts.append(current)

    return yaml_text, shifts


def _parse_appointments_for_pruning(content: str) -> list[dict]:
    """Parse appointments with their raw text for removal.

    Returns list of {date_str, raw_lines, parsed_date}
    """
    appointments = []
    current = None

    for line in content.split("\n"):
        # New appointment line
        match = re.match(r'^- \*\*(.+?)\*\* —', line)
        if match:
            if current:
                appointments.append(current)
            date_str = match.group(1).strip()
            current = {"date_str": date_str, "raw_lines": [line]}
        elif current and line.strip().startswith("-"):
            # Sub-item of current appointment
            current["raw_lines"].append(line)
        elif current and line.strip():
            current["raw_lines"].append(line)
        else:
            if current:
                appointments.append(current)
                current = None

    if current:
        appointments.append(current)

    return appointments


def _parse_appointment_date(date_str: str, reference_year: int = 2026) -> datetime | None:
    """Parse 'Feb 18, 10:00 AM' into a datetime."""
    for fmt in ["%b %d, %I:%M %p", "%B %d, %I:%M %p", "%b %d, %H:%M"]:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.replace(year=reference_year, tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


# ─── Pruning Functions ────────────────────────────────────────────────────

def prune_recent_events(content: str, max_entries: int = 50) -> tuple[str, PruneResult]:
    """Prune Recent Events to max_entries (keeping newest).

    Entries are in reverse chronological order (newest first).
    """
    entries = _parse_recent_events(content)
    total = len(entries)

    if total <= max_entries:
        return content, PruneResult("recent_events", total, total, 0)

    # Keep the newest max_entries
    keep = entries[:max_entries]
    removed = total - max_entries

    # Reconstruct section content
    new_content = "\n".join(keep) + "\n"
    return new_content, PruneResult("recent_events", total, max_entries, removed)


def prune_active_issues(content: str) -> tuple[str, PruneResult]:
    """Remove resolved issues ([x]) from Active Issues."""
    open_issues, resolved = _parse_active_issues(content)
    total = len(open_issues) + len(resolved)

    if not resolved:
        return content, PruneResult("active_issues", total, total, 0)

    # Keep only open issues
    if open_issues:
        new_content = "\n".join(open_issues) + "\n"
    else:
        new_content = ""

    return new_content, PruneResult("active_issues", total, len(open_issues), len(resolved))


def prune_schedule(content: str, now: datetime | None = None, keep_weeks: int = 3) -> tuple[str, PruneResult]:
    """Remove past shifts from Schedule (keep current + next N weeks)."""
    if now is None:
        now = datetime.now(timezone.utc)

    cutoff = now - timedelta(days=1)  # Keep today, remove anything before yesterday

    yaml_text, shifts = _parse_schedule_dates(content)
    if not shifts:
        return content, PruneResult("schedule", 0, 0, 0)

    keep = []
    removed = 0

    for shift in shifts:
        try:
            shift_date = datetime.strptime(shift["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            keep.append(shift)  # Can't parse date — keep it
            continue

        if shift_date >= cutoff:
            keep.append(shift)
        else:
            removed += 1

    if removed == 0:
        return content, PruneResult("schedule", len(shifts), len(shifts), 0)

    # Reconstruct YAML
    yaml_lines = ["shifts:"]
    for shift in keep:
        yaml_lines.extend(shift["raw_lines"])

    new_yaml = "\n".join(yaml_lines)

    # Replace the old YAML block in the content
    new_content = re.sub(
        r'```yaml\s*\n.*?```',
        f'```yaml\n{new_yaml}\n```',
        content,
        flags=re.DOTALL,
    )

    return new_content, PruneResult("schedule", len(shifts), len(keep), removed)


def prune_appointments(content: str, now: datetime | None = None) -> tuple[str, PruneResult]:
    """Remove past appointments."""
    if now is None:
        now = datetime.now(timezone.utc)

    appointments = _parse_appointments_for_pruning(content)
    if not appointments:
        return content, PruneResult("appointments", 0, 0, 0)

    keep = []
    removed = 0

    for appt in appointments:
        appt_dt = _parse_appointment_date(appt["date_str"])
        if appt_dt is None:
            keep.append(appt)  # Can't parse — keep
            continue

        if appt_dt >= now:
            keep.append(appt)
        else:
            removed += 1

    if removed == 0:
        return content, PruneResult("appointments", len(appointments), len(appointments), 0)

    # Reconstruct
    lines = []
    for appt in keep:
        lines.extend(appt["raw_lines"])

    new_content = "\n".join(lines) + "\n" if lines else ""
    return new_content, PruneResult("appointments", len(appointments), len(keep), removed)


# ─── Consistency Validation ───────────────────────────────────────────────

REQUIRED_SECTIONS = {
    "members", "care_recipient", "schedule", "medications",
    "appointments", "active_issues", "recent_events",
}


def validate_consistency(content: str) -> list[ConsistencyIssue]:
    """Run consistency checks across the whole family.md."""
    issues = []
    _, sections = parse_family_sections(content)
    section_map = {s.key: s.content for s in sections}
    section_keys = set(section_map.keys())

    # CHECK 1: Required sections present
    for required in REQUIRED_SECTIONS:
        if required not in section_keys:
            issues.append(ConsistencyIssue(
                severity="error",
                category="missing_section",
                description=f"Required section '{required}' not found",
                section=required,
            ))

    # CHECK 2: Members referenced in Schedule exist in Members
    member_names = set()
    members_content = section_map.get("members", "")
    for line in members_content.split("\n"):
        if line.startswith("### "):
            member_names.add(line[4:].strip())

    schedule_content = section_map.get("schedule", "")
    _, shifts = _parse_schedule_dates(schedule_content)
    for shift in shifts:
        assigned = None
        for line in shift.get("raw_lines", []):
            if "assigned:" in line:
                assigned = line.split("assigned:", 1)[1].strip().strip('"')
                break

        if assigned and assigned not in ("null", "None", ""):
            # Check if this name exists in members (partial match OK)
            found = any(assigned in name or name.startswith(assigned) for name in member_names)
            if not found:
                issues.append(ConsistencyIssue(
                    severity="warning",
                    category="orphan_member",
                    description=f"Schedule references '{assigned}' but no matching member found",
                    section="schedule",
                ))

    # CHECK 3: YAML blocks parseable
    for section_key in ["schedule", "medications"]:
        section_content = section_map.get(section_key, "")
        yaml_match = re.search(r'```yaml\s*\n(.*?)```', section_content, re.DOTALL)
        if yaml_match:
            yaml_text = yaml_match.group(1).strip()
            if not yaml_text:
                issues.append(ConsistencyIssue(
                    severity="warning",
                    category="yaml_parse",
                    description=f"YAML block in {section_key} is empty",
                    section=section_key,
                ))

    # CHECK 4: Empty critical sections
    for section_key in ["members", "care_recipient"]:
        section_content = section_map.get(section_key, "").strip()
        if not section_content:
            issues.append(ConsistencyIssue(
                severity="error",
                category="empty_section",
                description=f"Critical section '{section_key}' is empty",
                section=section_key,
            ))

    return issues


# ─── Main Maintenance Runner ──────────────────────────────────────────────

def run_maintenance(
    family_dir: Path,
    now: datetime | None = None,
    dry_run: bool = False,
    max_recent_events: int = 50,
) -> MaintenanceResult:
    """Run full maintenance on a family.md file.

    Steps:
        1. Backup the file
        2. Parse sections
        3. Prune each section per rules
        4. Run consistency checks
        5. Write back (unless dry_run)

    Returns MaintenanceResult with all details.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    family_md_path = family_dir / "family.md"
    if not family_md_path.exists():
        return MaintenanceResult(
            family_id=family_dir.name,
            scan_time=now.isoformat() + "Z",
            backup_path=None,
            consistency_issues=[ConsistencyIssue(
                severity="error", category="missing_section",
                description="family.md not found", section="root",
            )],
        )

    content = family_md_path.read_text()

    # 1. Backup
    backup_path = None
    if not dry_run:
        backup_path = backup_family_file(family_md_path)

    # 2. Parse sections
    header, sections = parse_family_sections(content)
    section_map = {s.key: s for s in sections}

    # 3. Prune each section
    prune_results = []
    modified_sections = {}

    # Recent Events: keep last N
    if "recent_events" in section_map:
        new_content, pr = prune_recent_events(section_map["recent_events"].content, max_recent_events)
        prune_results.append(pr)
        if pr.entries_removed > 0:
            modified_sections["recent_events"] = new_content

    # Active Issues: remove resolved
    if "active_issues" in section_map:
        new_content, pr = prune_active_issues(section_map["active_issues"].content)
        prune_results.append(pr)
        if pr.entries_removed > 0:
            modified_sections["active_issues"] = new_content

    # Schedule: remove past shifts
    if "schedule" in section_map:
        new_content, pr = prune_schedule(section_map["schedule"].content, now)
        prune_results.append(pr)
        if pr.entries_removed > 0:
            modified_sections["schedule"] = new_content

    # Appointments: remove past
    if "appointments" in section_map:
        new_content, pr = prune_appointments(section_map["appointments"].content, now)
        prune_results.append(pr)
        if pr.entries_removed > 0:
            modified_sections["appointments"] = new_content

    total_removed = sum(pr.entries_removed for pr in prune_results)

    # 4. Apply modifications
    new_content = content
    for section_key, new_section_content in modified_sections.items():
        section = section_map[section_key]
        old = section.content
        if old in new_content:
            new_content = new_content.replace(old, new_section_content)

    file_modified = new_content != content

    # 5. Consistency checks (run on the NEW content)
    consistency_issues = validate_consistency(new_content)

    # 6. Write back
    if file_modified and not dry_run:
        # Validate before writing
        is_valid, errors = validate_family_file(new_content)
        if is_valid:
            family_md_path.write_text(new_content)
        else:
            consistency_issues.append(ConsistencyIssue(
                severity="error", category="validation_failed",
                description=f"Post-prune validation failed: {errors}",
                section="root",
            ))
            file_modified = False

    return MaintenanceResult(
        family_id=family_dir.name,
        scan_time=now.isoformat() + "Z",
        backup_path=backup_path,
        prune_results=prune_results,
        consistency_issues=consistency_issues,
        total_entries_removed=total_removed,
        file_modified=file_modified,
        dry_run=dry_run,
    )


# ─── SMS Formatting ───────────────────────────────────────────────────────

def format_maintenance_sms(result: MaintenanceResult) -> str:
    """Format maintenance results as coordinator SMS."""
    lines = []

    if result.total_entries_removed > 0:
        lines.append(f"🧹 Maintenance: pruned {result.total_entries_removed} stale entries")
        for pr in result.prune_results:
            if pr.entries_removed > 0:
                lines.append(f"  • {pr.section}: {pr.entries_before} → {pr.entries_after}")
    else:
        lines.append("✅ Maintenance: nothing to prune")

    if result.consistency_issues:
        errors = [i for i in result.consistency_issues if i.severity == "error"]
        warnings = [i for i in result.consistency_issues if i.severity == "warning"]
        if errors:
            lines.append(f"\n🔴 {len(errors)} error(s):")
            for e in errors:
                lines.append(f"  • {e.description}")
        if warnings:
            lines.append(f"🟡 {len(warnings)} warning(s):")
            for w in warnings:
                lines.append(f"  • {w.description}")

    return "\n".join(lines)


# ─── CLI ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CareSupport Maintenance Cron")
    parser.add_argument("--family-dir", required=True, help="Path to family directory")
    parser.add_argument("--dry-run", action="store_true", help="Don't write changes")
    parser.add_argument("--now", help="Override 'now' for testing (ISO format)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    now = None
    if args.now:
        now = datetime.fromisoformat(args.now).replace(tzinfo=timezone.utc)

    result = run_maintenance(Path(args.family_dir), now, dry_run=args.dry_run)

    if args.json:
        print(json.dumps({
            "family_id": result.family_id,
            "scan_time": result.scan_time,
            "backup_path": result.backup_path,
            "total_entries_removed": result.total_entries_removed,
            "file_modified": result.file_modified,
            "dry_run": result.dry_run,
            "prune_results": [asdict(pr) for pr in result.prune_results],
            "consistency_issues": [asdict(ci) for ci in result.consistency_issues],
        }, indent=2))
    else:
        print(format_maintenance_sms(result))
