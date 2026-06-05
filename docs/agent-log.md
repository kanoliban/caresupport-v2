# Agent Log — CareSupport v2

Append-only shift-change log. Both Claude and Codex write here after every session.
Read the last 2-3 entries before starting work.

---

## 2026-06-05 — Codex

### What I did
- Hardened `internal.admin.getRobControlledLoopReport` so live pass evidence
  cannot be satisfied by stale dry-run state.
- The report now:
  - ignores old dry-run messages when no current sent outreach attempt exists
  - requires Rob status messages/audits to be at or after the latest controlled
    caregiver reply when replies exist
  - returns only fresh Rob status message ids in the report
- Added regression coverage for the sequence:
  dry-run, reset, live-style caregiver reply, stale status blocked, fresh Rob
  status update accepted.
- Updated the activation checklist to document the fresh-status pass criterion.

### Validation
- `npm test -- convex/robActivation.test.ts --reporter verbose` passed: 10 tests.
- `npm run typecheck` passed.
- `npm test` passed: 25 files / 296 tests.
- `git diff --check` passed.

### State I'm leaving
- No live Convex data was seeded.
- No Linq messages were sent.
- The controlled-loop report is safer for the real test-number run because a
  stale dry-run Rob update can no longer make a live run appear successful.

### Concerns
- Live activation still needs the external test-number inputs and the intended
  Convex deployment before actual iMessage/Linq outreach can be verified.

---

## 2026-06-05 — Codex

### What I did
- Merged PR #66 (`feat(coordination): add Rob controlled loop report`) into
  `main`.
- Added `internal.admin.resetRobControlledLoopAfterDryRun`.
- The reset handles the handoff from no-Linq proof to real test-number outreach:
  - cancels controlled dry-run outreach attempts
  - restores Jim/Jennifer as pending on the controlled event
  - removes dry-run confirmation/decline state for those contacts on the event
  - clears controlled contacts' dry-run last-reply pointers when they point at
    dry-run messages
  - does not delete messages/audits and does not send Linq/iMessage traffic
- Updated `docs/rob-multiplayer-activation.md` so the operator sequence is:
  dry-run report passes, reset, readiness returns true, then live test-number
  outreach.
- Updated the Phase 2G tracker with the reset command.

### Validation
- `npm test -- convex/robActivation.test.ts --reporter verbose` passed: 9 tests.
- `npm run typecheck` passed.
- `npm test` passed: 25 files / 295 tests.
- `git diff --check` passed.

### State I'm leaving
- No live Convex data was seeded.
- No Linq messages were sent.
- The activation path now has a clean transition from simulated Convex proof to
  real test-number outreach.
- Live activation remains gated on Rob's coordinator phone/chat id, two approved
  test numbers or Linq chat ids, and the intended Convex deployment.

### Concerns
- The dry-run rows are retained for audit/history, but dry-run attempts are
  marked `cancelled` by the reset so the real test-number run can create fresh
  sent outreach evidence.

---

## 2026-06-05 — Codex

### What I did
- Added `internal.admin.getRobControlledLoopReport`.
- The report inspects persisted Convex state for the Rob controlled loop instead
  of simulating anything:
  - Rob user/care case status
  - controlled coordination event
  - sent outreach attempts
  - source-linked outbound caregiver messages
  - source-linked inbound caregiver replies
  - event reply state
  - cleared/deferred follow-up clocks
  - Rob status message/audit evidence
  - accidental extra care cases for controlled caregiver phone numbers
- Updated `docs/rob-multiplayer-activation.md` to require the report before live
  test-number outreach or real Rob caregiver numbers.
- Updated the Phase 2G tracker with the report command.

### Validation
- `npm test -- convex/robActivation.test.ts --reporter verbose` passed: 8 tests.
- `npm run typecheck` passed.
- `npm test` passed: 25 files / 294 tests.
- `git diff --check` passed.

### State I'm leaving
- No live Convex data was seeded.
- No Linq messages were sent.
- The code can now answer whether the controlled Rob multiplayer loop has enough
  persisted evidence to proceed.
- Live activation is still gated on Rob's coordinator phone/chat id, two approved
  test numbers or Linq chat ids, and the intended Convex deployment.

### Concerns
- A no-Linq dry run can pass with `live_reply_audit_missing:*` warnings because
  webhook-only reply audits require real Linq/iMessage inbound traffic. Those
  warnings should disappear in the real test-number run.

---

## 2026-06-05 — Codex

### What I did
- Added `internal.admin.runRobControlledLoopDryRun`.
- The dry run refuses to execute unless `getRobMultiplayerReadiness` is clear.
- When ready, the dry run exercises the seeded Rob fixture through:
  - pending outreach creation
  - exact approval
  - sent outreach state with dry-run Linq ids
  - inbound caregiver reply logging
  - reply mapping into contact/event/outreach state
  - Rob status message/audit row creation
- Updated `docs/rob-multiplayer-activation.md` with the no-Linq dry-run command.
- Updated Phase 2G test targets with the three operational commands.

### Validation
- `npm test -- convex/robActivation.test.ts --reporter verbose` passed.
- `npm run typecheck` passed.
- `npm test -- convex/followUps.test.ts convex/outreachAttempts.test.ts convex/contactReplies.test.ts --reporter verbose` passed.
- `npm test` passed: 25 files / 291 tests.

### State I'm leaving
- No live Convex data was seeded.
- No Linq messages were sent.
- This adds one more safe operational step before real test-number outreach.

### Concerns
- The dry run writes rows into the target Convex deployment. It should only be
  run against dev/test deployments unless the team intentionally wants those
  dry-run audit/message rows in the selected deployment.

---

## 2026-06-05 — Codex

### What I did
- Created branch `liban/rob-activation-readiness` from merged `main`.
- Added `internal.admin.getRobMultiplayerReadiness`.
- The readiness check verifies:
  - Rob user/care case exists and is active
  - Rob has a chat id for coordinator updates
  - all Rob fixture contacts exist
  - all Rob fixture schedule rows exist
  - the controlled Jim/Jennifer event exists and is open/waiting
  - controlled contacts are active, textable, consented, pending on the event,
    and not using generated placeholder fixture phones
- Updated `docs/rob-multiplayer-activation.md` with the readiness command and
  the rule that `readyForControlledOutreach` must be true before sending.
- Added test coverage proving generated fixture phones block controlled outreach
  until explicit test numbers are installed.

### Validation
- `npm test -- convex/robActivation.test.ts --reporter verbose` passed.
- `npm run typecheck` passed.

### State I'm leaving
- No live Convex data was seeded.
- No Linq messages were sent.
- The remaining live activation inputs are Rob's coordinator phone/chat id and
  two approved test numbers/chats for the controlled Jim/Jennifer run.

### Concerns
- This does not complete live activation; it prevents unsafe activation from
  proceeding with placeholder fixture numbers.

---

## 2026-06-04 — Codex

### What I did
- Started Phase 2G preparation on branch `liban/rob-activation-setup`, stacked
  on the Phase 2F follow-up scanner branch while PR #62 waits for CodeRabbit.
- Added `internal.admin.seedRobMultiplayerFixture`.
- The fixture creates/updates:
  - Rob's active coordinator user and care case
  - 15 Rob care contacts with roles, schedule context, textability, and priority
  - 5 recurring schedule rows for known routine coverage
  - one controlled coordination event for Jim/Jennifer schedule confirmation
  - one durable memory note explaining the multiplayer activation purpose
- Added `docs/rob-multiplayer-activation.md` with the controlled activation
  checklist and commands.
- Added `convex/robActivation.test.ts` to prove fixture idempotency and a seeded
  controlled loop through approval, outreach, caregiver reply mapping, and
  Convex state update.

### Validation
- `npm test -- convex/robActivation.test.ts --reporter verbose` passed.

### State I'm leaving
- No live Convex data was seeded.
- No Linq messages were sent.
- Real caregiver activation remains gated on approved test numbers/chat IDs and
  a controlled test run.

### Concerns
- The fixture includes 15 non-Rob contacts because Rob's supplied care network
  list is larger than the earlier 12-13 shorthand. Real outreach should still
  start with two contacts, not the whole network.

---

## 2026-06-04 — Codex

