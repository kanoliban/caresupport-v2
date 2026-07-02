# Interaction/Execution Split — Design Proposal

Status: DESIGN ONLY — not implemented. Written 2026-07-02 after the group-chat
incident and the doorman build. Discuss before building.

## Why

Today every inbound message pays for a fully-loaded context: care-case profile,
medications, schedule, contacts, coordination events, care notes — then a
Sonnet/Opus call. The incident made the cost visible (~1,500 full-pipeline
calls for a stranger's group chat ≈ a whole API budget in 4 days), but the
structural problem exists for legitimate traffic too: "ok thanks" costs the
same as "rebuild mom's med schedule."

Reference architecture: Poke (Interaction Co), as reverse-engineered by
OpenPoke (github.com/shlokkhemani/openpoke). Their split: one **interaction
agent** owns the conversation — voice, thread continuity, delegation — and a
swarm of **execution agents** are spawned per task with isolated, minimal
context, plus a **trigger scheduler** for proactive behavior.

## What CareSupport already has

The seams exist:

- `careRouter` already routes intents to model tiers (`fast` / `reason` /
  `critical`).
- The doorman (shipped 2026-07-02) is the triage tier: strangers never reach
  the full pipeline.
- Coordination outreach already runs as a separate flow with its own state
  (`coordinationEvents`, `outreachAttempts`).
- The prompt is already block-structured (`buildSystemBlocks`) with cache
  breakpoints — blocks can be dropped per-tier without redesign.

## Proposed shape

```
inbound ──▶ doorman (strangers; Haiku, no context)
        ──▶ interaction agent (known users; Haiku/Sonnet, THIN context)
                 │  answers directly when no operation is needed
                 ▼
            execution agents (spawned per operation; each loads ONLY its slice)
              • meds agent        → medications table slice
              • schedule agent    → scheduleItems + calendar slice
              • outreach agent    → careContacts + coordinationEvents slice
              • memory agent      → memoryEntries write path
                 │
                 ▼
            interaction agent composes the reply in one voice
```

### The interaction agent
- Owns `sms_response`, tone, thread memory of the *conversation* (not the care
  record). Context: user identity, recent conversation, a one-paragraph care
  case summary (new, cached), and the list of operations it may request.
- Emits the existing structured fields, but instead of resolving them itself,
  fields become **operation requests** the runtime dispatches.

### Execution agents
- Each is a focused prompt + the minimal table slice it needs, invoked via
  `ctx.runAction` (or inline for cheap ones). They return structured results,
  never user-facing prose.
- Isolation rule (matches CLAUDE.md safety): every execution agent is scoped by
  `careCaseId` mechanically; an agent cannot read outside its slice.

### Trigger scheduler (later phase)
- Proactive behaviors (med reminders, coverage-gap checks, follow-ups) become
  scheduled triggers that spawn execution agents directly — no conversation
  needed. `scheduleItems` already models most of this.

## Cost model (rough)

| Path | Today | Proposed |
|------|-------|----------|
| Stranger message | full pipeline (Sonnet + full context) | doorman (Haiku, ~zero context) ✅ shipped |
| "ok thanks" from known user | full pipeline | interaction agent only (thin context, Haiku tier) |
| "add mom's new med" | full pipeline | interaction (thin) + meds agent (meds slice only) |
| Prompt caching | system blocks cached | same + per-tier smaller uncached tails |

Estimated effect: majority of turns drop from ~5-8k input tokens to ~1-2k,
and the model tier drops for most turns. Combined with the direct-Anthropic
cache discount, ~5-10x cheaper per average turn.

## Migration path (incremental, no big-bang)

1. **Care-case summary block**: add a cached one-paragraph summary to the
   prompt; measure. (Small, safe, immediately useful.)
2. **Context-on-demand**: let the router decide which context sections load
   per intent (`careRouter` already knows the intent). Drop unused sections.
3. **First execution agent**: extract medications (cleanest slice, existing
   `medication_updates` contract) behind a flag; interaction agent requests it.
4. **Schedule + outreach agents**: same pattern.
5. **Trigger scheduler**: move reminders/follow-ups out of conversation flow.

Each step is independently shippable and reversible. Stop at any point and the
system still works.

## Open questions for Liban

- Does the interaction agent stay on Sonnet for voice quality, or is Haiku
  good enough for routine turns with Sonnet on escalation? (Test with Rob's
  transcripts.)
- Do execution agents get their own audit-log event types? (Probably yes —
  `toolActions`-style, per CLAUDE.md direction of travel.)
- Where does the doorman hand off — to the interaction agent directly, or
  through onboarding as a special execution flow?
- Does the iOS companion app read execution-agent state to render "the agent's
  visible mind"? (It maps naturally onto this split.)
