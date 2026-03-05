"""
Structural Tests — CI-Ready System Integrity Checks
=====================================================
These tests verify the structural integrity of the entire codebase without
running any business logic. They catch wiring mistakes, config violations,
documentation drift, and import hygiene.

Every test is deterministic, fast, and runs without network or env setup.

THE QUESTIONS THESE TESTS ANSWER:
  Does every runtime script import from config.py (no hardcoded paths)?
  Does the handler call role_filter before every send?
  Does the handler call phi_audit for every interaction?
  Does AGENTS.md accurately reflect the current directory structure?
  Are all enforcement modules wired into the handler?
  Do all Python files parse without syntax errors?
"""

import ast
import re
import sys
from pathlib import Path

# ─── Project Paths ────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).parent.parent.parent
RUNTIME = PROJECT_ROOT / "runtime"
SCRIPTS = RUNTIME / "scripts"
ENFORCEMENT = RUNTIME / "enforcement"
TESTS = RUNTIME / "tests"
DOCS = PROJECT_ROOT / "docs"
AGENTS_MD = PROJECT_ROOT / "AGENTS.md"
CONFIG_PY = RUNTIME / "config.py"

sys.path.insert(0, str(RUNTIME))

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


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 1: No hardcoded paths
# ═══════════════════════════════════════════════════════════════════════════

def test_no_hardcoded_paths():
    """Every runtime script must use config.py, not hardcoded absolute paths."""
    print("\n── CHECK 1: No Hardcoded Paths ──")

    # Patterns that indicate hardcoded paths
    bad_patterns = [
        r'["\']/__modal/',          # Modal volume paths
        r'["\']\/work\/',           # /work/ paths
        r'["\']\/home\/',           # /home/ paths
        r'["\']\/tmp\/caresupport', # Hardcoded temp paths
    ]

    scripts_to_check = list(SCRIPTS.glob("*.py")) + list(ENFORCEMENT.glob("*.py"))

    for script in scripts_to_check:
        if script.name.startswith("__"):
            continue

        source = script.read_text()
        found_bad = False

        for pattern in bad_patterns:
            matches = re.findall(pattern, source)
            if matches:
                found_bad = True
                break

        assert_true(not found_bad, f"{script.name}: no hardcoded absolute paths")


def test_handler_imports_config():
    """The handler MUST import from config.py."""
    print("\n── CHECK 1b: Handler Uses Config ──")
    handler = SCRIPTS / "sms_handler.py"
    source = handler.read_text()
    tree = ast.parse(source)

    imports_config = False
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            if node.module and "config" in node.module:
                imports_config = True
                break

    assert_true(imports_config, "sms_handler.py imports from config")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 2: Handler calls role_filter before every send
# ═══════════════════════════════════════════════════════════════════════════

def _get_handle_sms_body() -> str:
    """Extract just the handle_sms function body for position checks."""
    source = (SCRIPTS / "sms_handler.py").read_text()
    # Find the handle_sms function
    start = source.find("async def handle_sms(")
    return source[start:]


def test_handler_pre_filter_before_ai():
    """Role filter PRE-FILTER must run BEFORE the AI call."""
    print("\n── CHECK 2: Role Filter Before Send ──")
    body = _get_handle_sms_body()

    # Find positions within handle_sms body
    pre_filter_pos = body.find("filter_family_context(")
    ai_call_pos = body.find("generate_response(")
    post_check_pos = body.find("check_outbound_message(")
    send_pos = body.find('log_message(from_phone, "OUTBOUND"')

    assert_true(pre_filter_pos > 0, "Pre-filter exists in handler")
    assert_true(pre_filter_pos < ai_call_pos, "Pre-filter runs BEFORE AI call")
    assert_true(post_check_pos > ai_call_pos, "Post-check runs AFTER AI call")
    assert_true(post_check_pos < send_pos, "Post-check runs BEFORE send")