### What I did
- Merged PR #61 into `main`, making structured care retrieval the baseline.
- Created branch `liban/follow-up-scanner` for Phase 2F.
- Added the coordination follow-up scanner:
  - sent outreach now gets a first `nextActionAt` follow-up clock
  - due sent outreach can produce one caregiver reminder
  - caregiver replies clear the reminder clock or defer it when the reply asks
    CareSupport to check later
  - due coordination events can produce a concise status update back to the
    primary coordinator
  - follow-up sends/skips are logged as messages and audit rows
- Wired `internal.reminders.dispatchCoordinationFollowUps` into Convex cron every
  15 minutes.
- Added `convex/followUps.test.ts` to validate due discovery, one-shot reminders,
  reply clearing/deferral, coordinator status updates, and Linq dispatch.
- Marked Phase 2F complete in `tasks/coordination-phase-2.md`.

### Validation
- `npm test -- convex/followUps.test.ts --reporter verbose` passed.
- `npm run typecheck` passed.
- `npm test -- convex/followUps.test.ts convex/outreachAttempts.test.ts convex/contactReplies.test.ts convex/coordinationLoop.test.ts convex/handler.test.ts --reporter verbose` passed.

### State I'm leaving
- The multiplayer loop can now continue after initial outreach instead of
  stopping at "I asked them."
- The scanner does not contact fallback caregivers automatically; it tells Rob
  what remains open and asks who to text next.
- If `LINQ_API_TOKEN` is missing, due follow-ups are not cleared.

### Concerns
- This is still engine-level activation. Phase 2G must seed/create Rob's real
  care case, contacts, and a controlled live-test checklist before using real
  caregiver numbers.

---

## 2026-06-03 — Codex

### What I did
- Merged PR #60 into `main`, making confirmed claim promotion the current
  baseline.
- Created branch `liban/structured-care-retrieval` for the 2E2 structured
  retrieval slice.
- Added `convex/lib/knowledge/retrieveCareContext.ts` as a structured-only
  retrieval interface before installing Convex RAG.
- Added `internal.mutations.retrieveStructuredCareContext` as the stable runtime
  entrypoint.
- Returned current truth, unresolved claims, reference snippets, and source
  links as separate sections.
- Added tests proving:
  - unresolved Rob-network claims return with source ids
  - older message history can be retrieved as reference context
  - current structured contact truth remains separate from older references
  - unresolved claims can be omitted from retrieval context
- Updated the Phase 2 task tracker to mark only the structured retrieval pieces
  complete; RAG indexing, namespaces, filters, and evals remain deferred.

### Validation
- `npm test -- convex/lib/knowledge/retrieveCareContext.test.ts --reporter verbose` passed.
- `npm run typecheck` passed.

### State I'm leaving
- No `@convex-dev/rag` dependency has been added.
- No Pinecone or external vector database has been introduced.
- The retrieval boundary is now ready for future Convex-native RAG behind the
  same return contract.

### Concerns
- This slice proves retrieval shape and source separation, not live model
  decision quality. The next RAG/eval slice should show whether retrieved
  references improve a concrete response or next-step decision.

---

## 2026-06-03 — Codex

### What I did
- Merged PR #59 into `main`, making unresolved-claim prompt context and the Rob
  clarification simulator the current baseline.
- Created branch `liban/confirmed-claim-promotion` for the next 2E1 slice.
- Added explicit promotion target fields to `careClaims` so source links can run
  from source message -> claim -> promoted current-truth row.
- Added `api.careClaims.promoteConfirmed`.
- Implemented deterministic promotion routing:
  - contact/relationship/role/availability/constraint claims promote into
    `careContacts`
  - schedule claims promote into `coordinationEvents`
  - preference, coordination-rule, and other claims promote into `memoryEntries`
- Added idempotency so rerunning promotion does not duplicate current truth.
- Added tests for confirmed availability -> contact, preference -> memory,
  schedule -> coordination event, blocked unconfirmed/inactive promotion, and
  blocked superseded promotion.

### Validation
- `npm test -- convex/careClaims.test.ts --reporter verbose` passed.
- `npm run typecheck` passed.
- `npm test -- convex/careClaims.test.ts convex/robCareNetworkClarification.test.ts convex/coordinationLoop.test.ts convex/contactReplies.test.ts convex/outreachAttempts.test.ts convex/handler.test.ts convex/mutations.test.ts` passed.
- Full suite passed: 22 files / 278 tests.
- `git diff --check` passed.

### State I'm leaving
- The claim layer now supports the full first loop:
  source message -> claim -> clarification/confirmation -> promotion into
  current truth.
- No Convex RAG dependency has been added.
- Promotion is intentionally narrow and deterministic; it does not yet parse
  recurring schedule patterns into calendar instances.

### Concerns
- Promotion currently stores source links on the claim and, for memory, in the
  memory source string. Some current-truth tables may eventually need richer
  provenance fields if the UI needs to show "why does CareSupport know this?"
  directly from those rows.

---

## 2026-06-03 — Codex

### What I did
- Merged PR #58 into `main`, making `careClaims` the current foundation.
- Created branch `liban/unresolved-claims-context` for the next 2E1 slice.
- Added unresolved claim retrieval into `getCompiledPromptContext`.
- Extended `buildCareCaseContext` with a new `## Unconfirmed Understanding`
  section that loads active `heard`, `inferred`, and `needs_clarification`
  claims without treating them as current truth.
- Updated model doctrine so `careClaims` are described as heard/inferred
  learning evidence, not confirmed truth.
- Added prompt-context coverage to `convex/careClaims.test.ts`.
- Added `convex/robCareNetworkClarification.test.ts`, which simulates Rob
  giving messy care-network fragments and asserts that CareSupport asks
  accuracy-seeking clarification questions before creating contacts, events, or
  outreach.

### Validation
- `npm test -- convex/careClaims.test.ts convex/robCareNetworkClarification.test.ts convex/lib/promptContent.test.ts --reporter verbose` passed.
- `npm run typecheck` passed.
- `npm test -- convex/careClaims.test.ts convex/robCareNetworkClarification.test.ts convex/coordinationLoop.test.ts convex/contactReplies.test.ts convex/outreachAttempts.test.ts convex/handler.test.ts convex/mutations.test.ts` passed.
- Full suite passed: 22 files / 274 tests.
- `git diff --check` passed.

### State I'm leaving
- Unresolved claims now appear in compiled prompt context as uncertainty.
- The Rob simulator proves the correct first move is clarification, not
  premature graph promotion or outreach.
- Confirmed-claim promotion into `careContacts`, `coordinationEvents`, and
  `memoryEntries` remains the next implementation slice.

### Concerns
- The simulator is deterministic and does not call the live model. It validates
  runtime/prompt-context contracts, not provider output quality.

---

## 2026-06-02 — Codex

### What I did
- Opened Phase 2E as PR #57:
  `https://github.com/kanoliban/caresupport-v2/pull/57`.
- Created stacked branch `liban/care-claims-learning-layer` from the Phase 2E
  branch.
- Added the first CareSupport learning layer implementation:
  - new `careClaims` table in Convex schema
  - `convex/careClaims.ts` lifecycle API
  - source-message validation
  - care-case boundary validation
  - claim status transitions for confirm, reject, contradict, supersede, and
    archive
- Added `convex/careClaims.test.ts` to prove messy fragments can become
  source-linked claims without changing current truth.
- Updated generated Convex API bindings with `npx convex codegen`.

### Validation
- `npm test -- convex/careClaims.test.ts --reporter verbose` passed.
- `npm run typecheck` passed.
- `npm test -- convex/careClaims.test.ts convex/coordinationLoop.test.ts convex/contactReplies.test.ts convex/outreachAttempts.test.ts convex/handler.test.ts` passed.
- Full suite passed: 21 files / 272 tests.

### State I'm leaving
- `careClaims` exists as evidence/learning state only.
- No promotion into `careContacts`, `coordinationEvents`, `memoryEntries`, or
  schedule state has been added yet.
- No Convex RAG dependency has been added.

### Concerns
- `npx convex codegen` required network access because the CLI attempted a
  telemetry/deployment-state call. It completed successfully after escalation.
- The next slice should add unresolved-claim prompt context and then the Rob
  care network clarification simulator.

---

## 2026-06-02 — Codex

### What I did
- Added `docs/caresupport-learning-retrieval-implementation.md` as the
  implementation-facing plan for CareSupport learning and Convex-native
  retrieval.
- Defined learning as source-linked, revisable understanding that can be
  clarified, confirmed, promoted into current truth, retrieved later, and
  audited.
