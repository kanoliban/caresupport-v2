# Reliability

What's tested, what isn't. What breaks, what recovers.

Last updated: 2026-02-18 (Wave 1)

---

## Test Coverage

| Layer | Tests | Coverage |
|-------|-------|----------|
| Agent reasoning (simulation) | 52 conversations | 99.5% pass rate across 5 families, 14 protocols |
| SMS handler (unit) | 0 | 0% — handler orchestration not unit-tested (structural tests verify wiring) |
| Role filter (unit) | 67 | Section parsing, 4 access levels, pre-filter, post-check, pattern detection |
| PHI audit (unit) | 36 | All event types, HIPAA fields, JSONL format, file location |
| Family editor (unit) | 61 | Append, prepend, replace, resolve_issue, backup, rollback, validation, surgical edits, multi-update |
| Handler enforcement (structural) | 28 | Imports, call sites, data flow, leakage blocking, file update wiring, AI schema, zero-PHI response |
| Phone routing (unit) | 0 | 0% |
| Twilio integration (integration) | 0 | 0% |
| End-to-end (SMS in → SMS out) | 0 | 0% |

The simulation validated the *reasoning*. The enforcement tests now validate *safety plumbing*.

## Failure Modes

| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| Twilio API down | No SMS in or out | None (no health check) | Manual restart |
| AI model unavailable | Handler returns fallback message | Error in response JSON | Automatic fallback text |
| family.md corrupted | Agent responds with wrong context | None (no integrity check) | Manual restore from git |
| family.md grows too large | Context window overflow, degraded responses | None (no size monitor) | Manual pruning |
| Unknown phone number | Generic response sent | Logged in handler | Correct by design |
| Concurrent messages to same family | Potential race condition on family.md | None (no queue) | Designed: per-family queue. Not built. |
| Poll cron misses a message | Message never processed | None | Processed on next poll (if within Twilio retention) |

## Monitoring

| What | How | Status |
|------|-----|--------|
| Inbound message processing | Poll cron stdout | ❌ Not captured |
| Outbound delivery status | Twilio delivery receipts | ❌ Not checked |
| family.md size | Size check in maintenance cron | ❌ Not built |
| PHI access frequency | Audit log analysis | ❌ Not built |
| Agent response latency | Timestamp logging | ❌ Not measured |
| Error rate | Error counting in handler | ❌ Not tracked |

## What's reliable today

1. **Phone → family resolution**: Simple JSON lookup. Hard to break.
2. **SMS send/receive via Twilio proxy**: Tested manually. Works.
3. **AI response generation**: Model produces appropriate responses. Validated in simulation.

## What's not reliable today

Everything else. The handler is a single-threaded script with no error tracking, no delivery verification, no state persistence, no monitoring, and no tests. It works when everything goes right. It has no resilience when anything goes wrong.
