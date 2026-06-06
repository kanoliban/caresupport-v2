# Coordination Research Synthesis

Date: 2026-05-30

Status: historical research snapshot. This document describes the repo before
Phase 2A-2G implemented the permissioned one-to-many loop. For current runtime
truth, use `docs/multiplayer-runtime-architecture.md`,
`docs/caresupport-model-constitution.md`, and
`docs/private-beta-coordination-activation.md`.

## Thesis Anchor

CareSupport is a text-native family care coordination agent. It starts in one
trusted thread, learns how a care situation works, turns that learning into
operational state, and reduces the manual chasing burden on the primary
coordinator.

Rob's caregiver scheduling loop is the first proof case and stress test, not
the whole product identity. The repo already says this clearly in
`README.md:3`, `AGENTS.md:5`, `docs/product-thesis.md:7`, and
`docs/design.md:3`.

## What The Repo Already Understands

The current docs are mostly aligned:

- The solo thread is a wedge, not the destination (`docs/product-thesis.md:9`,
  `docs/DECISIONS.md:12`, `docs/design.md:15`).
- Rob is the central heuristic because every avoidable tap, text, and status
  check has physical cost (`README.md:12`, `docs/rob-care-operations-model.md:7`,
  `SOUL.md:15`).
- The product should not be a dashboard-first scheduling system. Text is the
  primary interface, tools do the work, and the app should show useful state
  without making Rob administer the system (`docs/design.md:120`,
  `docs/agent-knowledge-visibility.md:23`, `docs/integrations-and-tool-bearing-agent.md:15`).
- The agent should not hide that it is learning. Its persona is careful,
  accountable, humble, useful, and correction-friendly (`docs/product-thesis.md:63`,
  `docs/product-thesis.md:80`, `SOUL.md:31`).

The key doctrine to preserve is not "initialization, scheduling, follow-up" as
a rigid product model. The better model is:

1. Understand the user's immediate goal.
2. Use current care context before asking.
3. Ask only for the next missing detail that blocks action.
4. Act at the highest safe capability level the runtime currently supports.
5. Track the open loop until the need is closed or the user must decide.

That is already consistent with `convex/lib/promptContent.ts:5`,
`docs/onboarding.md:41`, and the capability ladder in
`docs/tools-and-capabilities-thought-experiment.md:113`.

## Current Capability Matrix

### Works Now

- One texting user, one care case, one persistent thread.
- Inbound Linq webhook routing into Convex (`convex/http.ts`).
- User/care-case creation from unknown phone numbers (`convex/handler.ts:226`).
- Durable messages, memory, medication records, schedule records, and audit
  logs (`convex/schema.ts:129`).
- Claude structured JSON for profile, memory, medication, and schedule updates
  (`convex/lib/anthropicClient.ts:34`, `convex/lib/pipeline/types.ts:120`).
- Prompt context includes active care contacts and open/waiting coordination
  events when present (`convex/mutations.ts:403`, `convex/lib/memory.ts:309`).
- Linq can send replies and can create a new one-to-one chat through
  `createChat` (`convex/lib/linqClient.ts:82`).
- A daily digest cron exists for same-thread schedule reminders
  (`convex/crons.ts`, `convex/reminders.ts`).
- The web companion app can read current user, care case, memory, and today's
  schedule from Convex (`web/app/app/_lib/data-hooks.ts`).

Baseline validation passed: `npm run typecheck` and `npm test`
with 17 test files / 234 tests passing.

### Exists As Substrate

- `careContacts` already models people and organizations around a care case:
  name, phone, role, relationship, agency, availability notes, textability,
  priority, and consent (`convex/schema.ts:222`).
- `coordinationEvents` already models coverage gaps/open loops: status, urgency,
  time window, assignee, confirmed/pending/declined/fallback contact arrays, next
  action, escalation, and resolution (`convex/schema.ts:244`).
- The companion app has screens that can become Rob's working view: schedule,
  memory, shortcuts, and future coordination takeovers
  (`web/app/app/_components/companion-app.tsx`).

### Intentionally Blocked At Time Of Research

- At the time, the live prompt blocked third-party outreach and team-member
  addition (`convex/lib/promptContent.ts:12`, `convex/lib/promptContent.ts:62`).
- The prompt builder repeats that boundary in the actual JSON contract
  (`convex/lib/pipeline/promptBuilder.ts:3`).
- The handler has a mechanical boundary override for add/invite/text/call/contact
  requests involving family, caregivers, providers, or team members
  (`convex/handler.ts:48`, `convex/handler.ts:62`, `convex/handler.ts:408`).

This is good safety history. Phase 2 should replace this blanket block with a
permissioned path, not simply delete it.

### Missing For One-To-Many Reactivation At Time Of Research

- Inbound replies from caregivers are not mapped to `careContacts`. Unknown
  phones currently create new `users` and new `careCases` (`convex/handler.ts:226`).