- Proposed the new `careClaims` layer:
  - heard
  - inferred
  - needs clarification
  - confirmed
  - rejected
  - contradicted
  - superseded
  - archived
- Defined the minimal retrieval interface that can start structured-only and
  later be backed by Convex RAG.
- Added the next implementation phases to `tasks/coordination-phase-2.md`:
  - `2E1 — CareSupport Learning / Claim Layer`
  - `2E2 — Convex-Native Retrieval / RAG Spike`
- Added the new document to `AGENTS.md` canonical docs.

### Validation
- `git diff --check` passed.

### State I'm leaving
- The next implementation PR should start with `careClaims` and the Rob care
  network clarification simulator, not with a RAG dependency.
- Convex RAG is now explicitly sequenced after the claim layer and structured
  retrieval interface.

### Concerns
- Sensitive claims such as dementia context need a product decision around
  whether they can be stored as `needs_clarification` before explicit
  confirmation, or whether explicit confirmation is required before any durable
  storage.

---

## 2026-06-02 — Codex

### What I did
- Added `convex/coordinationLoop.test.ts`, a deterministic transcript-style
  simulator for the Phase 2E one-to-many loop.
- The test simulates:
  - Rob describing a Monday 9-5 coverage need
  - model-structured contact/event setup
  - pending outreach creation
  - coordinator approval
  - approved outbound outreach being marked sent
  - caregiver inbound reply resolution by Linq chat id
  - partial availability being applied to source-linked current truth
  - coordinator-facing status being stored as an outbound message
- The simulator result asserts:
  - event remains `waiting`
  - no false confirmation is created
  - Angela and Marcus remain pending
  - last reply status is `partial`
  - last reply source body is the stored caregiver message
  - compiled prompt context contains the last reply status
  - outreach/request/approval/sent/reply audit events exist
  - the coordinator update message is linked to the contact/event/attempt

### Validation
- `npm test -- convex/coordinationLoop.test.ts --reporter verbose` passed.
- `npm test -- convex/coordinationLoop.test.ts convex/contactReplies.test.ts convex/outreachAttempts.test.ts convex/handler.test.ts` passed.
- `npm run typecheck` passed.
- Full suite passed: 20 files / 268 tests.

### State I'm leaving
- Phase 2E now has transcript-style validation for the core coordination loop
  through messages and Convex state only.
- I left the reusable "CareSupport can summarize who replied / pending / open"
  acceptance item unchecked because this test proves the state can support that
  message, but it does not introduce a production summary API.

### Concerns
- The test intentionally avoids live model and Linq calls. It validates the
  runtime contract and state transitions, not model quality or provider delivery.

---

## 2026-06-02 — Codex

### What I did
- Continued Phase 2E agent/context hardening after the Convex memory/retrieval
  policy slice.
- Added optional source/current-truth fields to `careContacts` and
  `coordinationEvents`:
  - last reply status/message/time
  - availability source message/time
  - coordination event last reply contact/message/status/time
- Hardened caregiver reply classification and deterministic state transitions:
  - clear yes -> confirmed contact on event
  - clear no -> declined contact on event
  - partial availability -> updates contact availability without confirming
  - deferred reply -> keeps contact pending and sets a later next action when
    possible
  - wrong number / stop-texting -> disables future texting and removes the
    contact from pending coverage
- Linked caregiver reply state changes back to the stored inbound `messages` row.
- Added last-reply status to compiled prompt context so the model can summarize
  partial/deferred/declined state without a UI.
- Added prompt guidance for care contact replies so model behavior matches the
  runtime guardrails.
- Expanded `convex/contactReplies.test.ts` for source-linked partial,
  wrong-number, deferred, and confirmation behavior.

### Validation
- `npm test -- convex/contactReplies.test.ts` passed.
- `npm test -- convex/handler.test.ts convex/mutations.test.ts` passed.
- `npm test -- convex/lib/promptContent.test.ts convex/contactReplies.test.ts convex/handler.test.ts convex/mutations.test.ts` passed.
- `npm run typecheck` passed.
- Full suite passed: 19 files / 267 tests.

### State I'm leaving
- Phase 2E now has source-linked current truth for caregiver reply handling.
- Remaining Phase 2E work is the broader transcript-style loop test and the
  minimal retrieval interface definition before any Convex RAG spike.
- No RAG dependency was added.

### Concerns
- This slice keeps source links directly on current records. If source history
  grows beyond "last reply" semantics, introduce a narrow fact/decision-trace
  table rather than overloading current-state rows.

---

## 2026-06-02 — Codex

### What I did
- Reviewed Obssa's memory/retrieval concern as a technical architecture question,
  distinct from the product context graph.
- Confirmed the current repo uses custom Convex tables plus custom prompt
  compilation, not `@convex-dev/rag`, `@convex-dev/agent`, Pinecone, or
  LangSmith runtime infrastructure.
- Added `docs/convex-memory-retrieval-architecture.md` to define the current
  memory/retrieval policy:
  - structured Convex truth first
  - messages/audits as the operational record
  - `memoryEntries` for durable human/care context
  - semantic retrieval for fuzzy or historical reference
  - Convex-native RAG before external vector infrastructure
  - Pinecone only after measured Convex-native limits
- Added the new architecture doc to `AGENTS.md` canonical docs.
- Updated `tasks/coordination-phase-2.md` with a completed 2E0 memory/retrieval
  policy slice and revised Phase 2E acceptance criteria.

### State I'm leaving
- No runtime code changed.
- The next implementation phase remains Phase 2E agent/context hardening.
- The RAG question is now explicit and gated: do source-linked current truth and
  transcript-loop tests first; run a Convex RAG spike only if those tests show
  older/fuzzy context is being missed.

### What the next agent should know
- Do not add Pinecone or Convex RAG by default.
- Before adding any retrieval dependency, define a small retrieval interface,
  care-case-scoped namespaces, source links, filters, and eval questions.
- Current truth must remain in typed Convex tables; semantic retrieval may add
  reference context but must not override structured state.

### Concerns
- Two unrelated tracked web UI files were already locally modified and were left
  untouched: `web/app/_components/feature-sections.tsx` and
  `web/app/_components/iphone/message-bubble.tsx`.
- The repo also has unrelated untracked local files that were not included.

---

## 2026-05-19 - Codex

### What I did
- Created branch `codex/family-runtime-alignment`.
- Committed the documentation/product alignment pass as `7944f77`.
- Updated runtime prompt and handler boundary language so unsupported third-party coordination is framed as "not executable yet," not as a solo-only product identity.
- Added `careContacts` and `coordinationEvents` Convex tables, scoped CRUD/list modules, care-case isolation checks for cross-contact references, admin reset/count support, and prompt-context rendering for active contacts plus open/waiting coordination events.
- Added regression coverage for contact scoping, coordination-event scoping, prompt context rendering, and updated boundary wording.

### State I'm leaving
- Runtime work is committed locally as `44bf59e`.
- Verification passed:
  - `npx vitest run convex/careContacts.test.ts convex/coordinationEvents.test.ts convex/mutations.test.ts convex/handler.test.ts convex/lib/promptContent.test.ts convex/lib/pipeline/promptBuilder.test.ts`
  - `npx tsc --noEmit`
  - `npm test` (236/236 passing)
- `npm install` was run because `node_modules` was absent in this checkout.
- `CONVEX_DEPLOYMENT=prod:keen-raccoon-606 npx convex codegen --typecheck disable` generated local Convex bindings. The command reported "Uploading functions to Convex"; no data reset/import/destructive command was run.

### What the next agent should know
- `careContacts` and `coordinationEvents` now exist as substrate and are loaded into prompt context when present.
- The model still cannot create contacts/events from structured output. There is no outbound outreach and no tool execution.
- Next implementation step should be a narrow model-write path for contact/event capture, or `toolActions` + `userToolPermissions` if moving toward approved outreach.

### Concerns
- Because Convex codegen was pointed at the prod deployment name to get generated types on this machine, verify deployment state before assuming prod is still exactly on `origin/main`.
- Do not add outbound messaging to caregivers until permission rules, persisted action state, provider failure handling, and audit records exist.

---

## 2026-05-19 - Codex

