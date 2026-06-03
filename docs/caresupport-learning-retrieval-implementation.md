# CareSupport Learning And Retrieval Implementation Plan

Date: 2026-06-02

## Purpose

This document turns the memory/retrieval policy into an implementation plan.

It answers:

- What does it mean for CareSupport to learn?
- Where does learning live in the Convex runtime?
- When should CareSupport ask for clarification before acting?
- Where does Convex RAG fit?
- What PRs and tests should come next?

This is a plan for a new architecture track. It should be implemented as its
own PR sequence after the current Phase 2E source-linked coordination work is
merged or deliberately branched from.

## Definition Of Learning

CareSupport does not learn because a model "remembers" a conversation.

CareSupport learns when the runtime turns messy human conversation into durable,
source-linked, revisable understanding that improves future coordination.

Learning requires all of these:

1. A source message or event.
2. An extracted claim about the care situation.
3. A certainty state for that claim.
4. A clarification path when the claim is incomplete or risky.
5. A promotion path from confirmed claim to current truth.
6. Retrieval back into future model context.
7. Auditability when CareSupport acts from that understanding.

If any of these are missing, CareSupport may have generated a plausible summary,
but it has not learned.

## Core Thesis

CareSupport should infer freely but act conservatively.

The model may notice patterns, propose interpretations, and ask useful
questions. The runtime owns truth, permission, source links, execution, and
audit.

The memory architecture is therefore layered:

```text
messages
-> source-linked claims
-> clarification state
-> confirmed current truth
-> compiled prompt context
-> optional semantic retrieval
-> permissioned action
```

## Why This Matters For Rob

Rob's actual care network is complex:

- routine weekday care
- overnight caregivers
- family caregivers
- backup caregivers
- random/on-call availability
- dementia and family-care constraints
- summer-break/unavailable states
- empty-slot coverage

CareSupport will not receive that reality as a clean table. It will receive
pieces over time:

- "Jim usually does weekdays."
- "Jennifer has Mon/Tues nights."
- "Luann fills empty slots but she has dementia."
- "Grace is off for summer."
- "Marta is backup and helps with mom too."

The correct first move is not to pretend those fragments are complete truth.
The correct first move is to say:

```text
I want to make sure I understand the care situation accurately before I start
coordinating from this.
```

Then CareSupport should ask concrete clarification questions.

This is the product trust layer. It will slow the first setup down, but it
prevents false certainty. For users who stay through that setup, CareSupport
becomes valuable because it has earned the right to coordinate from an accurate
operating model.

## Mom Test Posture

CareSupport should avoid vague validation questions:

- "Is this right?"
- "Would this be helpful?"
- "Should I manage this?"

CareSupport should ask concrete reality questions:

- "When you say Jim usually does weekdays, should I treat that as Monday-Friday
  9am-5pm right now?"
- "For Jennifer's Mon/Tues nights, does that mean overnight shifts from 8pm to
  8am?"
- "Should Luann be treated as actively schedulable for open slots, or should I
  keep her as family context because of her dementia?"
- "Should Grace be excluded from active scheduling while she is on summer break?"

The goal is not to get the user to agree with CareSupport. The goal is to learn
the user's real operating world.

## Target Runtime Objects

### Existing Current Truth

These tables already exist and should remain the operational source of truth:

- `users`
- `careCases`
- `careContacts`
- `coordinationEvents`
- `outreachAttempts`
- `scheduleItems`
- `medications`
- `memoryEntries`

### Existing Evidence

These tables already preserve what happened:

- `messages`
- `auditLogs`

### New Learning Layer

Add a new table:

- `careClaims`

`careClaims` should hold tentative, inferred, clarified, confirmed, contradicted,
or superseded understanding before it becomes operational current truth.

## Proposed `careClaims` Schema

Initial fields:

```ts
careClaims: {
  careCaseId: Id<"careCases">;
  sourceMessageId: Id<"messages">;
  sourceActorType: "user" | "assistant" | "system";
  sourceCareContactId?: Id<"careContacts">;

  subjectType:
    | "care_recipient"
    | "care_contact"
    | "schedule"
    | "availability"
    | "relationship"
    | "role"
    | "constraint"
    | "preference"
    | "coordination_rule"
    | "other";

  subjectLabel: string;
  subjectContactId?: Id<"careContacts">;

  predicate: string;
  valueText: string;
  normalizedValue?: string;

  status:
    | "heard"
    | "inferred"
    | "needs_clarification"
    | "confirmed"
    | "rejected"
    | "contradicted"
    | "superseded"
    | "archived";

  confidence: "low" | "medium" | "high";
  sensitivity: "normal" | "sensitive";

  clarificationQuestion?: string;
  clarifiedByMessageId?: Id<"messages">;
  confirmedAt?: number;
  supersededByClaimId?: Id<"careClaims">;

  active: boolean;
  createdAt: number;
  updatedAt: number;
}
```

Indexes:

```ts
by_care_case
by_care_case_status
by_care_case_subject
by_source_message
by_subject_contact
```

## Claim Status Semantics

`heard`

The user directly said it, but CareSupport has not decided whether it is safe to
use as operational truth.

`inferred`

CareSupport derived this from the message. It must be treated as tentative.

`needs_clarification`

The claim affects coordination and is ambiguous, incomplete, sensitive, or risky
enough that CareSupport should ask before acting from it.

`confirmed`

The primary coordinator or appropriate source has confirmed it. It may be
promoted into current truth if a promotion rule exists.

`rejected`

The coordinator explicitly rejected the claim.

`contradicted`

A newer source conflicts with the claim and the conflict has not been resolved.

`superseded`

A newer claim replaced it.

`archived`

The claim is no longer active context but remains part of the audit trail.

## Example: Luann Fragment

Input:

```text
Luann fills empty slots but she has dementia.
```

Do not immediately write:

```text
Luann = schedulable for all empty slots
```

Instead create claims:

```ts
[
  {
    subjectType: "care_contact",
    subjectLabel: "Luann",
    predicate: "fills_empty_slots",
    valueText: "fills empty slots",
    status: "needs_clarification",
    confidence: "medium",
    sensitivity: "normal",
    clarificationQuestion:
      "Should I treat Luann as actively schedulable for open slots, or keep her as family context because of her dementia?",
  },
  {
    subjectType: "constraint",
    subjectLabel: "Luann",
    predicate: "has_dementia",
    valueText: "has dementia",
    status: "needs_clarification",
    confidence: "medium",
    sensitivity: "sensitive",
    clarificationQuestion:
      "How should I account for Luann's dementia when coordinating Rob's care?",
  },
]
```

After Rob clarifies:

```text
Do not actively schedule Luann. She is family context and may fill gaps
informally.
```

Promote to current truth:

```text
careContacts.Luann.role = "family context; informal gap support"
careContacts.Luann.notes = "Do not actively schedule; dementia context affects coordination."
careContacts.Luann.canReceiveTexts = false or unknown unless explicitly provided
```

## Promotion Rules

Claims do not automatically become current truth.

Promotion should be explicit and narrow:

| Confirmed claim type | Promotion target |
| --- | --- |
| person identity | `careContacts` |
| phone/contactability | `careContacts.phone`, `canReceiveTexts`, `consentToContact` |
| relationship | `careContacts.relationship` |
| role/capability | `careContacts.role`, `contactType`, `notes` |
| recurring availability | `careContacts.availabilityNotes`, future schedule-pattern table |
| coverage need | `coordinationEvents` |
| outreach permission | `outreachAttempts` |
| stable preference | `memoryEntries` |
| sensitive constraint | `careContacts.notes` or `memoryEntries` only when useful and confirmed |

Promotion must preserve source:

- source message id
- confirming message id
- affected current-truth row id
- audit event

