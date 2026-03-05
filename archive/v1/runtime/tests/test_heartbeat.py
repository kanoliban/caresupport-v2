"""
Tests: Heartbeat Cron — 48-Hour Lookahead Scanner

THE QUESTIONS THESE TESTS ANSWER:
  Does the heartbeat catch an uncovered shift 36 hours out?
  Does it detect med coverage gaps?
  Does it catch appointment logistics issues?
  Does it sort alerts by severity?
  Does it report all-clear when nothing is wrong?
"""

import json
import shutil
import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.heartbeat import (
    scan_family,
    format_alerts_sms,
    _parse_shifts,
    _parse_members_capabilities,
    _parse_appointments,
    _parse_appointment_date,
    _extract_yaml_block,
    Alert,
    HeartbeatResult,
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


# ─── Test Family.md Generation ────────────────────────────────────────────

def _make_family_md(shifts: str, appointments: str = "", members: str = "") -> str:
    """Generate a test family.md with specific schedule/appointments."""
    default_members = """### Rob Moreno
- Role: Care Recipient
- Phone: +1-555-0101
- Coordinator: yes
- Capabilities: []

### Marta Moreno
- Role: Family Caregiver
- Phone: +1-555-0102
- Coordinator: backup
- Capabilities: [mobility_assist, med_admin, driving, cooking]

### Sarah Nguyen
- Role: Professional Caregiver
- Phone: +1-555-0201
- Coordinator: no
- Capabilities: [mobility_assist, med_admin, PT_exercises]

### Linda Okafor
- Role: Community Supporter
- Phone: +1-555-0301
- Coordinator: no
- Capabilities: [driving, cooking, errands]"""

    return f"""# Moreno Care Network

Coordinator: Rob Moreno (Care Recipient)

## Members

{members or default_members}

## Care Recipient

Name: Rob Moreno
Conditions: Type 2 diabetes, hypertension

## Schedule

```yaml
shifts:
{shifts}
```

## Medications

```yaml
active:
  - name: Lisinopril
    dose: "10mg"
```

## Appointments

{appointments}

## Active Issues

## Recent Events

## Patterns
"""


def _make_test_dir(family_md_content: str) -> tuple[Path, str]:
    """Create a temporary family directory with given content."""
    tmp = tempfile.mkdtemp()
    family_dir = Path(tmp) / "test-family"
    family_dir.mkdir()
    (family_dir / "family.md").write_text(family_md_content)
    return family_dir, tmp


# ─── Test: YAML Parsing ──────────────────────────────────────────────────

def test_parse_shifts():
    """Correctly parses YAML shift entries."""
    print("\n── YAML Parsing: Shifts ──")
    yaml_text = """  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: null
    type: morning_routine
    status: uncovered
    tasks: [breakfast, morning_meds]
  - date: 2026-02-19
    window: "14:00-18:00"
    assigned: Sarah
    type: afternoon_care
    status: confirmed"""

    shifts = _parse_shifts(yaml_text)
    assert_eq(len(shifts), 2, "Parsed two shifts")
    assert_eq(shifts[0]["date"], "2026-02-19", "First shift date")
    assert_eq(shifts[0]["assigned"], "null", "First shift unassigned")
    assert_eq(shifts[0]["status"], "uncovered", "First shift uncovered")
    assert_eq(shifts[1]["assigned"], "Sarah", "Second shift assigned")


def test_parse_members_capabilities():
    """Correctly parses member capabilities."""
    print("\n── YAML Parsing: Capabilities ──")
    content = """### Sarah Nguyen
- Role: Professional Caregiver
- Capabilities: [mobility_assist, med_admin, PT_exercises]

### Linda Okafor
- Role: Community Supporter
- Capabilities: [driving, cooking, errands]"""

    caps = _parse_members_capabilities(content)
    assert_true("med_admin" in caps.get("Sarah Nguyen", []), "Sarah has med_admin")
    assert_true("med_admin" not in caps.get("Linda Okafor", []), "Linda lacks med_admin")


def test_parse_appointments():
    """Correctly parses appointment entries."""
    print("\n── Parsing: Appointments ──")
    content = """- **Feb 20, 10:00 AM** — Dr. Chen (cardiology), Mercy Medical
  - Transport: needed (wheelchair van)
  - Escort: Marta (confirmed)
- **Feb 22, 2:00 PM** — PT session, CareClinic
  - Transport: needed
  - Escort: TBD"""

    appts = _parse_appointments(content)
    assert_eq(len(appts), 2, "Parsed two appointments")
    assert_in("needed", appts[0]["transport"], "First appt transport needed")
    assert_in("Marta", appts[0]["escort"], "First appt escort confirmed")
    assert_eq(appts[1]["escort"], "TBD", "Second appt escort TBD")


def test_parse_appointment_date():
    """Correctly parses appointment date strings."""
    print("\n── Parsing: Appointment Dates ──")
    dt = _parse_appointment_date("Feb 20, 10:00 AM")
    assert_true(dt is not None, "Parsed 'Feb 20, 10:00 AM'")
    assert_eq(dt.month, 2, "Month is February")
    assert_eq(dt.day, 20, "Day is 20")
    assert_eq(dt.hour, 10, "Hour is 10")


# ─── Test: THE KEY TEST — Uncovered Shift 36 Hours Out ────────────────────

def test_catches_uncovered_shift_36_hours_out():
    """THE KEY TEST: Does the heartbeat catch an uncovered shift 36 hours out?"""
    print("\n── KEY TEST: Uncovered Shift 36h Out ──")
    # Set 'now' to Feb 18 at 08:00
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    # Create a shift on Feb 19 at 07:00-12:00 (23 hours away) — uncovered
    # And a shift on Feb 19 at 20:00-22:00 (36 hours away) — also uncovered
    shifts = """  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: null
    type: morning_routine
    status: uncovered
    tasks: [breakfast, morning_meds]
  - date: 2026-02-19
    window: "20:00-22:00"
    assigned: null
    type: evening_care
    status: uncovered
    tasks: [dinner, evening_meds]"""

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)

        assert_true(not result.all_clear, "Not all clear")
        assert_eq(len(result.alerts), 2, "Found two uncovered shifts")

        # The 23-hour one should be HIGH severity (< 24h)
        first = result.alerts[0]
        assert_eq(first.category, "uncovered_shift", "Category is uncovered_shift")
        assert_eq(first.severity, "high", "23h shift is HIGH severity")
        assert_eq(first.date, "2026-02-19", "Correct date")
        assert_in("07:00-12:00", first.window, "Correct window")
        assert_true(first.hours_until < 24, "Less than 24 hours away")

        # The 36-hour one should be MEDIUM severity (>= 24h)
        second = result.alerts[1]
        assert_eq(second.severity, "medium", "36h shift is MEDIUM severity")
        assert_true(35 < second.hours_until < 37, "About 36 hours away")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Tentative Shift ────────────────────────────────────────────────

