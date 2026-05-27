# Handle Normalization — International Numbers & Email Contacts

**Bug:** New CareSupport users with international phone numbers or email-based iMessage handles cannot use the agent. International numbers without a leading `+` are silently dropped; email handles are stripped to empty strings and dropped.

**Impact:** Any non-US user, plus any iMessage user reaching the agent from an Apple ID email, is silently rejected at the persistence layer even though the Linq Partner API natively supports both formats.

---

## Root cause

Three duplicated phone normalizers, each with identical buggy logic:

| File:line | Function | Used for |
|-----------|----------|----------|
| `convex/careContacts.ts:35` | `normalizeOptionalPhone` | Contacts the user adds via the agent |
| `convex/mutations.ts:107` | `normalizePhone` | Inbound webhook → user/care_case creation |
| `convex/waitlist.ts:10` | `normalizePhone` | Web signup form |

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

- [ ] 1. Create shared `convex/lib/handles.ts` with `normalizeHandle(raw): string | null`
  - Email branch: trim, lowercase, validate with a conservative regex
  - Phone branch: strip non-digit non-`+`; accept anything 8–15 digits as international E.164 (prepend `+` if missing); preserve existing US-default for bare 10/11-digit input
  - Return `null` on truly invalid input only
- [ ] 2. Replace `normalizeOptionalPhone` in `convex/careContacts.ts` with import from `lib/handles.ts`
- [ ] 3. Replace `normalizePhone` in `convex/mutations.ts` with import
- [ ] 4. Replace `normalizePhone` in `convex/waitlist.ts` with import
- [ ] 5. Add unit tests in `convex/lib/handles.test.ts` covering the matrix below
- [ ] 6. Update `convex/mutations.test.ts` and `convex/careContacts.test.ts` for new accepted inputs
- [ ] 7. `npx tsc --noEmit` + `npm test` clean
- [ ] 8. Smoke test on `dev` Convex deployment: send a webhook payload with an email sender; add a UK contact via the agent

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

(filled in after implementation)
