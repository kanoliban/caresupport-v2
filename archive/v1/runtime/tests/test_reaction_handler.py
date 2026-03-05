"""
Tests: Reaction Handler — Tapback → Approval Pipeline Integration

THE QUESTION THESE TESTS ANSWER:
  Does 👍 (like) on an approval message trigger approval?
  Does 👎 (dislike) trigger rejection?
  Does a reaction on a non-approval message get logged (no crash)?
  Does the message → approval mapping work?
"""

import json
import sys
import tempfile
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

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


# ─── Test: Reaction → Action Mapping ─────────────────────────────────────

def test_reaction_mapping():
    """Verify reaction types map to correct actions."""
    print("\n── Reaction → Action Mapping ──")

    from reaction_handler import (
        CONFIRMATION_REACTIONS,
        DECLINE_REACTIONS,
        QUESTION_REACTIONS,
        URGENT_REACTIONS,
    )

    assert_true("like" in CONFIRMATION_REACTIONS, "👍 (like) is a confirmation")
    assert_true("love" in CONFIRMATION_REACTIONS, "❤️ (love) is a confirmation")
    assert_true("dislike" in DECLINE_REACTIONS, "👎 (dislike) is a decline")
    assert_true("question" in QUESTION_REACTIONS, "❓ (question) is a question")
    assert_true("emphasize" in URGENT_REACTIONS, "‼️ (emphasize) is urgent")


# ─── Test: Message → Approval Mapping ─────────────────────────────────────

def test_message_approval_mapping():
    """Verify register/lookup of message_id → approval_id."""
    print("\n── Message → Approval Mapping ──")

    from reaction_handler import (
        register_message_approval,
        _load_message_map,
        _save_message_map,
        _MSG_TO_APPROVAL_FILE,
    )

    # Backup original file path and use temp
    original_path = _MSG_TO_APPROVAL_FILE
    import reaction_handler
    test_file = Path(tempfile.mktemp(suffix=".json"))
    reaction_handler._MSG_TO_APPROVAL_FILE = test_file

    try:
        # Register a mapping
        register_message_approval("msg-001", "approval-abc", "/tmp/family")
        register_message_approval("msg-002", "approval-def", "/tmp/family")

        data = _load_message_map()
        assert_true("msg-001" in data, "msg-001 registered")
        assert_true(data["msg-001"]["approval_id"] == "approval-abc", "Correct approval_id for msg-001")
        assert_true("msg-002" in data, "msg-002 registered")

    finally:
        reaction_handler._MSG_TO_APPROVAL_FILE = original_path
        if test_file.exists():
            test_file.unlink()


# ─── Test: Handle Reaction on Non-Approval Message ───────────────────────

def test_reaction_on_non_approval():
    """Verify reaction on a non-approval message logs without error."""
    print("\n── Non-Approval Reaction ──")

    from reaction_handler import handle_reaction, _MSG_TO_APPROVAL_FILE
    import reaction_handler

    # Use empty mapping (no approvals)
    test_file = Path(tempfile.mktemp(suffix=".json"))
    original_path = _MSG_TO_APPROVAL_FILE
    reaction_handler._MSG_TO_APPROVAL_FILE = test_file

    try:
        result = asyncio.run(handle_reaction(
            message_id="nonexistent-msg",
            reaction_type="like",
            sender_phone="+1-555-0101",
        ))
        assert_true(result["handled"] is True, "Non-approval reaction handled (no crash)")
        assert_true(result["action"] == "logged", "Action is 'logged' (no approval)")
    finally:
        reaction_handler._MSG_TO_APPROVAL_FILE = original_path
        if test_file.exists():
            test_file.unlink()


# ─── Test: Handle Reaction With Approval Mapping ─────────────────────────

