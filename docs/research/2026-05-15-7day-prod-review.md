# 7-Day Production Review — Where CareSupport Is Slipping

**Date:** 2026-05-15
**Scope:** Convex prod (`keen-raccoon-606`) — last 7 days of user traffic
**Sources:** `messages`, `scheduleItems`, `medications`, `auditLogs`, `memoryEntries` tables; conversation transcripts for 13 care cases
**Today's date** when reviewed: 2026-05-15

---

## Topline

CareSupport's **infrastructure is healthy** — zero `message_failed` or `response_blocked` events in 24h, all responses pass the leakage check. **The slips are at the agent capability layer and the prompt-design layer, not the plumbing.**

Three patterns Daisy already identified are confirmed in the data. Three more emerged from the review. Of the six, **two are silently corrupting the database** (phantom reminders, wrong-year dates) — they will keep causing user disappointment for as long as users keep talking to the product.

The single highest-leverage fix is to **inject the current date into every prompt and add a reminders cron**. That alone resolves slips #1, #4, and the trust-damaging part of #6. Estimated half-day of work.

---

## Volume

| Metric | Count |
|--------|-------|
| Care cases total | 44 |
| Care cases active in last 7d (≥1 message) | 7 |
| Care cases stuck in `onboarding` status | 29 of 44 |
| Total messages (all-time) | 602 |
| Inbound 24h / outbound 24h | 1 / 1 |
| Total `scheduleItems` (across all 44 cases) | **18** |
| Total `medications` | **6** |

The 44 signups are mostly Minnebar event demos from Apr 28 (Bob, MattyGee, Jean, Judd, etc.) — they tested once and never returned. Of the seven cases active in the last 7 days, only **three** have built any persistent state worth more than a paragraph: Rob Wudlick (15 memory entries, full caregiver schedule), Sean caring for Jim, and your own dogfood thread (Liban → Degitu).

That's the real cohort to learn from. The findings below come from those threads.

---

## Finding 1 — Phantom Reminders (CRITICAL)

The agent confidently promises to send timed reminders. No reminder ever fires, because **`convex/crons.ts` is empty** — there is no scheduled job that scans `scheduleItems` and triggers outbound messages.

**Code-level evidence:** [convex/crons.ts:1-5](convex/crons.ts:1) declares `cronJobs()` and exports it without registering a single job.

**User-facing evidence (Haley, kx77q5h…):**
> **May 3, 00:16** — Haley: "Text me in thirty minutes to remind me to bring her to her appointment"
> **CareSupport:** "I've got you, Haley. I'll save that reminder… I'll set a reminder for you in 30 minutes."
> **May 13, 03:59** *(10 days later)* — Haley: "Hey did you forget to remind me"
> **CareSupport:** "You're right, I'm sorry about that. I don't actually have the ability to send timed reminders automatically yet — I should have told you that upfront."

The honest walkback is good. The fact that the promise was made for **the first request a new user ever made** is catastrophic. This is the core product promise of CareSupport.

**Sean (kx78pz9k…)** had the same failure four times in one thread:
- "Got it! I'll remind you at 4pm to pick a time…"
- "I'll check in with you at 4pm today…"
- "I'll remind you at the end of the month with a recap."
- "I'll remind you at 4pm today about Jim's activity reminder time"
- Sean at 21:15: **"Hey you didnt remind me"**

**Rob (kx79211…)** is sitting on a phantom reminder for an eye-injection appointment on June 10 — the agent told him "I'll remind you on June 9." That cron does not exist; the reminder will not fire.

The `scheduleItems` table accumulates the *intent* of reminders but nothing scans it. Worse — see Finding 4 — many records aren't even queryable by date.

**Fix priorities:**
1. **Stop promising what we can't deliver.** Add a hard rule in `RESPONSE_FORMAT`: "Never use the words 'I'll remind you', 'I'll check in', 'I'll text you', 'I'll follow up' in `sms_response`. Reminders are stored for future capability but cannot fire today."
2. **Tell the user the truth** when they ask for a reminder: "I've noted it. I can't push you a notification yet, but if you text me when you wake up / before you leave, I'll have it ready."
3. **Build the cron** — at minimum: query `scheduleItems` where `date == today` and `status == scheduled`, send a digest. Requires Finding 4 to be fixed first.

---

## Finding 2 — No Concept of "Today" (CRITICAL, ROOT CAUSE)

