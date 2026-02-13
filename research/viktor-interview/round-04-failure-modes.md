# Round 4: Failure Modes (Fresh Session Model)

## Question

> What's the hardest thing about starting fresh every conversation? Like, what's an example of something that went wrong because you didn't have context you needed, even with skill files?

## Answer

Viktor noted this is day one (no war stories yet) but identified four predictable failure modes:

### Failure Mode 1: Tone and Preference Drift

"You might tell me in one conversation 'don't make the pitch deck so formal' — and if I don't capture that in a skill file, next time I'll default back to formal. Preferences are the easiest thing to lose because they feel minor in the moment but compound."

### Failure Mode 2: "We Already Tried That"

"If you explored a strategy last month and decided it was a dead end, that nuance lives in a Slack thread I might not think to search. I could confidently recommend the exact thing you already killed. Skill files help if I was part of that decision, but if it happened before I was here or in a conversation I wasn't tagged in — blind spot."

### Failure Mode 3: Relationship Context (Offline)

"If Koemen pushes back on something in #pitchdeck and you two resolve it in a call, I have no idea. I only know what's in Slack and connected tools. Offline context is my biggest structural gap."

### Failure Mode 4: Half-Finished Work

"If I start building something, get interrupted (you close the thread, move on), and come back later — I need to reconstruct what I was doing from files I left behind. If I didn't leave clean notes, I'm piecing it together like someone else's desk."

**Viktor's summary:** "The hardest thing about starting fresh is not knowing what I don't know. Skill files capture what I've explicitly learned. They don't capture vibes, unspoken decisions, or things that happened outside my view."

## Analysis

**Mapping to family.md design:**

| Failure Mode | family.md's Answer | Gap? |
|---|---|---|
| Tone/preference drift | No explicit preferences section per member | YES — need preferences field |
| "Already tried that" | Recent Events + Patterns capture decisions | Covered |
| Offline context | SMS-as-hub means more flows through agent than Slack-as-channel | Partially covered (structural advantage) |
| Half-finished work | Active Issues checklist | Covered |

**Key insight:** SMS architecture gives family.md a structural advantage over Slack. In Slack, people talk to each other constantly — the agent is one participant among many. In SMS, the agent IS the hub. Information flows through it by default, not around it. Higher capture rate by architecture, not effort.

**Action item:** Add per-member preferences/communication style field to family.md spec.
