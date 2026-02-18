"""
Tests: PHI Audit Logger — HIPAA Access Logging

THE QUESTION THESE TESTS ANSWER:
  Does every handler invocation produce a phi_access.log entry?
  Are the required HIPAA fields present in every log entry?
  Does the unknown-number path log correctly?
"""

import json
import shutil
import sys
import tempfile
from pathlib import Path

# Add runtime to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from enforcement.phi_audit import PHIAuditLogger

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


# ─── Test: Context Load Logging ───────────────────────────────────────────

def test_context_load_creates_log_entry():
    """Every context load must produce a log entry."""
    print("\n── Context Load Logging ──")
    tmp = tempfile.mkdtemp()
    try:
        logger = PHIAuditLogger(log_dir=tmp)

        logger.log_context_load(
            family_id="moreno-test",
            accessor_phone="+1-555-0201",
            accessor_role="Professional Caregiver",
            access_level="schedule+meds",
            sections_loaded=["members", "schedule", "medications"],
            trigger_message="What meds does Rob take tonight?",
        )

        events = logger.read_today_events()
        assert_true(len(events) == 1, "Exactly one event logged")

        event = events[0]
        assert_eq(event["event"], "context_load", "Event type is context_load")
        assert_true("timestamp" in event, "Has timestamp")
        assert_eq(event["family_id"], "moreno-test", "Has correct family_id")
        assert_eq(event["accessor"]["phone"], "+1-555-0201", "Has accessor phone")
        assert_eq(event["accessor"]["role"], "Professional Caregiver", "Has accessor role")
        assert_eq(event["accessor"]["access_level"], "schedule+meds", "Has access level")
        assert_true("sections_loaded" in event, "Has sections_loaded")
        assert_true("trigger" in event, "Has trigger message")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Response Sent Logging ──────────────────────────────────────────

def test_response_sent_creates_log_entry():
    """Every response must produce a log entry."""
    print("\n── Response Sent Logging ──")
    tmp = tempfile.mkdtemp()
    try:
        logger = PHIAuditLogger(log_dir=tmp)

        logger.log_response_sent(
            family_id="moreno-test",
            recipient_phone="+1-555-0201",
            recipient_role="Professional Caregiver",
            access_level="schedule+meds",
            response_length=150,
            leakage_clean=True,
        )

        events = logger.read_today_events()
        assert_true(len(events) == 1, "Exactly one event logged")

        event = events[0]
        assert_eq(event["event"], "response_sent", "Event type is response_sent")
        assert_true("timestamp" in event, "Has timestamp")
        assert_eq(event["family_id"], "moreno-test", "Has family_id")
        assert_eq(event["recipient"]["phone"], "+1-555-0201", "Has recipient phone")
        assert_eq(event["leakage_check_passed"], True, "Has leakage check result")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Response Blocked Logging ───────────────────────────────────────

def test_response_blocked_creates_log_entry():
    """Blocked responses must be logged with severity HIGH."""
    print("\n── Response Blocked Logging ──")
    tmp = tempfile.mkdtemp()
    try:
        logger = PHIAuditLogger(log_dir=tmp)

        logger.log_response_blocked(
            family_id="moreno-test",
            recipient_phone="+1-555-0301",
            access_level="schedule",
            leaked_categories=["medications"],
            leaked_terms=["lisinopril", "10mg"],
        )

        events = logger.read_today_events()
        assert_true(len(events) == 1, "Exactly one event logged")

        event = events[0]
        assert_eq(event["event"], "response_blocked", "Event type is response_blocked")
        assert_eq(event["severity"], "HIGH", "Severity is HIGH")
        assert_true("leaked_categories" in event, "Has leaked categories")
        assert_true("leaked_terms" in event, "Has leaked terms")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Unknown Number Logging ─────────────────────────────────────────