The prompt builder ([convex/lib/pipeline/promptBuilder.ts](convex/lib/pipeline/promptBuilder.ts)) **never injects the current date** into the system blocks. The only `new Date()` calls in [convex/handler.ts](convex/handler.ts) are for formatting conversation-log timestamps. The agent has to *infer* "today" from the latest line of conversation history — which is fragile and frequently fails.

**Rob Wudlick (kx75v2x2…), May 13 20:31:**
> Rob: "Who is helping me tonight and tomorrow night"
> CareSupport: "I'd need to know today's date to look that up for you. What's today?"
> Rob: "Wednesday may 13"
> CareSupport: "Tonight (**Wed May 14**) overnight: Ella" — *off by one day*
> CareSupport: "Tomorrow night (**Thu May 14**) overnight: Grace" — *same wrong day*

The agent doesn't know the day, asks the user, then **still gets it wrong on both lines** because it doesn't know how to do basic date math without scaffolding.

The same blindness corrupts the database — see Finding 4.

**Fix:**
- Prepend a system block to every prompt: `Current date: 2026-05-15 (Thursday). Current time: 09:14 UTC / 04:14 ET. Care recipient timezone: <careCase.timezone>.`
- Add a guidance line: "When the user says 'tomorrow' or 'next week', resolve to absolute YYYY-MM-DD using the current date above before saving to `schedule_updates`."

---

## Finding 3 — No Tools, So It Lies Politely About Them

`SOUL.md:91-94` literally says: `TOOLS (planned, not yet active)`. The agent has no tool surface — `callAnthropic` in [convex/handler.ts:359](convex/handler.ts:359) sends prompt → text, no tool loop. The CAPABILITIES block explicitly tells the model what it cannot do: contact others, sync calendars, access external systems.

**That blocking works most of the time.** Examples where the boundary held cleanly:
- Sean asked the agent to text his grandpa Jim — agent declined, offered to draft a message instead.
- Haley asked to add her sister Erin — agent gave the canned `SOLO_BETA_MULTIPLAYER_RESPONSE`.
- Rob Wudlick asked the agent to coordinate with caregivers and to create a calendar — agent declined both.
- Liban (you) asked "tell my brothers to pick her up" — agent declined.

**But the user-side signal is loud:** five of the seven active users tried to use CareSupport as a *multi-party coordination tool* within their first ~20 messages. Sean: "Could you text him telling him this is an AI bot Sean was talking about at dinner?" Rob Wudlick: "Can you help me coordinate with caregivers?" These users aren't misreading the product — they're describing the product they actually need.

Where the boundary slipped:
- **Liban thread, May 11 23:42** — Liban: "What do you mean by 'as it grows'?" → CareSupport: "Fair question — I shouldn't have implied something I don't actually know." Good self-correction, but it took the user grilling the agent two turns to get it to walk back the implication that group features are coming.
- **Judd, May 2** — asked "Can I send you pics?" of his aunt's medication bottles. Photo intake is another tool gap — high-value because med bottles are a natural photo upload.

**Fix:**
- Don't add tools yet — the product position is solo by design. But:
- Add a stronger rule against forward-promising features: "Never say 'as it grows', 'in the future', 'eventually', 'maybe later' — describe only what works today."
- Acknowledge the desire explicitly: "I hear that you want to coordinate with [name]. Right now I can only help you in this thread. Want me to draft something you can copy and send them?"
- **The "draft a message for you to send" pattern is the right escape hatch** — Sean and Liban both got this offer. Lean into it. Make it 1-tap to copy.

---

## Finding 4 — Schedule Storage Is Schema-Free Soup (SILENT DATA CORRUPTION)

`scheduleItems.date` is `v.optional(v.string())` — no validation. The agent writes natural-language values that no future cron or query will ever match.

**Actual data in production:**

| `date` field value | Title | Issue |
|---|---|---|
| `"today"` | Follow up with Sean on Jim's daily activity reminder time | Will never resolve |
| `"Monday"` | Psych appointment (Alicia) | Which Monday? |
| `"Friday"` | Church pickup by mom | Which Friday? |
| `"tomorrow"` | Dr. Rachmaninoff appointment | Tomorrow when? |
| `"daily"` | Ebise insulin | Daily forever, no start date |
| `"recurring Friday"` | Caregiver Liban shift | Free-text recurrence |
| `""` (empty) | Bring Kirsten to her appointment (Haley) | No date AT ALL |
| `"2025-05-10"` | Hospital appointment (your thread, Degitu) | **Wrong year** — should be 2026 |
| `"2025-06-09"` | Reminder: Jim's eye injection (Rob) | **Wrong year** |
| `"2025-06-10"` | Eye injection - reduce swelling | **Wrong year** |

