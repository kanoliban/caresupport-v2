# Agent Log — CareSupport v2

Append-only shift-change log. Both Claude and Codex write here after every session.
Read the last 2-3 entries before starting work.

---

## 2026-03-05 — Claude

### What I did
- Completed v1→v2 schema alignment: 69 type errors → 0, 187 tests passing
- Rewrote `schema.ts` (239 lines), `mutations.ts`, `handler.ts`, and 18 other files
- Three design decisions: access tier bridging (`mapAccessLevel`), `messages` not `conversations`, `familyId` optional on audit
- Created `AGENTS.md`, `docs/codex-handoff.md`, updated `CLAUDE.md`

### State I'm leaving
- `npx tsc --noEmit`: 0 errors
- `npm test`: 187/187 passing
- Working tree: 21 modified + 2 untracked files, all unstaged
- Last commit on main: `0584d25`
- Nothing deployed. No PR created yet.

### What the next agent should know
- All changes are unstaged. Read `docs/codex-handoff.md` for file-by-file summary.
- `promptContent.ts` still uses v1 output field names — that's intentional, separate migration.
- `docs/training-pipeline.md` is untracked from a previous session — include in any commit.
- Seed script reads from `fork/workspace/families/kano/routing.json` and maps v1 roles at runtime.

### Concerns
- `VISION.md` is stale (last updated Feb 19). Open questions that are now answered elsewhere haven't been backfilled.
- `RELIABILITY.md` predates the Convex migration — may need a rewrite.
- Claude SDK choices (extended thinking, prompt caching, structured output via `extractJson`) are implemented but not documented in prose. Only exists in `convex/lib/anthropicClient.ts`.

---

## 2026-03-06 — Codex

### What I did
- Added and pushed family-isolation fix commit `2dd701e` on `feat/v1-v2-schema-alignment`.
- Re-verified `npx tsc --noEmit` and `npm test` after that patch.
- Cleared legacy prod seed data via Convex CLI by replacing each existing table with an empty JSON array.
- Deployed prod successfully with `npx convex deploy --typecheck=disable`.
- Seeded prod successfully against `https://keen-raccoon-606.convex.cloud`.
- Ran a smoke test by posting a signed `message.received` webhook to the prod HTTP action for Liban's seeded chat.

### State I'm leaving
- PR #27 includes the family-isolation fix and is pushed.
- Prod Convex deployment `keen-raccoon-606` is on the current branch code.
- Prod has fresh Kano pilot seed data loaded.
- Smoke test produced an accepted webhook, inbound/outbound `messages` rows, `context_load` and `response_sent` audit rows, and successful Convex function executions with no runtime errors.

### What the next agent should know
- Convex prod deploy needed `--typecheck=disable` because Convex CLI still typechecks vitest files and trips on `import.meta.glob` even when repo `tsc` is clean.
- The fastest safe prod reset path was CLI-based: import `[]` with `--replace` for each existing table, including legacy v1 tables.
- Smoke test was webhook-simulated, not a physical phone interaction. It exercised the live prod handler and Linq send path.

### Concerns
- The smoke-test response quality is expected for the current architecture: the handler does not yet load structured table data (`scheduleItems`, `medications`) into the prompt, so the answer quality is limited until that future feature lands.
- `tests/seed.test.ts` still imports the seed script in a way that can write to a real Convex deployment during `npm test`.

---

## 2026-03-06 — Codex

### What I did
- Fixed approval routing in `convex/handler.ts` so pending approvals use family coordinator phone numbers instead of the requester phone.
- Added `internal.mutations.getCoordinators(familyId)` in `convex/mutations.ts`, backed by the `members.by_family` index and filtered on `isCoordinator`.
- Re-ran `npx tsc --noEmit` successfully after the patch.

### State I'm leaving
- `convex/handler.ts` and `convex/mutations.ts` are updated locally with the approval routing fix.
- `npx tsc --noEmit` passes on the current working tree.

### What the next agent should know
- The coordinator lookup returns phone numbers only; members without a phone are skipped.
- No schema or test files were changed for this fix.

### Concerns
- If a family has zero coordinators with phone numbers, approvals will be created with an empty `approverPhones` array; this patch does not add fallback behavior.

---

## 2026-03-06 — Codex

### What I did
- Patched the outreach loop in `convex/handler.ts` so a missing outreach target from `getMemberByPhone` writes an audit row before skipping the send attempt.
- Logged the failure as `message_failed` with `recipientPhone` and `failureReason: "outreach target not found"` in `details`.
- Re-ran `npx tsc --noEmit` successfully after the change.

