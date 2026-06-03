# Coordination Phase 2 — Permissioned One-To-Many Loop

Research source: `docs/coordination-research-synthesis.md`.

## Objective

Build the first working one-to-many coordination loop inside the iMessage agent
and Convex coordination runtime. The web/iOS companion app will consume this
state later, but it is not the critical path for this phase.

The loop:

1. A primary coordinator describes a care coordination need.
2. CareSupport identifies or creates the relevant care contacts.
3. CareSupport asks the coordinator for explicit permission before outreach.
4. CareSupport texts caregivers one-on-one through Linq.
5. Caregiver replies map back to the correct care case, contact, and open
   coordination event.
6. Convex context graph updates as replies come in.
7. CareSupport updates the primary coordinator conversationally and persists the
   smallest useful coordination state for later web/iOS companion views.

This phase should prove the agentic coordination loop before Google Calendar,
Composio, native iOS work, web dashboards, or broad role/permission systems
become critical path.

## Non-Goals

- No Google Calendar write integration.
- No Composio critical-path work.
- No native iOS implementation.
- No web prototype coordination view work in this phase.
- No caregiver app accounts.
- No caregiver dashboards.
- No generalized enterprise permissions.
- No revived v1 `families`, `members`, access tiers, or `family.md` runtime.
- No autonomous outreach without explicit approval.
- No medication/task expansion beyond what current runtime already supports.

## Operating Invariants

- The agent may infer next useful action, but code owns permission, execution,
  routing, persistence, and audit.
- No outbound message to a third party is sent unless a persisted approval exists.
- Every external message is stored as a `messages` row and audit event.
- Caregiver replies must not create a new `user` / `careCase` when they belong to
  an existing `careContact`.
- Rob is the launch fixture and stress test, but no runtime logic should
  hard-code Rob-only behavior.
- Web/iOS companion views are downstream consumers of coordination state, not the
  engine being validated in this phase.

## Phase Status

- [x] 2A — Structured coordination contract
- [x] 2B — Permissioned outreach state
- [x] 2C — Linq outbound execution
- [x] 2D — Caregiver reply mapping
- [x] 2E0 — Convex memory/retrieval architecture policy
- [ ] 2E — Agent/context engine hardening
- [ ] 2F — Follow-up cron / next action scanner
- [ ] 2G — Rob-style live test setup
- [ ] 2H — Web/iOS companion views (postponed)

## 2A — Structured Coordination Contract

Purpose: let the model propose contact/event/outreach state without executing
outreach yet.

Implementation tasks:

- [x] Add typed response fields for care coordination:
  - `careContactUpdates`
  - `coordinationEventUpdates`
  - `outreachRequests`
- [x] Update:
  - `convex/lib/pipeline/types.ts`
  - `convex/lib/anthropicClient.ts`
  - `convex/lib/pipeline/responseParser.ts`
  - `convex/lib/pipeline/promptBuilder.ts`
  - `convex/lib/promptContent.ts`
  - `convex/handler.ts`
- [x] Add internal mutations for model-written contact/event updates.
- [x] Keep outreach requests as proposed/pending only. Do not send messages in
      this slice.

Acceptance criteria:

- [x] A coordinator can provide a caregiver name/phone/schedule and the model can
      write/update a `careContacts` row.
- [x] A coordinator can describe a coverage or schedule coordination need and the
      model can create/update a `coordinationEvents` row.
- [x] Invalid contact/event references across care cases are rejected.
- [x] Outreach proposal copy is honest: CareSupport asks permission and does not
      claim it contacted anyone.
- [x] Existing solo-thread memory, medication, and schedule behavior still works.

Test targets:

- [x] `convex/lib/pipeline/responseParser.test.ts`
- [x] `convex/lib/pipeline/promptBuilder.test.ts`
- [x] `convex/lib/anthropicClient.test.ts`
- [x] `convex/careContacts.test.ts`
- [x] `convex/coordinationEvents.test.ts`
- [x] `convex/mutations.test.ts`
- [x] `convex/handler.test.ts`

