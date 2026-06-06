# Implementation Plan — Family Care Agent Runtime

## Purpose

This document translates `docs/product-thesis.md` into implementation direction.

The goal is not to immediately build the full multiplayer care coordination system. The goal is to make the current solo beta feel like the first relationship of a family care agent, while preparing the runtime to expand into true one-to-many coordination.

CareSupport should begin by learning one care situation through one trusted narrator, then gradually become capable of coordinating the people around that care situation.

## Product Principle

The implementation should make this sentence true:

> CareSupport does not arrive as an expert in your family. It becomes useful by learning your family.

That means the product should not hide learning, uncertainty, or correction. It should operationalize them.

## Implementation Layers

CareSupport should be implemented across five connected layers:

1. Agent identity and voice
2. Onboarding and intake
3. Memory and correction system
4. Care runtime records
5. Multi-person coordination expansion

Each layer should be coherent with the product thesis.

---

# 1. Agent Identity and Voice

## Current State

`SOUL.md` already defines a strong behavior loop:

1. Listen
2. Reason
3. Act or clarify
4. Close the loop

It also already states that CareSupport is part of a learning system and should accept corrections.

## Needed Change

Promote the learning posture from internal instruction to visible product behavior.

CareSupport should speak as a careful, accountable agent that is new to the family. It should not pretend to know the family's care system before it has learned it.

## Implementation Tasks

- Update `SOUL.md` to include a visible first-principles identity:
  - CareSupport is a family care assistant.
  - CareSupport is new to this family.
  - CareSupport learns through use and correction.
  - CareSupport should not overstate certainty.
- Add voice examples for:
  - first message
  - correction handling
  - missing context
  - action confirmation
  - escalation / urgency
- Add disallowed phrases:
  - "I understand how you feel"
  - "Your AI care coordinator is ready"
  - "I know exactly what you need"
  - over-polished SaaS helper language

## Desired Behavior

Instead of:

```text
I'm your AI care coordinator. Let's set up your account.
```

Say:

```text
I'm CareSupport. I'm here to learn how care works in your family and help carry the coordination load.
```

Instead of:

```text
I can manage your care team.
```

Say:

```text
I can start by remembering what matters and helping you keep track. As I learn the people involved, I can help coordinate more of the moving pieces.
```

---

# 2. Onboarding and Intake

## Current State

The active runtime is solo-thread native: one user, one care case, one persistent thread.

That is still correct for the beta, but onboarding should not frame the product as a solo caregiver app. It should frame the solo relationship as the beginning of CareSupport learning the family care system.

## Needed Change

Create an onboarding procedure that starts with the emotional/logistical burden, then gradually captures the care situation.

CareSupport should ask one question at a time.

## Proposed Onboarding Flow

### Step 1 — Establish the relationship

```text
Hi, I'm CareSupport.

I'm here to learn how care works in your family and help carry the coordination load.

I won't know everything at first. Tell me what matters, correct me when I'm wrong, and I'll remember.

To start, who are we caring for?
```

Capture:

- care recipient name
- relationship to user
- user's role

### Step 2 — Ask for the burden

```text
What is the part of care coordination that keeps falling back on you?
```

Capture:

- pain point
- recurring breakdown
- user's emotional/logistical framing

Store as memory entry:

- scope: `care_case`
- category: `care_note` or future `coordination_burden`

### Step 3 — Capture the immediate helpful surface

```text
What would be most useful for me to help remember first: medications, appointments, tasks, rides, or general notes?
```

Capture the selected starting surface and route into a specific intake procedure.

### Step 4 — Build a first useful record

Depending on selected surface:

- Medication intake
- Appointment intake
- Task/reminder intake
- Care note intake
- Ride / logistics intake

### Step 5 — Reflect what CareSupport has learned

```text
Here is what I know so far:

- We are caring for Rob.
- You coordinate most of the schedule changes.
- The hardest part is finding coverage when someone cancels.
- You want me to start by helping with shifts and reminders.

I will keep learning as you text me. What is one upcoming thing I should remember?
```

## Implementation Tasks

- Add an onboarding route/state to the message pipeline.
- Add prompt/procedure file for onboarding.
- Add typed extraction for:
  - care recipient name
  - user relationship
  - primary burden
  - first help surface
