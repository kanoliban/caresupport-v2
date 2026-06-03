# Convex Memory And Retrieval Architecture

Date: 2026-06-02

## Purpose

This document defines how CareSupport should store, retrieve, and inject care
context into the model as the product moves from one trusted text thread toward
one-to-many coordination.

It answers Obssa's architecture concern: persistent memory and context retrieval
are core system requirements, but they should be designed inside the current
Convex runtime before adding external vector infrastructure.

This is not a Pinecone rejection. It is a sequencing decision:

1. Use structured Convex state for current truth.
2. Use source-linked operational records for what happened.
3. Add Convex-native semantic retrieval when fuzzy or historical recall requires
   it.
4. Add Pinecone or another external vector database only after Convex-native
   retrieval proves insufficient.

## Distinction

CareSupport has two related but different concepts.

### Product Context Graph

The product context graph is what CareSupport understands about a care
situation:

- people
- roles
- relationships
- availability
- schedules
- routines
- medications
- open coordination events
- confirmations
- declines
- unresolved gaps
- relevant history

This maps to the CareSupport model constitution:

- relationship graph
- coordination state machine
- time-sequenced operational record

### Technical Memory And Retrieval Layer

The technical memory and retrieval layer is how the runtime stores facts,
retrieves prior context, and gives the model the right context at the right
time.

This layer must answer:

- Which facts are current truth?
- Which facts are historical evidence?
- Which facts are only useful if searched for?
- Which records should always be loaded?
- Which records should be retrieved on demand?
- Which source message or audit event supports this fact?
- Which storage/retrieval primitive is appropriate?

## Current Runtime

CareSupport currently uses custom Convex tables plus custom prompt compilation.
It does not currently use:

- `@convex-dev/rag`
- `@convex-dev/agent`
- Pinecone
- LangSmith as runtime infrastructure

Current runtime memory flow:

1. Linq sends an inbound webhook.
2. `convex/handler.ts` resolves the speaker and care case.
3. Convex logs the inbound message.
4. `getCompiledPromptContext` loads current care state.
5. `buildCareCaseContext` compiles that state into prompt-readable text.
6. The model returns structured JSON updates.
7. Convex persists typed records, memory entries, messages, and audits.
8. The next model turn receives the updated context.

This is sufficient for the first Rob-style coordination loop, but it is not the
final retrieval architecture.

## Core Policy

### 1. Structured Truth First

Current operational truth belongs in typed Convex tables, not vector search.

Use structured tables for facts where correctness matters:

- who the primary coordinator is
- who the care recipient is
- who each care contact is
- phone numbers
- textability and consent state
- current availability notes
- current schedules
- open coordination events
- pending/confirmed/declined contact state
- outreach approval and send status
- medication records
- active reminders

If CareSupport needs to answer "has Angela confirmed Monday 9am?", it should be
a deterministic Convex query, not a semantic search.

### 2. Prompt Context Is Compiled, Not Remembered

The model should not be trusted to remember important state from hidden
conversation memory.

Every model turn should receive a compiled context generated from Convex:

- user context
- care case profile
- current typed records
- active care contacts
- open/waiting coordination events
- recent relevant messages
- applicable lessons or corrections

The model can infer, but the runtime should reconstruct the truth.

### 3. Source Links Are Mandatory For Operational Facts

Durable care facts should preserve enough source context to audit later:

- who said it
- when they said it
- which message caused the update
- which care case it belongs to
- which contact/event/attempt it affected

The current schema already links messages to `careContactId`,
`coordinationEventId`, and `outreachAttemptId`. Phase 2E should strengthen this
so contact availability and coordination-state changes can be traced back to the
inbound message or audit event that caused them.

### 4. Current Context And Reference Context Should Separate

Not everything belongs in every prompt.

Always-loaded current context should include:

- care case profile
- primary coordinator profile
- active care contacts
- open/waiting coordination events
- active schedule/medication records
- recent messages needed for the live thread
- unresolved outreach attempts

Reference context should be retrieved only when needed:

- older message history
- old resolved coordination events
- patterns learned over time
- previous similar coverage gaps
- historical caregiver reliability
- old corrections or preferences not relevant to the current turn

This preserves context window quality while allowing the system to compound
memory over time.

### 5. Semantic Retrieval Is For Fuzzy Recall, Not Current Truth

Semantic retrieval is valuable for questions like:

- "How do we usually handle overnight gaps?"
- "Who tends to answer fastest?"
- "What did Sarah say about Wednesdays a while ago?"
- "Has Rob said he prefers not to ask his uncle unless urgent?"
- "What happened last time Angela cancelled?"