## 2B — Permissioned Outreach State

Purpose: replace the blanket "I can't message them yet" boundary with a safe
approval path.

Preferred minimal runtime addition:

- [x] Add an `outreachAttempts` table or equivalent narrow tool-action table:
  - `careCaseId`
  - `coordinationEventId`
  - `careContactId`
  - `requestedByUserId`
  - `approvedByUserId`
  - `status`
  - `messageBody`
  - `linqChatId`
  - `linqMessageId`
  - `nextActionAt`
  - timestamps

Implementation tasks:

- [x] Persist model-proposed `outreachRequests` as pending outreach attempts.
- [x] Detect coordinator approval from natural language confirmations.
- [x] Mark outreach approved only when the pending request, coordinator, contact,
      and care case all match.
- [x] Keep current mechanical coordination boundary as fallback for unsupported or
      ambiguous requests.

Acceptance criteria:

- [x] A proposed outreach request is saved but not sent.
- [x] "Yes, ask Angela" approves only the matching pending outreach.
- [x] Ambiguous approval asks one clarifying question.
- [x] Contacts without phone/text permission cannot be sent outreach.
- [x] Audit logs show request creation and approval.

Test targets:

- [x] `convex/schema.ts` validation through `convex-test`
- [x] New `convex/outreachAttempts.test.ts` if a table/module is added
- [x] `convex/handler.test.ts`
- [x] `convex/mutations.test.ts`
- [x] `convex/auditLogs.ts` / audit creation coverage

## 2C — Linq Outbound Execution

Purpose: execute approved outreach through existing Linq primitives.

Implementation tasks:

- [x] Add an internal action/mutation path to execute approved outreach.
- [x] Use existing `createChat` when no contact chat exists.
- [x] Use existing `sendMessage` when a contact chat exists.
- [x] Save the contact's Linq chat id for future reply mapping.
- [x] Persist outbound caregiver messages with `careContactId` and
      `coordinationEventId` context.
- [x] Add explicit audit events for outreach sent/failed.

Acceptance criteria:

- [x] No unapproved outreach can execute.
- [x] Approved outreach creates or reuses a one-to-one Linq chat.
- [x] Outbound caregiver message is stored in Convex.
- [x] Failed Linq calls do not claim success to Rob.
- [x] Rob gets a short useful update after outreach starts.

Test targets:

- [x] `convex/lib/linqClient.test.ts`
- [x] New/updated outreach execution tests with mocked Linq
- [x] `convex/handler.test.ts`
- [x] `convex/http.test.ts` if status callbacks are expanded

## 2D Prep — Approval And Micro-Onboarding Contract

Purpose: make the meaning of approval and caregiver onboarding explicit before
reply mapping begins.

Contract:

- [x] "Approved" means the primary coordinator authorized one exact outreach
      message to one exact contact for one care case and coordination event.
- [x] Approval does not mean global permission, blanket delegation, caregiver
      consent, team membership, app account creation, or role permissions.
- [x] Primary coordinator onboarding remains lightweight: identify the user,
      who they are caring for, and the first useful care thing to coordinate.
- [x] Caregiver onboarding is a one-to-one text introduction, not app signup.
- [x] First caregiver outreach should identify CareSupport, say who asked,
      state the concrete coordination purpose, ask whether this is a good number
      to text, and avoid unnecessary private care detail.
- [x] Prompt/runtime copy must distinguish proposed outreach, approved outreach,
      and actually sent outreach.

Validation targets:

- [x] `docs/onboarding.md`
- [x] `convex/lib/promptContent.ts`
- [x] `convex/lib/pipeline/promptBuilder.ts`
- [x] `convex/lib/promptContent.test.ts`
- [x] `convex/lib/pipeline/promptBuilder.test.ts`

## 2D — Caregiver Reply Mapping

Purpose: make replies from caregivers update the care graph instead of creating
new care cases.

Implementation tasks:

- [x] Update inbound identity resolution order:
  1. known `careContacts` by Linq chat id
  2. known unambiguous `careContacts` by phone only when tied to sent outreach
  3. primary `users` by phone
  4. unknown-user onboarding fallback