- Save early burden as durable memory.
- Add tests for onboarding sequence.

## Schema Implications

Current schema can support most of this with:

- `users.relationshipToRecipient`
- `careCases.careRecipientName`
- `careCases.relationshipToRecipient`
- `memoryEntries`

Potential future schema addition:

```ts
memoryCategory: "coordination_burden"
```

or a more structured field on `careCases`:

```ts
primaryCoordinationBurden?: string
```

Recommendation: start with `memoryEntries` before adding schema fields.

---

# 3. Memory and Correction System

## Current State

The schema already has `memoryEntries` with scope and category. `SOUL.md` already says corrections should become lessons.

## Needed Change

Make learning visible and operational.

CareSupport should explicitly acknowledge corrections, save them, and show that future behavior changes.

## Correction Pattern

User:

```text
No, don't text Marcus first. He works nights. Ask Angela before him.
```

CareSupport:

```text
Got it. Ask Angela before Marcus for coverage, because Marcus works nights. I'll remember that.
```

Persist memory:

- scope: `care_case`
- category: `lesson` or `care_preference`
- content: `For coverage requests, ask Angela before Marcus. Marcus works nights.`
- source: source message id or excerpt

## Implementation Tasks

- Add correction detection to routing.
- Add a `saveMemory` internal mutation if not already present.
- Add memory deduplication / update behavior.
- Add tests:
  - user corrects ordering preference
  - system saves correction
  - next prompt includes correction
  - next response follows correction

## Important Product Behavior

CareSupport should not over-apologize.

Correct:

```text
Got it. Ask Angela before Marcus for coverage. I'll remember that.
```

Incorrect:

```text
I'm so sorry for the confusion. I completely understand how frustrating that must be...
```

---

# 4. Care Runtime Records

## Current State

The deterministic core already includes:

- users
- careCases
- messages
- medications
- scheduleItems
- memoryEntries
- auditLogs

This is enough for the solo beta.

## Needed Change

Use records in a way that supports the family assistant arc, even before multiplayer coordination is active.

The system should distinguish between:

- structured care facts
- learned family preferences
- coordination rules
- open loops

## Recommended Runtime Concepts

### Structured care facts

Examples:

- medication name / dose / schedule
- appointment date / time / location
- task / reminder

Stored in:

- `medications`
- `scheduleItems`

### Learned family preferences

Examples:

- Rob prefers morning showers.
- Do not call Mom unless urgent.
- Angela is usually available on Tuesdays.

Stored in:

- `memoryEntries`

### Coordination rules

Examples:

- For cancellations, ask Angela first, then Marcus.
- Professional caregivers need 24 hours notice.
- Agency A handles weekday mornings.

Initially stored in:

- `memoryEntries`

Future structured table:

```ts
coordinationRules: defineTable({
  careCaseId,
  title,
  trigger,
  orderedContacts,
  constraints,
  active,
  createdAt,
  updatedAt,
})
```

### Open loops

Examples:

- Waiting for Angela to confirm Tuesday.
- Need pharmacy name for refill tracking.
- User asked CareSupport to remind them tomorrow.

Current schema does not have a dedicated open loop table.

Recommendation for near-term:

- Use `scheduleItems` for reminders/tasks.
- Use `auditLogs` for traceability.

Future table:

```ts
openLoops: defineTable({
  careCaseId,
  userId,
  type,
  status,
  description,
  waitingOn,
  dueAt,
  sourceMessageId,
  createdAt,
  updatedAt,
})
```

---

# 5. Multi-Person Coordination Expansion

## Current State

Implementation update: the active runtime now implements care-case-scoped
contacts, coordination events, outreach approval, approved Linq one-to-one
outreach, reply mapping, and audit state. It still does not implement old v1
family/network entities, access tiers, caregiver app accounts, or group chats.

## Needed Change

Do not rebuild full v1 multiplayer. Keep expanding the current care-case core
only through product loops that reduce coordination burden.

## Expansion Path

### Phase 1 — Single narrator

One user texts CareSupport. CareSupport learns the care situation and keeps records.

### Phase 2 — Named people as memory

CareSupport can remember people involved without texting them yet.

Example:

```text
Angela usually covers evenings. Marcus works nights. Solan handles rides.
```

