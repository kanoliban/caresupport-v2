# Agent Knowledge Visibility — How Rob Knows What CareSupport Knows

## The Trick Question

The question is not:

> How do we show Rob everything the agent knows?

The question is:

> How do we let Rob trust, correct, and rely on what CareSupport knows without making him manage another system?

For Rob, a dashboard of everything CareSupport knows may become another burden. It asks him to inspect the agent's memory, verify fields, manage accuracy, and police the system.

That is not relief.

CareSupport should not make Rob become the administrator of the agent.

CareSupport should make its knowledge visible at the moments where that knowledge matters.

## Core Principle

Do not expose memory as a database.

Expose memory as working understanding.

CareSupport should reveal what it knows through:

1. Brief confirmations
2. Assumption checks
3. Action previews
4. Correction invitations
5. Periodic summaries
6. Open-loop status
7. Source-aware explanations when needed

The user should feel:

> CareSupport understands enough to act, and I can easily correct it if something is wrong.

Not:

> I need to open a dashboard and maintain CareSupport's data model.

## The Wrong Answer

Wrong product answer:

```text
Here is everything I know about your care system:
- 42 memory entries
- 17 schedule records
- 12 caregivers
- 9 preferences
- 6 open loops
- 3 agencies
```

That may be useful for developers, but it is not how trust forms in care.

It turns the agent's memory into another care coordination artifact Rob has to audit.

## The Right Answer

Right product answer:

```text
I have tonight's gap as 6-10.

I know Angela is usually first for evenings, Marcus works nights, and Agency B is the fallback. I'll ask Angela first unless you want a different order.
```

That tells Rob:

- what CareSupport understood
- what CareSupport is relying on
- what it plans to do
- where he can correct it

This is knowledge visibility in the flow of action.

## Knowledge Should Appear in the Moment of Use

CareSupport should reveal memory when it affects a decision.

### Example: Coverage Gap

Rob:

```text
Tasha cancelled tonight. Need 6-10 covered.
```

CareSupport:

```text
I have the gap as tonight 6-10.

I know Angela is usually first for evening coverage, Marcus works nights, and Agency B is the fallback. I can ask Angela first.

Should I text her?
```

### Example: Medication Reminder

Rob:

```text
Remind me about the refill.
```

CareSupport:

```text
I have this as the baclofen refill from CVS, usually handled before Friday.

Want the reminder tomorrow morning or Thursday afternoon?
```

### Example: Appointment

Rob:

```text
Add the appointment for next week.
```

CareSupport:

```text
I can add it. I know your default appointment note is to include ride pickup and transfer time.

What day and time is it?
```

## Knowledge Visibility Patterns

### 1. "I have..."

Use when confirming a newly understood fact.

```text
I have the gap as tonight 6-10.
```

### 2. "I know..."

Use when referencing durable learned context.

```text
I know Angela is usually first for evening coverage.
```

### 3. "I don't have..."

Use when something required is missing.

```text
I don't have Angela's number yet.
```

### 4. "I'm assuming..."

Use when acting on a reasonable but uncertain inference.

```text
I'm assuming this is for Rob's evening routine, not an appointment ride.
```

### 5. "Correct me if..."

Use sparingly when a wrong assumption could create extra work or risk.

```text
Correct me if this changed: Angela is still the first person to ask for evening coverage.
```

### 6. "Here's what I'm using"

Use when a decision depends on multiple remembered facts.

```text
Here's what I'm using: Angela usually handles evenings, Marcus works nights, and Agency B is the fallback for short-notice gaps.
```

### 7. "Here's what's still open"

Use for operational visibility.

```text
Still open: tonight 8-10. Angela can cover 6-8. Marcus has not replied yet.
```

## The CareSupport Knowledge Card

CareSupport may eventually have a lightweight dashboard or vertical card, but it should not be a full admin panel.

It should be a living "what I know / what I'm tracking" card.

Suggested sections:

```text
What I Know
- Rob prefers Angela for evening coverage.
- Marcus works nights, so he is not first for evening gaps.
- Agency B is the fallback for short-notice coverage.

What I'm Tracking
- Tonight 8-10 still needs coverage.
- Baclofen refill due this week.
- PT appointment needs ride confirmation.

What I Need From You
- Angela's updated number.
- Whether Agency C can be used as backup.
```

