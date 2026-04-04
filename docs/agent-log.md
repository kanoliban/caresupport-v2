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

---

## 2026-03-31 — Codex

### What I did
- Removed stale v1 tool instructions from the active runtime prompt content and aligned the active README/CLAUDE docs with the current five-level access model and transitional runtime contract.
- Completed the live member-context loop: `convex/handler.ts` now loads the sender's `members.context` into prompt assembly, and a new `applyMemberContextUpdates` mutation persists `member_updates` into `members.context`.
- Added shared section-update helpers plus lazy member-context initialization from the current member row using the existing member-profile section shape (`Identity`, `Communication Preferences`, `Care Responsibilities`, `Personal Context`, `Interaction History`).
- Made `scripts/seed-from-files.ts` import-safe by gating `main()` behind a direct-execution check so parser tests can import it without hitting a real Convex deployment.
- Added targeted tests for prompt honesty, section-update helpers, member-context persistence, and the seed parser path; re-ran targeted vitest files, the full `npm test` suite, and `npx tsc --noEmit` successfully.

### State I'm leaving
- `convex/handler.ts`, `convex/mutations.ts`, and the new `convex/lib/contextUpdates.ts` now support loading and persisting per-member context without changing the current agent response schema.
- `convex/lib/promptContent.ts`, `README.md`, and `CLAUDE.md` are aligned with the live runtime instead of the old v1 tool story.
- `scripts/seed-from-files.ts` no longer runs seeding work on import, so `tests/seed.test.ts` is hermetic again.
- Verification passed: `npx vitest run convex/lib/contextUpdates.test.ts convex/lib/promptContent.test.ts convex/mutations.test.ts tests/seed.test.ts`, full `npm test`, and `npx tsc --noEmit`.

### What the next agent should know
- `member_updates` still use the existing section-based freeform contract; this tranche did not redesign the JSON schema toward `memberContextUpdate`.
- Lazy member-context initialization only happens when `member_updates` are actually applied. Members without context still do not get empty profile templates injected into prompts.
- The current sender's `members.context` is now part of prompt assembly, but there is still no live tool-call layer for supplementary lookups; the prompt now reflects that honestly.
- There were unrelated pre-existing untracked files in `.claude/skills/`, `docs/STRATEGY.*`, `docs/product-decisions/`, and `images__1_-removebg-preview.png`; this session did not modify them.

### Concerns
- The member-context template is intentionally minimal and section-based to match the existing legacy profile shape. If the product later wants a stricter typed profile contract, that should be a separate schema/prompt redesign rather than folded into this stabilization path.

---

## 2026-04-04 — Codex

### What I did
- Oriented in `~/caresupport-v2`: read the repo `AGENTS.md`, repo napkin, and the latest handoff entries in `docs/agent-log.md`.
- Checked current repo state with `git status --short --branch` and noted a dirty tree on `main`.
- Recorded one session-start process mistake in `.claude/napkin.md` so future sessions read the napkin before inspecting repo state.

### State I'm leaving
- No product code was changed in this pass.
- Working tree is still dirty with pre-existing tracked edits in `CLAUDE.md`, `README.md`, `convex/handler.ts`, `convex/lib/promptContent.ts`, `convex/mutations*.ts`, `docs/agent-log.md`, `scripts/seed-from-files.ts`, plus untracked files under `.claude/skills/`, `docs/STRATEGY.*`, `docs/product-decisions/`, and `images__1_-removebg-preview.png`.

### What the next agent should know
- Repo-local rules require keeping `docs/agent-log.md` current and treating `~/caresupport-v2` as the canonical clone.
- The latest substantive work on this tree was the 2026-03-31 member-context loop and prompt/runtime documentation alignment.

### Concerns
- No task-specific changes or verification were run because the user only provided the repo path so far; wait for concrete direction before touching the existing dirty files.

---

## 2026-04-04 — Codex

### What I did
- Fetched `origin` and verified remote state for `main`.
- Confirmed `HEAD..origin/main` is empty, so this clone is not behind remote and `git pull` would currently be a no-op.
- Reviewed the live handler/prompt path to translate repo state into an execution recommendation.

### State I'm leaving
- Latest remote commit remains `599ffc8` (`2026-03-26`, `Remove leftover v1 CI workflow`).
- The meaningful in-progress work is still local and uncommitted: member-context persistence, prompt/runtime honesty updates, and seed script import-safety.

### What the next agent should know
- The runtime is transitional, not fully “clean-room” aligned to the design doc: `handler.ts` already assembles structured meds/schedule/team/member context, but still packages it as a family-file style prompt plus section-based updates.
- Suggested priority order is: stabilize and commit the local member-context tranche, then reduce prompt/schema drift, then do end-to-end pilot hardening around Family A.

### Concerns
- There is still architectural drift between `docs/design.md` (“no markdown blob”) and the current prompt/update contract (`family_file_updates`, section headers, filtered family file text). Avoid layering more behavior onto that contract without deciding whether to keep or replace it.

---

## 2026-04-04 — Codex