Stored as memory entries or future contacts table.

### Phase 3 — Care circle directory

Add structured people around the care case.

Potential table:

```ts
careContacts: defineTable({
  careCaseId,
  name,
  phone,
  relationship,
  role,
  notes,
  preferredContactMethod,
  canReceiveTexts,
  createdAt,
  updatedAt,
})
```

### Phase 4 — Permissioned outreach

CareSupport can ask the primary user for permission to text someone.

Example:

```text
I can ask Angela if she can cover Tuesday evening. Do you want me to text her?
```

### Phase 5 — Closed-loop coordination

CareSupport texts Angela, waits for a reply, updates the primary user, and records the result.

Example:

```text
Covered. Angela can do Tuesday 5-8. I added it to the schedule and noted that Marcus should not be asked first for evening coverage.
```

### Phase 6 — Family assistant mode

Multiple family members can text CareSupport with role-aware context and privacy controls.

This is where role-aware visibility, group chats, approval flows, and PHI filtering return in a redesigned form.

## Important Principle

Do not present Phase 1 as the whole product.

Present it as:

```text
CareSupport starts by learning from you. As it learns the people involved, it can help coordinate more of the care circle.
```

---

# Milestone Plan

## Milestone 1 — Align Docs and Agent Voice

Goal: Make repo product direction coherent.

Tasks:

- Link `docs/product-thesis.md` from README.
- Update `docs/design.md` to describe solo beta as wedge, not final identity.
- Update `SOUL.md` with visible learning posture and first-run voice examples.
- Add `docs/implementation-plan-family-care-agent.md`.

Definition of done:

- A new agent or developer can understand that CareSupport is a family care assistant currently tested through a solo beta.

## Milestone 2 — Onboarding Procedure

Goal: Make first conversation embody the thesis.

Tasks:

- Add onboarding procedure prompt.
- Add onboarding state detection.
- Extract and persist care recipient, relationship, burden, and first help surface.
- Add tests for first-run onboarding.

Definition of done:

- A new user receives an honest, learning-oriented onboarding experience.
- The first conversation produces a useful care case and durable memory.

## Milestone 3 — Visible Learning and Corrections

Goal: Make correction part of the product loop.

Tasks:

- Detect corrections.
- Save corrections as memory entries.
- Include relevant corrections in future prompt context.
- Add tests proving behavior changes after correction.

Definition of done:

- If a user corrects CareSupport, CareSupport remembers and uses the correction later.

## Milestone 4 — Named Care Circle Without Outreach

Goal: Prepare for multiplayer without yet texting others.

Tasks:

- Allow CareSupport to remember named people involved in care.
- Store roles, preferences, and constraints as memory entries.
- Optionally add `careContacts` table.
- Add prompt behavior for referencing people without overstepping.

Definition of done:

- CareSupport can know that Angela, Marcus, Solan, Mom, etc. exist and understand rough roles without contacting them.

## Milestone 5 — Permissioned Outreach Prototype

Goal: Begin true one-to-many coordination safely.

Tasks:

- Add care contacts with phone numbers.
- Add outreach request flow.
- Require explicit primary-user permission before texting third parties.
- Track pending outreach as open loops.
- Send outbound via Linq.
- Handle replies and close the loop.

Definition of done:

- User can ask CareSupport to check with one known person, CareSupport can ask permission, text them, receive reply, update the schedule or memory, and report back.

## Milestone 6 — Care Circle Runtime

Goal: Move from solo assistant to family assistant.

Tasks:

- Add multi-user membership model.
- Add access tiers / role-aware context loading.
- Add group chat handling.
- Add PHI filtering and medication approval gates.
- Add audit logging for cross-person actions.

Definition of done:

- Multiple people can interact with CareSupport around one care case with appropriate boundaries.

---

# Near-Term Recommendation

Build Milestones 1-3 first.

Do not jump straight to multi-person coordination.

The first implementation should make the current product feel truthful:

- CareSupport introduces itself as learning the family.
- CareSupport asks about the burden, not just the data.
- CareSupport remembers corrections.
- CareSupport proves that its memory improves the next interaction.

Once that works, the expansion into one-to-many coordination will feel earned rather than bolted on.