- [x] Add optional `careContactId` and `coordinationEventId` fields to messages,
      or an equivalent link table.
- [x] Parse caregiver replies into statuses:
  - confirmed
  - declined
  - partial
  - needs clarification
- [x] Update `coordinationEvents` confirmed/pending/declined arrays for clear
      confirmed/declined replies.
- [x] Notify the primary coordinator only when useful.

Acceptance criteria:

- [x] A caregiver replying "yes" marks that contact confirmed on the correct
      coordination event.
- [x] A caregiver replying "no" marks that contact declined and keeps the event
      open.
- [x] A partial reply is classified for model follow-up without making a false
      confirmation or decline.
- [x] Unknown caregiver replies do not leak care context.
- [x] A contact reply never creates an unrelated new care case when the contact
      can be resolved.

Test targets:

- [x] `convex/contactReplies.test.ts`
- [x] `convex/handler.test.ts`
- [x] `convex/outreachAttempts.test.ts`
- [x] `convex/http.test.ts`

## 2E0 — Convex Memory/Retrieval Architecture Policy

Purpose: make persistent memory and context retrieval an explicit architecture
track before hardening the agent/context engine.

Decision:

- Current truth stays in structured Convex tables.
- Messages and audit logs remain the operational record.
- `memoryEntries` hold durable human/care context that does not fit typed
  records.
- Semantic retrieval is for fuzzy or historical reference, not current truth.
- Convex-native RAG should be evaluated before Pinecone or other external vector
  infrastructure.
- LangSmith may be useful for observability/evals, but not as the source of
  truth.

Implementation tasks:

- [x] Add `docs/convex-memory-retrieval-architecture.md`.
- [x] Distinguish the product context graph from the technical memory/retrieval
      layer.
- [x] Define structured truth, operational record, durable memory, retrieved
      reference context, and observability layers.
- [x] Define when Convex-native RAG becomes justified.
- [x] Define the Pinecone/external-vector gate.
- [x] Before installing any RAG dependency, define the minimal retrieval
      interface and eval questions it must satisfy.
- [ ] Revisit after Phase 2E transcript tests show whether older/fuzzy context
      is actually being missed.

Acceptance criteria:

- [x] The team can explain what belongs in typed Convex tables vs memory entries
      vs semantic retrieval.
- [x] Current truth cannot be overridden by retrieved semantic context.
- [x] Pinecone is explicitly deferred until measured Convex-native retrieval
      limits appear.
- [x] A future Convex RAG spike has source-link, namespace, filter, and eval
      requirements before implementation.

Validation targets:

- [x] `docs/convex-memory-retrieval-architecture.md`
- [x] `docs/caresupport-learning-retrieval-implementation.md`
- [x] `AGENTS.md`
- [x] this task tracker
- [ ] future retrieval/eval tests if a Convex RAG spike is started

## 2E — Agent/Context Engine Hardening

Purpose: make the agent and Convex context graph reliable enough to coordinate
care through conversation before the web/iOS companion app becomes critical.

Implementation tasks:

- [x] Adopt a canonical CareSupport model constitution as both human doctrine
      and runtime prompt doctrine.
- [x] Revise `SOUL.md` and live prompt soul so CareSupport is emotionally and
      cognitively intelligent without becoming care-task-only.
- [x] Define the Convex-native memory/retrieval policy so Phase 2E strengthens
      source-linked current truth before adding RAG infrastructure.
- [x] Strengthen prompt/runtime instructions for contact replies so the model
      reliably writes:
  - caregiver availability/context into `careContacts`
  - coverage/schedule state into `coordinationEvents`
  - lightweight coordinator updates into normal messages
- [x] Add deterministic guardrails for common reply classes:
  - clear confirmation
  - clear decline
  - partial availability
  - wrong number / stop texting
  - "ask me later" / unavailable until a date
- [x] Ensure partial availability never creates false confirmation.
- [x] Ensure the context graph keeps source-linked facts:
  - who said it
  - which message caused it
  - which coordination event it affected
