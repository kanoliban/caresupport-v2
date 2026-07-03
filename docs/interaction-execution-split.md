# Interaction/Execution Split — Design Proposal

Status: DESIGN ONLY — not implemented. Written 2026-07-02 after the group-chat
incident; revised 2026-07-03 to add presence as a first-class requirement
after the founder's charisma conversation. Discuss before building.

## First-class requirements

Every architecture decision below is judged against BOTH of these. A design
that wins on one and loses the other is rejected.

**R1 — Cost.** Most turns must stop paying for a fully-loaded context and a
top-tier model. Today "ok thanks" costs the same as "rebuild mom's med
schedule" (~5-8k input tokens + Sonnet). The incident made this visible
(~1,500 full-pipeline calls for a stranger's group chat), but it's true of
legitimate traffic too.

**R2 — Presence.** The agent must feel *there*: like it holds the person, not
just the person's data. Diagnosis from 2026-07-03 (founder + Claude Code):
the same intelligence feels present in Claude Code and thin in iMessage
because of four asymmetries, each of which maps to an architectural gap:

| Asymmetry | Gap in today's runtime |
|---|---|
| How much of the *person* is in context when it speaks | Context is fact-shaped (meds, schedules), not person-shaped (how they talk, what they're carrying, what happened last week and how it felt) |
| Whether words carry consequences | The agent mostly emits replies; almost nothing it says cashes out into actions it must survive |
| Shape of memory | `memoryEntries` stores WHAT (dosages, dates), never WHO — and the prompt currently *prohibits* saving emotional texture |
| Rhythm of attention | Must answer every message instantly in 1-2 bubbles; no ability to notice a silence, delay, or not reply |

Charisma is not a prompt property. It is evidence of accumulated attention,
consequence-bearing speech, person-shaped memory, and the right to pause.
Those are architecture.

## Reference architecture

Poke (Interaction Co), as reverse-engineered by OpenPoke
(github.com/shlokkhemani/openpoke): one **interaction agent** owns the
conversation — voice, thread continuity, delegation — and a swarm of
**execution agents** are spawned per task with isolated, minimal context,
plus a **trigger scheduler** for proactive behavior.

## What CareSupport already has (the seams)

- `careRouter` already routes intents to model tiers (`fast`/`reason`/`critical`).
- The doorman (shipped 2026-07-02) is the triage tier: strangers never reach
  the full pipeline; agents are detected and ignored.
- Coordination outreach already runs as a separate flow with its own state
  (`coordinationEvents`, `outreachAttempts`).
- The prompt is block-structured (`buildSystemBlocks`) with cache breakpoints —
  blocks can be added/dropped per-tier without redesign.
- Conversation log lines already carry timestamps (time-awareness raw material).
- The founder feedback loop supplies the corpus for tuning voice from caught
  moments instead of rewrites.

## Proposed shape

```
inbound ──▶ doorman (strangers; Haiku, no context)            [SHIPPED]
        ──▶ interaction agent (known users; thin PERSON-SHAPED context)
                 │  answers directly when no operation is needed
                 │  may WAIT or stay SILENT when that is the present response
                 ▼
            execution agents (spawned per operation; each loads ONLY its slice)
              • meds agent        → medications slice
              • schedule agent    → scheduleItems + calendar slice
              • outreach agent    → careContacts + coordinationEvents slice
              • memory agent      → memoryEntries + relationship-memory writes
                 │
                 ▼
            interaction agent composes the reply in one voice
```

### The interaction agent (R1 + R2 both live here)
Context it holds — small but person-shaped:
- who this user IS: a maintained **relationship sketch** (voice, temperament,
  load they're carrying, running threads) — see Relationship Memory below
- a one-paragraph cached **care-case summary** (not the full tables)
- recent conversation, WITH elapsed-time awareness ("it has been 3 days")
- the list of operations it may request

### Execution agents
Focused prompt + minimal table slice, mechanical `careCaseId` scoping (same
safety rule as today), structured results only, never user-facing prose.

### Relationship memory (new primitive, R2)
A second memory shape alongside `memoryEntries`:
- `relationshipSketch` per user: short maintained prose ("Rob texts in bursts
  late evening; dry humor; hates being asked twice; sister Karen is a sore
  subject; carrying the schedule mostly alone since May").
- Written by the memory execution agent, revised not appended — a sketch,
  not a log.
- **Consent tension (open question #5):** the current prompt FORBIDS saving
  inferred emotional summaries — a deliberate anti-creepiness rule that also
  bans exactly this. Resolution needs founder judgment: what is respectful to
  remember about a person, what does Rob want his agent to know about him,
  is the sketch user-visible/editable ("what do you know about me?" should
  answer honestly with it).

### Time awareness (R2, can ship before the split)
- Prompt gains explicit elapsed-time framing: time since last exchange, time
  since each open loop moved.
- Behavior: acknowledge gaps naturally, never fake continuity across them.

### Right to silence / delayed response (R2, can ship before the split)
- Runtime gains two legal responses beyond replying: **hold** (respond after
  a scheduled delay — "check back in an hour" becomes real) and **silent
  acknowledgment** (tapback only, no text) for messages that don't want words.
- Hard rule: never silent on questions, distress, or coordination requests.

### Trigger scheduler (later phase)
Proactive behaviors (med reminders, coverage-gap checks, follow-ups) become
scheduled triggers that spawn execution agents directly. This is also where
consequence-bearing speech grows: the agent that *did the thing* reports it.

## Cost model (rough)

| Path | Today | Proposed |
|------|-------|----------|
| Stranger message | doorman (Haiku, ~zero context) | ✅ shipped |
| "ok thanks" from known user | full pipeline (~5-8k tokens, Sonnet) | interaction agent only (~1-2k, Haiku/Sonnet) |
| "add mom's new med" | full pipeline | interaction (thin) + meds agent (meds slice) |

Estimated 5-10x cheaper per average turn combined with direct-Anthropic
prompt caching. Presence additions (sketch, elapsed-time) add ~150-300 cached
tokens — negligible against the savings.

## Migration path (incremental, each step shippable and reversible)

Phase A and B can ship independently, before and without the split.

**Phase A — Presence primitives (small, days):**
1. Elapsed-time block in the prompt + gap-acknowledgment guidance.
2. Right-to-silence: tapback-only response option + held/delayed replies.
3. SOUL edit: earned familiarity — "match the relationship as it stands;
   reserve is the default with strangers; warmth is accumulated, not assumed."

**Phase B — Relationship memory (design conversation first, then ~week):**
4. Resolve open question #5 with founder; define sketch content rules.
5. `relationshipSketch` storage + revision flow + prompt block; user-visible
   on request.

**Phase C — The split itself (weeks, five reversible steps):**
6. Cached care-case summary block; measure.
7. Context-on-demand: router chooses which sections load per intent.
8. First execution agent: medications (cleanest slice) behind a flag.
9. Schedule + outreach agents; memory agent absorbs sketch maintenance.
10. Trigger scheduler: reminders/follow-ups leave the conversation flow.

## Open questions for Liban

1. Interaction agent model: Sonnet always, or Haiku with Sonnet escalation?
   (Test against Rob's transcripts.)
2. Do execution agents get `toolActions`-style audit events? (Probably yes.)
3. Where does the doorman hand off — interaction agent directly, or via an
   onboarding execution flow?
4. Does the iOS companion app render execution-agent state ("the agent's
   visible mind" maps naturally onto this split)?
5. **Relationship memory consent:** what is respectful to remember, is the
   sketch shown to the user on request, and does the anti-creepiness rule
   get replaced by "remember the person, show your notes when asked"?
