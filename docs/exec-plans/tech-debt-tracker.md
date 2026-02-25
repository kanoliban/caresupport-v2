# Tech Debt Tracker

Known gaps, honest. Updated 2026-02-24. Corrected stale statuses from completed Wave 2 steps.

See [CTO Production Plan](active/cto-production-plan.md) for the sequenced strategy to address remaining items.

---

## Critical (blocks production use)

| Item | Location | Impact | Status |
|------|----------|--------|--------|
| role_filter `_redact_sections()` not implemented | `runtime/enforcement/role_filter.py` | PHI could leak to unauthorized members | ✅ Fixed — pre-filter + post-check + 67 tests |
| phi_audit not wired into handler | `runtime/enforcement/phi_audit.py` | No HIPAA audit trail for interactions | ✅ Fixed — all event types wired + 36 tests |
| family_file_updates not applied | `runtime/enforcement/family_editor.py` | Agent generates state updates that evaporate | ✅ Fixed — structured updates, edit-not-write, backup + rollback, 61 tests |
| No confirmation/approval pipeline | `runtime/enforcement/approval_pipeline.py` | Medication changes not gated by human approval | ✅ Fixed — Wave 2 Step 3. classify/resolve/expire, 16 tests |
| Hardcoded `/work/` paths in runtime | `runtime/scripts/*.py` | Scripts break outside specific environment | ✅ Fixed — Wave 1 (runtime/config.py) |
| Anthropic BAA not signed | Legal | Real PHI cannot be used without HIPAA coverage | Open — CTO Plan Phase 1a |
| No CI/CD pipeline | GitHub Actions | Safety modules can be unwired without detection | Open — CTO Plan Phase 1b |
| Two gateway implementations | `runtime/scripts/` | Ambiguity in safety-critical pipeline | Open — CTO Plan Phase 1c |
| No message serialization per family | `runtime/scripts/` | Concurrent messages race on family.md | Open — CTO Plan Phase 1d |

## High (degrades reliability)

| Item | Location | Impact | Status |
|------|----------|--------|--------|
| Zero tests | `runtime/tests/` | No verification that enforcement runs | ✅ Fixed — 117 tests across 8 suites |
| No heartbeat cron (real code) | `runtime/scripts/` | Proactive scanning is conceptual only | ✅ Fixed — Wave 2 Step 4. 48-hour lookahead, 18 tests |
| No family.md pruning agent | `runtime/scripts/` | File grows unbounded over time | ✅ Fixed — Wave 2 Step 5. Maintenance cron, GC + consistency, 17 tests |
| Outreach delivery not verified | `runtime/scripts/poll_inbound.py` | Outreach messages sent without confirmation | Open |
| Two runtime stacks (TS + Python) | `src/index.ts` + `runtime/scripts/` | Unclear which is production path | Open — clarify in ARCHITECTURE.md |
| SOUL.md not finalized | Agent identity | Agent personality undefined for production | Open — CTO Plan Phase 1e |
| user.md schema not defined | Architecture | Per-member context has no spec | Open — CTO Plan Phase 1e |

## Medium (should fix before multi-family)

| Item | Location | Impact | Status |
|------|----------|--------|--------|
| No family isolation enforcement | `runtime/scripts/sms_handler.py` | Prompt-level only, not infrastructure-level | Open |
| No file versioning/backup | — | family.md changes not recoverable | Partial — family_editor has backup-before-write |
| Pipedream integration ID hardcoded | `runtime/scripts/sms_gateway.py` | `custom_api_naaibymprtmspzikubg6zn` is opaque | Open |
| A2P 10DLC registration pending | Twilio | Carrier filtering risk for SMS delivery | Blocked — external |
| Toll-free verification pending | Twilio | Alternative number not yet usable | Blocked — external |
| No real family data | `families/` | All family.md files are synthetic | Open — CTO Plan Phase 2a |
| No OpenClaw deployment | Infrastructure | Handler pipeline only runs locally | Open — CTO Plan Phase 2c |