- [x] Split context-loading expectations into always-loaded current context and
      on-demand reference context before introducing Convex RAG.
- [x] Define a small retrieval interface that can later be backed by
      Convex-native RAG without changing the care graph source of truth.
- [x] Add transcript-style tests for the full agent loop:
  coordinator need -> contact creation -> approval -> outbound -> caregiver
  reply -> context update -> coordinator status.
- [ ] Keep the model general enough to learn non-scheduling coordination uses
      without conditioning the agent to only handle Rob's schedule.

Acceptance criteria:

- [x] The CareSupport model constitution is loaded into every agent system prompt.
- [x] The memory/retrieval policy is documented: structured truth first,
      Convex-native semantic retrieval second, external vector DB last.
- [x] The full coordination loop can be validated through messages and Convex
      state only.
- [x] Caregiver availability replies update `careContacts.availabilityNotes`.
- [x] Coverage replies update the correct `coordinationEvents` fields.
- [ ] CareSupport can summarize who replied, who has not, and what remains open
      without a UI.
- [ ] The agent can infer the next useful coordination step while code still
      owns permission, routing, execution, persistence, and audit.
- [ ] Non-scheduling coordination requests remain possible when they fit the
      broader care-coordination thesis.

Test targets:

- [x] `convex/lib/promptContent.test.ts`
- [x] `convex/lib/pipeline/promptBuilder.test.ts`
- [x] `docs/convex-memory-retrieval-architecture.md`
- [x] `docs/caresupport-learning-retrieval-implementation.md`
- [x] `convex/contactReplies.test.ts`
- [x] `convex/handler.test.ts`
- [ ] `convex/lib/pipeline/responseParser.test.ts`
- [x] New transcript-style coordination loop tests if practical

## 2E1 — CareSupport Learning / Claim Layer

Purpose: define CareSupport learning as source-linked, revisable claims before
confirmed current truth, so the model can seek accuracy without acting from
false certainty.

Implementation tasks:

- [x] Add a `careClaims` table for source-linked heard, inferred,
      needs-clarification, confirmed, rejected, contradicted, superseded, and
      archived understanding.
- [x] Add claim lifecycle helpers:
  - create claims from a source message
  - list claims by care case/status/subject/source
  - confirm, reject, contradict, and supersede claims
  - preserve source and confirming message ids
- [x] Keep claims separate from current truth until a deterministic promotion
      rule runs.
- [ ] Add promotion helpers from confirmed claims into current tables such as
      `careContacts`, `coordinationEvents`, and `memoryEntries`.
- [ ] Add unresolved-claim context to compiled prompt context so CareSupport can
      say what it thinks it heard and what still needs confirmation.
- [ ] Ensure non-scheduling claims remain possible:
  relationship, role, constraint, preference, coordination rule, and care note.

Acceptance criteria:

- [x] Messy fragments can create source-linked claims without changing current
      truth.
- [x] Ambiguous/risky claims are marked `needs_clarification`.
- [ ] CareSupport can ask targeted clarification questions before outreach or
      schedule creation.
- [ ] Confirmed claims can promote into current truth with source links.
- [ ] Contradicted/superseded claims do not continue to appear as current truth.

Test targets:

- [x] `convex/careClaims.test.ts`
- [ ] `convex/robCareNetworkClarification.test.ts`
- [ ] prompt context test for unresolved claims

## 2E2 — Convex-Native Retrieval / RAG Spike

Purpose: evaluate Convex-native semantic retrieval after the claim layer exists,
without letting retrieved text override structured current truth.

Implementation tasks:

- [ ] Add `convex/lib/knowledge/retrieveCareContext.ts` with a structured-only
      backend first.
- [ ] Return current truth, unresolved claims, reference snippets, and source
      links as separate sections.
- [ ] Install `@convex-dev/rag` only after the structured retrieval interface
      and claim simulator pass.
- [ ] Use care-case-scoped namespaces:
      `namespace = careCaseId`.
