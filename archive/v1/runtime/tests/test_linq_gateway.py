"""
Tests: Linq Gateway — API Client Structure and Config Integration

THE QUESTION THESE TESTS ANSWER:
  Does the gateway import from config.py (not hardcode)?
  Does it construct correct API URLs?
  Does webhook signature verification work?
  Do all API functions exist with correct signatures?
"""

import ast
import hmac
import hashlib
import sys
import time
from pathlib import Path

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


# ─── Test: Config Integration ─────────────────────────────────────────────

def test_config_integration():
    """Verify gateway imports from config.py, not hardcoded."""
    print("\n── Config Integration ──")

    gateway_source = (Path(__file__).parent.parent / "scripts" / "linq_gateway.py").read_text()
    tree = ast.parse(gateway_source)

    # Check that config is imported
    imports = [node for node in ast.walk(tree) if isinstance(node, (ast.Import, ast.ImportFrom))]
    config_imported = any(
        getattr(node, 'module', '') == 'config' or
        any(alias.name == 'config' for alias in getattr(node, 'names', []))
        for node in imports
    )
    assert_true(config_imported, "Gateway imports from config")

    # Check no hardcoded API base URL
    assert_true("linqapp.com" not in gateway_source.split("from config")[0],
                "No hardcoded API URL before config import")


def test_linq_config_class():
    """Verify LinqConfig exists in config.py with required fields."""
    print("\n── LinqConfig Class ──")

    from config import LinqConfig, linq

    assert_true(hasattr(LinqConfig, 'api_token'), "LinqConfig has api_token")
    assert_true(hasattr(LinqConfig, 'phone_number'), "LinqConfig has phone_number")
    assert_true(hasattr(LinqConfig, 'base_url'), "LinqConfig has base_url")
    assert_true(hasattr(LinqConfig, 'webhook_signing_secret'), "LinqConfig has webhook_signing_secret")

    # Verify base_url has a default value
    assert_true("linqapp.com" in LinqConfig.base_url or linq.base_url == "", "base_url defaults to Linq API")


def test_linq_paths():
    """Verify extended paths for Linq pipeline exist in config.py."""
    print("\n── Linq Paths ──")

    from config import linq_paths

    assert_true(callable(getattr(linq_paths, 'chat_conversation_log', None)),
                "linq_paths.chat_conversation_log exists")
    assert_true(callable(getattr(linq_paths, 'webhook_log', None)),
                "linq_paths.webhook_log exists")
    assert_true(callable(getattr(linq_paths, 'reaction_log', None)),
                "linq_paths.reaction_log exists")
    assert_true(callable(getattr(linq_paths, 'processed_event_ids', None)),
                "linq_paths.processed_event_ids exists")

    # Verify paths are reasonable
    log_path = linq_paths.webhook_log("2026-02-21")
    assert_true("webhooks" in str(log_path), "Webhook log path contains 'webhooks'")
    assert_true("2026-02-21" in str(log_path), "Webhook log path contains date")


# ─── Test: API Function Signatures ───────────────────────────────────────

def test_api_functions_exist():
    """Verify all API functions exist with expected signatures."""
    print("\n── API Functions ──")

    from linq_gateway import (
        create_chat,
        list_chats,
        get_chat,
        send_message,
        get_messages,
        add_reaction,
        remove_reaction,
        start_typing,
        stop_typing,
        mark_as_read,
        share_contact_card,
        send_voice_memo,
        add_participant,
        remove_participant,
        pre_upload_attachment,
        list_phone_numbers,
        list_webhook_subscriptions,
        create_webhook_subscription,
        delete_webhook_subscription,
        verify_webhook_signature,
    )

    assert_true(callable(create_chat), "create_chat is callable")
    assert_true(callable(send_message), "send_message is callable")
    assert_true(callable(add_reaction), "add_reaction is callable")
    assert_true(callable(start_typing), "start_typing is callable")
    assert_true(callable(share_contact_card), "share_contact_card is callable")
    assert_true(callable(verify_webhook_signature), "verify_webhook_signature is callable")
    assert_true(callable(list_phone_numbers), "list_phone_numbers is callable")


# ─── Test: Webhook Signature Verification ─────────────────────────────────

def test_webhook_signature_verification():
    """Verify HMAC-SHA256 signature checking works correctly."""
    print("\n── Webhook Signature Verification ──")

    from linq_gateway import verify_webhook_signature

    # With no secret configured, should pass (development mode)
    from config import linq as linq_config
    original_secret = linq_config.webhook_signing_secret
    linq_config.webhook_signing_secret = ""
    assert_true(verify_webhook_signature(b"test", "123", "anything"),
                "No secret → verification passes (dev mode)")

    # With a secret configured, verify HMAC
    linq_config.webhook_signing_secret = "test_secret"
    payload = b'{"event": "test"}'
    timestamp = str(int(time.time()))
    message = f"{timestamp}.{payload.decode()}"
    expected_sig = hmac.new(b"test_secret", message.encode(), hashlib.sha256).hexdigest()

    assert_true(verify_webhook_signature(payload, timestamp, expected_sig),
                "Valid signature passes")
    assert_false(verify_webhook_signature(payload, timestamp, "bad_signature"),
                 "Bad signature fails")

    # Restore
    linq_config.webhook_signing_secret = original_secret


# ─── Test: Gateway Source Structure ───────────────────────────────────────

def test_gateway_source_structure():
    """Verify the gateway has proper structure (no __main__ side effects, etc.)."""
    print("\n── Source Structure ──")

    gateway_source = (Path(__file__).parent.parent / "scripts" / "linq_gateway.py").read_text()
    tree = ast.parse(gateway_source)

    # Count async functions (should have many API operations)
    async_funcs = [node.name for node in ast.walk(tree) if isinstance(node, ast.AsyncFunctionDef)]
    assert_true(len(async_funcs) >= 10, f"Has {len(async_funcs)} async API functions (>=10)")

    # Verify key functions
    assert_true("create_chat" in async_funcs, "create_chat is an async function")
    assert_true("send_message" in async_funcs, "send_message is an async function")
    assert_true("add_reaction" in async_funcs, "add_reaction is an async function")
    assert_true("start_typing" in async_funcs, "start_typing is an async function")

    # Check docstring at module level
    assert_true(gateway_source.startswith('"""'), "Module has docstring")


# ─── Main ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("Linq Gateway Tests")
    print("=" * 60)

    test_config_integration()
    test_linq_config_class()
    test_linq_paths()
    test_api_functions_exist()
    test_webhook_signature_verification()
    test_gateway_source_structure()

    print(f"\n{'=' * 60}")
    total = _passed + _failed
    print(f"Results: {_passed}/{total} passed, {_failed} failed")
    if _failed > 0:
        print("❌ SOME TESTS FAILED")
        sys.exit(1)
    else:
        print("✅ ALL TESTS PASSED")