def test_handler_post_check_gates_response():
    """If leakage is detected, the response MUST be replaced with BLOCKED_RESPONSE."""
    print("\n── CHECK 2b: Post-Check Gates Response ──")
    source = (SCRIPTS / "sms_handler.py").read_text()

    assert_in("leakage.is_clean", source, "Handler checks leakage.is_clean")
    assert_in("BLOCKED_RESPONSE", source, "Handler defines BLOCKED_RESPONSE")

    # Blocked path must replace the SMS response
    blocked_section = source[source.find("if not leakage.is_clean"):][:500]
    assert_in("sms_response = BLOCKED_RESPONSE", blocked_section, "Blocked path replaces response")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 3: Handler calls phi_audit for every interaction
# ═══════════════════════════════════════════════════════════════════════════

def test_handler_phi_audit_completeness():
    """PHI audit must log ALL interaction paths."""
    print("\n── CHECK 3: PHI Audit Completeness ──")
    source = (SCRIPTS / "sms_handler.py").read_text()

    # Four audit paths
    assert_in("log_context_load", source, "Handler logs context_load")
    assert_in("log_response_sent", source, "Handler logs response_sent")
    assert_in("log_response_blocked", source, "Handler logs response_blocked")
    assert_in("log_unknown_number", source, "Handler logs unknown_number")

    # Unknown number logged in the handler's early return path
    body = _get_handle_sms_body()
    unknown_section = body[:body.find("return {") + 200]
    assert_in("log_unknown_number", unknown_section, "Unknown number logged in early return")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 4: All enforcement modules wired
# ═══════════════════════════════════════════════════════════════════════════

def test_all_enforcement_modules_exist():
    """All enforcement modules exist as separate files."""
    print("\n── CHECK 4: Enforcement Modules Exist ──")
    expected_modules = [
        "role_filter.py",
        "phi_audit.py",
        "family_editor.py",
        "approval_pipeline.py",
        "message_lock.py",
    ]

    for module in expected_modules:
        path = ENFORCEMENT / module
        assert_true(path.exists(), f"enforcement/{module} exists")


def test_handler_imports_all_enforcement():
    """The handler must import from ALL enforcement modules."""
    print("\n── CHECK 4b: Handler Imports All Enforcement ──")
    source = (SCRIPTS / "sms_handler.py").read_text()
    tree = ast.parse(source)

    imported_modules = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            if "enforcement." in node.module:
                module_name = node.module.split(".")[-1]
                imported_modules.add(module_name)

    expected = {"role_filter", "phi_audit", "family_editor", "approval_pipeline", "message_lock"}
    for module in expected:
        assert_true(module in imported_modules, f"Handler imports enforcement.{module}")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 5: AGENTS.md accuracy
# ═══════════════════════════════════════════════════════════════════════════

def test_agents_md_reflects_structure():
    """AGENTS.md must accurately list key files and directories."""
    print("\n── CHECK 5: AGENTS.md Accuracy ──")
    assert_true(AGENTS_MD.exists(), "AGENTS.md exists at project root")
    agents_content = AGENTS_MD.read_text()

    # Key files that MUST be mentioned
    key_items = [
        "ARCHITECTURE.md",
        "QUALITY_SCORE.md",
        "SECURITY.md",
        "RELIABILITY.md",
        "config.py",
        "sms_handler",
        "enforcement",
        "design-docs/",
        "exec-plans/",
        "product-specs/",
    ]

    for item in key_items:
        assert_in(item, agents_content, f"AGENTS.md mentions {item}")


def test_agents_md_mentions_enforcement():
    """AGENTS.md must reference the enforcement layer."""
    print("\n── CHECK 5b: AGENTS.md Enforcement ──")
    agents_content = AGENTS_MD.read_text()

    # Should mention the enforcement layer or modules
    assert_true(
        "enforcement" in agents_content.lower() or "role_filter" in agents_content,
        "AGENTS.md references enforcement layer"
    )