- [ ] Index selected summaries, not every raw message:
  - confirmed care model summaries
  - unresolved claim summaries
  - resolved coordination event recaps
  - important corrections and stable preferences
- [ ] Preserve source ids and filters for record type, claim status, contact,
      event type, actor type, sensitivity, and active state.

Acceptance criteria:

- [ ] Current structured truth always wins over retrieved reference context.
- [ ] RAG entries are care-case scoped.
- [ ] Retrieved references include source ids.
- [ ] Tests prove retrieval improves a response or next-step decision.
- [ ] No Pinecone or external vector database is introduced.

Test targets:

- [ ] `convex/lib/knowledge/retrieveCareContext.test.ts`
- [ ] RAG index payload construction tests
- [ ] transcript/eval test with mocked retrieval results

## 2F — Follow-Up Cron / Next Action Scanner

Purpose: make open outreach loops continue without Rob repeatedly asking.

Implementation tasks:

- [ ] Add a cron/internal action that scans due `outreachAttempts.nextActionAt`
      and/or `coordinationEvents.nextActionAt`.
- [ ] For first version, default to lightweight status/follow-up:
  - remind a caregiver once
  - ask Rob before moving to next fallback unless prior permission covers it
  - mark failed/delayed attempts clearly
- [ ] Avoid noisy repeat reminders.
- [ ] Log follow-up decisions and sent messages.

Acceptance criteria:

- [ ] Due follow-ups are found deterministically.
- [ ] No follow-up is sent without valid permission.
- [ ] Rob receives status only when it changes what he needs to know or decide.
- [ ] Completed/resolved events are ignored by the scanner.

Test targets:

- [ ] New cron/follow-up tests with `convex-test`
- [ ] Existing `convex/admin.test.ts` patterns for digest-like queries
- [ ] Existing reminder/digest tests as reference, not duplicated blindly

## 2G — Rob-Style Live Test Setup

Purpose: prove the loop with realistic data before widening beta behavior.

Implementation tasks:

- [ ] Seed or manually create one active coordinator care case.
- [ ] Add 12-13 care contacts with phone, role, textability, and priority.
- [ ] Create one coverage/schedule coordination event.
- [ ] Run a controlled outreach sequence with test numbers first.
- [ ] Then run with Rob only after the controlled sequence passes.

Acceptance criteria:

- [ ] Coordinator initiates a need over iMessage.
- [ ] CareSupport asks permission before outreach.
- [ ] CareSupport texts at least two contacts one-on-one.
- [ ] Replies update Convex contact/event state.
- [ ] Convex contact/event/outreach state reflects replies without UI
      intervention.
- [ ] Rob receives concise status updates and does not need to pull status.

Test targets:

- [ ] Local/Dev Convex smoke script or manual checklist
- [ ] Linq test-number verification
- [ ] Agent-log entry with exact data state left behind

## 2H — Web/iOS Companion Views (Postponed)

Purpose: consume the coordination graph in a companion interface after the agent
loop is reliable.

Deferred scope:

- [ ] Web data hooks for contacts, coordination events, outreach attempts, and
      reply status.
- [ ] A simple coordination view at `app.caresupport.com`.
- [ ] Native iOS companion app views.
- [ ] Calendar-like coverage display.

Resume only after:

- [ ] The iMessage agent can complete the coordination loop with test contacts.
- [ ] The context graph can be trusted as the source of truth.
- [ ] Rob-style testing shows what state actually needs to be visible.

## Standard Gates Before Moving Between Slices

Before marking any slice complete:

- [ ] Acceptance criteria for that slice checked.
- [ ] Test targets either implemented or explicitly deferred with reason.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] No unrelated dirty work included.
- [ ] `docs/agent-log.md` updated after substantive runtime changes.

Before live Rob testing:

- [ ] Dev data is understood and no production reset/deploy command is run
      accidentally.
- [ ] Linq numbers/chats used for testing are known.
- [ ] The web prototype points at the intended Convex deployment.
- [ ] There is a rollback path for prompt/runtime changes.