### What I did
- Reviewed issue #52, the canonical docs, the newer Rob/product/tool docs, and the current open PR list (#50 agent-log only, #28 Claude workflow only).
- Realigned the active docs around CareSupport as a multiplayer, one-to-many family care coordination runtime with the solo thread as the current wedge, not the final identity.
- Updated `README.md`, `CLAUDE.md`, `SOUL.md`, `docs/design.md`, `AGENTS.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, `docs/onboarding.md`, `docs/concierge-beta.md`, and `docs/product-specs/sms-care-coordination.md`.
- Added missing architecture notes for `docs/integrations-and-tool-bearing-agent.md` and `docs/research-integration-architecture.md`.
- Updated archive banners in `docs/ARCHIVE.md`, `docs/PRODUCT_STRATEGY.md`, and `docs/VISION.md` so old docs are stale for dashboard/network/family.md assumptions, not because family coordination is no longer active direction.

### State I'm leaving
- This is a documentation/architecture alignment pass only. No runtime code or tests were changed.
- `git diff --check` passes.
- The current runtime still enforces a solo-thread boundary in prompts and handler behavior.

### What the next agent should know
- Product direction is now explicit: family care agent, text-native coordination runtime, one-to-many orchestration, tool-bearing assistant.
- Current implementation remains `users` + `careCases` + `messages` + care records + memory + audit logs.
- Future code should introduce `careContacts`, `coordinationEvents`, `toolActions`, `connectedAccounts`, `externalRefs`, and `userToolPermissions` only behind concrete product loops and tests.

### Concerns
- `convex/lib/promptContent.ts`, `convex/lib/pipeline/promptBuilder.ts`, and `convex/handler.ts` still contain solo-only product language and blocking behavior. That is acceptable for the current runtime, but it is now the main runtime/doc mismatch to address when implementation moves beyond the wedge.
- Do not ship outbound outreach or tools by prompt copy alone. The runtime needs permission checks, persisted action state, provider adapters, failure handling, and audit logs first.

---

## 2026-05-18 — Codex

### What I did
- Pulled `main` forward to `5d3139e` after repairing local corrupted remote refs (`origin/main 2` and duplicate `*.lock` remote-ref files were moved aside under `/tmp/caresupport-git-ref-backup`).
- Read the updated canonical direction (`AGENTS.md`, `docs/DECISIONS.md`, `docs/design.md`, `docs/product-thesis.md`) and the new Rob/family-care planning docs.
- Reviewed recent merged PRs #39-#47, open PR #50, and open issue #49 via GitHub CLI.

### State I'm leaving
- Local `main` matches `origin/main` at `5d3139e`.
- `docs/agent-log.md` has this session note appended per repo convention.
- A previous local stash named `codex-agent-log-before-pull` still exists with older Poke/OpenPoke research log entries from before the pull; it was not reapplied because the upstream agent log has moved on.

### What the next agent should know
- The active runtime remains solo beta by repo instruction, but current product thinking now distinguishes the solo beta from the broader family-care assistant thesis.
- The Rob docs define the real long-term target as operational, one-to-many coordination that reduces Rob's physical interaction burden, with future primitives like `careContacts`, `coordinationEvents`, permissioned playbooks, and closed-loop coverage-gap handling.
- Immediate implementation pressure is issue #49: the daily digest cron shipped, but time-precise one-off reminders via `ctx.scheduler.runAt` are still missing.

### Concerns
- The pulled repo contains a live strategic tension: `AGENTS.md` still says do not re-center active implementation around multiplayer, while the new Rob/product docs make clear that multiplayer coordination is the deeper product direction. Treat that as sequencing, not contradiction: do not ship outreach without an explicit decision, but design current primitives so they can grow toward coordination.

---

## 2026-05-15 — Claude

### What I did
- Pulled 7 days of prod data from `keen-raccoon-606` (13 care cases, full transcripts) and audited the live agent against three Daisy-identified failure modes; surfaced three more from the data.
- Wrote `docs/research/2026-05-15-7day-prod-review.md` — six findings, prioritized fix list, prod evidence per finding.
- Filed parent tracking issue [#29](https://github.com/kanoliban/caresupport-v2/issues/29) and nine Codex-ready child issues [#30](https://github.com/kanoliban/caresupport-v2/issues/30)–[#38](https://github.com/kanoliban/caresupport-v2/issues/38) with a strict template: Context · Current behavior (file:line + prod evidence) · Desired behavior · Implementation plan · Acceptance criteria · Out of scope · Dependencies · Verification.
- Added labels: `priority:p0/p1/p2`, `codex-ready`, `area:prompt/cron/schema/onboarding/safety`, `tracking`.

### State I'm leaving
- No code changed. Report and issues are the only artifacts.
- Cross-links between the 9 children are correct (verified by spot-check on #34). Each issue's "Out of scope" section is anchored to `AGENTS.md` non-goals so Codex doesn't re-expand toward multiplayer.

### What the next agent should know
- **Start with #30 and #31** — both are prompt-only with no code dependencies, and they unblock everything else.
- **Do not ship #34 (cron) before #30, #32, and #33 land** — the cron query depends on date-injected ISO output and clean validated/backfilled data. The tracking issue (#29) has the dependency graph drawn out.
- Two critical findings worth re-reading the report for: (a) the model has **no current-date awareness** in the prompt at all, which is the root cause of half the other bugs; (b) `scheduleItems.date` is a free string with literal values like `"today"`, `"Monday"`, and wrong-year ISO dates from the model's 2025 training-data prior.

### Concerns
- The Apr 28 Minnebar cohort (29 care cases stuck in onboarding) is dead weight in the metrics. Consider archiving them before re-baselining onboarding completion rate after #36 ships.
- #33 (backfill) assumes we want to interpret `_creationTime` as the anchor for "today"/"tomorrow"/"Monday" resolution. That's the right call for most rows but could be wrong if a user said "next Monday" 5 days before the next Monday. The fix is "good enough"; perfect is the enemy.

---

## 2026-04-13 — Codex

### What I did
- Tightened the memory persistence contract so CareSupport no longer saves inferred emotional support summaries as durable `care_note` entries by default.
- Added code-side filtering in `convex/lib/memory.ts` and `convex/mutations.ts` to reject support-style / emotional-paraphrase memory proposals and suppress near-duplicate memory content before insert.
- Strengthened model-facing instructions in `convex/lib/promptContent.ts` and `convex/lib/pipeline/promptBuilder.ts` so the model prefers structured records and explicit long-term memory over vague emotional summaries.
- Added regression tests covering the new boundary: inferred emotional notes are rejected, concrete care facts still persist, and prompt copy preserves the rule.
- Re-ran `npx vitest run convex/mutations.test.ts convex/lib/promptContent.test.ts convex/lib/pipeline/promptBuilder.test.ts`, `npx tsc --noEmit`, and the full `npm test` suite successfully.

### State I'm leaving
- The live production logs from Liban/Degitu showed that structured save and retrieval worked, but memory was over-eager and duplicative around caregiver-burden summaries.
- The local repo now contains the fix for that behavior, verified in tests, but it has not been deployed yet in this session.

### What the next agent should know
- The current memory rule is intentional: empathy is fine, but inferred emotional summaries and “be warm/patient” coaching should not become durable memory automatically.
- If future product work wants to remember emotional state, it should be explicit and deliberate, not a side effect of supportive responses.

### Concerns
- The current fix is intentionally narrow. It solves the observed production failure mode without inventing a full training pipeline abstraction.

---

## 2026-04-13 — Codex

### What I did
- Replaced the active Convex schema and runtime contract with a solo-native core built around `users`, `careCases`, `messages`, `medications`, `scheduleItems`, `memoryEntries`, and `auditLogs`.
- Removed legacy active-model files and concepts tied to the family/network product path, including `families`, `members`, `approvals`, `careTeam`, `outreachThreads`, product-mode helpers, and enforcement modules that only existed for the multiplayer model.
- Rewrote the handler, prompt pipeline, admin/reset path, and seed script so CareSupport now reads and writes deterministic solo-care state instead of relying on family-file style updates.
- Updated the durable docs (`docs/DECISIONS.md`, `docs/design.md`, `docs/ROADMAP.md`) so future agents can see that the active architecture changed, not just the product copy.
- Re-ran `npx tsc --noEmit` and `npm test`; both passed after closing the final typecheck issues in `convex/handler.ts` and `convex/lib/pipeline/responseParser.ts`.

### State I'm leaving
- The repo now encodes the solo beta as both the product wedge and the active deterministic foundation.
- The current runtime no longer depends on legacy family-network entities to onboard, remember context, or persist care records.
- Verification is green on the local working tree: `npx tsc --noEmit` and `npm test` both pass.

### What the next agent should know
- Do not reintroduce `families` / `members` compatibility layers unless there is an explicit new product decision in `docs/DECISIONS.md`.
- The current architectural question has been answered in code: the active system is `user + careCase + messages + care records + memory + audit`.
- If future work extends memory or care records, extend the current deterministic core directly rather than rebuilding a markdown context blob abstraction.

### Concerns
- This was a hard cutover of the active model. Any deployment/reset should be treated as a schema-changing operational event and validated on dev before prod, even though prod was previously emptied.

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

---

## 2026-04-04 — Codex

### What I did
- Verified the last failing Family A dev scenario after the new member-profile fallback was synced to dev: sent `Please save this to my profile for future messages: I prefer text updates after 8 PM and very short bullet-style messages.` through `handler:handleMessage` for Liban Kano.
- Confirmed the live handler no longer gives a false save acknowledgement: it replied `Already in your profile — no changes needed.` once the preference was already present.
- Queried `members:getByPhone` on dev and confirmed `members.context` now contains the actual saved preference under `## Communication Preferences`.
- Re-ran the local verification for the patch: `npx vitest run convex/handler.test.ts convex/mutations.test.ts` and `npx tsc --noEmit`.

