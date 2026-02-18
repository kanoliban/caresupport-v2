# Tech Debt Tracker

Known gaps, honest. Updated after each Wave 2 step.

---

## Critical (blocks production use)

| Item | Location | Impact | Status |
|------|----------|--------|--------|
| role_filter `_redact_sections()` not implemented | `fork/workspace/sdk/utils/role_filter.py` | PHI could leak to unauthorized members | Open — Wave 2 Step 1 |
| phi_audit not wired into handler | `fork/workspace/sdk/utils/phi_audit.py` | No HIPAA audit trail for interactions | Open — Wave 2 Step 1 |
| family_file_updates not applied | `runtime/scripts/sms_handler.py` | Agent generates state updates that evaporate | Open — Wave 2 Step 2 |
| No confirmation/approval pipeline | `runtime/scripts/` | Medication changes not gated by human approval | Open — Wave 2 Step 3 |
| Hardcoded `/work/` paths in runtime | `runtime/scripts/*.py` | Scripts break outside specific environment | ✅ Fixed — Wave 1 (runtime/config.py) |

## High (degrades reliability)

| Item | Location | Impact | Status |
|------|----------|--------|--------|
| Zero tests | `runtime/` | No verification that enforcement runs | Open — Wave 2 Step 6 |
| No heartbeat cron (real code) | — | Proactive scanning is conceptual only | Open — Wave 2 Step 4 |
| No family.md pruning agent | — | File grows unbounded over time | Open — Wave 2 Step 5 |
| Outreach delivery not verified | `runtime/scripts/poll_inbound.py` | Outreach messages sent without confirmation | Open — Wave 2 Step 2 |
| Two runtime stacks (TS + Python) | `src/index.ts` + `runtime/scripts/` | Unclear which is production path | Open — clarify in ARCHITECTURE.md |

## Medium (should fix before multi-family)

| Item | Location | Impact | Status |
|------|----------|--------|--------|
| No family isolation enforcement | `runtime/scripts/sms_handler.py` | Prompt-level only, not infrastructure-level | Open |
| No file versioning/backup | — | family.md changes not recoverable | Open |
| Pipedream integration ID hardcoded | `runtime/scripts/sms_gateway.py` | `custom_api_naaibymprtmspzikubg6zn` is opaque | Open |
| A2P 10DLC registration pending | Twilio | Carrier filtering risk for SMS delivery | Blocked — external |
| Toll-free verification pending | Twilio | Alternative number not yet usable | Blocked — external |
