"""
Tests: Role Filter — Mechanical Enforcement of Access Levels

THE QUESTION THESE TESTS ANSWER:
  Does a schedule-only member ever receive medication details?
  Does the pre-filter strip restricted sections?
  Does the post-check catch leakage in outbound messages?
"""

import sys
from pathlib import Path

# Add runtime to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from enforcement.role_filter import (
    parse_family_sections,
    filter_family_context,
    check_outbound_message,
    get_filtered_sections,
    can_approve,
    scan_for_medication_leakage,
    scan_for_condition_leakage,
)
from tests.fixtures import FAMILY_MD

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

def assert_false(condition: bool, test_name: str):
    assert_true(not condition, test_name)

def assert_in(needle: str, haystack: str, test_name: str):
    assert_true(needle.lower() in haystack.lower(), test_name)

def assert_not_in(needle: str, haystack: str, test_name: str):
    assert_true(needle.lower() not in haystack.lower(), test_name)


# ─── Test: Section Parsing ────────────────────────────────────────────────

def test_section_parsing():
    print("\n── Section Parsing ──")
    header, sections = parse_family_sections(FAMILY_MD)

    assert_in("Moreno Care Network", header, "Header contains family name")
    assert_true(len(sections) == 9, f"Parsed 9 sections (got {len(sections)})")

    keys = [s.key for s in sections]
    assert_in("members", str(keys), "Found 'members' section")
    assert_in("medications", str(keys), "Found 'medications' section")
    assert_in("schedule", str(keys), "Found 'schedule' section")
    assert_in("care_recipient", str(keys), "Found 'care_recipient' section")


# ─── Test: Pre-Filter by Access Level ────────────────────────────────────

def test_full_access_sees_everything():
    print("\n── Full Access (Marta) ──")
    filtered = filter_family_context(FAMILY_MD, "full")

    assert_in("Lisinopril", filtered, "Full access sees Lisinopril")
    assert_in("Metformin", filtered, "Full access sees Metformin")
    assert_in("Type 2 diabetes", filtered, "Full access sees conditions")
    assert_in("## Schedule", filtered, "Full access sees schedule")
    assert_in("## Medications", filtered, "Full access sees medications section")
    assert_in("## Patterns", filtered, "Full access sees patterns")
    assert_in("## Recent Events", filtered, "Full access sees recent events")


def test_schedule_meds_access():
    print("\n── Schedule+Meds Access (Sarah — Professional Caregiver) ──")
    filtered = filter_family_context(FAMILY_MD, "schedule+meds")

    assert_in("## Schedule", filtered, "Sees schedule")
    assert_in("## Medications", filtered, "Sees medications")
    assert_in("Lisinopril", filtered, "Sees Lisinopril (needs for med admin)")
    assert_in("## Members", filtered, "Sees members")
    assert_in("## Appointments", filtered, "Sees appointments")
    assert_in("## Active Issues", filtered, "Sees active issues")

    # Should NOT see
    assert_not_in("## Recent Events", filtered, "Does NOT see recent events")
    assert_not_in("## Patterns", filtered, "Does NOT see patterns")


def test_schedule_only_access():
    """THE KEY TEST: Does a schedule-only member ever receive medication details?"""
    print("\n── Schedule-Only Access (Linda — Community Supporter) ──")
    filtered = filter_family_context(FAMILY_MD, "schedule")

    # MUST see
    assert_in("## Schedule", filtered, "Sees schedule")
    assert_in("## Members", filtered, "Sees members (names)")
    assert_in("## Availability", filtered, "Sees availability")
    assert_in("## Active Issues", filtered, "Sees active issues")

    # MUST NOT SEE — this is the critical enforcement test
    assert_not_in("Lisinopril", filtered, "Does NOT see Lisinopril")
    assert_not_in("Metformin", filtered, "Does NOT see Metformin")
    assert_not_in("10mg", filtered, "Does NOT see medication dosages")
    assert_not_in("500mg", filtered, "Does NOT see medication dosages")
    assert_not_in("## Medications", filtered, "Does NOT see medications section header")
    assert_not_in("Type 2 diabetes", filtered, "Does NOT see medical conditions")
    assert_not_in("hypertension", filtered, "Does NOT see medical conditions")
    assert_not_in("## Care Recipient", filtered, "Does NOT see care recipient details")
    assert_not_in("## Recent Events", filtered, "Does NOT see recent events")
    assert_not_in("## Patterns", filtered, "Does NOT see patterns")
    assert_not_in("## Appointments", filtered, "Does NOT see appointments")


def test_provider_access():
    print("\n── Provider Access ──")
    filtered = filter_family_context(FAMILY_MD, "provider")

    assert_in("## Medications", filtered, "Sees medications")
    assert_in("## Care Recipient", filtered, "Sees care recipient details")
    assert_in("## Appointments", filtered, "Sees appointments")
    assert_in("## Members", filtered, "Sees members")

    assert_not_in("## Schedule", filtered, "Does NOT see shift schedule")
    assert_not_in("## Availability", filtered, "Does NOT see availability")
    assert_not_in("## Patterns", filtered, "Does NOT see patterns")