Semantic retrieval is not the right primitive for:

- whether outreach is approved
- whether a message was sent
- whether a shift is confirmed
- whether a contact can receive texts
- what the current open event status is

### 6. Convex-Native RAG Before External Vector Infrastructure

Official Convex components now support RAG-style retrieval with namespaces,
filters, importance weighting, semantic search, and surrounding chunk context.
Convex Agent also supports persistent threads, message management, RAG, tool
calls, and tool approval flows.

CareSupport should evaluate those native components before adding Pinecone.

The first RAG namespace should be care-case scoped:

```text
namespace = careCaseId
```

Useful filters may include:

- record type: message, audit, resolved event, memory, decision trace
- contact id
- coordination event type
- urgency
- source actor type
- active vs archived
- PHI sensitivity level if/when introduced

### 7. LangSmith Is Observability, Not The Source Of Truth

LangSmith may be useful for tracing, evaluating model behavior, debugging
chains, and comparing prompt versions.

It should not become the canonical memory store. CareSupport's source of truth
should remain inside the care-case-scoped runtime.

## Proposed Retrieval Layers

### Layer 0: Current Structured State

Source:

- `users`
- `careCases`
- `careContacts`
- `coordinationEvents`
- `outreachAttempts`
- `scheduleItems`
- `medications`

Use for:

- current truth
- permission checks
- routing
- open-loop status
- app/web views
- deterministic assertions in responses

### Layer 1: Operational Record

Source:

- `messages`
- `auditLogs`

Use for:

- source links
- audit trails
- what happened
- who said what
- what action was approved, sent, blocked, failed, or received

### Layer 2: Durable Human Memory

Source:

- `memoryEntries`

Use for:

- communication preferences
- care preferences
- stable care notes
- lessons/corrections
- facts that do not fit typed records

Avoid storing:

- emotional guesses
- one-off remarks
- speculative summaries
- raw private detail with no coordination value

### Layer 3: Retrieved Reference Context

Source, future:

- Convex-native RAG entries and/or a local retrieval index derived from
  messages, audits, memory, and resolved coordination events

Use for:

- fuzzy recall
- precedent search
- pattern lookup
- older context not worth loading every turn

### Layer 4: Evaluation And Observability

Source, future:

- transcript-style tests
- decision-trace tests
- prompt/version evals
- optional LangSmith traces

Use for:

- validating retrieval quality
- detecting hallucinated memory
- debugging context omissions
- measuring whether retrieved context changed outcomes

## Phase 2E Implications

Before adding RAG infrastructure, Phase 2E should harden the current context
graph and source links.

Immediate Phase 2E work:

1. Strengthen caregiver reply classification.
2. Ensure clear confirmations/declines update `coordinationEvents`.
3. Ensure partial availability updates `careContacts.availabilityNotes` without
   creating false confirmations.
4. Add wrong-number, stop-texting, and ask-later handling.
5. Preserve source links from caregiver replies to resulting contact/event
   changes.
6. Add transcript-style tests for the full coordination loop.
7. Define the minimal retrieval interface before adding Convex RAG dependencies.

Only after those pass should we run a Convex RAG spike.

## Convex RAG Spike Gate

Do not add `@convex-dev/rag` merely because it exists.

Run a spike only when at least one of these is true:

- prompt context becomes too large for reliable model use
- older but relevant facts are being missed
- users ask history/pattern questions that current structured context cannot
  answer
- Rob-style tests need precedent recall across many prior coordination events
- resolved events become useful as examples for future decisions

Spike acceptance criteria:

- care-case-scoped namespace
- source ids retained for every retrieved chunk
- filters by record type and care case
- no retrieved fact can override current structured state
- transcript tests show retrieval improves an answer or decision
- no external vector database added

## Pinecone Gate

Pinecone or another external vector database should be considered only if:

- Convex-native RAG cannot meet retrieval volume, latency, or ranking needs
- cross-care-case retrieval becomes an approved product requirement
- specialized vector operations become necessary
- operational complexity is justified by measured retrieval failures
- privacy/security posture is explicitly reviewed before PHI is indexed

Until then, Pinecone is unnecessary complexity.

## Architectural Rule

CareSupport should not choose between "database memory" and "AI memory."

The correct design is layered:

- structured truth in Convex
- operational history in messages/audits
- durable human memory in scoped records
- semantic retrieval for fuzzy reference
- model reasoning over the retrieved context
- runtime enforcement for permission, execution, persistence, and truthfulness

The model may infer the next useful action. The runtime must decide what is
true, what is allowed, what was persisted, and what was actually done.