This should be generated from runtime state, not manually maintained.

The card's job is not to expose the database.

Its job is to give Rob a calm operational picture.

## Text-First Knowledge Disclosure

Because CareSupport is text-native, the primary knowledge visibility should happen in text.

Useful commands:

### "What do you know?"

CareSupport should not dump everything. It should summarize the care operating picture.

```text
Here is the useful version of what I know right now:

- We are coordinating care for Rob.
- Evening coverage usually starts with Angela.
- Marcus works nights, so he is not first for evening gaps.
- Agency B is the fallback for short-notice coverage.
- Tonight 8-10 is still open.
- Baclofen refill is due this week.

The most important missing thing: I do not have Angela's updated number.
```

### "What are you tracking?"

```text
I'm tracking 3 things:

1. Tonight's coverage gap: 8-10 still open.
2. Baclofen refill: due this week.
3. PT ride: needs confirmation for Tuesday.
```

### "What do you need from me?"

```text
The one thing I need most is Angela's updated number. Without it, I cannot ask her about tonight.
```

### "Why did you ask Angela first?"

```text
Because you told me Angela is usually first for evening coverage, and Marcus works nights. I used that order for tonight's gap.
```

### "Forget that"

```text
Got it. I won't use that anymore.
```

### "That's wrong"

```text
Got it. What should I remember instead?
```

## Progressive Disclosure

Knowledge visibility should be progressive.

CareSupport should not reveal everything by default.

Default level:

```text
I have tonight's gap as 6-10. I can ask Angela first.
```

More detail if helpful:

```text
I'm asking Angela first because she usually covers evenings. Marcus works nights, and Agency B is the fallback.
```

Full summary only when requested:

```text
Here is what I know about evening coverage...
```

This keeps the experience lightweight while preserving trust.

## Confidence and Source

CareSupport should distinguish between:

- known fact
- remembered preference
- current assumption
- missing information
- open question

Suggested language:

```text
I know...
```

Use for durable memory or structured records.

```text
You told me...
```

Use when grounding a fact in the user's past correction or instruction.

```text
I'm assuming...
```

Use for inference.

```text
I don't have...
```

Use for missing data.

```text
Still open...
```

Use for unresolved operational state.

## Implementation Implications

The runtime needs a way to produce a human-readable knowledge summary.

This should not require a dashboard first.

Recommended implementation:

### 1. Knowledge Snapshot Builder

Create a function that assembles a concise snapshot from:

- care case
- user
- recent messages
- medications
- schedule items
- memory entries
- open loops / pending tasks, when available

Output shape:

```ts
type KnowledgeSnapshot = {
  subject: string[];
  usefulKnownFacts: string[];
  activeCareRecords: string[];
  coordinationPreferences: string[];
  openLoops: string[];
  missingInfo: string[];
  assumptions: string[];
};
```

### 2. Knowledge Disclosure Policy

The prompt should decide how much of the snapshot to show based on the user's intent:

- action request: show only relevant facts
- correction: show the fact being corrected
- status request: show open loops
- explicit knowledge request: show concise summary
- high-risk request: show assumptions and ask before acting

### 3. Memory Provenance

Eventually, memory entries should include enough provenance to answer:

- who said this
- when it was learned
- whether it is still active
- whether it has been corrected

Current schema has `source`, `createdAt`, and `updatedAt`, which may be enough for a first version.

### 4. User Correction Tools

CareSupport needs simple correction behavior:

- save replacement memory
- deactivate wrong memory if possible
- confirm the new understanding

Example:

```text
Got it. Angela is not first anymore. Ask Marcus first for evening coverage unless it involves transfers.
```

## Product Risk

Too little visibility creates distrust:

> Why did it do that?

Too much visibility creates burden:

> Now I have to manage the agent's memory too.

The balance is contextual visibility.

Show Rob what CareSupport knows when it is about to matter.

## Final Principle

Rob should not have to inspect CareSupport's brain.

CareSupport should show its working at the moment its working affects Rob.

The product is not a memory dashboard.

The product is a care agent whose understanding is visible enough to trust and easy enough to correct.