def test_unknown_access_level():
    print("\n── Unknown Access Level ──")
    filtered = filter_family_context(FAMILY_MD, "alien_visitor")

    assert_not_in("Lisinopril", filtered, "Unknown level sees zero medication data")
    assert_not_in("diabetes", filtered, "Unknown level sees zero condition data")
    assert_in("not recognized", filtered, "Shows access-not-recognized message")


# ─── Test: Post-Check Leakage Detection ──────────────────────────────────

def test_post_check_clean_message():
    print("\n── Post-Check: Clean Messages ──")
    result = check_outbound_message(
        "Hey Linda! You're on the schedule for Tuesday afternoon. Let me know if that works!",
        "schedule"
    )
    assert_true(result.is_clean, "Schedule-appropriate message passes")

    result2 = check_outbound_message(
        "Sarah, Rob's afternoon meds are Lisinopril 10mg at 2pm.",
        "schedule+meds"
    )
    assert_true(result2.is_clean, "Med info to schedule+meds member passes")


def test_post_check_catches_medication_leakage():
    print("\n── Post-Check: Medication Leakage to Schedule-Only ──")
    result = check_outbound_message(
        "Linda, just a heads up — Rob takes Lisinopril 10mg at 8am.",
        "schedule"
    )
    assert_false(result.is_clean, "Catches medication name leak to schedule-only")
    assert_in("medications", str(result.leaked_categories), "Identifies medication category")

    result2 = check_outbound_message(
        "Rob needs his 500mg dose before dinner.",
        "schedule"
    )
    assert_false(result2.is_clean, "Catches dosage leak (mg) to schedule-only")


def test_post_check_catches_condition_leakage():
    print("\n── Post-Check: Condition Leakage to Schedule-Only ──")
    result = check_outbound_message(
        "Linda, Rob has diabetes so he needs a low-sugar snack.",
        "schedule"
    )
    assert_false(result.is_clean, "Catches condition leak to schedule-only")
    assert_in("conditions", str(result.leaked_categories), "Identifies condition category")


def test_post_check_full_access_no_false_positives():
    print("\n── Post-Check: Full Access Never Blocked ──")
    result = check_outbound_message(
        "Marta, Rob's Lisinopril 10mg and Metformin 500mg are confirmed. His diabetes is well-controlled.",
        "full"
    )
    assert_true(result.is_clean, "Full access never flags anything")


# ─── Test: Medication & Condition Pattern Detection ───────────────────────

def test_medication_pattern_detection():
    print("\n── Medication Pattern Detection ──")
    found = scan_for_medication_leakage("Take lisinopril 10mg at 8am")
    assert_true(len(found) > 0, "Catches 'lisinopril' and '10mg'")

    found2 = scan_for_medication_leakage("metformin 500 mg twice daily")
    assert_true(len(found2) > 0, "Catches 'metformin' and '500 mg'")

    found3 = scan_for_medication_leakage("See you at 3pm for errands!")
    assert_true(len(found3) == 0, "No false positives on normal text")


def test_condition_pattern_detection():
    print("\n── Condition Pattern Detection ──")
    found = scan_for_condition_leakage("managing his diabetes")
    assert_true(len(found) > 0, "Catches 'diabetes'")

    found2 = scan_for_condition_leakage("blood pressure is stable")
    assert_true(len(found2) > 0, "Catches 'blood pressure'")

    found3 = scan_for_condition_leakage("I'll bring groceries tomorrow")
    assert_true(len(found3) == 0, "No false positives on normal text")


# ─── Test: Access Matrix Properties ──────────────────────────────────────

def test_access_matrix_properties():
    print("\n── Access Matrix Properties ──")
    assert_true(can_approve("full"), "Full access can approve changes")
    assert_false(can_approve("schedule+meds"), "Schedule+meds cannot approve")
    assert_false(can_approve("schedule"), "Schedule cannot approve")
    assert_false(can_approve("provider"), "Provider cannot approve")

    full_sections = get_filtered_sections("full")
    assert_in("*", str(full_sections), "Full access gets wildcard")

    schedule_sections = get_filtered_sections("schedule")
    assert_in("schedule", str(schedule_sections), "Schedule access includes schedule")
    assert_true("medications" not in schedule_sections, "Schedule access excludes medications")


# ─── Run All ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("ROLE FILTER ENFORCEMENT TESTS")
    print("=" * 60)

    test_section_parsing()
    test_full_access_sees_everything()
    test_schedule_meds_access()
    test_schedule_only_access()
    test_provider_access()
    test_unknown_access_level()
    test_post_check_clean_message()
    test_post_check_catches_medication_leakage()
    test_post_check_catches_condition_leakage()
    test_post_check_full_access_no_false_positives()
    test_medication_pattern_detection()
    test_condition_pattern_detection()
    test_access_matrix_properties()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
