# CareSupport v2 Design

CareSupport is a text-native, tool-bearing family care coordination runtime.

The product begins in one trusted text thread, but it is designed for
multiplayer care: one care situation, many people, many organizations, many
handoffs, and one agent responsible for reducing the coordination burden.

## Product Frame

CareSupport is not a generic personal assistant, reminder bot, or care journal.
It is a family care agent that learns how care is coordinated and helps carry
that work through conversation and permissioned tools.

The current solo-thread experience remains important. It is:

- the first relationship
- the onboarding wedge
- the trusted narrator
- the initial memory-building surface
- the safest way to prove the core loop

It is not the final product identity.

## Primary User Model

Rob is the clearest stress test.

Rob is quadriplegic and uses his nose to operate his iPhone. He coordinates 12
people himself:

- 9 professional caregivers
- 3 family members
- caregivers spread across 3 disconnected agencies

Rob becomes the communication bridge, dispatcher, historian, escalation path,
and schedule operator for his own care. Every unnecessary interaction has
physical cost.

The product heuristic is:

> Does this reduce the number of times Rob has to use his nose to chase care coordination?

If a capability does not reduce Rob's coordination burden, it is not central.

## Families We Serve

The pilot families exercise different parts of the system:

- **Family A - Kano:** small, tight-knit family where Liban coordinates care for
  Degitu.
- **Family B - Rob:** Rob is both care recipient and coordinator, with a large
  mixed team of professional caregivers and family members across disconnected
  organizations.
- **Family C - Amanti:** distributed siblings coordinating care for their mother,
  where group communication and remote visibility matter.

The runtime should stay grounded in these families. Schema and product choices
should make sense for at least one of them.

## Current Active Runtime

The active implementation is still intentionally narrow:

- one primary coordinator beginning in one trusted text thread
- one care case
- memory extraction and correction
- medications and schedule items
- care contacts and coordination events created from conversation
- pending, approved, sent, failed, and audited outreach attempts
- approved one-to-one outreach through Linq
- care contact replies mapped back to the same care case/contact/event/attempt
- audit logging
- Linq iMessage/SMS transport
- Claude structured-response loop

Current tables:

- `users`
- `careCases`
- `messages`
- `medications`
- `scheduleItems`
- `memoryEntries`
- `careContacts`
- `coordinationEvents`
- `outreachAttempts`
- `auditLogs`

This deterministic core should remain stable while the product direction is
being clarified. Do not rebuild the old v1 family schema just to make the docs
sound multiplayer again. The multiplayer runtime now extends the current
care-case core through `careContacts`, `coordinationEvents`, and
`outreachAttempts`.

## Current Product Boundary

In the active runtime, CareSupport does not yet:

- execute external tools
- sync Google Calendar or Gmail
- run group chats as the main coordination surface
- autonomously resolve coverage gaps

These are current implementation boundaries, not product non-goals.

The assistant should be honest about them:

> I can ask Angela about Wednesday evening coverage. Before I message her, do you want me to send this?

The assistant should not imply that multiplayer coordination is outside
CareSupport's purpose.

Care contact replies are not new app-user onboarding by default. They are tied
back to the coordinator's care graph by Linq chat id first, then by phone only
when the phone is uniquely tied to a sent outreach attempt. See
`docs/multiplayer-runtime-architecture.md`.

## Long-Term Runtime Direction

CareSupport should evolve into a one-to-many coordination runtime with these
core primitives. Two of them now exist as early substrate:

- `careContacts`
- `coordinationEvents`

The remaining tool-bearing primitives are still future work:

- `toolActions`
- `connectedAccounts`
- `externalRefs`
- `userToolPermissions`

These primitives support a future where CareSupport can:

- know who is involved in care
- understand availability, roles, agencies, and fallback order
- track unresolved coordination work
- ask permission before outreach or tool use
- send approved messages
- update schedules and reminders
- track replies and failures
- escalate when a care need remains unresolved
- close the loop with a short operational update

## First Multiplayer Loop

The first true multiplayer loop should be coverage-gap coordination.

Example:

1. Rob texts that tonight's caregiver cancelled.
2. CareSupport identifies the uncovered time window.
3. CareSupport checks known contacts, preferences, and fallback order.
4. CareSupport asks Rob for permission to begin outreach.
5. CareSupport texts approved contacts or agencies.
6. CareSupport tracks pending, declined, partial, and confirmed replies.
7. CareSupport escalates only when needed.
8. CareSupport updates Rob with the smallest useful status message.
9. CareSupport records the resolution and relevant schedule changes.

This is the product loop that proves CareSupport is more than a memory surface.

## Tool-Bearing Architecture

Conversation is the interface. Tools are how work gets done.

Likely runtime organization:

- `convex/lib/tools/` - registry, tool plans, tool action lifecycle
- `convex/lib/providers/` - Google Calendar, Linq, reminders, email, and other
  external adapters
- `convex/lib/coordination/` - coordination events, escalation, fallback order,
  status summaries, closure logic
- `convex/lib/knowledge/` - memory retrieval, correction, contextual knowledge
  visibility

Tool-bearing behavior must include:

- explicit permission checks
- persisted execution state
- provider request/response records where useful
- audit logs for user-visible and external actions
- failure handling that does not pretend work succeeded

## Knowledge Visibility

CareSupport should reveal knowledge in context rather than forcing users into a
dashboard.

The agent should naturally say things like:

- "I have Angela as your first evening coverage fallback."
- "I do not have Marcus's phone number yet."
- "I am assuming this is for tonight's 6-10 gap."
- "Here is what is still open."

The goal is trust through situated explanation, not a giant profile screen.

## Push, Not Pull

CareSupport should avoid making Rob ask for status repeatedly.

The agent should proactively push operational updates when:

- a coordination event changes state
- someone confirms, declines, or partially accepts
- the fallback path is exhausted
- Rob must choose between real options
- time pressure changes the situation

Low-value chatter should be avoided. The right update is the shortest message
that changes what the user needs to know or do.

## Implementation Stance

Do not overbuild.

The right order is:

1. Keep the first trusted thread reliable.
2. Keep docs and prompts honest that the first thread is the wedge, not the
   identity.
3. Use care-case-scoped contact, event, outreach, reply, and audit state for the
   first one-to-many loop.
4. Add external tools behind permissions and audit records.
5. Expand toward richer family/team coordination only after the narrow loop is
   reliable.

This preserves the working Convex runtime while making the product direction
clear.