def test_unknown_number_creates_log_entry():
    """Unknown number attempts must be logged with phi_disclosed=False."""
    print("\n── Unknown Number Logging ──")
    tmp = tempfile.mkdtemp()
    try:
        logger = PHIAuditLogger(log_dir=tmp)

        logger.log_unknown_number("+1-999-9999")

        events = logger.read_today_events()
        assert_true(len(events) == 1, "Exactly one event logged")

        event = events[0]
        assert_eq(event["event"], "unknown_number", "Event type is unknown_number")
        assert_eq(event["phi_disclosed"], False, "PHI disclosed is False")
        assert_eq(event["phone"], "+1-999-9999", "Has the unknown phone")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Multiple Events in One Session ─────────────────────────────────

def test_full_interaction_produces_two_events():
    """A normal interaction should produce context_load + response_sent."""
    print("\n── Full Interaction Audit Trail ──")
    tmp = tempfile.mkdtemp()
    try:
        logger = PHIAuditLogger(log_dir=tmp)

        # Simulating what the handler does:
        logger.log_context_load(
            family_id="moreno-test",
            accessor_phone="+1-555-0102",
            accessor_role="Family Caregiver",
            access_level="full",
            sections_loaded=["*"],
            trigger_message="How is dad doing today?",
        )
        logger.log_response_sent(
            family_id="moreno-test",
            recipient_phone="+1-555-0102",
            recipient_role="Family Caregiver",
            access_level="full",
            response_length=200,
            leakage_clean=True,
        )

        events = logger.read_today_events()
        assert_true(len(events) == 2, "Two events for one interaction")
        assert_eq(events[0]["event"], "context_load", "First event is context_load")
        assert_eq(events[1]["event"], "response_sent", "Second event is response_sent")

        # Verify all HIPAA required fields on both events
        for event in events:
            assert_true("timestamp" in event, f"Event {event['event']} has timestamp")
            assert_true("family_id" in event, f"Event {event['event']} has family_id")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Log File Path ─────────────────────────────────────────────────

def test_log_file_created_in_correct_location():
    """Log files must be at {log_dir}/{YYYY-MM-DD}/phi_access.log."""
    print("\n── Log File Location ──")
    tmp = tempfile.mkdtemp()
    try:
        logger = PHIAuditLogger(log_dir=tmp)
        logger.log_unknown_number("+1-000-0000")

        log_path = logger.get_today_log_path()
        assert_true(log_path.exists(), "Log file exists at expected path")
        assert_true(str(log_path).endswith("phi_access.log"), "Filename is phi_access.log")
        assert_true("/20" in str(log_path), "Path contains date directory")
    finally:
        shutil.rmtree(tmp)


# ─── Test: JSON-line Format ──────────────────────────────────────────────

def test_log_entries_are_valid_jsonl():
    """Each line in the log must be valid JSON (JSONL format)."""
    print("\n── JSONL Format ──")
    tmp = tempfile.mkdtemp()
    try:
        logger = PHIAuditLogger(log_dir=tmp)

        # Log multiple events
        logger.log_unknown_number("+1-000-0001")
        logger.log_unknown_number("+1-000-0002")
        logger.log_context_load("test", "+1-000-0003", "role", "full", ["*"], "test message")

        log_path = logger.get_today_log_path()
        with open(log_path) as f:
            lines = [l.strip() for l in f if l.strip()]

        assert_true(len(lines) == 3, "Three lines for three events")

        all_valid = True
        for i, line in enumerate(lines):
            try:
                json.loads(line)
            except json.JSONDecodeError:
                all_valid = False
                print(f"    ❌ Line {i+1} is not valid JSON: {line[:80]}...")

        assert_true(all_valid, "All log lines are valid JSON")
    finally:
        shutil.rmtree(tmp)


# ─── Run All ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("PHI AUDIT LOGGER TESTS")
    print("=" * 60)

    test_context_load_creates_log_entry()
    test_response_sent_creates_log_entry()
    test_response_blocked_creates_log_entry()
    test_unknown_number_creates_log_entry()
    test_full_interaction_produces_two_events()
    test_log_file_created_in_correct_location()
    test_log_entries_are_valid_jsonl()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
