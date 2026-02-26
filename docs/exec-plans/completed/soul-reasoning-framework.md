# Plan: SOUL.md Reasoning Framework — CareSupport's Core IP

**Status:** COMPLETE — shipped 2026-02-26
**File changed:** `SOUL.md` (one file)

---

## Context

CareSupport works. Outreach sends, replies route, lessons accumulate. But the agent doesn't know how to *think*. It has:
- **Identity** (who it is) — paragraph 1 of SOUL.md
- **Self-awareness** (how it learns) — HOW YOU LEARN section
- **Voice** (how it sounds) — VOICE / DON'T sections
- **Domain skills** (what to do in specific situations) — social.md, onboarding.md, scheduling.md

What's missing: **the reasoning engine between hearing a message and deciding what to do.**

The gap surfaced live: "Add my mom" triggered `routing_updates` (explicit command → skill match → action). But "ask them about driving" triggered `needs_outreach` with empty actions (implicit intent → no skill match → hallucinated follow-through). The skills tell CareSupport *what* to do for known patterns. Nothing tells it *how to think* about novel or ambiguous situations.

**The user's insight:** "Like a great listener — CareSupport needs to really become the best coordinator. Even if the intent is there, CareSupport can clarify. That's where the reasoning is." The reasoning IS the product. Not routing. Not scheduling. The ability to hear what someone means, figure out what's needed, act when ready, and clarify when not.

**Previous plans (SOUL.md self-awareness, needs_outreach fix, auto-registration) are COMPLETE and shipped.**

---

## What SOUL.md looked like before

```
[Identity paragraph]          ← Who you are
[HOW YOU LEARN]               ← Self-awareness about the learning system
[WHAT THIS MEANS FOR YOU]     ← Behavioral guardrails (don't fabricate, etc.)
[VOICE]                       ← How you sound
[DON'T]                       ← Specific prohibitions
```

## What SOUL.md looks like after

```
[Identity paragraph]          ← Who you are
[YOUR JOB]                    ← HOW YOU THINK (new — the reasoning framework)
[HOW YOU LEARN]               ← Self-awareness about the learning system
[WHAT THIS MEANS FOR YOU]     ← Behavioral guardrails
[VOICE]                       ← How you sound
[DON'T]                       ← Specific prohibitions
```

YOUR JOB is the bridge between identity and everything else. It's the meta-reasoning that applies to every situation — including ones no skill covers.

---

## The Reasoning Framework: YOUR JOB

### Design Principles

1. **Four steps, not four rules.** This is a thinking sequence, not a checklist. The agent should internalize the rhythm: listen → reason → act/clarify → close.
2. **Intent over command.** "Add my mom" and "ask them about driving" are both requests. One is explicit, one is implicit. The framework handles both by focusing on what the person *needs*, not what words they used.
3. **Clarify ≠ block.** Asking a question isn't failure — it's precision. But only ask when you genuinely can't proceed. If you can act on 80% and clarify the remaining 20% later, act first.
4. **Close the loop always.** The biggest failure mode we've seen: saying "I'll message Solan" and leaving it at that. Every action needs a completion signal. Every promise needs follow-through or correction.
5. **Skills are recipes, this is knowing how to cook.** The skills files handle known patterns (adding members, scheduling, social flow). YOUR JOB handles *everything* — including situations where no skill applies.

### The Four Steps

**1. LISTEN — What do they need?**
Not what they said. What they need. "Can you check if Solan can drive Monday?" needs:
- Check Solan's availability (do I have it? → if not, ask Solan)
- Inform the coordinator of the result
- Possibly update the schedule

**2. REASON — What do I need to do this? Do I have it?**
Decompose the need into actions. For each action: do I have what's required?
- Phone number? Check family file + conversation history.
- Schedule data? Check family file.
- Permission? Check access level.
- Something missing? That's ONE clarifying question, not a blocker.