### State I'm leaving
- The last known live Family A failure is closed: explicit save-to-profile requests now persist the requested communication preference in `members.context` on dev instead of only seeding the profile scaffold.
- Local code and the dev deployment are aligned on this fix, but the git working tree still has the validated patch and notes unstaged until the next commit.
- The repo napkin now records an operational rule from user feedback: do not trigger Convex device auth on this machine again without warning and explicit approval first.

### What the next agent should know
- The member-profile safeguard is implemented in three places:
  - `convex/lib/pipeline/promptBuilder.ts` tells the model to populate `member_updates` for explicit save/remember requests and forbids claiming a profile save without it.
  - `convex/handler.ts` has `inferExplicitMemberProfileUpdate(...)` as a fallback if the model still returns no `member_updates`.
  - `convex/handler.test.ts` covers the explicit save-to-profile and future-reference cases.
- The live dev response for the repeat Liban test was `Already in your profile — no changes needed.` and the stored member context includes `- I prefer text updates after 8 PM and very short bullet-style messages.` under `## Communication Preferences`.
- If another deploy becomes necessary from this machine, warn the user first because `npx convex dev --once --env-file .env.local --typecheck disable` can trigger a browser/device auth flow again.

### Concerns
- Webhook-path validation is still not complete because the dev `LINQ_WEBHOOK_SECRET` mismatch has not been resolved; current live validation is via `npx convex run handler:handleMessage`.

---

## 2026-04-13 — Codex

### What I did
- Implemented the solo-beta pivot in the active runtime and docs instead of treating it as a planning-only exercise.
- Added `productMode` support to `families` in `convex/schema.ts`, `convex/families.ts`, and `convex/admin.ts`.
- Set `createOnboardingFamily` to create `"New Care Profile"` accounts in `productMode: "solo_beta"` with solo-beta onboarding context in `convex/mutations.ts`.
- Added `convex/lib/productMode.ts` and made missing or unknown product modes default to `solo_beta` so the runtime is restrictive even before a database wipe.
- Updated `convex/handler.ts` to block multiplayer behavior in solo beta:
  - suppress outreach, care-team additions, upgrade prompts, and non-self routing updates
  - replace those requests with a fixed single-user boundary response
  - log blocked attempts as `response_blocked` with `failureReason: "solo_beta_multiplayer_request"`
- Updated `convex/lib/promptContent.ts` and `convex/lib/pipeline/promptBuilder.ts` so the active prompt now frames CareSupport as a solo caregiver beta, free during beta, centered on one user managing one loved one's care.
- Added and updated tests for the new behavior:
  - `convex/lib/productMode.test.ts`
  - `convex/handler.test.ts`
  - `convex/mutations.test.ts`
  - `convex/lib/pipeline/promptBuilder.test.ts`
- Added reset tooling in `scripts/reset-convex.sh` plus `npm run reset:dev` / `npm run reset:prod`.
- Rewrote the active product docs toward solo beta:
  - `docs/design.md`
  - `docs/ROADMAP.md`
  - `docs/onboarding.md`
  - `docs/product-specs/sms-care-coordination.md`
  - `docs/concierge-beta.md`
- Added status notes to legacy strategy docs (`docs/PRODUCT_STRATEGY.md`, `docs/VISION.md`) so they no longer read like the active product definition.
- Verified the implementation locally with:
  - `npx vitest run convex/lib/productMode.test.ts convex/handler.test.ts convex/mutations.test.ts convex/lib/pipeline/promptBuilder.test.ts`
  - `npx tsc --noEmit`
  - `npm test`

### State I'm leaving
- The repo now defaults to the solo-beta product path at runtime. If an existing family row has no `productMode`, it is treated as `solo_beta`, not family coordination.
- Multiplayer/family coordination logic still exists in the codebase, but it is no longer the active product path for unspecified or newly created accounts.
- The implementation is local only right now. I did not run a Convex deploy/sync in this tranche, and I did not run the destructive dev/prod reset scripts.
- The working tree still contains the pivot changes plus unrelated pre-existing untracked files outside this tranche (`.claude/skills/`, `docs/STRATEGY.*`, `docs/product-decisions/`, `images__1_-removebg-preview.png`).

### What the next agent should know
- The active product is now intentionally:
  - one user
  - one loved one / care situation
  - no invites, outreach, group-chat behavior, or team management in the active beta path
- The safest enforcement point is the runtime default: `getEffectiveProductMode(undefined)` now returns `solo_beta`.
- The reset tooling exists but has not been exercised yet:
  - `npm run reset:dev`
  - `npm run reset:prod`
- If a deploy/sync is needed from this machine, warn the user first before any `npx convex dev --once ...` flow because that can trigger device/browser auth again.

### Concerns
- The pivot is implemented in code and active docs, but not yet operationally completed because the required Convex data reset and deployment are destructive steps that still need an explicit go-ahead.
- Older deep strategy/reference docs still contain family/multi-network language. The current mitigation is status notes plus updated active docs, not a full archive pass across every historical document.

---

## 2026-04-13 — Codex

### What I did
- Added a repo-local [AGENTS.md](/Users/libankano/caresupport-v2/AGENTS.md) so future agents inherit the active product direction from the repository itself instead of stale global/default context.
- Added [docs/DECISIONS.md](/Users/libankano/caresupport-v2/docs/DECISIONS.md) to record the pivot as a durable product decision with explicit non-goals and revisit criteria.
- Added [docs/ARCHIVE.md](/Users/libankano/caresupport-v2/docs/ARCHIVE.md) and strengthened archive banners in [docs/PRODUCT_STRATEGY.md](/Users/libankano/caresupport-v2/docs/PRODUCT_STRATEGY.md) and [docs/VISION.md](/Users/libankano/caresupport-v2/docs/VISION.md) so they stop competing with the active solo-beta docs.
- Refactored the solo-beta enforcement in [convex/handler.ts](/Users/libankano/caresupport-v2/convex/handler.ts) into `applySoloBetaProductBoundary(...)` so the product boundary is directly testable.
- Added regression coverage that proves solo beta strips outreach, upgrades, and member-creation side effects instead of relying only on prompt instructions.
- Re-ran local verification:
  - `npx vitest run convex/handler.test.ts convex/lib/productMode.test.ts convex/lib/pipeline/promptBuilder.test.ts convex/lib/promptContent.test.ts convex/mutations.test.ts`
  - `npx tsc --noEmit`
  - `npm test`

### State I'm leaving
- The repo now has four anti-dilution layers:
  - repo-local agent instructions
  - durable decision log
  - archive boundary for legacy strategy docs
  - runtime/test enforcement of the solo-beta product boundary
- The active docs and tests now point to the solo-beta wedge consistently.
- The code is still local only until the next commit/push/deploy step.

### What the next agent should know
- Start from `AGENTS.md` and `docs/DECISIONS.md`, not legacy strategy documents.
- If someone proposes reactivating multiplayer/team behavior, that should be treated as a new product decision, not an incidental code change.
- The remaining operational steps are still unchanged:
  - commit
  - deploy updated runtime
  - reset dev
  - validate solo onboarding on clean data
  - then repeat for prod if approved