The wrong-year entries are the same bug as Finding 2 — the model has no current-date anchor, so it defaults to 2025 (its training-data prior).

This is silent corruption. Nothing alerts on it. The agent reads back the same wrong dates to users (Liban thread May 13: "you're picking Degitu up for the hospital appointment on May 10th at 2pm" — May 10 is in the past).

**Fix priorities:**
1. **Validate `scheduleItems.date` at the mutation boundary.** Make it `v.union(v.null(), <ISO date regex>)`. Reject anything else. Force the agent to either resolve to ISO or omit.
2. **Add a separate `recurrence` field** that accepts a controlled vocabulary (`daily`, `weekly:mon`, `weekly:mon,thu,fri`, `monthly:15`, etc.). Stop overloading `date`.
3. **Backfill the existing rows** — best-effort patch wrong-year dates from 2025→2026 and resolve "today"/"tomorrow"/"Monday" against `_creationTime`.

---

## Finding 5 — Job-Oriented Conditioning (Daisy's Observation 2, Confirmed)

Every CareSupport response funnels into "want me to save this?" — even when the user wanted to *think out loud* or *get ideas*.

**Sean, May 13** — wants activity ideas for his grandpa Jim who has tremors and memory loss:
> Sean: "I would like to find activity's for him"
> CareSupport: "That's a great goal! **I can help you track activities and reminders for Jim.**" *(reframes immediately as tracking)*
> CareSupport, after every idea: "**Want me to save one of these** as a regular activity for Jim?" / "**Want me to save** a daily reminder…" / "**Want me to save** one of these as a recurring activity reminder?"

Sean wanted brainstorming and human warmth. He got a database-entry chatbot pretending to brainstorm so it could file something. The ideas themselves (audiobooks, photo albums, word association) were genuinely good — but every response ended in "want me to save…"

**MattyGee, May 2** — onboarding KK with Parkinson's:
> CareSupport: "Got it. And how are her hand tremors right now?"
> MattyGee: "Excellent. **Steady as she goes.**"
> CareSupport: "Got it. And how would you describe her ability to handle daily tasks right now?"

That's a parent expressing relief about his mom's Parkinson's symptoms staying steady. The right response is to acknowledge it. The actual response moves to the next baseline question.

**Where it worked:** In your dogfood thread, Liban said "Today I did the bathing. We had dinner. No activities whatsoever." The agent replied: "Sounds like a quiet one. Bathing and dinner covered — that's still a full day of care. How are you doing with it all?" That's exactly right. So the model *can* do this — but the prompt's "save / update / track / capture" framing biases it toward filing every turn.

**Fix:**
- The first rule in the SKILLS block currently is "Save what you learn immediately." Demote that. Promote: "First, acknowledge what they shared. Save only when they ask, when they describe something durable, or after you've responded to the emotional layer."
- Add a routing intent for `EXPLORATORY` (ideas, brainstorming, suggestions) where the system prompt suppresses the "want me to save" closing question and instead asks "want more ideas, or shall we pick one to try?"
- The `do not save inferred emotional summaries` rule in SKILLS_CONTENT was added recently (commit `5cb7aca`) and is the right direction — extend it.

---

## Finding 6 — Onboarding Drop-Off & Cold-Start Misfires

Of 44 signups, **29 are stuck in `status: "onboarding"`** — they never named a care recipient or a first task and never returned. The Minnebar event cohort dominates this number.

Patterns in the dropoffs:
- **Demo-bombed onboarding**: "Mario caring for Luigi", "Spartacus caring for Spartacus", "Colton caring for Colton". Three names entered, then nothing.
- **One-question-too-many**: Jean made it through name → recipient → first task (eyedrops) → asked "How many drops and which eye(s) — both, left, or right?" → user typed "Sign off" and quit. Four questions of structure before any value delivered.
- **Out-of-scope first question**: Shad asked "wondering if you can help with clock in" — agent correctly declined, but Shad never tried again. The redirect ("I help caregivers like you keep track of medications…") didn't land enough to recover.
- **Crisis false-positive**: Jim caring for himself wrote `"38spl cutters"` (referring to .38 Special hollow-point ammunition). Agent flipped into suicide-hotline mode (988 referral) before Jim clarified he was talking about going to the shooting range. This is a safety-keyword overshoot.

