# Security Posture

What's enforced, what isn't. Updated as enforcement layers are added.

Last updated: 2026-02-18 (Wave 1)

---

## HIPAA Requirements

| Requirement | Status | How |
|-------------|--------|-----|
| PHI audit trail | ⚠️ Code exists, not wired | `fork/workspace/sdk/utils/phi_audit.py` — Wave 2 Step 1 |
| Access controls (role-based) | ⚠️ Code exists, not wired | `fork/workspace/sdk/utils/role_filter.py` — Wave 2 Step 1 |
| Encryption in transit | ✅ Enforced | HTTPS for all API calls, TLS for SMS via Twilio |
| Encryption at rest | ❌ Not enforced | Filesystem storage, no encryption layer |
| BAA with model provider | ❌ Not in place | Required before production PHI handling |
| BAA with Twilio | ❌ Not in place | Required for SMS containing PHI |
| Breach notification plan | ❌ Not written | Required before production |
| Minimum necessary standard | ⚠️ Prompt-level | Role scoping in system prompt. Not mechanically enforced. |

## Hard Rules (from system prompt)

All 12 hard rules are currently enforced by prompt only. None have mechanical enforcement.

| Rule | Mechanical enforcement | Status |
|------|----------------------|--------|
| No medication changes without caregiver + prescriber | Confirmation pipeline | Wave 2 Step 3 |
| No PHI to unauthorized access levels | Role filter | Wave 2 Step 1 |
| Emergency keyword → emergency protocol | Keyword detector | Wave 2 (future) |
| Log PHI access | PHI audit logger | Wave 2 Step 1 |
| No SSN/CC/insurance ID in family.md | Content scanner | Wave 2 (future) |
| Full access ≠ medication change authority | Confirmation pipeline | Wave 2 Step 3 |
| Emergency access override (documented) | Override logger | Wave 2 (future) |
| Unknown number → zero PHI | Handler check | Implemented, not tested |
| No record deletion/withholding | Edit-only policy | Prompt-level |
| No secrets between authorized members | Prompt-level | Prompt-level |
| Verify medication matches current family file | Pre-send check | Wave 2 (future) |
| Multi-topic messages: address each explicitly | Prompt-level | Prompt-level |

## Authentication & Authorization

| Layer | Status |
|-------|--------|
| Phone → member resolution | ✅ Implemented (JSON lookup) |
| Member → access level | ✅ Implemented (in routing table) |
| Access level → content filtering | ⚠️ Class exists, not wired |
| Agent → family.md isolation | ❌ Prompt-level only |
| Agent → API credentials | ✅ Managed by Tool Gateway |

## Threat Model (high-level)

| Threat | Mitigation | Status |
|--------|-----------|--------|
| Cross-family data leakage | Family isolation (infra-level) | ❌ Prompt-level only |
| Unauthorized PHI access | Role filter | ⚠️ Not wired |
| Medication error from stale data | Pre-send verification | ❌ Not built |
| Social engineering via SMS | Unknown number handling | ✅ Implemented |
| Agent hallucination of medical info | "Never fabricate" hard rule | Prompt-level only |
| family.md corruption | Edit-only policy, backups | ❌ Backups not built |