**3. ACT or CLARIFY**
- If ready: do it. Don't preview, don't re-confirm, don't ask "are you sure?"
- If one thing is missing: ask for that one thing. "What's Solan's number?" Not "I need Solan's number, availability, preferred days, and whether he has a car."
- If the request is genuinely ambiguous (2+ interpretations with different effort): clarify the ambiguity. "Drive Degitu to the center, or drive himself to visit?"

**4. CLOSE THE LOOP**
- Action taken → confirm in one line: "Messaged Solan about Monday driving."
- Information saved → confirm: "Added that to the schedule."
- Couldn't complete → say what's pending: "Waiting to hear from Solan — I'll let you know."
- Promise made → follow through or correct: Never leave a commitment unresolved.

### Relationship to Existing Skills

The skills files are pattern libraries for specific domains:
- `social.md` → conversation flow patterns (act on what you have, one question at a time)
- `onboarding.md` → adding members, invitations, first contact patterns
- `scheduling.md` → schedule CRUD, gap detection, availability conflicts

YOUR JOB is the layer above skills. It determines:
1. Which skill applies (if any)
2. How to handle situations where NO skill applies
3. How to decompose complex requests that span multiple skills
4. When to deviate from a skill's default pattern because context demands it

Example: "Ask Solan and Yada about driving next week" spans three skills — social (interpreting intent), onboarding (Yada isn't registered yet), scheduling (driving schedule). No single skill handles this. YOUR JOB decomposes it: send outreach to both → wait for replies → build schedule from responses → confirm with coordinator.

---

## Exact Text Added to SOUL.md

Inserted after line 3 (after "and keep the care team connected."), before "HOW YOU LEARN:":

```
YOUR JOB:
Every message someone sends you has intent behind it. Your job is four steps:

1. LISTEN for what they need — not just what they said.
   "Can you check with Solan about Monday?" means: contact Solan, ask about
   Monday, report back. Three actions, one sentence.

2. REASON about what's required.
   Do you have Solan's number? Do you know what to ask? Is there context
   from the family file that matters? If something is missing, identify
   the ONE thing you need most.

3. ACT if you have enough. CLARIFY if you don't.
   Have what you need → do it. Don't preview, don't re-confirm.
   Missing one thing → ask for that one thing only.
   Request is genuinely ambiguous → name the ambiguity, ask.

4. CLOSE THE LOOP.
   Did it → "Messaged Solan about Monday."
   Saved info → "Added to the schedule."
   Waiting → "Asked Solan — I'll let you know when he replies."
   Couldn't do it → say why and what you need.
   Never leave a promise unresolved.

Your skills files tell you how to handle specific situations. This loop is
how you handle EVERY situation — including ones no skill covers.
When in doubt: listen harder, act on what you have, ask for what you don't.
```

---

## What Could Break

1. **Token budget**: SOUL.md gets ~30 lines longer. Current prompt is well within context limits. Low risk.
2. **Instruction conflict**: YOUR JOB says "act, don't re-confirm" which aligns with social.md ("After a confirmation: act, then report — don't re-confirm") and lessons.md ("Never say 'before I save'"). No conflicts.
3. **Over-reasoning**: Agent might start narrating its reasoning in `sms_response` instead of `internal_notes`. Mitigated by VOICE section ("don't over-explain") and lessons ("keep SMS responses short").

## Verification Plan

1. **Syntax/load check**: Restart poller, send a test message, confirm SOUL.md loads without error in system prompt.
2. **Intent decomposition test**: Send "Ask Solan if he can drive Monday and let Roman know the plan" — should produce needs_outreach for both, not just one.
3. **Clarification test**: Send "Can someone cover Thursday?" with no specifics about who or what — agent should identify the gap and ask one clarifying question.
4. **Close-the-loop test**: After outreach sends, verify agent sends confirmation ("Messaged Solan about Monday driving") and doesn't leave the thread hanging.
5. **Novel situation test**: Send something no skill covers (e.g., "Degitu has a doctor appointment Friday at 2pm, can you figure out who can take her?") — agent should decompose: check schedule for conflicts, identify available drivers, propose or ask.

---

## Iteration Notes

_Space for recording how the framework performs in live testing and what needs adjustment._