**Fix:**
- **Compress onboarding.** Currently it gates everything on three explicit slots: name, recipient, first task. For users who text "I want to track my mom's meds" — extract all three from one message, skip the loop.
- **Better cold-redirect.** When the first message is out of scope (Shad's "clock in"), tighten the redirect to a single specific example, not a generic list: "Not what I do, but if you ever need to keep track of someone's meds or appointments, just tell me their name and I'll get you set up in 30 seconds."
- **Soften the crisis trigger.** Match on full phrases ("hurt myself", "end it", "kill myself"), not single tokens like "cutters". Or: add a confirming turn before triggering 988 — "Are you okay? That sentence caught my attention." Jim's clarification came one turn later anyway.

---

## What's Working

Worth preserving — these are not slips:

- **Solo boundary on inbound asks.** `SOLO_BOUNDARY_PATTERN` regex + the `SOLO_BETA_MULTIPLAYER_RESPONSE` override fire reliably on user-side requests to add other people. Caught Sean, Haley, Liban, Rob Wudlick. 100% precision in this dataset.
- **Truthfulness corrections.** When the agent is challenged ("Why can't you do that?", "What do you mean 'as it grows'?", "Hey did you forget to remind me?"), it walks back gracefully and acknowledges the limit. Two turns is too long — but the eventual self-correction is solid.
- **Memory writes from explicit user corrections.** Liban: "You should have asked specifically what time" → agent acknowledged, behavior changed in the same session. The lessons loop ([convex/handler.ts:464-482](convex/handler.ts:464)) is doing its job.
- **State recall on demand.** Liban: "How is my aunt?" → agent produced a clean digest (bath, dinner, meds, two upcoming appointments). This is the killer feature when it works.
- **Rob Wudlick's full schedule load.** Building out a 7-day caregiver coverage map in 20 minutes of texting is genuinely impressive product behavior. The slip is what happens 3 days later when the agent can't tell what day it is.

---

## Prioritized Fix List

| # | Fix | Files | Effort | Resolves |
|---|---|---|---|---|
| 1 | **Inject current date into every prompt** | [promptBuilder.ts](convex/lib/pipeline/promptBuilder.ts), [handler.ts](convex/handler.ts) | 30 min | F2, half of F4, future of F1 |
| 2 | **Block phantom-reminder language** in `RESPONSE_FORMAT` | [promptBuilder.ts:3-33](convex/lib/pipeline/promptBuilder.ts:3) | 15 min | F1 user trust |
| 3 | **Validate `scheduleItems.date` as ISO at mutation** | [schema.ts:156](convex/schema.ts:156), [mutations.ts](convex/mutations.ts) | 1 hour | F4 going forward |
| 4 | **Backfill bad date strings** in `scheduleItems` | one-off migration | 1 hour | F4 historical |
| 5 | **Ship reminders cron** (daily digest of today's items) | [crons.ts](convex/crons.ts), new internal action | half day | F1 capability |
| 6 | **Tone down "save-everything" framing** in SKILLS | [promptContent.ts](convex/lib/promptContent.ts) | 30 min + iteration | F5 |
| 7 | **Compress onboarding** — extract slots from a single message when possible | [handler.ts buildIntent](convex/handler.ts:186), routing | 2 hours | F6 dropoff |
| 8 | **Soften crisis-keyword matcher** | inferred — locate the keyword check | 1 hour | F6 false-positive |
| 9 | **Make "draft a message you can send" a 1-tap pattern** | response format guidance | 30 min | F3 escape hatch |

Fixes 1, 2, and 5 are the highest leverage — they collectively turn "CareSupport is a chatbot that promises things it can't do" into "CareSupport is a chatbot that helps you track and reliably reminds you." That's the difference between churn and retention.

---

## Open Questions Before Implementing

- **Reminder delivery channel:** when the cron fires, do we send via Linq SMS as a one-off message, or piggyback on the next user-initiated turn? SMS push has its own deliverability story.
- **Timezone source of truth:** `careCases.timezone` exists in the schema but I didn't audit whether it's actually populated for live users. If empty, reminder times can't be computed correctly. (Need to check.)
- **Migration safety on backfill:** existing wrong-year schedule items belong to real users. Patching from 2025→2026 is safe for items in the recent past, but anything with a real 2025 date (e.g. retroactive logging) shouldn't be touched. Need a confidence rule before bulk-fixing.
