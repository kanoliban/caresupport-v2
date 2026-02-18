"""
Tests: Family File Editor — Edit-Not-Write Semantics

THE QUESTIONS THESE TESTS ANSWER:
  Does the handler actually persist state changes?
  Does backup exist before each edit?
  Does edit-not-write work (only target section changes)?
  Does rollback work?
  Does validation prevent corrupt writes?
"""

import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from enforcement.family_editor import (
    apply_updates,
    backup_family_file,
    validate_family_file,
    parse_update_instructions,
    rollback,
    FileUpdate,
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

def assert_eq(actual, expected, test_name: str):
    assert_true(actual == expected, f"{test_name} (got {actual!r}, expected {expected!r})")

def assert_in(needle: str, haystack: str, test_name: str):
    assert_true(needle in haystack, f"{test_name} (looking for {needle!r})")

def assert_not_in(needle: str, haystack: str, test_name: str):
    assert_true(needle not in haystack, f"{test_name} (should NOT contain {needle!r})")


def _make_family_file(tmp: str) -> Path:
    """Write FAMILY_MD to a temp directory and return the path."""
    family_dir = Path(tmp) / "moreno-test"
    family_dir.mkdir(parents=True)
    family_path = family_dir / "family.md"
    family_path.write_text(FAMILY_MD)
    return family_path


# ─── Test: Backup Before Edit ─────────────────────────────────────────────

def test_backup_created_before_edit():
    """Every edit must create a backup first."""
    print("\n── Backup Before Edit ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)
        original = family_path.read_text()

        result = apply_updates(family_path, [
            FileUpdate(section="recent_events", operation="prepend",
                       content="- **2026-02-18 11:00** — Test event")
        ])

        assert_true(result.backup_path != "", "Backup path is set")
        backup = Path(result.backup_path)
        assert_true(backup.exists(), "Backup file exists")
        assert_eq(backup.read_text(), original, "Backup contains original content")
        assert_true("backups/" in str(backup), "Backup is in backups/ directory")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Append to Section ──────────────────────────────────────────────

def test_append_to_recent_events():
    """Append adds content to end of section."""
    print("\n── Append to Recent Events ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)
        event_text = "- **2026-02-18 11:00** — Linda confirmed for Tuesday groceries"

        result = apply_updates(family_path, [
            FileUpdate(section="recent_events", operation="append", content=event_text)
        ])

        assert_true(result.success, "Edit succeeded")
        assert_eq(result.updates_applied, 1, "One update applied")

        new_content = family_path.read_text()
        assert_in(event_text, new_content, "New event is in the file")
        assert_in("## Recent Events", new_content, "Section header preserved")
        # Original events still there
        assert_in("Morning meds confirmed", new_content, "Original events preserved")
    finally:
        shutil.rmtree(tmp)


def test_append_to_schedule():
    """Append a new shift to the schedule section."""
    print("\n── Append to Schedule ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)
        new_shift = """  - date: 2026-02-20
    window: "07:00-12:00"
    assigned: Linda
    type: errands
    status: confirmed"""

        result = apply_updates(family_path, [
            FileUpdate(section="schedule", operation="append", content=new_shift)
        ])

        assert_true(result.success, "Edit succeeded")
        new_content = family_path.read_text()
        assert_in("2026-02-20", new_content, "New shift date in file")
        assert_in("assigned: Linda", new_content, "New shift assignment in file")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Prepend to Section ─────────────────────────────────────────────

def test_prepend_to_active_issues():
    """Prepend adds content right after the section header."""
    print("\n── Prepend to Active Issues ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)
        new_issue = "- [ ] Rob mentioned knee pain — monitor and report to Dr. Chen"

        result = apply_updates(family_path, [
            FileUpdate(section="active_issues", operation="prepend", content=new_issue)
        ])

        assert_true(result.success, "Edit succeeded")
        new_content = family_path.read_text()
        assert_in(new_issue, new_content, "New issue in file")

        # The new issue should appear before the existing ones
        new_pos = new_content.find("knee pain")
        old_pos = new_content.find("morning shift uncovered")
        assert_true(new_pos < old_pos, "New issue appears before existing issues")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Replace in Section ─────────────────────────────────────────────

def test_replace_in_section():
    """Replace swaps specific text within a section."""
    print("\n── Replace in Section ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)

        result = apply_updates(family_path, [
            FileUpdate(
                section="schedule",
                operation="replace",
                old_content='    assigned: null\n    type: morning_routine\n    status: uncovered',
                content='    assigned: Linda\n    type: morning_routine\n    status: confirmed',
            )
        ])

        assert_true(result.success, "Edit succeeded")
        new_content = family_path.read_text()
        assert_not_in("assigned: null", new_content, "Old null assignment gone")
        # Check we have the Linda assignment in the right context
        assert_in("assigned: Linda", new_content, "Linda assigned")
    finally:
        shutil.rmtree(tmp)


def test_replace_fails_when_old_content_not_found():
    """Replace should fail gracefully when old_content doesn't match."""
    print("\n── Replace Failure (no match) ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)

        result = apply_updates(family_path, [
            FileUpdate(
                section="schedule",
                operation="replace",
                old_content="this text does not exist anywhere",
                content="new text",
            )
        ])

        assert_true(result.success, "Overall edit succeeds (skip bad update)")
        assert_eq(result.updates_applied, 0, "Zero updates applied")
        assert_eq(result.updates_skipped, 1, "One update skipped")
        assert_true(len(result.errors) > 0, "Error message recorded")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Resolve Issue ──────────────────────────────────────────────────

def test_resolve_issue():
    """Resolve changes [ ] to [x] on a matching issue."""
    print("\n── Resolve Issue ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)

        result = apply_updates(family_path, [
            FileUpdate(
                section="active_issues",
                operation="resolve_issue",
                content="morning shift uncovered",
            )
        ])

        assert_true(result.success, "Edit succeeded")
        new_content = family_path.read_text()
        assert_in("[x] Feb 19 morning shift uncovered", new_content,
                  "Issue marked as resolved")
        # Other issues still open
        assert_in("[ ] Dr. Chen", new_content, "Other issues still open")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Edit-Not-Write (Surgical) ──────────────────────────────────────

def test_only_target_section_changes():
    """Edit-not-write: only the target section should change."""
    print("\n── Edit-Not-Write: Surgical ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)
        original = family_path.read_text()

        # Extract the Medications section from original
        from enforcement.role_filter import parse_family_sections
        _, orig_sections = parse_family_sections(original)
        orig_meds = next(s for s in orig_sections if s.key == "medications")
        orig_members = next(s for s in orig_sections if s.key == "members")

        # Apply an update to recent_events only
        result = apply_updates(family_path, [
            FileUpdate(section="recent_events", operation="prepend",
                       content="- **2026-02-18 11:30** — Test surgical edit")
        ])

        assert_true(result.success, "Edit succeeded")
        new_content = family_path.read_text()

        # Verify untouched sections are byte-identical
        _, new_sections = parse_family_sections(new_content)
        new_meds = next(s for s in new_sections if s.key == "medications")
        new_members = next(s for s in new_sections if s.key == "members")

        assert_eq(orig_meds.content, new_meds.content,
                  "Medications section unchanged")
        assert_eq(orig_members.content, new_members.content,
                  "Members section unchanged")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Last Updated Timestamp ─────────────────────────────────────────

def test_last_updated_changes():
    """Every edit should update the Last Updated timestamp."""
    print("\n── Last Updated Timestamp ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)

        result = apply_updates(family_path, [
            FileUpdate(section="recent_events", operation="prepend",
                       content="- **2026-02-18 11:45** — Timestamp test")
        ])

        assert_true(result.success, "Edit succeeded")
        new_content = family_path.read_text()
        # The original had "Last Updated: 2026-02-18 09:15"
        assert_not_in("Last Updated: 2026-02-18 09:15", new_content,
                       "Old timestamp replaced")
        assert_in("Last Updated: 2026-02-18", new_content,
                  "New timestamp present")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Multiple Updates in One Call ────────────────────────────────────

def test_multiple_updates():
    """Multiple updates can be applied in a single call."""
    print("\n── Multiple Updates ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)

        result = apply_updates(family_path, [
            FileUpdate(section="recent_events", operation="prepend",
                       content="- **2026-02-18 12:00** — Linda confirmed for tomorrow"),
            FileUpdate(section="active_issues", operation="resolve_issue",
                       content="morning shift uncovered"),
            FileUpdate(section="patterns", operation="append",
                       content="- Linda is responsive to short-notice requests for non-medical tasks."),
        ])

        assert_true(result.success, "Edit succeeded")
        assert_eq(result.updates_applied, 3, "Three updates applied")
        assert_eq(len(result.sections_modified), 3, "Three sections modified")

        new_content = family_path.read_text()
        assert_in("Linda confirmed for tomorrow", new_content, "Event added")
        assert_in("[x] Feb 19 morning shift uncovered", new_content, "Issue resolved")
        assert_in("Linda is responsive", new_content, "Pattern added")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Rollback ───────────────────────────────────────────────────────

def test_rollback():
    """Rollback restores the original file from backup."""
    print("\n── Rollback ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)
        original = family_path.read_text()

        result = apply_updates(family_path, [
            FileUpdate(section="recent_events", operation="prepend",
                       content="- **2026-02-18 12:30** — This will be rolled back"),
        ])

        assert_true(result.success, "Edit succeeded")
        modified = family_path.read_text()
        assert_true(modified != original, "File was modified")

        # Rollback
        success = rollback(family_path, Path(result.backup_path))
        assert_true(success, "Rollback succeeded")
        restored = family_path.read_text()
        assert_eq(restored, original, "File restored to original")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Validation ─────────────────────────────────────────────────────

def test_validation_passes_on_good_file():
    """Valid family.md passes validation."""
    print("\n── Validation: Good File ──")
    is_valid, issues = validate_family_file(FAMILY_MD)
    assert_true(is_valid, "Test fixture passes validation")
    assert_eq(len(issues), 0, "No issues found")


def test_validation_catches_empty_file():
    """Empty file fails validation."""
    print("\n── Validation: Empty File ──")
    is_valid, issues = validate_family_file("")
    assert_true(not is_valid, "Empty file fails")
    assert_true(len(issues) > 0, "Has error message")


def test_validation_catches_missing_header():
    """File without # header fails validation."""
    print("\n── Validation: Missing Header ──")
    is_valid, issues = validate_family_file("## Schedule\nSome content\n")
    assert_true(not is_valid, "Missing header fails")


# ─── Test: Parse AI Update Instructions ───────────────────────────────────

def test_parse_structured_updates():
    """AI-returned structured updates parse correctly."""
    print("\n── Parse AI Updates ──")
    raw = [
        {
            "section": "recent_events",
            "operation": "prepend",
            "content": "- **2026-02-18 13:00** — Sarah confirmed for Thursday"
        },
        {
            "section": "active_issues",
            "operation": "resolve_issue",
            "content": "morning shift"
        },
    ]

    updates = parse_update_instructions(raw)
    assert_eq(len(updates), 2, "Two updates parsed")
    assert_eq(updates[0].section, "recent_events", "Section normalized")
    assert_eq(updates[0].operation, "prepend", "Operation preserved")
    assert_eq(updates[1].operation, "resolve_issue", "Second operation correct")


def test_parse_handles_malformed_entries():
    """Malformed entries are skipped gracefully."""
    print("\n── Parse Malformed Updates ──")
    raw = [
        {"section": "recent_events"},             # Missing operation and content
        "not a dict",                              # Wrong type
        {"section": "", "operation": "append", "content": "x"},  # Empty section
        {"section": "schedule", "operation": "append", "content": "valid entry"},
    ]

    updates = parse_update_instructions(raw)
    assert_eq(len(updates), 1, "Only one valid update parsed")
    assert_eq(updates[0].section, "schedule", "Valid entry preserved")


# ─── Test: Invalid Section Skipped ────────────────────────────────────────

def test_nonexistent_section_skipped():
    """Updates targeting nonexistent sections are skipped."""
    print("\n── Nonexistent Section ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)

        result = apply_updates(family_path, [
            FileUpdate(section="insurance", operation="append",
                       content="Provider: Blue Cross"),
        ])

        assert_true(result.success, "Overall succeeds (nothing to apply)")
        assert_eq(result.updates_applied, 0, "Zero applied")
        assert_eq(result.updates_skipped, 1, "One skipped")
        assert_true(len(result.errors) > 0, "Error logged")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Invalid Operation Skipped ──────────────────────────────────────

def test_invalid_operation_skipped():
    """Unknown operations are skipped."""
    print("\n── Invalid Operation ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)

        result = apply_updates(family_path, [
            FileUpdate(section="schedule", operation="delete_all",
                       content="everything"),
        ])

        assert_true(result.success, "Overall succeeds (nothing to apply)")
        assert_eq(result.updates_applied, 0, "Zero applied")
        assert_eq(result.updates_skipped, 1, "One skipped")
    finally:
        shutil.rmtree(tmp)


# ─── Test: File Unchanged on No Updates ───────────────────────────────────

def test_empty_updates_no_write():
    """Empty update list doesn't modify the file."""
    print("\n── Empty Updates ──")
    tmp = tempfile.mkdtemp()
    try:
        family_path = _make_family_file(tmp)
        original = family_path.read_text()

        result = apply_updates(family_path, [])

        assert_true(result.success, "Succeeds with nothing to do")
        assert_eq(family_path.read_text(), original, "File unchanged")
    finally:
        shutil.rmtree(tmp)


# ─── Run All ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("FAMILY FILE EDITOR TESTS")
    print("=" * 60)

    test_backup_created_before_edit()
    test_append_to_recent_events()
    test_append_to_schedule()
    test_prepend_to_active_issues()
    test_replace_in_section()
    test_replace_fails_when_old_content_not_found()
    test_resolve_issue()
    test_only_target_section_changes()
    test_last_updated_changes()
    test_multiple_updates()
    test_rollback()
    test_validation_passes_on_good_file()
    test_validation_catches_empty_file()
    test_validation_catches_missing_header()
    test_parse_structured_updates()
    test_parse_handles_malformed_entries()
    test_nonexistent_section_skipped()
    test_invalid_operation_skipped()
    test_empty_updates_no_write()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