### State I'm leaving
- `convex/handler.ts` now leaves a traceable audit event instead of silently dropping null-member outreach targets.
- `.claude/napkin.md` includes a note to reuse existing audit detail fields for small handler fixes.
- `npx tsc --noEmit` passes on the current working tree.

### What the next agent should know
- The fix is intentionally minimal: no schema changes, no test changes, and the outreach loop still treats failures as best-effort.
- The new audit log uses the target phone both as the top-level `phone` field and as `details.recipientPhone`.

### Concerns
- The outreach loop still logs `outreach_sent` before target resolution, so one outreach attempt can now produce both `outreach_sent` and `message_failed` audit rows when the target phone does not resolve.

---

## 2026-03-06 — Codex

### What I did
- Replaced the unsafe `member.accessLevel as AccessLevel` cast in `convex/handler.ts` with a shared runtime guard from `convex/lib/enforcement/types.ts`.
- Defaulted invalid access levels to `"limited"` and logged a `response_blocked` audit event with `failureReason` noting the bad stored value.
- Re-ran `npx tsc --noEmit` successfully after the patch.

### State I'm leaving
- `convex/handler.ts`, `convex/lib/enforcement/types.ts`, and `convex/lib/enforcement/index.ts` are updated locally for fail-closed access-level handling.
- `npx tsc --noEmit` passes on the current working tree.

### What the next agent should know
- The new guard is exported from the enforcement module so other runtime DB entry points can reuse the same canonical access-level list.
- This fix is intentionally narrow: no schema changes and no test-file edits.

### Concerns
- I only ran `npx tsc --noEmit` because that was the requested verification step; no broader test run was done in this session.

---

## 2026-03-06 — Codex

### What I did
- Added `extractReplyTo` in `convex/lib/linqClient.ts` and covered it in `convex/lib/linqClient.test.ts`.
- Threaded Linq `reply_to.message_id` through `convex/http.ts` into `internal.handler.handleMessage` as optional `replyToMessageId`.
- Updated `convex/handler.ts` to resolve the replied-to message via `internal.mutations.getMessageByLinqId` and prepend `[Replying to: "..."] ` context before routing and prompt construction.
- Re-ran `npx vitest run convex/lib/linqClient.test.ts` and `npx tsc --noEmit` successfully.

### State I'm leaving
- `convex/lib/linqClient.ts`, `convex/lib/linqClient.test.ts`, `convex/http.ts`, and `convex/handler.ts` are updated locally for iMessage reply threading support.
- Reply context is prompt-only: inbound message logging, approval detection, and audit trigger text still use the original user message body.
- Targeted helper tests and TypeScript checks pass on the current working tree.

### What the next agent should know
- The new extractor returns both `messageId` and `partIndex`, but only `messageId` is used downstream right now per the requested scope.
- The quoted reply prefix normalizes whitespace and truncates the referenced message body to 200 characters with `...` if needed.
- No schema changes or new tables were introduced; the implementation reuses `messages.by_linq_message_id`.

### Concerns
- Reply context is message-level only for now; if Linq multi-part bubbles need part-specific quoting later, `partIndex` is already available but unused.

---

## 2026-03-06 — Codex

### What I did
- Added mechanical markdown stripping in `convex/handler.ts` via `stripMarkdown`, applied immediately after `extractJson`, and covered it in `convex/handler.test.ts`.
- Changed outbound pacing so `sendResponse` computes the initial delay from bubble count, while `convex/lib/linqClient.ts` now caps responses at 3 bubbles and uses dynamic inter-bubble delays based on the next bubble's length.
- Updated `convex/lib/linqClient.test.ts` for the 3-bubble cap and added timer-based coverage for the new pacing delays.
- Re-ran `npx vitest run convex/handler.test.ts convex/lib/linqClient.test.ts` and `npx tsc --noEmit` successfully.

### State I'm leaving
- `convex/handler.ts`, `convex/lib/linqClient.ts`, `convex/handler.test.ts`, and `convex/lib/linqClient.test.ts` are updated locally for the SMS UX fixes.
- `.claude/napkin.md` now records that SMS UX constraints should be enforced mechanically in the send path, not only in prompts.
- Targeted tests and TypeScript checks pass on the current working tree.

### What the next agent should know
- `sendResponse` now applies the initial response delay itself; main AI replies pass the earlier `pacingStart`, while other helper-triggered replies use the default start time and therefore still get a human-ish pause.
- `stripMarkdown` is intentionally narrow: it removes headers, list prefixes, and paired `**`, `__`, and `*` markers without attempting full Markdown parsing.

### Concerns
- I did not run full `npm test` because this repo's seed-related tests are not hermetic and can hit a real Convex deployment; only the targeted vitest files plus `tsc` were verified in this session.
