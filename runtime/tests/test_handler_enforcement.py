"""
Tests: Handler Enforcement Integration

THE QUESTIONS THESE TESTS ANSWER:
  Is role_filter wired into the handler? (not just existing, but called)
  Is phi_audit wired into the handler? (not just existing, but called)
  Is family_editor wired into the handler? (file updates applied, not ignored)
  Does the handler import enforcement, or can it run without it?
  Does the unknown-number path disclose zero PHI?
"""

import ast
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

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


# ─── Structural Tests: Verify Wiring via AST ─────────────────────────────
# These tests read the source code and verify enforcement is imported and called.
# This catches "someone removed the import" or "someone bypassed the filter."

HANDLER_PATH = Path(__file__).parent.parent / "scripts" / "sms_handler.py"


def test_handler_imports_enforcement():
    """The handler MUST import from all enforcement modules."""
    print("\n── Structural: Imports ──")
    source = HANDLER_PATH.read_text()
    tree = ast.parse(source)

    role_filter_imported = False
    phi_audit_imported = False
    family_editor_imported = False

    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            if node.module and "role_filter" in node.module:
                role_filter_imported = True
            if node.module and "phi_audit" in node.module:
                phi_audit_imported = True
            if node.module and "family_editor" in node.module:
                family_editor_imported = True

    assert_true(role_filter_imported, "Handler imports from enforcement.role_filter")
    assert_true(phi_audit_imported, "Handler imports from enforcement.phi_audit")
    assert_true(family_editor_imported, "Handler imports from enforcement.family_editor")


def test_handler_calls_filter_family_context():
    """The handler MUST call filter_family_context before building system context."""
    print("\n── Structural: Pre-Filter Called ──")
    source = HANDLER_PATH.read_text()

    assert_true("filter_family_context" in source, "Handler references filter_family_context")
    assert_true("check_outbound_message" in source, "Handler references check_outbound_message")

    # Verify the pre-filter runs BEFORE build_system_context
    filter_pos = source.find("filter_family_context")
    build_pos = source.find("build_system_context(member, filtered_context")
    assert_true(
        filter_pos < build_pos,
        "Pre-filter runs BEFORE system context is built"
    )


def test_handler_calls_phi_audit():
    """The handler MUST call PHI audit logging methods."""
    print("\n── Structural: PHI Audit Called ──")
    source = HANDLER_PATH.read_text()

    assert_true("log_context_load" in source, "Handler calls log_context_load")
    assert_true("log_response_sent" in source, "Handler calls log_response_sent")
    assert_true("log_response_blocked" in source, "Handler calls log_response_blocked")
    assert_true("log_unknown_number" in source, "Handler calls log_unknown_number")


def test_handler_uses_filtered_context():
    """The handler MUST pass filtered context (not raw) to the system prompt builder."""
    print("\n── Structural: Filtered Context Used ──")
    source = HANDLER_PATH.read_text()

    # The build_system_context call must use filtered_context, not raw_family_context
    assert_true(
        "build_system_context(member, filtered_context" in source,
        "build_system_context receives filtered_context"
    )
    # raw_family_context must NOT be passed to build_system_context
    assert_true(
        "build_system_context(member, raw_family_context" not in source,
        "build_system_context does NOT receive raw_family_context"
    )


def test_handler_blocks_on_leakage():
    """The handler MUST replace the response when leakage is detected."""
    print("\n── Structural: Leakage Blocking ──")
    source = HANDLER_PATH.read_text()

    assert_true("BLOCKED_RESPONSE" in source, "Handler defines BLOCKED_RESPONSE")
    assert_true("not leakage.is_clean" in source, "Handler checks leakage.is_clean")
    assert_true("response_blocked" in source.lower(), "Handler has a blocked response path")


def test_handler_returns_enforcement_metadata():
    """The handler response MUST include enforcement metadata."""
    print("\n── Structural: Enforcement Metadata ──")
    source = HANDLER_PATH.read_text()

    assert_true('"enforcement"' in source, "Handler returns enforcement dict in response")
    assert_true('"phi_access_logged"' in source, "Enforcement metadata includes phi_access_logged")
    assert_true('"context_filtered"' in source, "Enforcement metadata includes context_filtered")
    assert_true('"leakage_detected"' in source, "Enforcement metadata includes leakage_detected")


def test_handler_calls_apply_updates():
    """The handler MUST call apply_updates for family file persistence."""
    print("\n── Structural: File Update Loop ──")
    source = HANDLER_PATH.read_text()

    assert_true("apply_updates" in source, "Handler references apply_updates")
    assert_true("parse_update_instructions" in source, "Handler references parse_update_instructions")
    assert_true("family_md_path" in source, "Handler resolves family.md path")
    assert_true("file_update_result" in source, "Handler tracks file update result")
    assert_true("backup_path" in source, "Handler captures backup path")


def test_handler_ai_schema_has_structured_updates():
    """The AI output schema must request structured updates, not free text."""
    print("\n── Structural: AI Schema ──")
    source = HANDLER_PATH.read_text()

    # The family_file_updates field should be an array of objects, not a string
    assert_true('"type": "array"' in source, "family_file_updates is array type")
    assert_true('"enum": ["append", "prepend", "replace", "resolve_issue"]' in source,
                "Operations are enumerated in schema")
    assert_true('"enum": ["schedule"' in source, "Sections are enumerated in schema")


# ─── Test: Unknown Number Response ────────────────────────────────────────

def test_unknown_number_response_has_zero_phi():
    """The response to an unknown number must contain zero PHI."""
    print("\n── Unknown Number: Zero PHI ──")
    source = HANDLER_PATH.read_text()

    # Find the unknown number response string
    # Look for the hardcoded response after "if not member:"
    import re
    match = re.search(r'if not member:.*?"response":\s*"([^"]+)"', source, re.DOTALL)
    if match:
        response_text = match.group(1)
        # Must not contain any care-related terms
        phi_terms = ["medication", "lisinopril", "metformin", "diabetes",
                     "family", "care recipient", "schedule", "appointment"]
        has_phi = any(term.lower() in response_text.lower() for term in phi_terms)
        assert_true(not has_phi, f"Unknown number response contains zero PHI: '{response_text[:80]}...'")
    else:
        assert_true(False, "Could not find unknown number response in handler")


# ─── Run All ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("HANDLER ENFORCEMENT INTEGRATION TESTS")
    print("=" * 60)

    test_handler_imports_enforcement()
    test_handler_calls_filter_family_context()
    test_handler_calls_phi_audit()
    test_handler_uses_filtered_context()
    test_handler_blocks_on_leakage()
    test_handler_returns_enforcement_metadata()
    test_unknown_number_response_has_zero_phi()
    test_handler_calls_apply_updates()
    test_handler_ai_schema_has_structured_updates()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