def test_agents_md_key_rules():
    """AGENTS.md must include critical rules about config and safety."""
    print("\n── CHECK 5c: AGENTS.md Key Rules ──")
    agents_content = AGENTS_MD.read_text()

    assert_in("config.py", agents_content, "AGENTS.md mentions config.py rule")
    assert_in("QUALITY_SCORE.md", agents_content, "AGENTS.md mentions QUALITY_SCORE.md rule")
    assert_in("mechanical", agents_content.lower(), "AGENTS.md mentions mechanical enforcement")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 6: All Python files parse
# ═══════════════════════════════════════════════════════════════════════════

def test_all_python_files_parse():
    """Every .py file must parse without syntax errors."""
    print("\n── CHECK 6: Python Syntax ──")
    all_py = list(RUNTIME.rglob("*.py"))

    parse_failures = []
    for py_file in all_py:
        try:
            ast.parse(py_file.read_text())
        except SyntaxError as e:
            parse_failures.append(f"{py_file.name}: {e}")

    assert_eq(len(parse_failures), 0, f"All {len(all_py)} Python files parse cleanly")
    if parse_failures:
        for f in parse_failures:
            print(f"    ⚠ {f}")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 7: Test coverage exists for every enforcement module
# ═══════════════════════════════════════════════════════════════════════════

def test_every_enforcement_module_has_tests():
    """Every enforcement module must have a corresponding test file."""
    print("\n── CHECK 7: Test Coverage ──")
    enforcement_modules = [f.stem for f in ENFORCEMENT.glob("*.py")
                           if not f.name.startswith("__")]

    test_files = [f.stem for f in TESTS.glob("test_*.py")]

    for module in enforcement_modules:
        has_test = any(module in tf for tf in test_files)
        assert_true(has_test, f"enforcement/{module}.py has test coverage")


def test_every_cron_script_has_tests():
    """Heartbeat and maintenance scripts must have tests."""
    print("\n── CHECK 7b: Cron Test Coverage ──")
    cron_scripts = ["heartbeat", "maintenance"]

    test_files = [f.stem for f in TESTS.glob("test_*.py")]

    for script in cron_scripts:
        has_test = any(script in tf for tf in test_files)
        assert_true(has_test, f"scripts/{script}.py has test coverage")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 8: Documentation exists for every major component
# ═══════════════════════════════════════════════════════════════════════════

def test_quality_docs_exist():
    """Quality/security/reliability docs must exist and be non-empty."""
    print("\n── CHECK 8: Documentation ──")
    required_docs = [
        DOCS / "QUALITY_SCORE.md",
        DOCS / "SECURITY.md",
        DOCS / "RELIABILITY.md",
    ]

    for doc in required_docs:
        assert_true(doc.exists(), f"{doc.name} exists")
        if doc.exists():
            content = doc.read_text()
            assert_true(len(content) > 100, f"{doc.name} is non-trivial (>{len(content)} chars)")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 9: Approval pipeline mechanically decides (not the agent)
# ═══════════════════════════════════════════════════════════════════════════

def test_approval_is_mechanical():
    """Approval decisions must be based on APPROVAL_REQUIRED set, not agent output."""
    print("\n── CHECK 9: Mechanical Approval ──")
    source = (ENFORCEMENT / "approval_pipeline.py").read_text()

    assert_in("APPROVAL_REQUIRED", source, "Approval rules defined as constant set")
    assert_in('"medications"', source, "Medications in approval set")

    # The handler must call classify_updates, not trust the agent
    handler_source = (SCRIPTS / "sms_handler.py").read_text()
    assert_in("classify_updates", handler_source, "Handler calls classify_updates (mechanical)")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 10: No circular imports between enforcement modules
# ═══════════════════════════════════════════════════════════════════════════