### Concerns
- This solves direction drift inside the repo, but it does not yet make the pivot live. Deploy/reset is still the boundary between “well-documented local implementation” and “actual running product.”

---

## 2026-04-13 — Codex

### What I did
- Deployed the solo-beta runtime to the dev Convex deployment using the only reliable path on this machine: `npx convex dev --once --env-file .env.local --typecheck disable`.
- Discovered the repo reset script's original `convex import --env-file ...` approach was not operational here because fresh-process Convex admin commands fail with `401 MissingAccessToken`.
- Replaced the reset mechanism with an internal admin mutation, `admin:clearAppData`, and updated `scripts/reset-convex.sh` to target deployments by explicit deployment name rather than `--env-file`.
- Found the working run/reset path for this machine:
  - authenticate/sync with `npx convex dev --once --env-file .env.local --typecheck disable`
  - use `npx convex run <fn> --deployment-name <name>` for follow-up admin commands
- Wiped the dev deployment and verified zero counts across:
  - `families`
  - `members`
  - `messages`
  - `medications`
  - `scheduleItems`
  - `approvals`
  - `auditLogs`
  - `lessons`
  - `careTeam`
  - `outreachThreads`
- Ran a clean dev solo-beta smoke flow with synthetic input through the real `handler:handleMessage` path:
  - unknown number created a single onboarding family
  - second message captured user name + care recipient
  - appointment reminder request persisted a `scheduleItems` row
  - add-member request was blocked without creating members/outreach
- During the clean dev smoke test, found a new false-confirmation bug:
  - explicit “save this to my profile” messaging could still reply “Saved” while no new preference text was persisted
- Fixed that bug by adding `ensureExplicitMemberProfileUpdate(...)` in `convex/handler.ts`, so explicit save requests append an inferred member update unless the exact content is already present.
- Re-synced dev and re-ran the exact profile-save message; confirmed the preference now appears in `members.context` under `## Communication Preferences`.
- Deployed the updated runtime to the prod Convex deployment with `npx convex deploy --typecheck disable -y` from the authenticated shell.
- Wiped prod using `npx convex run admin:clearAppData --deployment-name keen-raccoon-606`.
- Verified prod table counts are now zero across all core app tables.

### State I'm leaving
- Dev is on the solo-beta runtime and has been clean-smoke-tested successfully after the profile-save fix.
- Prod is on the solo-beta runtime and all app data has been cleared.
- Prod has not been repopulated with synthetic smoke data; it is intentionally empty after the restart.
- The repo contains the deploy/reset operational fix (`admin:clearAppData` + updated `scripts/reset-convex.sh`) but that work is not committed yet in this session.

### What the next agent should know
- The active product direction remains the same:
  - one user
  - one loved one / care situation
  - one 1:1 thread
  - no active multiplayer behavior
- The reliable Convex operational pattern on this machine is:
  1. `npx convex dev --once --env-file .env.local --typecheck disable`
  2. `npx convex run <function> --deployment-name <deployment-name>`
- `--env-file` works for the `convex dev --once` sync, but it was not reliable for follow-up `convex run` / `convex import` admin commands here.
- The explicit profile-save regression is fixed mechanically in `convex/handler.ts`; do not weaken that fallback without replacing it with another hard guarantee.

### Concerns
- Prod has been reset cleanly, but there has not yet been a real post-reset iMessage conversation on prod. The next real user message will effectively be the first production validation on the restarted system.

---

## 2026-05-19 — Codex

### What I did
- Merged `origin/main` into `codex/family-runtime-alignment` after main advanced with the integrations/research docs and the prompt fix from PR #51.
- Resolved conflicts by keeping the newer tool-bearing integration architecture docs from main, then folding in the current runtime status for `careContacts` and `coordinationEvents`.
- Preserved the PR #51 prompt correction that removed unsupported reminder/push-follow-up claims.
- Preserved the family-runtime branch wording that third-party outreach is a current runtime boundary, not a permanent product prohibition.
- Re-ran local verification:
  - `npx tsc --noEmit`
  - `npm test`

### State I'm leaving
- Branch `codex/family-runtime-alignment` includes the latest `origin/main` through `91d8fbe`.
- The staged merge keeps the documentation alignment work and the new care coordination substrate intact.
- Local verification passes: TypeScript has 0 errors and Vitest reports 17 files / 234 tests passing.
- The working tree still has pre-existing untracked duplicate/archive files with ` 2` in their names; I left them untouched.

### What the next agent should know
- PR #53 is the active branch for family runtime alignment.
- The runtime now has `careContacts` and `coordinationEvents` substrate, but no outbound third-party messaging, external tool execution, provider sync, or reusable permission model yet.
- The prompt should continue saying CareSupport cannot contact others yet, not that contacting others is outside the product.

### Concerns
- The next implementation tranche should add tool action lifecycle and permission primitives before any assistant copy claims calendar changes, caregiver outreach, or autonomous follow-up.

---

## 2026-05-19 — Codex

### What I did
- Synced merged `main` to the dev Convex deployment after PR #53 merged.
- Reconfigured this checkout to the existing Convex project and dev deployment `valiant-tortoise-962`; Convex wrote a local ignored `.env.local`.
- The first sync attempt failed because stale dev rows still had legacy schema fields (`auditLogs.accessLevel`).
- Cleared dev app data with `admin:clearAppData` on `valiant-tortoise-962`; no prod command was run.
- Re-ran `npx convex dev --once --typecheck disable`; sync succeeded.
- Ran live dev smoke tests through Convex:
  - `admin:tableCounts` confirmed dev started empty after reset.
  - `handler:handleMessage` with a synthetic phone/chat created an onboarding care case for Liban caring for Degitu.
  - Created a smoke `careContacts` record for Angela.
  - Created an open `coordinationEvents` coverage gap referencing Angela.
  - Verified `mutations:getCompiledPromptContext` includes both `care_contacts` and `coordination_events`.
  - Asked the handler to text caregiver Angela; it returned the truthful boundary response and `blocked: true`.

### State I'm leaving
- Dev Convex deployment `valiant-tortoise-962` is on merged `main`.
- Dev contains smoke data only:
  - 1 care case
  - 1 user
  - 4 messages
  - 1 care contact
  - 1 coordination event
  - 5 audit logs
- Local `main` matches `origin/main` except for this agent-log note and the pre-existing untracked duplicate/archive files.

### What the next agent should know
- The runtime substrate is deployable and works in dev.
- The prompt context correctly reveals active care contacts and open coordination events.
- Unsupported third-party outreach is still blocked at runtime copy: CareSupport says it cannot add/message them yet and can draft/track instead.

### Concerns
- This was a synthetic Convex function smoke, not a real inbound Linq webhook/iMessage test.
- Dev had to be cleared because stale data blocked schema validation. Treat prod separately; do not reset or deploy prod without an explicit production decision.

---

## 2026-05-30 — Codex

### What I did
- Started Phase 1 research on a clean branch:
  `liban/coordination-mvp-spec`, based on `origin/liban/landing-2026-05`.
- Initially drafted a blank-slate MVP spec and implementation checklist, then
  corrected course after Liban pointed out that the repo already contains
  substantial product doctrine, onboarding guidance, runtime substrate, and
  tests.
- Replaced the premature MVP spec with
  `docs/coordination-research-objective.md`.
- Replaced the speculative implementation checklist with
  `tasks/coordination-research.md`.
- Anchored the research on this thesis:
  CareSupport is a text-native care coordination agent that learns a care
  situation through conversation, turns that understanding into operational
  state, and reduces the manual chasing burden on the primary coordinator.

### State I'm leaving
- Phase 1 is now a research/audit phase, not an implementation-spec phase.
- No runtime implementation has been changed.
- The Composio WIP remains separate on `liban/composio-integration-wip`; this
  branch treats Google Calendar/Composio as research-adjacent but not the
  current critical path.

### What the next agent should know
- Do not start implementation yet. The next step is a deep repo research pass
  following `docs/coordination-research-objective.md` and
  `tasks/coordination-research.md`.
- The research should synthesize existing docs/code/tests before recommending
  any implementation tasks.
- Do not write speculative tests before auditing existing tests and runtime
  behavior.