def test_reaction_with_approval():
    """Verify 👍 on an approval message triggers resolve_approval."""
    print("\n── Approval Reaction (integration) ──")

    from reaction_handler import (
        handle_reaction,
        register_message_approval,
        _MSG_TO_APPROVAL_FILE,
    )
    from enforcement.approval_pipeline import (
        create_pending,
        load_pending,
        save_pending,
    )
    from enforcement.family_editor import FileUpdate
    import reaction_handler

    # Set up temp paths
    test_map_file = Path(tempfile.mktemp(suffix=".json"))
    test_family_dir = Path(tempfile.mkdtemp())
    original_path = _MSG_TO_APPROVAL_FILE
    reaction_handler._MSG_TO_APPROVAL_FILE = test_map_file

    try:
        # Create a test family.md
        family_md = test_family_dir / "family.md"
        family_md.write_text("# Test Family\n\nLast Updated: 2026-01-01\n\n## Medications\n\nNone yet.\n")

        # Create a pending approval
        update = FileUpdate(section="medications", operation="append", content="- New med")
        approval = create_pending(
            family_dir=test_family_dir,
            update=update,
            description="append on medications: New med",
            requester_phone="+1-555-0102",
            requester_name="Marta",
            approver_phones=["+1-555-0101"],
        )

        # Register the message → approval mapping
        register_message_approval("msg-approval-001", approval.id, str(test_family_dir))

        # Simulate 👍 reaction from approver
        result = asyncio.run(handle_reaction(
            message_id="msg-approval-001",
            reaction_type="like",
            sender_phone="+1-555-0101",
        ))
        assert_true(result["action"] == "approved", "👍 from approver triggers approval")

        # Verify the approval was resolved
        pending = load_pending(test_family_dir)
        resolved = [a for a in pending if a.id == approval.id]
        assert_true(len(resolved) == 1, "Approval found in storage")
        assert_true(resolved[0].status == "approved", "Approval status is 'approved'")

        # Verify family.md was updated
        new_content = family_md.read_text()
        assert_true("New med" in new_content, "family.md updated with new medication")

    finally:
        reaction_handler._MSG_TO_APPROVAL_FILE = original_path
        if test_map_file.exists():
            test_map_file.unlink()
        import shutil
        shutil.rmtree(test_family_dir, ignore_errors=True)


# ─── Test: Reject Via Dislike ─────────────────────────────────────────────

def test_reject_via_dislike():
    """Verify 👎 on an approval message triggers rejection."""
    print("\n── Reject Via Dislike ──")

    from reaction_handler import (
        handle_reaction,
        register_message_approval,
        _MSG_TO_APPROVAL_FILE,
    )
    from enforcement.approval_pipeline import create_pending, load_pending
    from enforcement.family_editor import FileUpdate
    import reaction_handler

    test_map_file = Path(tempfile.mktemp(suffix=".json"))
    test_family_dir = Path(tempfile.mkdtemp())
    original_path = _MSG_TO_APPROVAL_FILE
    reaction_handler._MSG_TO_APPROVAL_FILE = test_map_file

    try:
        family_md = test_family_dir / "family.md"
        family_md.write_text("# Test Family\n\nLast Updated: 2026-01-01\n\n## Medications\n\nExisting med.\n")

        update = FileUpdate(section="medications", operation="append", content="- Bad med")
        approval = create_pending(
            family_dir=test_family_dir,
            update=update,
            description="append on medications: Bad med",
            requester_phone="+1-555-0102",
            requester_name="Marta",
            approver_phones=["+1-555-0101"],
        )

        register_message_approval("msg-reject-001", approval.id, str(test_family_dir))

        result = asyncio.run(handle_reaction(
            message_id="msg-reject-001",
            reaction_type="dislike",
            sender_phone="+1-555-0101",
        ))
        assert_true(result["action"] == "rejected", "👎 from approver triggers rejection")

        # Verify family.md was NOT updated
        content = family_md.read_text()
        assert_true("Bad med" not in content, "family.md unchanged after rejection")

    finally:
        reaction_handler._MSG_TO_APPROVAL_FILE = original_path
        if test_map_file.exists():
            test_map_file.unlink()
        import shutil
        shutil.rmtree(test_family_dir, ignore_errors=True)


# ─── Test: Source Structure ───────────────────────────────────────────────

def test_source_structure():
    """Verify reaction_handler integrates with enforcement."""
    print("\n── Source Structure ──")

    import ast
    source = (Path(__file__).parent.parent / "scripts" / "reaction_handler.py").read_text()

    assert_true("approval_pipeline" in source, "References approval_pipeline")
    assert_true("resolve_approval" in source, "Calls resolve_approval")
    assert_true("PHIAuditLogger" in source, "References PHIAuditLogger")
    assert_true("from config" in source, "Imports from config")


# ─── Main ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("Reaction Handler Tests")
    print("=" * 60)

    test_reaction_mapping()
    test_message_approval_mapping()
    test_reaction_on_non_approval()
    test_reaction_with_approval()
    test_reject_via_dislike()
    test_source_structure()

    print(f"\n{'=' * 60}")
    total = _passed + _failed
    print(f"Results: {_passed}/{total} passed, {_failed} failed")
    if _failed > 0:
        print("❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("✅ ALL TESTS PASSED")