def test_no_circular_enforcement_imports():
    """Enforcement modules must have clean dependency order."""
    print("\n── CHECK 10: No Circular Imports ──")
    # role_filter: no enforcement deps
    # phi_audit: no enforcement deps
    # family_editor: no enforcement deps (uses its own logic)
    # approval_pipeline: imports from family_editor (one-way)

    role_filter_src = (ENFORCEMENT / "role_filter.py").read_text()
    phi_audit_src = (ENFORCEMENT / "phi_audit.py").read_text()
    family_editor_src = (ENFORCEMENT / "family_editor.py").read_text()
    approval_src = (ENFORCEMENT / "approval_pipeline.py").read_text()

    # role_filter should not import from other enforcement modules
    assert_true("from enforcement.phi_audit" not in role_filter_src, "role_filter doesn't import phi_audit")
    assert_true("from enforcement.family_editor" not in role_filter_src, "role_filter doesn't import family_editor")
    assert_true("from enforcement.approval_pipeline" not in role_filter_src, "role_filter doesn't import approval_pipeline")

    # phi_audit should not import from other enforcement modules
    assert_true("from enforcement.role_filter" not in phi_audit_src, "phi_audit doesn't import role_filter")

    # family_editor should not import approval_pipeline
    assert_true("from enforcement.approval_pipeline" not in family_editor_src, "family_editor doesn't import approval_pipeline")

    # approval_pipeline CAN import family_editor (one-way dependency)
    assert_in("from enforcement.family_editor", approval_src, "approval_pipeline imports family_editor (correct direction)")


# ═══════════════════════════════════════════════════════════════════════════
# CHECK 11: Handler enforcement order
# ═══════════════════════════════════════════════════════════════════════════

def test_handler_enforcement_order():
    """The handler enforcement steps must execute in the correct order."""
    print("\n── CHECK 11: Enforcement Order ──")
    body = _get_handle_sms_body()

    # Find positions within handle_sms body only
    positions = {
        "resolve_phone": body.find("resolve_phone(from_phone)"),
        "approval_check": body.find("_handle_approval_response("),
        "filter_context": body.find("filter_family_context("),
        "log_context": body.find("log_context_load("),
        "generate_response": body.find("generate_response("),
        "check_outbound": body.find("check_outbound_message("),
        "classify_updates": body.find("classify_updates("),
    }

    # All steps must exist
    for step, pos in positions.items():
        assert_true(pos > 0, f"Handler has {step} step")

    # Order must be: resolve → approval_check → filter → log → generate → check → classify
    order_checks = [
        ("resolve_phone", "approval_check"),
        ("approval_check", "filter_context"),
        ("filter_context", "log_context"),
        ("log_context", "generate_response"),
        ("generate_response", "check_outbound"),
        ("check_outbound", "classify_updates"),
    ]

    for before, after in order_checks:
        assert_true(
            positions[before] < positions[after],
            f"{before} runs before {after}"
        )


# ═══════════════════════════════════════════════════════════════════════════
# RUN ALL
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("STRUCTURAL INTEGRITY TESTS")
    print("=" * 60)

    # CHECK 1: No hardcoded paths
    test_no_hardcoded_paths()
    test_handler_imports_config()

    # CHECK 2: Role filter before every send
    test_handler_pre_filter_before_ai()
    test_handler_post_check_gates_response()

    # CHECK 3: PHI audit for every interaction
    test_handler_phi_audit_completeness()

    # CHECK 4: All enforcement modules wired
    test_all_enforcement_modules_exist()
    test_handler_imports_all_enforcement()

    # CHECK 5: AGENTS.md accuracy
    test_agents_md_reflects_structure()
    test_agents_md_mentions_enforcement()
    test_agents_md_key_rules()

    # CHECK 6: Syntax
    test_all_python_files_parse()

    # CHECK 7: Test coverage
    test_every_enforcement_module_has_tests()
    test_every_cron_script_has_tests()

    # CHECK 8: Documentation
    test_quality_docs_exist()

    # CHECK 9: Mechanical approval
    test_approval_is_mechanical()

    # CHECK 10: No circular imports
    test_no_circular_enforcement_imports()

    # CHECK 11: Enforcement order
    test_handler_enforcement_order()

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {_passed} passed, {_failed} failed")
    print(f"{'=' * 60}")

    sys.exit(1 if _failed > 0 else 0)