### What I did
- Fixed the approval-reply runtime so YES/NO responses no longer just acknowledge a pending approval; they now resolve it through a new atomic internal mutation in `convex/approvals.ts`.
- Applied approved family-context updates inside that same mutation, so approval status and the approved change persist together.
- Added shared section-key normalization in `convex/lib/sections.ts` and wired it into approval gating, family-context writes, and role-filter parsing so slug keys like `care_recipient` match title-case headers like `## Care Recipient`.
- Updated the Stripe checkout failure message in `convex/handler.ts` to stop claiming “the team has been notified” and instead direct users to `support@caresupport.ai`.
- Added regression coverage for slug/header section matching and for `resolveFromReply` applying an approved pending update to family context.

### State I'm leaving
- Local approval handling is materially safer: the handler now calls `internal.approvals.resolveFromReply` and only tells users “Change applied” after the mutation returns `approved`.
- Full local verification passed: `npx vitest run convex/lib/contextUpdates.test.ts convex/lib/enforcement/approvalPipeline.test.ts convex/mutations.test.ts convex/handler.test.ts`, `npm test`, and `npx tsc --noEmit`.

### What the next agent should know
- The handler still uses the transitional family-file prompt/update contract, but section-key normalization now makes that contract more robust against mixed naming (`Care Recipient` vs `care_recipient`).
- This tranche did not attempt real deployment/webhook smoke tests or broader architecture cleanup; it was limited to approval correctness and runtime truthfulness.

### Concerns
- The broader hybrid architecture still remains: structured tables are assembled into prompt context, but updates still flow through section-based family/member context text. That is stable enough for pilot hardening, not a final design.

---

## 2026-04-04 — Codex

### What I did
- Ran live Family A smoke tests directly against the dev Convex deployment by sourcing `.env.local` and invoking public queries plus `npx convex run handler:handleMessage`.
- Expired two stale pending approvals on dev with `approvals:expireStale`, then created a fresh test approval (`j57brz8xb52r09y29hb8k5t5h9846r0t`) for the coordinator phone `+16517037981`.
- Sent a plain `YES` through the live handler for Liban Kano and captured both the handler response and the resulting deployment state.

### State I'm leaving
- The deployed dev runtime still has the approval trust-break: the live handler replied `Approved: SMOKE approval should resolve on YES. Change applied.` but the approval row remained `pending`.
- Recent dev message history now contains the full repro sequence:
  - inbound `YES j57ajgdr4tw6n3qynng17kp07d82dd2w` -> outbound `That looks like a code or token...`
  - inbound `YES` -> outbound `Approved: ... Change applied.`
- Local code has the fix and tests pass, but that fix is not currently deployed to dev.

### What the next agent should know
- Direct live validation is possible even without a working Linq webhook: `npx convex run handler:handleMessage` reaches the deployed handler and writes real `messages` rows on dev.
- HTTP webhook smoke tests are currently blocked because the local `LINQ_WEBHOOK_SECRET` does not match the secret configured on the dev deployment, so signed POSTs to `/webhook/linq` return `401 invalid_signature`.
- Deploying the local fix to dev is also blocked from this terminal right now because Convex CLI needs an access token / interactive login.

### Concerns
- Family A on the deployed dev environment is still on stale runtime behavior, so pilot trust is blocked until the current local approval fix is actually deployed and re-smoke-tested.

---

## 2026-04-04 — Codex

### What I did
- Re-authenticated the Convex CLI through the interactive `npx convex dev --once --env-file .env.local --typecheck disable` device flow.
- Removed the stale legacy `familyId` field from the dev Family A row with `admin:stripLegacyFields`, which had been blocking schema validation on the dev deployment.
- Synced the current local Convex code onto the dev deployment with `npx convex dev --once --env-file .env.local --typecheck disable`.
- Re-ran the live Family A approval smoke test by sending `YES` through `handler:handleMessage` against the updated deployment.

### State I'm leaving
- The approval fix is now validated on the dev deployment: approval `j57brz8xb52r09y29hb8k5t5h9846r0t` moved from `pending` to `approved` with `resolvedAt` and `resolvedBy` after the live `YES` reply.
- The same reply path still produces the user-facing text `Approved: ... Change applied.`, but it now matches stored state on dev instead of lying.
- The dev family row no longer contains the legacy `familyId` slug field that was breaking schema validation.

### What the next agent should know
- The workable deploy path to the dev deployment from this machine was `npx convex dev --once --env-file .env.local --typecheck disable`, not `convex deploy`; `deploy` and `env list` still reported `MissingAccessToken` in separate noninteractive invocations.
- Direct live validation remains practical via `npx convex run handler:handleMessage '{...}'` plus follow-up state checks in `approvals:listByFamily` and `messages:listByFamily`.
- The Linq webhook secret mismatch is still unresolved; direct signed POSTs to `/webhook/linq` were not re-tested in this tranche.

### Concerns
- Convex CLI auth persistence is still odd on this machine: login works inside `convex dev`, but separate admin-style commands may still fail with `MissingAccessToken`. Treat the `convex dev --once` path as the reliable deploy mechanism here until that is understood.
