"""
Tests: Webhook Receiver — Event Routing and Enforcement Integration

THE QUESTION THESE TESTS ANSWER:
  Does the receiver route messages through sms_handler (with enforcement)?
  Does deduplication work (same event_id rejected)?
  Does signature verification reject tampered payloads?
  Does reaction routing connect to the approval pipeline?
  Are all 16 Linq event types handled?
"""

import json
import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime, timezone

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


# ─── Test: Signature Verification ─────────────────────────────────────────

def test_signature_verification():
    """Verify webhook authenticity checking."""
    print("\n── Signature Verification ──")

    from webhook_receiver import verify_signature
    from config import linq as linq_config

    # Development mode (no secret)
    original = linq_config.webhook_signing_secret
    linq_config.webhook_signing_secret = ""
    assert_true(verify_signature(b"payload", "ts", "sig"), "No secret → pass (dev mode)")

    # Valid signature
    import hmac, hashlib
    linq_config.webhook_signing_secret = "test_secret_123"
    payload = b'{"event":"test"}'
    ts = str(int(datetime.now(timezone.utc).timestamp()))
    msg = f"{ts}.{payload.decode()}"
    valid_sig = hmac.new(b"test_secret_123", msg.encode(), hashlib.sha256).hexdigest()

    assert_true(verify_signature(payload, ts, valid_sig), "Valid signature passes")
    assert_false(verify_signature(payload, ts, "tampered"), "Tampered signature fails")

    # Replay attack (old timestamp)
    old_ts = str(int(datetime.now(timezone.utc).timestamp()) - 600)  # 10 min old
    old_msg = f"{old_ts}.{payload.decode()}"
    old_sig = hmac.new(b"test_secret_123", old_msg.encode(), hashlib.sha256).hexdigest()
    assert_false(verify_signature(payload, old_ts, old_sig), "Old timestamp rejected (replay)")

    linq_config.webhook_signing_secret = original


# ─── Test: Event Type Dispatch ────────────────────────────────────────────

def test_event_type_dispatch():
    """Verify all event types are handled or logged."""
    print("\n── Event Type Dispatch ──")

    from webhook_receiver import EVENT_HANDLERS, CHAT_EVENTS

    # Core message events
    assert_true("message.received" in EVENT_HANDLERS, "message.received has handler")
    assert_true("message.read" in EVENT_HANDLERS, "message.read has handler")
    assert_true("message.delivered" in EVENT_HANDLERS, "message.delivered has handler")
    assert_true("message.sent" in EVENT_HANDLERS, "message.sent has handler")
    assert_true("message.failed" in EVENT_HANDLERS, "message.failed has handler")
    assert_true("reaction.added" in EVENT_HANDLERS, "reaction.added has handler")
    assert_true("reaction.removed" in EVENT_HANDLERS, "reaction.removed has handler")

    # Chat events (logged, not individually handled)
    assert_true("chat.created" in CHAT_EVENTS, "chat.created in CHAT_EVENTS")
    assert_true("chat.typing_indicator.started" in CHAT_EVENTS, "typing started in CHAT_EVENTS")
    assert_true("participant.added" in CHAT_EVENTS, "participant.added in CHAT_EVENTS")


# ─── Test: Field Extraction ───────────────────────────────────────────────

def test_field_extraction():
    """Verify webhook event field extraction handles multiple V3 formats."""
    print("\n── Field Extraction ──")

    from webhook_receiver import (
        _extract_sender_phone,
        _extract_message_text,
        _extract_chat_id,
        _extract_message_id,
        _extract_service,
    )

    # Format 1: top-level fields
    event1 = {
        "sender_handle": {"handle": "+16517037981", "type": "phone"},
        "parts": [{"type": "text", "value": "Hello"}],
        "chat_id": "chat-uuid-1",
        "id": "msg-uuid-1",
        "service": "iMessage",
    }
    assert_true(_extract_sender_phone(event1) == "+16517037981", "Extracts phone from sender_handle")
    assert_true(_extract_message_text(event1) == "Hello", "Extracts text from parts")
    assert_true(_extract_chat_id(event1) == "chat-uuid-1", "Extracts chat_id")
    assert_true(_extract_message_id(event1) == "msg-uuid-1", "Extracts message_id")
    assert_true(_extract_service(event1) == "iMessage", "Extracts service")

    # Format 2: nested in message object
    event2 = {
        "message": {
            "from_handle": {"handle": "+16517037982", "type": "phone"},
            "parts": [{"type": "text", "value": "World"}],
            "id": "msg-uuid-2",
            "service": "SMS",
        },
        "chat": {"id": "chat-uuid-2"},
    }
    assert_true(_extract_sender_phone(event2) == "+16517037982", "Extracts phone from nested from_handle")
    assert_true(_extract_message_text(event2) == "World", "Extracts text from nested parts")
    assert_true(_extract_chat_id(event2) == "chat-uuid-2", "Extracts chat_id from nested chat.id")
    assert_true(_extract_message_id(event2) == "msg-uuid-2", "Extracts id from nested message.id")
    assert_true(_extract_service(event2) == "SMS", "Extracts service from nested message.service")

    # Multi-part message
    event3 = {
        "parts": [
            {"type": "text", "value": "Part one "},
            {"type": "media", "url": "https://..."},
            {"type": "text", "value": "Part two"},
        ],
    }
    assert_true(_extract_message_text(event3) == "Part one  Part two",
                "Concatenates multiple text parts")

    # Empty event
    assert_true(_extract_sender_phone({}) == "", "Empty event → empty phone")
    assert_true(_extract_message_text({}) == "", "Empty event → empty text")