- The important product line is: Rob's caregiver scheduling loop is the first
  proof case, not the entire product identity.

### Concerns
- Existing untracked local docs/assets from earlier work are still present and
  intentionally untouched.
- Several existing docs may already contain the answer to onboarding,
  conversation skills, scheduling, and knowledge visibility. The research must
  preserve and reconcile that work rather than replacing it.

---

## 2026-05-30 — Codex

### What I did
- Completed the Phase 1 research pass for CareSupport one-to-many coordination.
- Read the current product/rules docs, Convex schema/runtime, prompt/parser
  contracts, Linq messaging layer, crons/reminders, existing tests, archived v1
  one-to-many remnants, and the active companion app path under `web/app/app`.
- Added `docs/coordination-research-synthesis.md` with:
  - thesis anchor
  - capability matrix
  - product doctrine synthesis
  - agent inference model
  - runtime gaps
  - preserve/reactivate/remove recommendations
  - Phase 2 implementation objective
  - validation targets
- Updated `tasks/coordination-research.md` to mark the audited sections
  complete.
- Ran baseline checks:
  - `npm run typecheck`
  - `npm test` (17 files / 234 tests passing)

### State I'm leaving
- No runtime code changed.
- No speculative tests were added.
- Phase 1 research artifacts are uncommitted and ready for Liban review.
- The current active branch remains `liban/coordination-mvp-spec`.

### What the next agent should know
- The repo already has the right substrate: `careContacts`,
  `coordinationEvents`, `scheduleItems`, `messages`, `memoryEntries`, Linq
  `createChat`, and companion-app schedule/memory reads.
- The main gap is not a blank-slate scheduling spec. It is the bridge from
  prompt/model output to permissioned outreach and event tracking.
- Archived v1 had `needs_outreach` and `routing_updates`, but those should be
  reactivated as current Convex primitives, not by reviving `families`,
  `members`, access tiers, or `family.md`.
- Phase 2 should focus on one permissioned messaging coordination loop before
  Google Calendar or Composio becomes the critical path.

### Concerns
- Unknown caregiver phones currently create new `users` and new `careCases`,
  which would break one-to-many reply mapping unless fixed.
- The current mechanical coordination boundary in `convex/handler.ts` is a
  useful safety guard, but Phase 2 must replace the blanket block with an
  explicit permissioned path rather than just removing it.
- The companion app is a web prototype in this checkout, not a native iOS target.

---

## 2026-05-30 — Codex

### What I did
- Added `tasks/coordination-phase-2.md` as the concrete Phase 2 build plan.
- Structured Phase 2 into monitored slices:
  - 2A structured coordination contract
  - 2B permissioned outreach state
  - 2C Linq outbound execution
  - 2D caregiver reply mapping
  - 2E web prototype coordination view
  - 2F follow-up cron / next action scanner
  - 2G Rob-style live test setup
- Included acceptance criteria and test targets for each slice so implementation
  can be checked incrementally rather than treated as one large feature.

### State I'm leaving
- No runtime code changed.
- `git diff --check` passes after the docs/task update.
- Phase 2 is ready to start with slice 2A once Liban approves the plan.

### What the next agent should know
- Use `tasks/coordination-phase-2.md` as the live checklist while implementing.
- Do not skip the permissioned outreach state. The current blanket coordination
  boundary should become a safe approval path, not disappear.
- The first implementation target is model/schema/parser/handler agreement for
  contact, event, and pending outreach outputs.

### Concerns
- The plan proposes an `outreachAttempts` table or equivalent narrow tool-action
  primitive. Confirm the exact name during 2B, but do not try to overload
  `coordinationEvents` alone with every message-attempt detail.

---

## 2026-05-30 — Codex

### What I did
- Completed Phase 2A: structured coordination contract.
- Added typed model response fields for:
  - `careContactUpdates`
  - `coordinationEventUpdates`
  - `outreachRequests`
- Updated the Anthropic JSON schema, response parser, prompt builder, prompt
  doctrine, and handler persistence path.
- Added internal mutations that let model output create/update/deactivate
  `careContacts` and create/update/cancel `coordinationEvents`.
- Changed the coordination boundary from a blanket "cannot add/message" block to
  an honest pending-outreach stance: CareSupport can save coordination details
  and ask approval, but does not send third-party outreach in this slice.
- Updated `tasks/coordination-phase-2.md` to mark 2A complete.

### Validation
- `npm run typecheck` passed.
- Targeted tests passed:
  - `convex/lib/pipeline/responseParser.test.ts`
  - `convex/lib/pipeline/promptBuilder.test.ts`
  - `convex/lib/promptContent.test.ts`
  - `convex/lib/anthropicClient.test.ts`
  - `convex/handler.test.ts`
  - `convex/mutations.test.ts`
- Full suite passed: 17 files / 237 tests.
- `git diff --check` passed.
- `npm run build` could not run because this package has no `build` script.

### State I'm leaving
- No outreach is sent yet. `outreachRequests` are parsed and available in the
  structured response contract, but third-party execution remains blocked until
  Phase 2B/2C.
- Existing solo-thread memory, medication, schedule, care-contact, and
  coordination-event tests are passing.

### Next slice
- Phase 2B should add the persisted permission layer for pending outreach:
  likely an `outreachAttempts` table or equivalent narrow action table with
  explicit requested/approved/sent state.

---

## 2026-05-31 — Codex

### What I did
- Completed Phase 2B: permissioned outreach state.
- Added an `outreachAttempts` Convex table with a narrow lifecycle:
  `pending_approval`, `approved`, `blocked`, `cancelled`, `sent`, `failed`.
- Added `convex/outreachAttempts.ts` with:
  - public care-case list/get queries
  - internal model request persistence
  - deterministic natural-language approval resolution
  - audit writes for requested, approved, and blocked outreach
- Wired `convex/handler.ts` so:
  - parsed `outreachRequests` become pending/blocked outreach attempts
  - simple coordinator approvals like "Yes, ask Angela" approve only the
    matching pending attempt
  - ambiguous approval replies ask a clarifying question instead of approving
    the wrong attempt
  - approval responses explicitly say outreach has not been sent yet
- Updated admin reset/count/detail helpers to include `outreachAttempts`.
- Updated `tasks/coordination-phase-2.md` to mark 2B complete.

### Validation
- `npm run typecheck` passed.
- Targeted tests passed:
  - `convex/outreachAttempts.test.ts`
  - `convex/handler.test.ts`
  - `convex/mutations.test.ts`
  - `convex/careContacts.test.ts`
  - `convex/coordinationEvents.test.ts`
- Full suite passed: 18 files / 244 tests.
- `git diff --check` passed.

### State I'm leaving
- Third-party outreach is still not sent. The runtime can now persist a pending
  outreach request and mark it approved, but Linq execution remains intentionally
  absent until Phase 2C.
- Contacts without a phone number, disabled texting, inactive status, or explicit
  `consentToContact: false` create blocked outreach attempts instead of pending
  sendable work.

### Next slice
- Phase 2C should execute only approved outreach attempts through Linq:
  create/reuse one-to-one chats, send the approved message, persist outbound
  message context, and update `outreachAttempts` to `sent` or `failed`.

---

## 2026-05-31 — Codex

### What I did
- Completed Phase 2C: Linq outbound execution.
- Added `convex/outreachExecution.ts`, an internal action that executes only
  `approved` outreach attempts.
- Wired approval handling in `convex/handler.ts` so a coordinator approval can
  immediately execute the approved attempt and respond truthfully based on the
  send result.
- Extended message persistence with optional `careContactId`,
  `coordinationEventId`, and `outreachAttemptId` links so 2D reply mapping has
  concrete context to use.
- Added `linqChatId` to `careContacts` and save it after successful outreach.
- Added sent/failed lifecycle handling on `outreachAttempts`, including
  `outreach_sent` and `outreach_failed` audit events.
- Updated `tasks/coordination-phase-2.md` to mark 2C complete.

### Validation
- `npm run typecheck` passed.
- Targeted tests passed:
  - `convex/outreachAttempts.test.ts`
  - `convex/handler.test.ts`
  - `convex/lib/linqClient.test.ts`
- Full suite passed: 18 files / 249 tests.
- `git diff --check` passed.

### State I'm leaving
- One-to-many outbound is now active only behind approval:
  pending outreach cannot execute, approved outreach can create/reuse a Linq
  one-to-one chat, and failed sends move the attempt to `failed`.