## Retrieval Architecture

### Retrieval Principle

Retrieval should answer:

```text
What context does the model need for this turn, and which of it is current truth
versus reference context?
```

Retrieval must not answer:

```text
What should CareSupport believe if semantic search says something plausible?
```

Current truth wins over retrieved reference every time.

### Minimal Retrieval Interface

Add a stable interface before installing RAG:

```ts
retrieveCareContext({
  careCaseId,
  userId,
  query,
  purpose,
  includeUnresolvedClaims,
  includeResolvedHistory,
  limit,
})
```

Return shape:

```ts
{
  currentTruth: {
    careCase;
    contacts;
    openCoordinationEvents;
    activeScheduleItems;
    activeMemoryEntries;
  };
  unresolvedClaims: Array<CareClaimSnapshot>;
  references: Array<{
    sourceType: "message" | "audit" | "claim" | "coordination_event" | "memory";
    sourceId: string;
    text: string;
    score?: number;
    status?: string;
  }>;
  sourceLinks: Array<{
    sourceType: string;
    sourceId: string;
    reason: string;
  }>;
}
```

First implementation should use structured Convex queries only.

RAG can be added behind this interface later without changing the caller.

## Convex RAG Role

Convex RAG is useful for semantic reference, not truth.

Use it for:

- old messages that are relevant but not always loaded
- resolved coordination event recaps
- confirmed care model summaries
- unresolved claim summaries
- corrections and lessons
- recurring coordination patterns

Do not use it for:

- current contact phone numbers
- current outreach approval state
- whether a shift is confirmed
- whether an event is open or resolved
- whether a caregiver can receive texts

### RAG Namespace

Use one namespace per care case:

```text
namespace = careCaseId
```

This keeps memory scoped to one care situation and avoids accidental cross-case
retrieval.

### RAG Filters

Initial filters:

```text
recordType: message | claim | memory | coordination_event | audit_summary
claimStatus: confirmed | needs_clarification | contradicted | superseded
contactId
coordinationEventType
sourceActorType
sensitivity: normal | sensitive
active: true | false
```

### RAG Entries

Do not index every raw message by default.

Index selected summaries:

- confirmed care model summary
- unresolved claim summary
- resolved event recap
- important correction
- stable preference
- source-linked excerpt when the exact wording matters

Every RAG entry must retain:

- `careCaseId`
- source record ids
- record type
- created/updated timestamp
- sensitivity

## Convex Agent Role

Convex Agent may later help with persistent threads, tool approval flows,
message management, and RAG integration.

Do not migrate the current runtime to Convex Agent as part of the first claim
layer PR.

The first goal is to preserve CareSupport's current deterministic core:

- typed Convex state
- explicit prompt construction
- source-linked actions
- tests with `convex-test`

Convex Agent can be evaluated after:

1. `careClaims` exists.
2. clarification/promotion tests pass.
3. a retrieval interface exists.
4. the team can name the specific runtime problem Convex Agent solves better
   than the current handler.

## PR Sequence

### PR 1: Source-Linked Claims

Goal: install the learning layer without RAG.

Build:

- `careClaims` schema
- claim create/list/update/confirm/reject/supersede helpers
- source links to `messages`
- tests for claim lifecycle

Acceptance:

- claims can be created from one source message
- claims can be marked `needs_clarification`
- claims can be confirmed/rejected/superseded
- claims are queryable by care case, status, subject, and source message
- no current truth changes happen merely because a claim exists

Tests:

- `convex/careClaims.test.ts`

### PR 2: Rob Care Network Clarification Simulator

Goal: prove CareSupport seeks accuracy before forming operational truth.

Build:

- transcript-style test using Rob's messy care network fragments
- deterministic helper that simulates model-extracted claims
- clarification response assertions
- confirmation response assertions
- promotion into current truth only after confirmation

Acceptance:

- messy fragments create source-linked claims
- risky or ambiguous claims are marked `needs_clarification`
- CareSupport prefaces that it is seeking accuracy
- no outreach starts before clarification
- no calendar/current truth is blindly promoted
- confirmed claims update `careContacts` and prompt context

Tests:

- `convex/robCareNetworkClarification.test.ts`

### PR 3: Retrieval Interface

Goal: add the stable retrieval contract before installing RAG.

Build:

- `convex/lib/knowledge/retrieveCareContext.ts`
- structured-only retrieval backend
- unresolved claim section in compiled prompt context
- source-link return shape

Acceptance:

- current truth always appears separately from reference context
- unresolved claims are included when relevant
- structured current truth wins over older claims
- callers do not depend on a specific RAG implementation

Tests:

- `convex/lib/knowledge/retrieveCareContext.test.ts`
- prompt context tests for unresolved claims

### PR 4: Convex RAG Spike

Goal: evaluate Convex-native semantic retrieval with source links.

Build:

- install `@convex-dev/rag`
- configure care-case namespace
- add indexing helpers for selected summaries
- add retrieval adapter behind `retrieveCareContext`
- keep structured current truth separate from RAG results

Acceptance:

- RAG entries are care-case scoped
- RAG entries preserve source ids
- filters work for record type and claim status
- retrieved reference never overrides current truth
- at least one transcript/eval shows retrieval improves a response or next-step
  decision

Tests:

- unit tests for index payload construction
- adapter tests with mocked retrieval results
- transcript eval proving source-linked retrieval changes the answer

### PR 5: Agent Prompt And Action Integration

Goal: teach the live CareSupport model to use claims and retrieval.

Build:

- prompt contract for claims vs current truth
- response parser support for claim proposals
- handler writes proposed claims
- clarification questions use Mom Test posture
- promotion only through confirmation/promotion helpers

Acceptance:

- the model can propose claims
- the runtime stores claims with source messages
- the model can ask targeted clarification questions
- confirmed claims promote through deterministic helpers
- non-scheduling care coordination claims remain possible

Tests:

- parser tests
- handler tests
- Rob clarification simulator
- non-scheduling claim example

## Implementation Timing

Recommended sequence from here:

1. Finish and merge the current Phase 2E source-linked coordination PR.
2. Open a new branch for PR 1:

```bash
git checkout main
git pull
git checkout -b liban/care-claims-learning-layer
```

3. Implement `careClaims` schema and lifecycle tests.
4. Add the Rob clarification simulator in the same PR only if the schema PR
   remains small. If it grows, split simulator into PR 2.
5. Add the retrieval interface in PR 3.
6. Only then start the Convex RAG spike.

The reason is simple:

```text
RAG retrieves memory.
Claims define memory.
Current truth constrains memory.
Clarification earns memory.
```

Installing RAG before claims would give CareSupport a better search layer for
an insufficient memory model.

## Open Product Decisions

Before implementation, decide:

1. Should sensitive claims require explicit confirmation before storage, or may
   they be stored as `needs_clarification` with sensitivity metadata?
2. What claim categories should be visible to Rob in the companion app later?
3. Should users be able to edit claims directly, or only edit promoted current
   truth?
4. Should "confirmed by caregiver" ever promote current truth without Rob's
   confirmation?
5. How should CareSupport represent "informal reality" such as Luann filling
   gaps without being actively schedulable?

These do not block PR 1, but they should shape prompt wording and UI later.

## Non-Goals For The First Claim PR

- no Pinecone
- no cross-care-case retrieval
- no broad role/permission system
- no web/iOS memory dashboard
- no full schedule-pattern engine
- no migration to Convex Agent
- no indexing every raw message into RAG

## Final Rule

CareSupport should be able to say:

```text
Here is what I know.
Here is what I think I heard.
Here is what I still need to confirm.
Here is what I will not act on yet.
```

That is the difference between an assistant that sounds smart and a care
coordinator that can be trusted.
