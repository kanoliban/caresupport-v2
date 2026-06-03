# Handle Normalization — International Numbers & Email Contacts

**Bug:** New CareSupport users with international phone numbers or email-based iMessage handles cannot use the agent. International numbers without a leading `+` are silently dropped; email handles are stripped to empty strings and dropped.

**Impact:** Any non-US user, plus any iMessage user reaching the agent from an Apple ID email, is silently rejected at the persistence layer even though the Linq Partner API natively supports both formats.

---

## Root cause

Duplicated phone normalizers, each with identical buggy logic:

| File:line | Function | Used for |
|-----------|----------|----------|
| `convex/careContacts.ts:35` | `normalizeOptionalPhone` | Contacts the user adds via the agent |
| `convex/mutations.ts:107` | `normalizePhone` | Inbound webhook → user/care_case creation |

> Note: the planned `convex/waitlist.ts` normalizer does not exist in this repo;
> only the two above were present.

All three:

```ts
const stripped = raw.replace(/[^\d+]/g, "");
const digits = stripped.replace(/\+/g, "");
if (digits.length < 7) return undefined;
if (stripped.startsWith("+")) return `+${digits}`;
if (digits.length === 10) return `+1${digits}`;
if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
return undefined;   // ← all international without `+` + all emails fall here
```

**Failure 1:** `447911123456` (UK without `+`) → falls through to `undefined`, contact saved with `phone: undefined`.

**Failure 2:** `joe@example.com` → letters and `@` stripped → empty string → `undefined`. Linq API supports email handles for iMessage (per docs: handles are E.164 phones *or* email addresses).

The Linq webhook payload already passes through whatever handle Linq sends (E.164 or email) via `extractSenderPhone` in `convex/lib/linqClient.ts`. The break is only at the normalize/persist layer.

---

## Plan

- [x] 1. Create shared `convex/lib/handles.ts` with `normalizeHandle(raw): string | null`
  - Email branch: trim, lowercase, validate with a conservative regex
  - Phone branch: strip non-digit non-`+`; accept anything 8–15 digits as international E.164 (prepend `+` if missing); preserve existing US-default for bare 10/11-digit input
  - Return `null` on truly invalid input only
- [x] 2. Replace `normalizeOptionalPhone` in `convex/careContacts.ts` with import from `lib/handles.ts`
- [x] 3. Replace `normalizePhone` in `convex/mutations.ts` with delegating wrapper (kept the export name; `handler.ts` and `mutations.test.ts` still import it)
- [~] 4. ~~Replace `normalizePhone` in `convex/waitlist.ts`~~ — file does not exist; nothing to change
- [x] 5. Add unit tests in `convex/lib/handles.test.ts` covering the matrix below
- [x] 6. Reviewed `convex/mutations.test.ts` — existing `698-4328 → null` still holds (min 8 digits); no change needed. `convex/careContacts.test.ts` does not exist.
- [ ] 7. `npx tsc --noEmit` + `npm test` clean — **BLOCKED**: `node_modules` not installed and disk is full (~195 MB free), so `npm install` fails with ENOSPC. Needs disk space freed, then `npm install` + `npx convex dev` (for `_generated/`) before checks can run.
- [ ] 8. Smoke test on `dev` Convex deployment: send a webhook payload with an email sender; add a UK contact via the agent — **BLOCKED** on same.

## Test matrix

| Input | Expected | Note |
|-------|----------|------|
| `+447911123456` | `+447911123456` | UK with `+` — already worked |
| `447911123456` | `+447911123456` | UK without `+` — **bug fix** |
| `+1 (651) 555-1234` | `+16515551234` | US E.164 with formatting |
| `(651) 555-1234` | `+16515551234` | US 10-digit — preserved |
| `16515551234` | `+16515551234` | US 11-digit — preserved |
| `joe@example.com` | `joe@example.com` | **bug fix** |
| `JOE@Example.COM` | `joe@example.com` | normalize case |
| `  joe@example.com  ` | `joe@example.com` | trim |
| `+12` | `null` | too short |
| `not-a-handle` | `null` | invalid |
| `""` / `undefined` | `null` | empty |

## Schema decision (not in this PR)

`users.phone` and `careContacts.phone` are typed `string` and named for phone. Emails will fit in the same column once normalization stops rejecting them — Convex `by_phone` indexes work fine with email keys (any unique string).

**Renaming `phone` → `handle`** across the schema, indexes, and queries is a separate ~6–8 file refactor with a migration. Defer to a follow-up PR.

## Risk

- `careContacts.getByPhone` (`careContacts.ts:86`) currently falls back to raw input when normalization fails — that fallback masks the bug today and continues to work after the fix, but should be re-examined in the schema-rename follow-up.
- `messages.senderPhone` index will receive email keys for the first time once an email-handle user appears. Convex indexes are agnostic to string contents — safe.
- The web signup form uses the same normalizer. Today it returns "Please enter a valid phone number." for international input — after this fix, valid international + emails pass. The form currently asks only for "phone"; copy may want updating in a follow-up, but the data path is correct.

## Out of scope

- Schema rename (`phone` → `handle`)
- Web signup form copy
- UI changes to display email vs phone in contact lists

## Review

**Root cause confirmed at runtime path:** an inbound iMessage from an Apple-ID
email arrives as `senderPhone = "clintonksang@gmail.com"`
(`extractSenderPhone`, `linqClient.ts`). In `handler.ts`, a new sender hits
`createOnboardingUserAndCareCase`, which calls `normalizePhone(email)` → `null`
→ `throw new Error("Cannot normalize phone")`. The whole handler aborts before
any reply is sent. Phone senders normalize fine, so they reply. This matches the
reported symptom exactly.

**Changes:**
- Added `convex/lib/handles.ts` — single `normalizeHandle()` accepting E.164
  phones, bare international numbers (8–15 digits), bare US 10/11-digit, and
  email handles (trim + lowercase + conservative regex). Returns `null` only on
  truly invalid input.
- `convex/mutations.ts` — `normalizePhone` now delegates to `normalizeHandle`
  (export name kept to avoid churn in `handler.ts` / tests; rename deferred).
- `convex/careContacts.ts` — `normalizeOptionalPhone` now delegates.
- Added `convex/lib/handles.test.ts` covering the full test matrix.

**Verification not yet run** — environment blocker (no `node_modules`, disk
full). Once unblocked: `npm install` → `npx convex dev` → `npx tsc --noEmit` →
`npm test`, then the dev smoke test with an email sender.
