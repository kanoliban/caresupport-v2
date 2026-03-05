"""
Tests: Approval Pipeline — Confirmation for High-Stakes Changes

THE QUESTIONS THESE TESTS ANSWER:
  Does an unapproved medication change get blocked?
  Does a YES response trigger the change?
  Does a NO response prevent the change?
  Are approvals stored durably (file, not memory)?
  Does expiration work?
  Is the pipeline tied to specific change + phone + session?
"""

import json
import shutil
import sys
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from enforcement.approval_pipeline import (
    requires_approval,
    classify_updates,
    create_pending,
    load_pending,
    save_pending,
    resolve_approval,
    get_pending_for_approver,
    expire_stale,
    detect_approval_response,
    format_confirmation_sms,
    PendingApproval,
)
from enforcement.family_editor import FileUpdate
from tests.fixtures import FAMILY_MD, PHONE_ROUTING

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


def _make_test_family(tmp: str) -> Path:
    """Set up a test family directory with family.md and phone_routing.json."""
    family_dir = Path(tmp) / "moreno-test"
    family_dir.mkdir(parents=True)
    (family_dir / "family.md").write_text(FAMILY_MD)
    (family_dir / "phone_routing.json").write_text(json.dumps(PHONE_ROUTING, indent=2))
    return family_dir


# ─── Test: Classification ─────────────────────────────────────────────────

def test_medication_changes_require_approval():
    """ANY change to medications requires approval."""
    print("\n── Classification: Medications ──")
    assert_true(requires_approval("medications", "append"), "Append to medications requires approval")
    assert_true(requires_approval("medications", "prepend"), "Prepend to medications requires approval")
    assert_true(requires_approval("medications", "replace"), "Replace in medications requires approval")


def test_schedule_changes_auto_apply():
    """Schedule changes auto-apply (coordination, not clinical)."""
    print("\n── Classification: Schedule ──")
    assert_true(not requires_approval("schedule", "append"), "Append to schedule auto-applies")
    assert_true(not requires_approval("schedule", "replace"), "Replace in schedule auto-applies")


def test_recent_events_auto_apply():
    """Recent Events and Active Issues always auto-apply."""
    print("\n── Classification: Observational Sections ──")
    assert_true(not requires_approval("recent_events", "prepend"), "Recent events auto-applies")
    assert_true(not requires_approval("active_issues", "resolve_issue"), "Resolve issue auto-applies")
    assert_true(not requires_approval("patterns", "append"), "Patterns auto-applies")


def test_classify_mixed_batch():
    """A mixed batch gets correctly split into auto-apply and needs-approval."""
    print("\n── Classification: Mixed Batch ──")
    updates = [
        FileUpdate(section="recent_events", operation="prepend", content="new event"),
        FileUpdate(section="medications", operation="replace", content="new dosage", old_content="old dosage"),
        FileUpdate(section="active_issues", operation="resolve_issue", content="shift covered"),
        FileUpdate(section="members", operation="replace", content="new phone"),
    ]

    result = classify_updates(updates)
    assert_eq(len(result.auto_apply), 2, "Two auto-apply updates")
    assert_eq(len(result.needs_approval), 2, "Two need-approval updates")

    auto_sections = [u.section for u in result.auto_apply]
    assert_true("recent_events" in auto_sections, "Recent events in auto-apply")
    assert_true("active_issues" in auto_sections, "Active issues in auto-apply")

    approval_sections = [u.section for u, _ in result.needs_approval]
    assert_true("medications" in approval_sections, "Medications in needs-approval")
    assert_true("members" in approval_sections, "Members in needs-approval")


# ─── Test: Durable Storage ────────────────────────────────────────────────

