"""
Tests: Maintenance Cron — Garbage Collection & Consistency Validation

THE QUESTIONS THESE TESTS ANSWER:
  Does a 90-entry Recent Events section get pruned to 50?
  Are resolved Active Issues removed?
  Are past shifts cleaned from the Schedule?
  Are past appointments removed?
  Does the orphan member check work?
  Does the file stay valid after pruning?
"""

import json
import shutil
import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.maintenance import (
    prune_recent_events,
    prune_active_issues,
    prune_schedule,
    prune_appointments,
    validate_consistency,
    run_maintenance,
    format_maintenance_sms,
    _parse_recent_events,
    _parse_active_issues,
    _parse_schedule_dates,
    _parse_appointments_for_pruning,
)

# ─── Counters ─────────────────────────────────────────────────────────────

_passed = 0
_failed = 0

def assert_true(condition: bool, test_name: str):
    global _passed, _failed
    if condition:
        _passed += 1
        print(f"  ✅ {test_name}")
    else:
        _failed += 1
        print(f"  ❌ {test_name}")

def assert_eq(actual, expected, test_name: str):
    assert_true(actual == expected, f"{test_name} (got {actual!r}, expected {expected!r})")

def assert_in(needle: str, haystack: str, test_name: str):
    assert_true(needle in haystack, f"{test_name} (looking for {needle!r})")


# ─── Test Family.md Builders ──────────────────────────────────────────────