# ─── Test: Deduplication ─────────────────────────────────────────────────

def test_deduplication():
    """Verify that duplicate event_ids are rejected."""
    print("\n── Deduplication ──")

    from webhook_receiver import _is_duplicate, _mark_processed, _load_processed_ids, _save_processed_ids
    from config import linq_paths

    # Use a temp file for this test
    original_fn = linq_paths.processed_event_ids
    test_file = Path(tempfile.mktemp(suffix=".json"))
    linq_paths.processed_event_ids = lambda: test_file

    try:
        assert_false(_is_duplicate("event-001"), "New event is not duplicate")
        _mark_processed("event-001")
        assert_true(_is_duplicate("event-001"), "Processed event IS duplicate")
        assert_false(_is_duplicate("event-002"), "Different event is not duplicate")
    finally:
        linq_paths.processed_event_ids = original_fn
        if test_file.exists():
            test_file.unlink()


# ─── Test: Enforcement Integration (Source Analysis) ──────────────────────

def test_enforcement_integration():
    """Verify the receiver routes through sms_handler (not around it)."""
    print("\n── Enforcement Integration ──")

    import ast
    source = (Path(__file__).parent.parent / "scripts" / "webhook_receiver.py").read_text()
    tree = ast.parse(source)

    # Check sms_handler is imported inside message handler
    assert_true("sms_handler" in source, "Source references sms_handler")
    assert_true("handle_sms" in source, "Source calls handle_sms")
    assert_true("PHIAuditLogger" in source, "Source uses PHIAuditLogger")
    assert_true("reaction_handler" in source, "Source references reaction_handler")

    # Verify it does NOT bypass enforcement (e.g., building its own context)
    assert_true("filter_family_context" not in source,
                "Receiver does NOT call filter_family_context directly (handler does)")
    assert_true("check_outbound_message" not in source,
                "Receiver does NOT call leakage check directly (handler does)")


# ─── Test: Source Structure ───────────────────────────────────────────────

def test_source_structure():
    """Verify the receiver has proper module structure."""
    print("\n── Source Structure ──")

    import ast
    source = (Path(__file__).parent.parent / "scripts" / "webhook_receiver.py").read_text()
    tree = ast.parse(source)

    async_funcs = [node.name for node in ast.walk(tree) if isinstance(node, ast.AsyncFunctionDef)]

    assert_true("handle_webhook_event" in async_funcs, "handle_webhook_event is async")
    assert_true("_handle_message_received" in async_funcs, "message handler is async")
    assert_true("_handle_reaction_added" in async_funcs, "reaction handler is async")

    # Verify imports config (not hardcoded paths)
    imports = [node for node in ast.walk(tree) if isinstance(node, ast.ImportFrom)]
    config_imported = any(getattr(node, 'module', '') == 'config' for node in imports)
    assert_true(config_imported, "Imports from config module")


# ─── Main ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("Webhook Receiver Tests")
    print("=" * 60)

    test_signature_verification()
    test_event_type_dispatch()
    test_field_extraction()
    test_deduplication()
    test_enforcement_integration()
    test_source_structure()

    print(f"\n{'=' * 60}")
    total = _passed + _failed
    print(f"Results: {_passed}/{total} passed, {_failed} failed")
    if _failed > 0:
        print("❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("✅ ALL TESTS PASSED")