- Caregiver replies are still not mapped back to care contacts. Unknown inbound
  phones can still enter the ordinary user onboarding path until Phase 2D fixes
  identity resolution.

### Next slice
- Phase 2D should resolve inbound caregiver replies by Linq chat id and/or
  contact phone before user onboarding, update the matching coordination event,
  and notify the primary coordinator when useful.

---

## 2026-05-31 — Codex

### What I did
- Completed the Phase 2D prep pass for the approval and micro-onboarding
  contract.
- Updated `docs/onboarding.md` so "approved" now means explicit coordinator
  authorization for one exact outreach message, one exact contact, one exact
  care case, and, when relevant, one exact coordination event.
- Clarified that approval is not global permission, blanket delegation,
  caregiver consent, team membership, app signup, or role-based access.
- Added caregiver micro-onboarding rules: the first one-to-one text should say
  who CareSupport is, who asked it to reach out, why it is texting, whether this
  is a good number to use, and only the next useful scheduling/context question.
- Updated prompt doctrine in `convex/lib/promptContent.ts` and
  `convex/lib/pipeline/promptBuilder.ts` so the model distinguishes proposed,
  approved, and sent outreach now that approved Linq execution exists.
- Updated `tasks/coordination-phase-2.md` to capture this as an explicit bridge
  between approved outbound execution and caregiver reply mapping.

### Validation
- Targeted prompt/runtime tests passed:
  - `convex/lib/promptContent.test.ts`
  - `convex/lib/pipeline/promptBuilder.test.ts`
  - `convex/handler.test.ts`
  - `convex/outreachAttempts.test.ts`
- `npm run typecheck` passed.
- Full suite passed: 18 files / 251 tests.
- `git diff --check` passed.

### State I'm leaving
- The approval and caregiver micro-onboarding contract is now explicit in docs,
  prompt content, prompt builder output, and tests.
- Caregiver reply mapping itself is not implemented in this prep pass. Phase 2D
  can now proceed against a clearer contract: inbound caregiver replies should
  attach to the care contact and coordination event created by the approved
  outreach attempt, not create a separate primary-coordinator onboarding path.

---

## 2026-05-31 — Codex

### What I did
- Completed Phase 2D: caregiver reply mapping.
- Added `convex/contactReplies.ts` to resolve inbound caregiver replies before
  normal user onboarding.
- Resolution now prefers Linq chat id, then falls back to normalized phone only
  when that phone is uniquely tied to a sent outreach attempt. Known contacts
  without sent outreach do not receive care context by phone alone.
- Wired `convex/handler.ts` so caregiver replies:
  - use the primary coordinator's care case and user id
  - store inbound/outbound messages with `careContactId`,
    `coordinationEventId`, and `outreachAttemptId`
  - skip primary-user profile and user-memory writes
  - skip coordinator approval handling
  - pass explicit "care contact reply" context into the model
  - log `care_contact_reply_received`
  - create a short coordinator-facing update message
- Added deterministic reply classification for clear caregiver replies:
  - `confirmed`
  - `declined`
  - `partial`
  - `needs_clarification`
- Clear "yes" replies move the contact from pending/declined to confirmed on
  the coordination event. Clear "no" replies move the contact from
  pending/confirmed to declined without resolving the event.
- Updated `tasks/coordination-phase-2.md` to mark 2D complete.

### Validation
- Targeted tests passed:
  - `convex/contactReplies.test.ts`
  - `convex/handler.test.ts`
  - `convex/outreachAttempts.test.ts`
- `npm run typecheck` passed.
- Full suite passed: 19 files / 259 tests.
- `git diff --check` passed.

### State I'm leaving
- The one-to-many runtime now has the core loop:
  coordinator-approved outbound outreach can be sent, and caregiver replies map
  back to the same care case/contact/event instead of creating unrelated care
  cases.
- Partial replies are classified and routed to the model with the right contact
  context, but richer schedule extraction still depends on the model producing
  `care_contact_updates` and `coordination_event_updates`.
- Rob-facing visibility exists as persisted coordinator update messages, but the
  web app has not yet been changed to show a purpose-built coordination view.

### Next slice
- Phase 2E should harden the agent/context engine before any web or iOS view
  work: stronger caregiver reply interpretation, source-linked context graph
  updates, transcript-style loop tests, and coordinator status behavior.

---

## 2026-05-31 — Codex

### Product direction correction
- Liban clarified that the web prototype coordination view should be postponed.
- The current priority is exclusively the agent, coordination engine, context
  engine, and whether CareSupport can complete the coordination job through
  iMessage/runtime behavior.
- The web/iOS companion app remains in development and should consume the
  coordination graph later, after the agent loop is reliable.

### What I changed
- Updated `tasks/coordination-phase-2.md` so Phase 2E is now
  "Agent/Context Engine Hardening" instead of "Web Prototype Coordination View."
- Moved web/iOS companion views into a postponed Phase 2H.
- Removed web app verification from the active Rob-style live-test acceptance
  criteria.

### Next slice
- Phase 2E should validate and harden:
  - caregiver reply interpretation
  - context graph updates
  - source-linked facts
  - coordinator status updates
  - transcript-style end-to-end coordination tests
  - non-scheduling care coordination flexibility

---

## 2026-05-31 — Codex

### What I did
- Wrote the canonical CareSupport model constitution at
  `docs/caresupport-model-constitution.md`.
- Defined the care model as three projections of one care reality:
  - relationship graph
  - coordination state machine
  - time-sequenced operational record
- Added `MODEL_CONSTITUTION_CONTENT` to `convex/lib/promptContent.ts`.
- Updated `convex/lib/pipeline/promptBuilder.ts` so the constitution is loaded
  into every agent call as its own system block before operational guidance.
- Passed `MODEL_CONSTITUTION_CONTENT` from `convex/handler.ts` into the prompt
  builder.
- Updated prompt tests to assert the constitution exists and is loaded.
- Added the constitution to `AGENTS.md` canonical docs and corrected the stale
  current-runtime summary to reflect approved outreach and caregiver reply
  mapping.
- Updated `tasks/coordination-phase-2.md` to mark constitution adoption as the
  first completed slice of Phase 2E.

### Validation
- Targeted tests passed:
  - `convex/lib/promptContent.test.ts`
  - `convex/lib/pipeline/promptBuilder.test.ts`
  - `convex/handler.test.ts`
- `npm run typecheck` passed.
- Full suite passed: 19 files / 263 tests.
- `git diff --check` passed.
- Full suite passed: 19 files / 262 tests.
- `git diff --check` passed.

### State I'm leaving
- The constitution is now human-readable doctrine and runtime prompt doctrine.
- Safety-critical parts remain enforced by code; the constitution explains the
  operating model, while outreach approval, send truthfulness, reply mapping,
  persistence, and audit remain mechanical runtime responsibilities.

---

## 2026-06-01 — Codex

### What I did
- Reviewed the old `CareSupport_Soul_Document.md` artifact as historical
  doctrine rather than current implementation guidance.
- Added `docs/caresupport-soul-revision-notes.md` to capture what carries
  forward and what conflicts with the current CareSupport v2 runtime.
- Rewrote root `SOUL.md` as the current CareSupport v2 soul document.
- Updated live prompt soul in `convex/lib/promptContent.ts` so CareSupport is
  framed as a family care assistant that can respond to the user's current
  human need, not a care-task-only form.
- Replaced the old hard redirect for unrelated topics with conversational range
  guidance: answer naturally when useful, but do not save unrelated content as
  care context or structured care records.
- Updated `convex/lib/promptContent.test.ts` to validate emotional/cognitive
  intelligence and the new conversational range behavior.
- Updated `tasks/coordination-phase-2.md` to mark the soul revision as part of
  Phase 2E agent/context hardening.

### What I intentionally did not carry forward
- Provider-specific identity like "CareSupport is Claude."
- Anthropic-specific principal hierarchy as product doctrine.
- Old architecture primitives as implementation guidance.
- Autonomous outreach defaults that would bypass exact coordinator approval.
- Claims that CareSupport can guarantee coverage or make care judgments.

### Validation
- Targeted tests passed:
  - `convex/lib/promptContent.test.ts`
  - `convex/lib/pipeline/promptBuilder.test.ts`
  - `convex/handler.test.ts`
- `npm run typecheck` passed.