def test_approvals_stored_durably():
    """Pending approvals survive between load/save cycles (file, not memory)."""
    print("\n── Durable Storage ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)

        # Create an approval
        update = FileUpdate(section="medications", operation="replace",
                           content="Lisinopril 20mg", old_content="Lisinopril 10mg")
        approval = create_pending(
            family_dir=family_dir,
            update=update,
            description="Change Lisinopril from 10mg to 20mg",
            requester_phone="+1-555-0201",
            requester_name="Sarah",
            approver_phones=["+1-555-0101", "+1-555-0102"],
        )

        # Verify file exists
        approvals_file = family_dir / "pending_approvals.json"
        assert_true(approvals_file.exists(), "pending_approvals.json exists")

        # Load from scratch (simulating restart)
        loaded = load_pending(family_dir)
        assert_eq(len(loaded), 1, "One approval loaded from file")
        assert_eq(loaded[0].id, approval.id, "Same ID after reload")
        assert_eq(loaded[0].status, "pending", "Status is pending")
        assert_eq(loaded[0].description, "Change Lisinopril from 10mg to 20mg", "Description preserved")
        assert_eq(loaded[0].requester_phone, "+1-555-0201", "Requester phone preserved")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Unapproved Medication Change Gets Blocked ──────────────────────

def test_unapproved_medication_change_blocked():
    """THE KEY TEST: does an unapproved medication change get blocked?

    A medication update goes through classify_updates, is identified as
    needs-approval, and is NOT applied to family.md.
    """
    print("\n── Unapproved Medication Change Blocked ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)
        family_md_path = family_dir / "family.md"
        original_content = family_md_path.read_text()

        # Simulate: the agent wants to change Lisinopril dosage
        updates = [
            FileUpdate(section="medications", operation="replace",
                       content='    dose: "20mg"', old_content='    dose: "10mg"'),
            FileUpdate(section="recent_events", operation="prepend",
                       content="- **2026-02-18** — Dr. Chen changed Lisinopril to 20mg"),
        ]

        classified = classify_updates(updates)

        # Only auto-apply the safe ones
        from enforcement.family_editor import apply_updates
        if classified.auto_apply:
            apply_updates(family_md_path, classified.auto_apply)

        # Create pending for the rest
        for update, reason in classified.needs_approval:
            create_pending(
                family_dir=family_dir,
                update=update,
                description=f"{reason}: dosage change",
                requester_phone="+1-555-0201",
                requester_name="Sarah",
                approver_phones=["+1-555-0101", "+1-555-0102"],
            )

        # Verify: medication was NOT changed
        current = family_md_path.read_text()
        assert_in('dose: "10mg"', current, "Medication still at 10mg (change blocked)")
        assert_true('dose: "20mg"' not in current, "20mg NOT in file (change blocked)")

        # Verify: recent event WAS added (it's observational, auto-applied)
        assert_in("Dr. Chen changed Lisinopril", current, "Recent event was auto-applied")

        # Verify: pending approval exists
        pending = load_pending(family_dir)
        assert_eq(len(pending), 1, "One pending approval created")
        assert_eq(pending[0].status, "pending", "Status is pending")
    finally:
        shutil.rmtree(tmp)


# ─── Test: YES Response Triggers Change ────────────────────────────────────

def test_yes_triggers_change():
    """When an approver replies YES, the change is applied to family.md."""
    print("\n── YES Triggers Change ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)
        family_md_path = family_dir / "family.md"

        # Create pending medication change
        update = FileUpdate(section="medications", operation="replace",
                           content='    dose: "20mg"', old_content='    dose: "10mg"')
        approval = create_pending(
            family_dir=family_dir,
            update=update,
            description="Change Lisinopril from 10mg to 20mg",
            requester_phone="+1-555-0201",
            requester_name="Sarah",
            approver_phones=["+1-555-0101", "+1-555-0102"],
        )

        # Approver (Rob, full access) says YES
        result = resolve_approval(family_dir, approval.id, approved=True, by_phone="+1-555-0101")

        assert_eq(result["action"], "approved", "Action is approved")
        assert_true(result["success"], "Resolution succeeded")

        # Verify: file was actually changed
        current = family_md_path.read_text()
        assert_in('dose: "20mg"', current, "Medication changed to 20mg")

        # Verify: approval status updated
        loaded = load_pending(family_dir)
        assert_eq(loaded[0].status, "approved", "Status is approved")
        assert_eq(loaded[0].resolved_by, "+1-555-0101", "Resolved by Rob's phone")
        assert_true(loaded[0].resolved_at is not None, "resolved_at is set")
    finally:
        shutil.rmtree(tmp)


# ─── Test: NO Response Prevents Change ─────────────────────────────────────

def test_no_prevents_change():
    """When an approver replies NO, the change is NOT applied."""
    print("\n── NO Prevents Change ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)
        family_md_path = family_dir / "family.md"

        update = FileUpdate(section="medications", operation="replace",
                           content='    dose: "20mg"', old_content='    dose: "10mg"')
        approval = create_pending(
            family_dir=family_dir,
            update=update,
            description="Change Lisinopril from 10mg to 20mg",
            requester_phone="+1-555-0201",
            requester_name="Sarah",
            approver_phones=["+1-555-0101", "+1-555-0102"],
        )

        # Approver says NO
        result = resolve_approval(family_dir, approval.id, approved=False, by_phone="+1-555-0102")

        assert_eq(result["action"], "rejected", "Action is rejected")
        assert_true(result["success"], "Rejection succeeded")

        # Verify: file was NOT changed
        current = family_md_path.read_text()
        assert_in('dose: "10mg"', current, "Medication still at 10mg")
        assert_true('dose: "20mg"' not in current, "20mg NOT in file")

        # Verify: approval status
        loaded = load_pending(family_dir)
        assert_eq(loaded[0].status, "rejected", "Status is rejected")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Unauthorized Approver Blocked ──────────────────────────────────

def test_unauthorized_approver_blocked():
    """Only designated approvers can approve/reject."""
    print("\n── Unauthorized Approver ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)

        update = FileUpdate(section="medications", operation="replace",
                           content='    dose: "20mg"', old_content='    dose: "10mg"')
        approval = create_pending(
            family_dir=family_dir,
            update=update,
            description="Change Lisinopril dosage",
            requester_phone="+1-555-0201",
            requester_name="Sarah",
            approver_phones=["+1-555-0101", "+1-555-0102"],
        )

        # Linda (schedule-only) tries to approve
        result = resolve_approval(family_dir, approval.id, approved=True, by_phone="+1-555-0301")

        assert_eq(result["action"], "unauthorized", "Unauthorized approver blocked")
        assert_true(not result["success"], "Resolution failed")

        # Verify: approval still pending
        loaded = load_pending(family_dir)
        assert_eq(loaded[0].status, "pending", "Still pending")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Expiration ─────────────────────────────────────────────────────

def test_expired_approval_cannot_be_resolved():
    """Expired approvals can't be approved or rejected."""
    print("\n── Expired Approval ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)

        # Create approval with 0-hour expiry (already expired)
        update = FileUpdate(section="medications", operation="replace",
                           content='    dose: "20mg"', old_content='    dose: "10mg"')
        approval = create_pending(
            family_dir=family_dir,
            update=update,
            description="Change Lisinopril dosage",
            requester_phone="+1-555-0201",
            requester_name="Sarah",
            approver_phones=["+1-555-0101"],
            expiry_hours=0,  # Expires immediately
        )

        # Try to approve after expiry
        result = resolve_approval(family_dir, approval.id, approved=True, by_phone="+1-555-0101")

        assert_eq(result["action"], "expired", "Expired approval caught")
        assert_true(not result["success"], "Resolution failed")
    finally:
        shutil.rmtree(tmp)


def test_expire_stale():
    """expire_stale() marks all expired approvals."""
    print("\n── Expire Stale ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)

        # Create two approvals: one expired, one valid
        update = FileUpdate(section="medications", operation="replace",
                           content="new", old_content="old")

        create_pending(family_dir, update, "expired one", "+1-555-0201",
                       "Sarah", ["+1-555-0101"], expiry_hours=0)
        create_pending(family_dir, update, "valid one", "+1-555-0201",
                       "Sarah", ["+1-555-0101"], expiry_hours=24)

        count = expire_stale(family_dir)
        assert_eq(count, 1, "One newly expired")

        loaded = load_pending(family_dir)
        statuses = [a.status for a in loaded]
        assert_true("expired" in statuses, "One is expired")
        assert_true("pending" in statuses, "One is still pending")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Tied to Specific Change + Phone + Session ──────────────────────

def test_approval_tied_to_specific_change():
    """Each approval is tied to a specific update, requester, and approvers."""
    print("\n── Tied to Specific Change ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)

        update = FileUpdate(section="medications", operation="replace",
                           content='    dose: "20mg"', old_content='    dose: "10mg"')
        approval = create_pending(
            family_dir=family_dir,
            update=update,
            description="Specific dosage change",
            requester_phone="+1-555-0201",
            requester_name="Sarah",
            approver_phones=["+1-555-0101"],
        )

        loaded = load_pending(family_dir)
        a = loaded[0]

        assert_eq(a.update["section"], "medications", "Tied to medications section")
        assert_eq(a.update["operation"], "replace", "Tied to replace operation")
        assert_in("20mg", a.update["content"], "Tied to specific content")
        assert_eq(a.requester_phone, "+1-555-0201", "Tied to requester phone")
        assert_eq(a.approver_phones, ["+1-555-0101"], "Tied to specific approvers")
        assert_true(len(a.id) == 8, "Has unique 8-char ID")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Double Resolution Prevented ─────────────────────────────────────

def test_cannot_resolve_twice():
    """An already-resolved approval can't be resolved again."""
    print("\n── Double Resolution Prevented ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)

        update = FileUpdate(section="medications", operation="replace",
                           content='    dose: "20mg"', old_content='    dose: "10mg"')
        approval = create_pending(
            family_dir=family_dir,
            update=update,
            description="Dosage change",
            requester_phone="+1-555-0201",
            requester_name="Sarah",
            approver_phones=["+1-555-0101"],
        )

        # First resolution
        resolve_approval(family_dir, approval.id, approved=True, by_phone="+1-555-0101")

        # Try again
        result2 = resolve_approval(family_dir, approval.id, approved=False, by_phone="+1-555-0101")
        assert_eq(result2["action"], "already_resolved", "Cannot resolve twice")
    finally:
        shutil.rmtree(tmp)


# ─── Test: Detect Approval Response ───────────────────────────────────────

def test_detect_approval_response():
    """Detects YES/NO messages as approval responses."""
    print("\n── Detect Approval Response ──")
    # Positive matches
    approved, _ = detect_approval_response("yes")
    assert_eq(approved, True, "'yes' is approved")

    approved, _ = detect_approval_response("YES")
    assert_eq(approved, True, "'YES' is approved")

    approved, _ = detect_approval_response("y")
    assert_eq(approved, True, "'y' is approved")

    approved, _ = detect_approval_response("approve")
    assert_eq(approved, True, "'approve' is approved")

    approved, _ = detect_approval_response("confirm")
    assert_eq(approved, True, "'confirm' is approved")

    # Negative matches
    approved, _ = detect_approval_response("no")
    assert_eq(approved, False, "'no' is rejected")

    approved, _ = detect_approval_response("NO")
    assert_eq(approved, False, "'NO' is rejected")

    approved, _ = detect_approval_response("reject")
    assert_eq(approved, False, "'reject' is rejected")

    approved, _ = detect_approval_response("cancel")
    assert_eq(approved, False, "'cancel' is rejected")

    # With approval ID
    approved, aid = detect_approval_response("YES abc123")
    assert_eq(approved, True, "'YES abc123' is approved")
    assert_eq(aid, "abc123", "Captures approval ID")

    approved, aid = detect_approval_response("no def456")
    assert_eq(approved, False, "'no def456' is rejected")
    assert_eq(aid, "def456", "Captures rejection ID")

    # Not approval responses
    approved, _ = detect_approval_response("Can someone take dad to the doctor?")
    assert_eq(approved, None, "Normal message is not an approval")

    approved, _ = detect_approval_response("what time is the appointment")
    assert_eq(approved, None, "Question is not an approval")


# ─── Test: Confirmation SMS Format ────────────────────────────────────────

def test_confirmation_sms_format():
    """Confirmation SMS contains the key information."""
    print("\n── Confirmation SMS Format ──")
    approval = PendingApproval(
        id="abc12345",
        created_at="2026-02-18T16:30:00Z",
        expires_at="2026-02-19T16:30:00Z",
        status="pending",
        requester_phone="+1-555-0201",
        requester_name="Sarah",
        approver_phones=["+1-555-0101"],
        description="Change Lisinopril from 10mg to 20mg",
        update={},
    )

    sms = format_confirmation_sms(approval)
    assert_in("Approval needed", sms, "Contains approval needed")
    assert_in("Lisinopril", sms, "Contains the medication")
    assert_in("Sarah", sms, "Contains requester name")
    assert_in("YES or NO", sms, "Contains YES/NO instructions")
    assert_in("abc12345", sms, "Contains approval ID reference")


# ─── Test: Pending Approvals for Specific Approver ─────────────────────────

def test_get_pending_for_approver():
    """Only returns pending approvals for the specific approver."""
    print("\n── Pending for Specific Approver ──")
    tmp = tempfile.mkdtemp()
    try:
        family_dir = _make_test_family(tmp)

        update = FileUpdate(section="medications", operation="replace",
                           content="new", old_content="old")

        # Approval for Rob only
        create_pending(family_dir, update, "For Rob", "+1-555-0201",
                       "Sarah", ["+1-555-0101"])

        # Approval for Marta only
        create_pending(family_dir, update, "For Marta", "+1-555-0201",
                       "Sarah", ["+1-555-0102"])

        rob_pending = get_pending_for_approver(family_dir, "+1-555-0101")
        assert_eq(len(rob_pending), 1, "Rob has one pending")
        assert_eq(rob_pending[0].description, "For Rob", "Rob sees his approval")

        marta_pending = get_pending_for_approver(family_dir, "+1-555-0102")
        assert_eq(len(marta_pending), 1, "Marta has one pending")

        linda_pending = get_pending_for_approver(family_dir, "+1-555-0301")
        assert_eq(len(linda_pending), 0, "Linda has no pending")
    finally:
        shutil.rmtree(tmp)


# ─── Run All ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("APPROVAL PIPELINE TESTS")
    print("=" * 60)

    test_medication_changes_require_approval()
    test_schedule_changes_auto_apply()
    test_recent_events_auto_apply()
    test_classify_mixed_batch()
    test_approvals_stored_durably()
    test_unapproved_medication_change_blocked()
    test_yes_triggers_change()
    test_no_prevents_change()
    test_unauthorized_approver_blocked()
    test_expired_approval_cannot_be_resolved()
    test_expire_stale()
    test_approval_tied_to_specific_change()
    test_cannot_resolve_twice()
    test_detect_approval_response()
    test_confirmation_sms_format()
    test_get_pending_for_approver()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