- The model cannot create or update `careContacts` or `coordinationEvents`
  because those fields do not exist in `AgentResponse`
  (`convex/lib/pipeline/types.ts:120`) or the Anthropic JSON schema
  (`convex/lib/anthropicClient.ts:34`).
- There is no `outreachRequest`, `toolAction`, or permission object. Audit logs
  also lack explicit outreach/action events (`convex/schema.ts:95`).
- `coordinationEvents.nextActionAt` exists, but no cron scans it for follow-up.
  The only active cron is the daily digest path.
- `scheduleItems` do not link to a `careContact`, source message, confidence, or
  confirmation state (`convex/schema.ts:189`).
- The app does not yet query `careContacts` or `coordinationEvents`; memory
  people are hardcoded in the current slice (`web/app/app/_screens/memory-screen.tsx`).

## Old One-To-Many Evidence

Archived v1 did have one-to-many machinery:

- `needs_outreach` in model output queued messages to other people
  (`archive/v1/runtime/scripts/sms_handler.py:459`).
- `routing_updates` added members when a coordinator provided name and phone
  (`archive/v1/runtime/scripts/sms_handler.py:478`).
- The webhook receiver iterated `needs_outreach`, resolved or created Linq chats,
  sent messages, and audited outreach (`archive/v1/runtime/scripts/webhook_receiver.py:195`).

Do not revive the old architecture wholesale. `docs/DECISIONS.md:75` explicitly
retires v1 `families`, `members`, `outreachThreads`, and access tiers for the
active runtime. Reactivate the useful behavior through current Convex primitives.

## Agent Inference Model

The model should not need every possible step enumerated. It needs a stable
operating doctrine plus deterministic tools.

The doctrine:

- Interpret the user's actual goal, not just their literal wording.
- Use care-case context, care contacts, schedule, memory, and open events before
  asking.
- If enough context exists, propose or perform the next safe action.
- If one detail blocks action, ask only that detail.
- Show working understanding when it affects a decision: "I have...", "I know...",
  "I don't have...", "I'm assuming..." (`docs/agent-knowledge-visibility.md:136`).

The capability ladder:

1. Remember.
2. Remind.
3. Draft.
4. Ask permission.
5. Act.
6. Track.
7. Escalate.
8. Close the loop.

Implementation update: the current code now reaches levels 4-6 for a narrow
permissioned Linq messaging loop. Google Calendar and broader integrations
remain outside the current runtime.

## Preserve / Reactivate / Remove

Preserve:

- The current Convex core: `users`, `careCases`, `messages`, `memoryEntries`,
  `scheduleItems`, `careContacts`, `coordinationEvents`, `auditLogs`.
- The prompt honesty that distinguishes active capability from product direction.
- `careContacts` and `coordinationEvents` as the current context graph substrate.
- Linq `createChat` and send-message utilities.
- Existing tests around contact/event scoping, prompt context, schedule
  validation, Linq behavior, webhook extraction, and boundary behavior.

Reactivate:

- The old behavior concept of outbound outreach, but as a typed,
  permissioned Convex flow.
- The old behavior concept of adding people by name and phone, but as
  `careContacts`, not `members`.
- Follow-up scanning against `coordinationEvents.nextActionAt`.
- Rob-facing status summaries driven by `coordinationEvents`, not a large
  scheduling dashboard.

Remove or quarantine:

- Do not bring back v1 `families`, `members`, access tiers, or markdown
  `family.md` as the active source of truth.
- Keep Composio/Google Calendar out of the immediate critical path until the
  messaging coordination loop works.
- Treat older scheduling playbooks as behavioral reference only; they still speak
  in `family.md` terms (`docs/tasks/scheduling.md:5`).

## Phase 2 Objective

Enable one permissioned, care-case-scoped one-to-many coordination loop without
hard-coding Rob:

Rob or another primary coordinator can name a coverage/schedule coordination
need, approve outreach to known or newly provided care contacts, CareSupport can
send one-to-one messages through Linq, map replies back to the correct contact
and coordination event, update status, and report the smallest useful update
back to the coordinator.

This should be built before advanced Google Calendar work.

## Phase 2 Validation Targets

Extend existing tests rather than duplicating them:

- Contact creation from model output is scoped to one care case.
- Outreach requires explicit permission and a textable/consented contact.
- Approved outreach calls Linq `createChat` or `sendMessage`, persists message
  records, and writes an audit event.
- Inbound caregiver replies map to the existing `careContact` and
  `coordinationEvent`, not a new care case.
- Coordination event status changes from open/waiting/resolved based on replies.
- `nextActionAt` follow-up cron sends or schedules the next safe message.
- Prompt/parser/schema/handler all agree on any new structured fields.
- Companion app can read contacts/events needed for Rob's progress view.
