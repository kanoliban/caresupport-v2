# CareSupport v2

CareSupport is a text-native, tool-bearing family care coordination runtime.

It starts in one trusted text thread, but the product identity is not a solo
caregiver app. The wedge is one caregiver or care recipient building trust,
memory, and operational context with the agent. The destination is multiplayer:
one agent coordinating one care situation across family, professional
caregivers, agencies, schedules, reminders, outreach, and open coordination
events.

The core product heuristic is:

> Does this reduce the number of times Rob has to use his nose to chase care coordination?

Rob is the sharpest user model: he is quadriplegic, uses his nose to operate
his iPhone, and coordinates 12 people himself across family, professional
caregivers, and disconnected agencies. If CareSupport only remembers things but
still leaves Rob as the dispatcher, it has not solved the central problem.

## Current Runtime

The deployed Convex runtime is intentionally narrower than the full product
direction. Today it supports:

- one texting user
- one care case
- one persistent text thread
- durable messages, memory, medications, schedule items, and audit logs
- scoped care contacts and coordination events as prompt-readable substrate
- Claude-generated structured updates parsed into typed Convex records
- Linq-backed iMessage/SMS ingress and egress

Current active tables:

- `users`
- `careCases`
- `messages`
- `medications`
- `scheduleItems`
- `memoryEntries`
- `careContacts`
- `coordinationEvents`
- `auditLogs`

This solo-thread runtime is the onboarding wedge and first memory-building
surface. It should stay simple until the core loop is reliable, but it should no
longer be described as the final product category. `careContacts` and
`coordinationEvents` exist as inert coordination substrate; the assistant does
not yet create them from conversation or perform outreach.

## Product Direction

CareSupport should grow into a one-to-many care orchestration system where:

- conversation is the interface
- tools are how work gets done
- the agent pushes meaningful operational updates instead of making users pull
  status
- memory is revealed contextually, not through giant dashboards
- outreach and tool actions are permissioned, auditable, and reversible where
  possible
- coordination stays open until the care need is actually resolved

Runtime primitives now started:

- `careContacts` - people and organizations involved in a care case
- `coordinationEvents` - coverage gaps, schedule changes, handoffs, unresolved
  tasks, escalations, and closures

Still-emerging runtime primitives:

- `toolActions` - attempted, approved, executed, failed, and reverted tool work
- `connectedAccounts` - user-authorized integrations such as calendars or email
- `externalRefs` - links to provider-side IDs in calendars, messaging, email, or
  agency systems
- `userToolPermissions` - explicit permission rules for what CareSupport may do
  and when it must ask first

Likely runtime folders:

- `convex/lib/tools/`
- `convex/lib/providers/`
- `convex/lib/coordination/`
- `convex/lib/knowledge/`

Do not build these abstractions speculatively. Add them when a real product loop
requires them, starting with coverage-gap coordination and permissioned
outreach.

## Architecture

The active stack is:

- **Convex** for typed backend state, mutations, actions, and auditability
- **Linq** for iMessage/SMS delivery and webhook callbacks
- **Claude** for reasoning, response generation, memory extraction, and care
  context interpretation
- **A future tool registry** for permissioned actions across calendars,
  reminders, messaging, outreach, schedules, and eventually email

Current message flow:

1. Linq posts an inbound webhook.
2. The handler resolves the sender and care case.
3. Convex loads deterministic context: profile, memory, care records, recent
   messages, and audit-relevant state.
4. Claude returns structured JSON.
5. The parser validates and normalizes the response.
6. Convex persists messages, memory, medications, schedule items, reactions, and
   audit records.
7. Linq sends the outbound text response.

Future tool-bearing flow should preserve that shape while adding explicit tool
planning, permission checks, execution records, provider adapters, and closure
tracking.

## Operating Principles

- **Text is the UI.** CareSupport should not require a dashboard to finish core
  work.
- **Push beats pull.** Users should not have to keep asking for status on active
  care coordination.
- **Safety is mechanical.** Permission checks, filtering, audit logs, and
  tool-action state belong in code, not only in prompts.
- **Memory must be correctable.** The agent should show what it is using when it
  matters and make correction cheap.
- **Rob is the stress test.** Features that do not reduce Rob's coordination
  burden are not central.

## Canonical Docs

Start here when changing product direction or architecture:

- `docs/product-thesis.md`
- `docs/rob-care-operations-model.md`
- `docs/tools-and-capabilities-thought-experiment.md`
- `docs/integrations-and-tool-bearing-agent.md`
- `docs/research-integration-architecture.md`
- `docs/agent-knowledge-visibility.md`
- `docs/implementation-plan-family-care-agent.md`
- `docs/design.md`
- `docs/DECISIONS.md`

## Development

Install dependencies:

```bash
npm install
```

Run Convex locally:

```bash
npx convex dev
```

Typecheck:

```bash
npx tsc --noEmit
```

Run tests:

```bash
npm test
```