def test_catches_tentative_shift():
    """Detects tentative/unconfirmed shifts."""
    print("\n── Tentative Shift ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    shifts = """  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: James
    type: morning_routine
    status: tentative
    notes: "Depends on James feeling better" """

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)

        assert_true(not result.all_clear, "Not all clear")
        assert_eq(len(result.alerts), 1, "Found one alert")
        assert_eq(result.alerts[0].category, "unconfirmed_shift", "Category is unconfirmed_shift")
        assert_in("James", result.alerts[0].summary, "Summary mentions James")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Med Coverage Gap ──────────────────────────────────────────────

def test_catches_med_coverage_gap():
    """Detects when a member without med_admin is assigned med tasks."""
    print("\n── Med Coverage Gap ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    # Linda has [driving, cooking, errands] but NOT med_admin
    shifts = """  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: Linda Okafor
    type: morning_routine
    status: confirmed
    tasks: [breakfast, morning_meds, light_housekeeping]"""

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)

        assert_true(not result.all_clear, "Not all clear")
        med_alerts = [a for a in result.alerts if a.category == "med_coverage_gap"]
        assert_eq(len(med_alerts), 1, "Found med coverage gap")
        assert_in("Linda", med_alerts[0].summary, "Alert mentions Linda")
        assert_in("med_admin", med_alerts[0].summary, "Alert mentions med_admin")
    finally:
        shutil.rmtree(tmp)


def test_no_med_gap_when_capable():
    """No alert when a med_admin capable member handles meds."""
    print("\n── No Med Gap When Capable ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    # Sarah has med_admin capability
    shifts = """  - date: 2026-02-19
    window: "14:00-18:00"
    assigned: Sarah Nguyen
    type: afternoon_care
    status: confirmed
    tasks: [PT_exercises, evening_meds]"""

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)
        med_alerts = [a for a in result.alerts if a.category == "med_coverage_gap"]
        assert_eq(len(med_alerts), 0, "No med gap for Sarah (has med_admin)")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Appointment Logistics ──────────────────────────────────────────

def test_catches_appointment_transport_needed():
    """Detects appointment with unresolved transport."""
    print("\n── Appointment Transport Needed ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    # Feb 19 at 10:00 = 26h from now (within 48h window)
    appointments = """- **Feb 19, 10:00 AM** — Dr. Chen (cardiology), Mercy Medical
  - Transport: needed (wheelchair van)
  - Escort: Marta (confirmed)"""

    family_md = _make_family_md("", appointments=appointments)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)
        transport_alerts = [a for a in result.alerts if a.category == "appointment_logistics"]
        assert_true(len(transport_alerts) >= 1, "Found transport alert")
        transport_summary = " ".join(a.summary for a in transport_alerts)
        assert_in("transport", transport_summary.lower(), "Alert mentions transport")
    finally:
        shutil.rmtree(tmp)


def test_catches_missing_escort():
    """Detects appointment with unconfirmed escort."""
    print("\n── Missing Escort ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    appointments = """- **Feb 19, 2:00 PM** — PT session
  - Transport: Marta driving
  - Escort: TBD"""

    family_md = _make_family_md("", appointments=appointments)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)
        escort_alerts = [a for a in result.alerts
                        if a.category == "appointment_logistics" and "escort" in a.summary.lower()]
        assert_eq(len(escort_alerts), 1, "Found escort alert")
    finally:
        shutil.rmtree(tmp)


# ─── Test: All Clear ──────────────────────────────────────────────────────

def test_all_clear_when_no_issues():
    """Reports all clear when everything is covered and confirmed."""
    print("\n── All Clear ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    shifts = """  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: Sarah Nguyen
    type: morning_routine
    status: confirmed
    tasks: [breakfast, light_housekeeping]"""

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)
        assert_true(result.all_clear, "All clear")
        assert_eq(len(result.alerts), 0, "No alerts")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Ignores Past Shifts ────────────────────────────────────────────

def test_ignores_past_shifts():
    """Shifts before 'now' are not alerted."""
    print("\n── Ignores Past Shifts ──")
    now = datetime(2026, 2, 20, 8, 0, tzinfo=timezone.utc)

    # This shift is in the past relative to 'now'
    shifts = """  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: null
    type: morning_routine
    status: uncovered"""

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)
        assert_true(result.all_clear, "Past shift ignored")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Ignores Shifts Beyond Window ───────────────────────────────────

def test_ignores_shifts_beyond_window():
    """Shifts more than 48h out are not alerted."""
    print("\n── Ignores Beyond Window ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    # This shift is 72+ hours out
    shifts = """  - date: 2026-02-21
    window: "14:00-18:00"
    assigned: null
    type: afternoon_care
    status: uncovered"""

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)
        assert_true(result.all_clear, "72h-out shift ignored")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Severity Ordering ─────────────────────────────────────────────

def test_alerts_sorted_by_severity():
    """High severity alerts come before medium."""
    print("\n── Severity Ordering ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    shifts = """  - date: 2026-02-19
    window: "20:00-22:00"
    assigned: James
    type: evening_care
    status: tentative
  - date: 2026-02-18
    window: "14:00-18:00"
    assigned: null
    type: afternoon_care
    status: uncovered
    tasks: [PT_exercises]"""

    family_md = _make_family_md(shifts)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)
        assert_true(len(result.alerts) >= 2, "At least two alerts")
        assert_eq(result.alerts[0].severity, "high", "First alert is high")
        # Tentative is medium
        tent = [a for a in result.alerts if a.category == "unconfirmed_shift"]
        assert_true(len(tent) > 0, "Has tentative alert")
        assert_eq(tent[0].severity, "medium", "Tentative is medium")
    finally:
        shutil.rmtree(tmp)


# ─── Test: SMS Format ────────────────────────────────────────────────────

def test_sms_format_alerts():
    """SMS format includes alert count and severity icons."""
    print("\n── SMS Format: Alerts ──")
    result = HeartbeatResult(
        family_id="test", scan_time="2026-02-18T08:00Z",
        lookahead_hours=48, all_clear=False,
        alerts=[
            Alert("high", "uncovered_shift", "Uncovered morning on Feb 19",
                  "2026-02-19", "07:00-12:00", {}, 23.0),
            Alert("medium", "unconfirmed_shift", "James tentative Feb 19",
                  "2026-02-19", "20:00-22:00", {}, 36.0),
        ],
    )

    sms = format_alerts_sms(result)
    assert_in("2 alert(s)", sms, "Shows alert count")
    assert_in("🔴", sms, "High severity icon")
    assert_in("🟡", sms, "Medium severity icon")
    assert_in("23h away", sms, "Shows hours for <24h alert")


def test_sms_format_all_clear():
    """SMS format shows all clear."""
    print("\n── SMS Format: All Clear ──")
    result = HeartbeatResult(
        family_id="test", scan_time="2026-02-18T08:00Z",
        lookahead_hours=48, all_clear=True, alerts=[],
    )

    sms = format_alerts_sms(result)
    assert_in("All clear", sms, "Shows all clear")
    assert_in("48h", sms, "Shows lookahead window")


# ─── Test: Missing family.md ──────────────────────────────────────────────

def test_missing_family_md():
    """Gracefully handles missing family.md."""
    print("\n── Missing family.md ──")
    tmp = tempfile.mkdtemp()
    family_dir = Path(tmp) / "empty-family"
    family_dir.mkdir()

    try:
        result = scan_family(family_dir, lookahead_hours=48)
        assert_true(not result.all_clear, "Not all clear")
        assert_eq(result.alerts[0].category, "system_error", "System error alert")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Mixed Scenario ────────────────────────────────────────────────

def test_mixed_scenario():
    """Full scenario: uncovered shift + tentative + appointment logistics."""
    print("\n── Mixed Scenario ──")
    now = datetime(2026, 2, 18, 8, 0, tzinfo=timezone.utc)

    shifts = """  - date: 2026-02-19
    window: "07:00-12:00"
    assigned: null
    type: morning_routine
    status: uncovered
    tasks: [breakfast, morning_meds]
  - date: 2026-02-19
    window: "14:00-18:00"
    assigned: Sarah Nguyen
    type: afternoon_care
    status: confirmed
    tasks: [PT_exercises]
  - date: 2026-02-19
    window: "20:00-22:00"
    assigned: James
    type: evening_care
    status: tentative"""

    # Feb 19 at 10:00 = 26h from now (within 48h window)
    appointments = """- **Feb 19, 10:00 AM** — Dr. Chen, Mercy Medical
  - Transport: needed (wheelchair van)
  - Escort: Marta (confirmed)"""

    family_md = _make_family_md(shifts, appointments=appointments)
    family_dir, tmp = _make_test_dir(family_md)

    try:
        result = scan_family(family_dir, lookahead_hours=48, now=now)

        categories = [a.category for a in result.alerts]
        assert_true("uncovered_shift" in categories, "Found uncovered shift")
        assert_true("unconfirmed_shift" in categories, "Found tentative shift")
        assert_true("appointment_logistics" in categories, "Found appointment logistics")

        # Confirmed shift with Sarah should NOT generate an alert
        sarah_alerts = [a for a in result.alerts if "Sarah" in a.summary]
        assert_eq(len(sarah_alerts), 0, "Sarah's confirmed shift is clean")
    finally:
        shutil.rmtree(tmp)


# ─── Run All ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("HEARTBEAT CRON TESTS")
    print("=" * 60)

    test_parse_shifts()
    test_parse_members_capabilities()
    test_parse_appointments()
    test_parse_appointment_date()
    test_catches_uncovered_shift_36_hours_out()
    test_catches_tentative_shift()
    test_catches_med_coverage_gap()
    test_no_med_gap_when_capable()
    test_catches_appointment_transport_needed()
    test_catches_missing_escort()
    test_all_clear_when_no_issues()
    test_ignores_past_shifts()
    test_ignores_shifts_beyond_window()
    test_alerts_sorted_by_severity()
    test_sms_format_alerts()
    test_sms_format_all_clear()
    test_missing_family_md()
    test_mixed_scenario()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