def _make_family_md(
    recent_events_count: int = 5,
    resolved_issues: int = 0,
    open_issues: int = 2,
    past_shifts: int = 0,
    future_shifts: int = 2,
    past_appointments: int = 0,
    future_appointments: int = 1,
    extra_schedule_member: str | None = None,
) -> str:
    """Generate a test family.md with configurable section sizes."""

    # Recent Events
    events = []
    for i in range(recent_events_count):
        day = 18 - (i // 3)  # Spread across days
        events.append(f"- **2026-02-{day:02d} {12 - i % 12:02d}:00** — Event entry #{i + 1}")
    recent_events_text = "\n".join(events) if events else ""

    # Active Issues
    issues = []
    for i in range(open_issues):
        issues.append(f"- [ ] Open issue #{i + 1}")
    for i in range(resolved_issues):
        issues.append(f"- [x] Resolved issue #{i + 1}")
    active_issues_text = "\n".join(issues) if issues else ""

    # Schedule shifts
    shift_entries = []
    now = datetime(2026, 2, 18, 0, 0, tzinfo=timezone.utc)
    for i in range(past_shifts):
        d = now - timedelta(days=i + 2)
        assigned = extra_schedule_member or "Sarah"
        shift_entries.append(f"""  - date: {d.strftime('%Y-%m-%d')}
    window: "07:00-12:00"
    assigned: {assigned}
    type: morning_routine
    status: confirmed""")
    for i in range(future_shifts):
        d = now + timedelta(days=i + 1)
        future_assigned = extra_schedule_member or "Sarah"
        shift_entries.append(f"""  - date: {d.strftime('%Y-%m-%d')}
    window: "14:00-18:00"
    assigned: {future_assigned}
    type: afternoon_care
    status: confirmed""")

    shifts_yaml = "\n".join(shift_entries) if shift_entries else "  []"

    # Appointments
    appt_entries = []
    for i in range(past_appointments):
        d = now - timedelta(days=i + 2)
        appt_entries.append(f"- **{d.strftime('%b')} {d.day}, 10:00 AM** — Past appointment #{i + 1}\n  - Transport: Marta driving\n  - Escort: Marta (confirmed)")
    for i in range(future_appointments):
        d = now + timedelta(days=i + 2)
        appt_entries.append(f"- **{d.strftime('%b')} {d.day}, 10:00 AM** — Future appointment #{i + 1}\n  - Transport: needed\n  - Escort: Marta (confirmed)")
    appointments_text = "\n".join(appt_entries) if appt_entries else ""

    return f"""# Moreno Care Network

Coordinator: Rob Moreno (Care Recipient)

## Members

### Rob Moreno
- Role: Care Recipient
- Phone: +1-555-0101
- Coordinator: yes
- Capabilities: []

### Marta Moreno
- Role: Family Caregiver
- Phone: +1-555-0102
- Capabilities: [mobility_assist, med_admin, driving, cooking]

### Sarah Nguyen
- Role: Professional Caregiver
- Phone: +1-555-0201
- Capabilities: [mobility_assist, med_admin, PT_exercises]

## Care Recipient

Name: Rob Moreno
Conditions: Type 2 diabetes, hypertension

## Schedule

```yaml
shifts:
{shifts_yaml}
```

## Medications

```yaml
active:
  - name: Lisinopril
    dose: "10mg"
    frequency: daily
```

## Appointments

{appointments_text}

## Active Issues

{active_issues_text}

## Recent Events

{recent_events_text}

## Patterns

- Sarah is consistently reliable for afternoon shifts
"""


def _make_test_dir(content: str) -> tuple[Path, str]:
    tmp = tempfile.mkdtemp()
    family_dir = Path(tmp) / "moreno-test"
    family_dir.mkdir()
    (family_dir / "family.md").write_text(content)
    return family_dir, tmp


# ─── Test: Recent Events Pruning ──────────────────────────────────────────

def test_90_entries_pruned_to_50():
    """THE KEY TEST: Does a 90-entry Recent Events section get pruned to 50?"""
    print("\n── KEY TEST: 90 Entries Pruned to 50 ──")
    entries = []
    for i in range(90):
        entries.append(f"- **2026-02-{18 - i // 5:02d} {12 - i % 12:02d}:00** — Event #{i + 1}")
    content = "\n".join(entries) + "\n"

    new_content, result = prune_recent_events(content, max_entries=50)

    assert_eq(result.entries_before, 90, "Started with 90")
    assert_eq(result.entries_after, 50, "Ended with 50")
    assert_eq(result.entries_removed, 40, "Removed 40")
    assert_in("Event #1", new_content, "Newest entry kept")
    assert_in("Event #50", new_content, "50th entry kept")
    assert_true("Event #51" not in new_content, "51st entry removed")
    assert_true("Event #90" not in new_content, "90th entry removed")


def test_under_limit_not_pruned():
    """Sections under the limit are left alone."""
    print("\n── Under Limit: No Pruning ──")
    entries = []
    for i in range(30):
        entries.append(f"- **2026-02-18** — Event #{i + 1}")
    content = "\n".join(entries) + "\n"

    new_content, result = prune_recent_events(content, max_entries=50)

    assert_eq(result.entries_removed, 0, "Nothing removed")
    assert_eq(result.entries_before, 30, "30 entries")
    assert_eq(result.entries_after, 30, "Still 30 entries")


def test_exactly_50_not_pruned():
    """Exactly 50 entries is not pruned."""
    print("\n── Exactly 50: No Pruning ──")
    entries = [f"- **2026-02-18** — Event #{i}" for i in range(50)]
    content = "\n".join(entries)

    _, result = prune_recent_events(content, max_entries=50)
    assert_eq(result.entries_removed, 0, "Nothing removed at exactly 50")


# ─── Test: Active Issues Pruning ──────────────────────────────────────────

def test_resolved_issues_removed():
    """Resolved issues ([x]) are removed."""
    print("\n── Resolved Issues Removed ──")
    content = """- [ ] Open issue 1
- [x] Resolved issue A
- [ ] Open issue 2
- [x] Resolved issue B
- [x] Resolved issue C"""

    new_content, result = prune_active_issues(content)

    assert_eq(result.entries_before, 5, "Started with 5")
    assert_eq(result.entries_after, 2, "2 open remain")
    assert_eq(result.entries_removed, 3, "3 resolved removed")
    assert_in("Open issue 1", new_content, "Open issue 1 kept")
    assert_in("Open issue 2", new_content, "Open issue 2 kept")
    assert_true("Resolved issue" not in new_content, "No resolved issues remain")


def test_all_open_issues_kept():
    """When no issues are resolved, nothing changes."""
    print("\n── All Open Issues Kept ──")
    content = "- [ ] Issue 1\n- [ ] Issue 2"

    _, result = prune_active_issues(content)
    assert_eq(result.entries_removed, 0, "Nothing removed")


# ─── Test: Schedule Pruning ───────────────────────────────────────────────

def test_past_shifts_removed():
    """Past shifts are removed from the schedule."""
    print("\n── Past Shifts Removed ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    content = """```yaml
shifts:
  - date: 2026-02-15
    window: "07:00-12:00"
    assigned: Sarah
    type: morning_routine
    status: confirmed
  - date: 2026-02-16
    window: "14:00-18:00"
    assigned: Marta
    type: afternoon_care
    status: confirmed
  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: Sarah
    type: morning_routine
    status: confirmed
```"""

    new_content, result = prune_schedule(content, now)

    assert_eq(result.entries_before, 3, "Started with 3 shifts")
    assert_eq(result.entries_removed, 2, "2 past shifts removed")
    assert_eq(result.entries_after, 1, "1 future shift remains")
    assert_in("2026-02-19", new_content, "Future shift kept")
    assert_true("2026-02-15" not in new_content, "Past shift Feb 15 removed")
    assert_true("2026-02-16" not in new_content, "Past shift Feb 16 removed")


def test_today_shifts_kept():
    """Today's shifts are NOT pruned."""
    print("\n── Today's Shifts Kept ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    content = """```yaml
shifts:
  - date: 2026-02-18
    window: "14:00-18:00"
    assigned: Sarah
    type: afternoon_care
    status: confirmed
```"""

    new_content, result = prune_schedule(content, now)
    assert_eq(result.entries_removed, 0, "Today's shift not removed")


# ─── Test: Appointment Pruning ────────────────────────────────────────────

def test_past_appointments_removed():
    """Past appointments are removed."""
    print("\n── Past Appointments Removed ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    content = """- **Feb 15, 10:00 AM** — Past appointment
  - Transport: Marta driving
  - Escort: Marta (confirmed)
- **Feb 20, 10:00 AM** — Future appointment
  - Transport: needed
  - Escort: TBD"""

    new_content, result = prune_appointments(content, now)

    assert_eq(result.entries_removed, 1, "1 past appointment removed")
    assert_eq(result.entries_after, 1, "1 future appointment remains")
    assert_true("Past appointment" not in new_content, "Past appointment gone")
    assert_in("Future appointment", new_content, "Future appointment kept")


# ─── Test: Consistency Validation ──────────────────────────────────────────

def test_orphan_member_detected():
    """Detects when Schedule references a member not in Members."""
    print("\n── Orphan Member Detection ──")
    content = _make_family_md(extra_schedule_member="GhostPerson", past_shifts=0, future_shifts=2)

    issues = validate_consistency(content)
    orphans = [i for i in issues if i.category == "orphan_member"]
    assert_true(len(orphans) > 0, "Orphan member detected")
    assert_in("GhostPerson", orphans[0].description, "Names the orphan")


def test_clean_file_no_issues():
    """A well-formed file has no consistency issues."""
    print("\n── Clean File No Issues ──")
    content = _make_family_md()

    issues = validate_consistency(content)
    # Filter out warnings about Sarah partial name match
    errors = [i for i in issues if i.severity == "error"]
    assert_eq(len(errors), 0, "No errors in clean file")


def test_missing_section_detected():
    """Detects missing required sections."""
    print("\n── Missing Section ──")
    content = "# Test\n\n## Members\n\n### Rob\n- Role: Care Recipient"

    issues = validate_consistency(content)
    missing = [i for i in issues if i.category == "missing_section"]
    assert_true(len(missing) > 0, "Missing sections detected")


# ─── Test: Full Maintenance Run ───────────────────────────────────────────

def test_full_maintenance_run():
    """Full maintenance: prunes, validates, writes back."""
    print("\n── Full Maintenance Run ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    content = _make_family_md(
        recent_events_count=90,
        resolved_issues=3,
        open_issues=2,
        past_shifts=5,
        future_shifts=2,
        past_appointments=2,
        future_appointments=1,
    )

    family_dir, tmp = _make_test_dir(content)

    try:
        result = run_maintenance(family_dir, now=now)

        assert_true(result.file_modified, "File was modified")
        assert_true(result.total_entries_removed > 0, "Entries were removed")
        assert_true(result.backup_path is not None, "Backup was created")

        # Verify the file was actually modified
        new_content = (family_dir / "family.md").read_text()
        # 90 recent events should be pruned to 50
        remaining_events = new_content.count("- **2026-02-")
        # Should be around 50 (recent events) + future appointments
        assert_true(remaining_events < 90, f"Events pruned (remaining: {remaining_events})")

        # Check prune results
        re_result = [pr for pr in result.prune_results if pr.section == "recent_events"]
        assert_true(len(re_result) > 0, "Has recent_events prune result")
        if re_result:
            assert_eq(re_result[0].entries_before, 90, "90 events before")
            assert_eq(re_result[0].entries_after, 50, "50 events after")
    finally:
        shutil.rmtree(tmp)


def test_dry_run_doesnt_modify():
    """Dry run reports what would happen without modifying the file."""
    print("\n── Dry Run ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    content = _make_family_md(recent_events_count=90, resolved_issues=3)
    family_dir, tmp = _make_test_dir(content)

    try:
        result = run_maintenance(family_dir, now=now, dry_run=True)

        assert_true(result.dry_run, "Marked as dry run")
        assert_true(result.total_entries_removed > 0, "Reports entries to remove")
        assert_eq(result.backup_path, None, "No backup created")

        # File should be unchanged
        current = (family_dir / "family.md").read_text()
        assert_eq(current, content, "File unchanged in dry run")
    finally:
        shutil.rmtree(tmp)


def test_maintenance_creates_backup():
    """Maintenance creates a backup before modifying."""
    print("\n── Backup Created ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)
    content = _make_family_md(recent_events_count=60, resolved_issues=2)
    family_dir, tmp = _make_test_dir(content)

    try:
        result = run_maintenance(family_dir, now=now)
        assert_true(result.backup_path is not None, "Backup path returned")
        assert_true(Path(result.backup_path).exists(), "Backup file exists")

        # Backup should match original
        backup_content = Path(result.backup_path).read_text()
        assert_eq(backup_content, content, "Backup matches original")
    finally:
        shutil.rmtree(tmp)


def test_nothing_to_prune():
    """Clean file with nothing to prune."""
    print("\n── Nothing to Prune ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)
    content = _make_family_md(
        recent_events_count=10, resolved_issues=0,
        past_shifts=0, future_shifts=2,
        past_appointments=0,
    )
    family_dir, tmp = _make_test_dir(content)

    try:
        result = run_maintenance(family_dir, now=now)
        assert_eq(result.total_entries_removed, 0, "Nothing removed")
        assert_true(not result.file_modified, "File not modified")
    finally:
        shutil.rmtree(tmp)


# ─── Test: SMS Format ────────────────────────────────────────────────────

def test_sms_format_with_pruning():
    """SMS format shows pruning summary."""
    print("\n── SMS Format: Pruning ──")
    from scripts.maintenance import PruneResult, MaintenanceResult
    result = MaintenanceResult(
        family_id="test", scan_time="2026-02-18T08:00Z",
        backup_path="/tmp/backup", total_entries_removed=45,
        file_modified=True,
        prune_results=[
            PruneResult("recent_events", 90, 50, 40),
            PruneResult("active_issues", 5, 2, 3),
            PruneResult("schedule", 8, 6, 2),
        ],
    )

    sms = format_maintenance_sms(result)
    assert_in("45 stale entries", sms, "Shows total removed")
    assert_in("recent_events: 90 → 50", sms, "Shows recent events detail")
    assert_in("active_issues: 5 → 2", sms, "Shows active issues detail")


def test_sms_format_nothing_to_prune():
    """SMS format shows all clean."""
    print("\n── SMS Format: Nothing to Prune ──")
    from scripts.maintenance import MaintenanceResult
    result = MaintenanceResult(
        family_id="test", scan_time="2026-02-18T08:00Z",
        backup_path=None, total_entries_removed=0,
    )

    sms = format_maintenance_sms(result)
    assert_in("nothing to prune", sms, "Shows nothing to prune")


# ─── Run All ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("MAINTENANCE CRON TESTS")
    print("=" * 60)

    test_90_entries_pruned_to_50()
    test_under_limit_not_pruned()
    test_exactly_50_not_pruned()
    test_resolved_issues_removed()
    test_all_open_issues_kept()
    test_past_shifts_removed()
    test_today_shifts_kept()
    test_past_appointments_removed()
    test_orphan_member_detected()
    test_clean_file_no_issues()
    test_missing_section_detected()
    test_full_maintenance_run()
    test_dry_run_doesnt_modify()
    test_maintenance_creates_backup()
    test_nothing_to_prune()
    test_sms_format_with_pruning()
    test_sms_format_nothing_to_prune()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
