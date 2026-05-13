# Poppy iOS — Study

Synthesis of 145 screenshots captured during 24 hours of personal use, May 11–12 2026. Source app: [getpoppy.app](https://getpoppy.app), built by Second Nature Computing (SF + NYC), version 0.71 (build 456).

This document is the consolidated learning. Per-bucket detail lives in each bucket's `README.md`; raw screenshot-by-screenshot notes live in `00-MANIFEST.md`.

---

## Executive summary

Poppy is the most sophisticated execution of the iMessage-as-surface bet observed to date. Where CareSupport v2 chose "no app" as a doctrine, Poppy went further than a notification channel — they built **a synchronized iOS app + iMessage agent + Mac companion**, where each surface plays a distinct role and the three coordinate state.

The architecture's central mechanic: the **agent decides which surface a given response belongs in**. Short conversational answers stay in iMessage. Structured artifacts (lists, schedules, plans, recipes, directions) are generated as `askpoppy.app/{id}` URLs, render as iMessage rich link previews, and tap into the iOS app where the content materializes as an editable, actionable form.

The iOS app's job is therefore **not to host the agent** (iMessage does that) but to host:
- Rich structured artifacts the agent generates
- A stateful home with evolving greeting + status pills + feeds
- Granular settings (Nudges, Connected Apps, Memories, plans)
- Frontier features (Magic Cue meta-launcher, Lock Screen Briefing via Shortcut hack)

Liban tested it for 24 hours, paid for Bloom annual on day zero, and confirmed it works. The features are not vaporware.

The product reveals several patterns worth stealing — and a few worth specifically NOT stealing because care contexts differ from consumer productivity.

---

## 1. Architecture — a graph of surfaces

Poppy is NOT one app. It's a coordinated graph of five surfaces:

```
┌───────────────────────────────────────────────────────────┐
│                    Poppy backend                          │
│  (agent reasoning, memory store, integrations,            │
│   askpoppy.app URL hosting, ZDR AI provider)              │
└─┬───────────────┬──────────────┬───────────────┬──────────┘
  │               │              │               │
  ▼               ▼              ▼               ▼
iMessage      iOS app       Mac companion    Lock Screen
agent      (rich state)     (data ingest)    (alarm-chain
(primary                   (iMessage hist,    rendered image)
 surface)                   call logs)
                ▲
                │
                ▼
              Widgets (3 styles: Coming Up / Actions list / 2x2 grid)
              + Voice channel (Push-to-talk + Voice Notifications)
              + Magic Cue (Action Button / Control Center)
```

| Surface | Role | Evidence |
|--------|------|----------|
| **iMessage agent** | Conversational primary surface — chat with Poppy in your existing messaging app | `agent-thread/01-08` |
| **iOS app** | Rich-state layer for structured artifacts, settings, feeds, memory | `home/*`, `settings/*`, `memories/*` |
| **Mac companion** | Data-ingestion bridge — reads iMessage history + call logs from macOS chat.db | `onboarding/18-transparency-messages-calls-MACAPP.png`, `settings/14-mac-app-required-airdrop.png` |
| **Lock Screen** | Glanceable rendered briefing image, updated every 30min via Shortcut alarm-chain | `experimental/02-07` |
| **Voice channel** | Two-number telephony (510 for voice, 313 for messages); Push-to-talk in app; Voice Notifications at home | `onboarding/32-ios-contact-two-numbers.png`, `experimental/08-voice-notifications-setup.png` |
| **Widgets** | Three styles: Coming Up event, Actions list, 2x2 Quick Actions grid | `onboarding/26-28` |
| **Magic Cue** | Context-aware meta-launcher via Action Button or Control Center — predicts which app to open | `experimental/09-12` |

### Two-number architecture

The iOS contact card pre-populated during onboarding (`onboarding/32-ios-contact-two-numbers.png`) shows TWO phone numbers:

- **+1 (510) 947-6779** — labeled "phone" (voice calls)
- **+1 (313) 263-8263** — labeled "messages" (iMessage / SMS)

Different area codes signal different telephony providers. One number is the voice line (Apple's iMessage doesn't route voice; need real PSTN), one is the iMessage line. Standard pattern when you need both high-deliverability messaging AND voice — but Poppy committed to both from day one. CareSupport already has this pattern (Linq handles messaging); voice is a future surface.

### Mac companion app — non-negotiable for iMessage memory

The single most surprising architectural piece. From `onboarding/18-transparency-messages-calls-MACAPP.png`:

> "iMessage history synced from your Mac via the Poppy companion app."

iOS sandboxes prevent third-party apps from reading the user's broader iMessage history. macOS doesn't — `~/Library/Messages/chat.db` is readable by user-installed apps. Poppy's Mac app reads this database (with consent) and uploads structured conversation data so the iMessage agent can reason about "who matters most" and "people you mention."

Without the Mac app, Poppy's iMessage agent can only see the conversations IT is part of. With the Mac app, the agent has a complete relationship graph.

Install vector: **AirDrop**. The iPhone is already authenticated; tapping "Send to Mac" AirDrops an install link (likely with embedded auth token) to the user's macOS device. One-tap cross-device handoff (`settings/14-mac-app-required-airdrop.png`).

---

## 2. The cross-surface bridge — `askpoppy.app/{id}`

The single most important mechanic in the architecture. Observed multiple times in the agent thread (`agent-thread/03-08`) and in home deep-link landings (`home/39, 47, 49`).

### The flow

1. User asks for structured content in iMessage (recipes, grocery list, directions).
2. Agent generates content too rich for plain text bubbles.
3. Agent emits a stable URL: `askpoppy.app/{content-id}`.
4. iMessage renders an OpenGraph-compliant rich link preview card — custom illustration, title, "Tap to open in Poppy" subtitle.
5. User taps preview → iOS deep-link → opens Poppy iOS app on a STATE that **materializes the content as an editable suggestion** (event-creator form, reminder builder, Maps modal).
6. User can confirm / modify / dismiss inside the app.

### Why it matters

iMessage stays the conversational surface. The iOS app becomes the structured-content surface. **The agent makes a routing decision per response**: does this go as text, or as `askpoppy.app/...`?

When a user wants something Poppy generated to leave iMessage and live in the app, they can just ASK ("Can you put this as a step by step guide in the app not here" — `agent-thread/06-user-asks-app-not-here.png`). The agent complies — generates the link, user taps to expand.

This is the bridge between two surfaces without either dominating the other.

### Implications for CareSupport

This is the answer to "why a companion app at all if iMessage is the UI." The companion app exists to host artifacts that don't fit chat:

- Care plan summaries
- Medication schedules
- Today's shift coverage map
- Daily/weekly family digests
- Long-form member-context updates

Each artifact lives at `askcaresupport.app/{id}`, renders as iMessage rich preview, opens into the companion app pre-filled and editable. The companion app becomes the **structured-artifact surface**, never the primary conversation.

---

## 3. The agent's voice

Across the 8 agent-thread captures and the home greetings/suggestions, a consistent voice emerges:

### Lexical characteristics

- **Lowercase-friendly**, present-tense, first-person
- **Specific** (uses real names, specific times, concrete data)
- **Owns mistakes plainly** with "Actually..." or "Looks like..."
- **Casual greetings** ("Hey!" not "Hello")
- **Open questions** ("Anything on your mind for tomorrow?")
- **Soft verbs for surveillance** ("I just pulled up your location" — softer than "I checked")
- **Time-of-day emoji bookends** (🌙)
- **Echoes user vocabulary** (user says "the coven"; agent uses "the Coven" next morning in greeting)

### Voice in agent thread vs voice in home

| Surface | Voice |
|---------|-------|
| Agent thread (iMessage) | First-person "I", conversational, asks open questions, sends images for personality |
| Home greeting | Third-person editorial ("Your schedule is clear for a peaceful evening") OR direct address ("Leave by 9am for the Coven tomorrow") |
| Suggestion long-form cards | Third-person about the user with confident inferences ("Wednesday morning is packed with two back-to-back meetings") |
| Why-suggested explainer | Third-person about the agent ("Poppy noticed that...") with explicit reasoning |
| Settings/system copy | Plain second-person ("You have full control over your data") |

Five distinct voices for five surfaces. Each surface has a register.

### The first-contact composition

The agent's opening message (`agent-thread/01-first-contact-cat-image.png`) is composed in **four parts**:

```
1. Greeting + self-introduction
   "Hi there! This is Poppy."

2. Context flex (demonstrate data access AS care, not surveillance)
   "I just pulled up your location and see you're hanging out at home tonight in Minneapolis."

3. Personality moment (image — orange cat with paws up — no caption)

4. Open invitation tied to user's near future
   "Since your schedule is looking wide open for the rest of the evening, is there anything
    I can help you set up or look into so you're ready for the week ahead?"
```

This is borrowable. For CareSupport, the equivalent first message to a new caregiver would compose:

```
1. "Hi! I'm CareSupport's assistant — you can think of me as Mei's care coordinator-on-text."

2. (Context flex — something the agent can already see)
   "I've got your care relationship with Mei set up, with shifts starting Tuesday."

3. (Personality moment — small calming illustration of a houseplant or hand)

4. "What would be most helpful for me to start watching this week?"
```

### The graceful failure protocol

Best illustrated in `agent-thread/02-calendar-gap-admission.png`. The 5-step script when the agent gives wrong info due to a capability gap:

1. **Acknowledge with "Actually..."** — soft self-correction
2. **Name the specific gap** ("your calendar isn't linked to Poppy right now")
3. **Connect to the prior wrong claim** ("That's probably why Wednesday looked empty!")
4. **Offer the fix path** ("just head over to your app settings to link it")
5. **State the future capability** ("Once that's set up, I'll be able to see and add events for you")

**No grovel. No over-apology. Action-forward.** This is the gold-standard pattern for care contexts where the agent will inevitably hit capability gaps (no PCP integration, missing med record, family member offline).

### Cross-surface vocabulary continuity

User typed "the coven" in iMessage at 11:54 PM. Agent absorbed it silently into memory. Next morning at 12:05, the home greeting was: "Leave by 9am for the Coven tomorrow."

The user's idiom (their pet name for their workplace) became the agent's word. This is **memory at the voice level**, not just memory at the fact level. The agent uses YOUR words back at you. Compare to ChatGPT/Claude that are amnesiac per session.

For care contexts: caregivers' nicknames for care recipients ("Mom" / "Auntie" / "Mama Rosa" / "Pops"), specific terms ("the morning routine," "the bad nights"), shorthand for problems ("when she gets agitated") — these should all be absorbed and echoed.

---

## 4. Memory architecture — typed named categories

The Memories hub (`memories/01-memories-hub.png`) reveals Poppy's memory schema:

```
Memories
├── Your Places              (geographic facts with map UI)
│   ├── Home (preset)
│   ├── Work (preset)
│   └── [custom places]
├── Your Preferences
│   ├── Likes                (positive valence)
│   ├── Dislikes             (negative valence)
│   ├── Habits & Routines    (temporal patterns)
│   ├── Food & Diet          (dietary — separate from general Likes)
│   └── Personal Info        (locale + identity)
├── Your People              (relational, auto-extracted from mentions)
└── Your Calls with Poppy    (voice call summaries)
```

### The locale baseline

`memories/08-personal-info-locale-facts.png` shows 10 auto-populated locale facts: week start, language, units, currency, time format, temperature, calendar system, timezone, date format, country.

**These ARE the Free tier's memory cap.** Free = locale baseline. Pay → personal memories. Brilliant: Free tier isn't crippled, it's just baselined to what's universally true.

### Two-path memory population

Every category supports both:
- **Implicit** — agent extracts during conversation ("People you mention to Poppy will appear here")
- **Explicit** — user adds via + button or "Add a fact" CTA

The user can teach the agent in either direction.

### Search the memory

The hub has a top-right search icon. Memory is indexable text content.

### Implications for CareSupport

A typed memory schema for care contexts:

```
Care Network (per-recipient)
├── Recipient profile        (name, age, diagnoses, allergies, preferences)
├── Caregivers               (per-person — role, access, schedule)
├── Family Members           (relationships, contact preferences, communication style)
├── Care Routines            (medications, mealtimes, sleep schedule, mobility)
├── Medical Context          (providers, recent appointments, conditions)
├── Incidents                (logged events, severity, follow-up)
└── Notes                    (free-form coordinator observations)
```

Each category typed. Each has fact-count surfaces. Each has implicit + explicit population. Searchable. Per-recipient (not per-user — since memories about Mom aren't memories about Dad).

The "locale baseline" equivalent for Free tier: care-recipient setup facts (name, address, primary diagnoses, primary caregiver, household timezone). Auto-populated from setup. Free users get the baseline; paid users can accrue richer memories.

---

## 5. Trust patterns

Poppy spends extraordinary onboarding budget on trust-building. The pattern is consistent across surfaces.

### Transparency before permissions

A 13-screen data-transparency explainer (`onboarding/12-24`) BEFORE the permissions request screen. Each screen has the same template:

- **WHAT IS COLLECTED**
- **HOW IT IS USED**
- **HOW LONG WE STORE**

Concrete numbers (retention windows, sync intervals), category-specific colors, two emotional closers ("Zero Data Retention" → "You're in control"), and a metaphor-led encryption explanation.

The single best line: **"Every piece of data has a purpose. Nothing is collected 'just in case.'"**

### Negative-space disclosure

Every category states what's NOT done:
- Email: "...but not your full email content."
- Photos: "The photos themselves are deleted immediately after."
- Wallet: "Never shared with third parties or used for ads."

Telling users what you DON'T do is more trust-building than telling them what you do.

### Adversary-scenario encryption

The encryption screen (`onboarding/23-transparency-encryption.png`) doesn't say "industry-standard AES-256." It says:

> "Think of it like a personal lock that only fits your data."
>
> "If someone broke into our database, all they'd find is scrambled text. Without your key, it's meaningless."

Adversary scenarios + metaphor. AES-256 only appears later in the Settings footer for technical readers.

### Source attribution + explainability modal

Every long-form suggestion card has:
- Footer badge: **`via 📅`** or **`via 📅 📧`** (single or multi-source attribution)
- Link: **"Why was this suggested to me?"** → modal with:
  - **CONTEXT** (natural-language reasoning)
  - **SOURCES** (which integrations contributed)
  - **LAST UPDATED** (freshness)
  - 👍 **Show Me More Like This** / 👎 **Not Interested In This** feedback

Two-tier transparency: badge for quick scan, modal for full audit. This is the explainability gold standard for AI products.

### Cancellation transparency

The plan detail screen (`settings/06`) ends with: **"Manage Subscription / Change plan or cancel in App Store"** — direct deep-link, not buried. Cancellation is one tap away from the plan settings. Builds trust precisely BY making leaving easy.

### Implication for CareSupport

For HIPAA-adjacent care contexts, transparency isn't optional — it's the entire trust argument. CareSupport's data transparency explainer needs to be at least as thorough as Poppy's, and probably more (since care recipients' data is much more sensitive than calendar+email).

Every agent recommendation needs an explainer modal: CONTEXT (what the agent inferred) + SOURCES (which family members, which records) + LAST UPDATED + FEEDBACK. Caregivers will trust an agent that shows its work.

---

## 6. Onboarding philosophy — spend the budget on trust

The 41-screen onboarding (`onboarding/*`) took Liban ~9 minutes. By the end, the agent had already sent its first iMessage ("A message is on its way!").

The onboarding budget allocation:

| Phase | Screens | % of budget |
|-------|---------|-------------|
| Phone + verify + name | 5 | 12% |
| JTBD + integrations | 6 | 15% |
| **Data transparency explainer** | **13** | **32%** |
| Permissions + widget | 4 | 10% |
| Channel + contact | 4 | 10% |
| Cadence | 3 | 7% |
| Paywall + post-payment | 6 | 15% |

**Nearly a third of onboarding is data transparency.** This is the strongest tell about the brand's positioning: Poppy is selling trust, not features. The feature pitch (integrations, JTBD personalization) is brief. The trust pitch is exhaustive.

### Personalization mechanics

The JTBD picker (`onboarding/06-07`) captures the user's chosen problems. The next screen (integration carousel, `08-11`) quotes those problems back in each integration card:

```
Gmail
Poppy will surface what needs a reply and flag threads worth your time.
"My mornings are chaos"  ← JTBD quote
```

Per-class value description + per-user JTBD quote. Personalization that's earned, not hidden behind ML opacity.

### Implication for CareSupport

CareSupport's onboarding has the same opportunity. Capture coordinator problems explicitly:
- "I'm worried about Mom forgetting her meds"
- "We can't keep our care team on the same page"
- "Family wants updates but I don't have time"
- "We need help when something unexpected happens"

Use those problems to:
1. Tailor integration recommendations
2. Set up initial Smart Reminder watchers
3. Quote back in agent first-contact message
4. Quote back in home greeting on day 2-3 ("You mentioned X — here's what I noticed")

---

## 7. Tier economics — meter by resource, not feature

Poppy's three tiers (Free / Sprout $8.99 / Bloom $15.99) are named botanically (matching the poppy logo) and metered by RESOURCE caps, not feature lockouts:

| Resource | Free | Sprout | Bloom |
|----------|------|--------|-------|
| Email accounts | 1 | 2 | ∞ |
| Push-to-talk / day | 3 | 10 | ∞ |
| Memory facts | 10 | 100 | ∞ |
| Refresh frequency | Hourly | 30 min | 30 min |
| Magic Cue | — | ✓ | ✓ |
| Daily messages with Poppy | 10 | ∞ | ∞ |
| Audio & file uploads | — | ✓ | ✓ |
| Video uploads | — | — | ✓ |
| Phone calls | — | (?) | ✓ |
| Check-ins | — | (?) | every 30 min |

Bloom annual = $149.99 (22% off). Sprout annual = $79.99 (26% off — more aggressive discount). Annual trial = 1 month. Monthly trial = 1 week.

Free isn't crippled — it's throttled. A free user can experience full agent capability at small scale. Paying buys SCALE: more accounts, more facts, more messages.

Notable: **"texting Poppy" is itself a metered feature.** The iMessage agent (positioned as primary surface) has a per-day cap on Free tier (10 messages). Reinforces that the conversational surface IS the product, not a wrapper.

### Implication for CareSupport

Meter by RESOURCE:
- Number of care recipients per account
- Number of caregivers in a network
- Daily agent messages
- Memory facts
- Schedule-watcher reminders
- Voice channel availability

Free tier supports ONE caregiver running ONE care relationship. Paid tiers unlock multi-recipient, multi-caregiver, multi-family scale.

Names: avoid generic "Plus / Pro / Premium." Use names that mirror care journey — perhaps **Care / Network / Coordination** or domain-specific terms.

Paywall arrives AFTER value is felt. Day-1 paywall only after multiple delivered agent interactions.

---

## 8. Engineering ambition

Beyond UX, the team is shipping ambitious engineering:

### Lock Screen Briefing alarm-chain hack

(`experimental/04-07`) Apple doesn't allow third-party apps to write to the Lock Screen beyond widgets. Poppy chains iOS primitives:

```
Recurring Alarm "Update Lock Screen"
  → fires every 30 min
  → triggers Shortcut Automation
  → runs Poppy's public Shortcut
  → DELETES old alarm
  → CREATES new alarm 30 min ahead
  → calls Poppy's "Fetch Briefing as Image" custom App Intent (server-rendered briefing image)
  → SETS LOCK SCREEN WALLPAPER to that image
  → loop continues forever
```

Distribution vector: published as a public Shortcut on January 9, 2026. Anyone can install via Apple's share-sheet.

Custom App Intent ("Fetch Briefing as Image") — they ship a Swift `AppIntent` that returns image content on demand. Mature iOS integration.

### Magic Cue (context-aware meta-launcher)

(`experimental/09-12`) Tap your iPhone Action Button or Control Center widget → Poppy predicts the "right app" for your current "moment" and opens it. The example phrase that conveys everything:

> **"Maps before a meeting, Music in the air."**

Calendar+location infers meeting-imminent → suggest Maps. Device-on-plane state → suggest Music. Poppy as **meta-OS routing layer**.

Strategically: Magic Cue justifies the iOS app's existence beyond hosting structured artifacts. The app is also an **active router**.

### App Intents as agent primitives

(`experimental/06-07`) Inside the Lock Screen Shortcut, "Fetch Briefing as Image" is Poppy's custom App Intent. They ship multiple App Intents likely for: Magic Cue invocation, briefing fetch, etc. App Intents are the modern way to make app actions discoverable in Shortcuts, Spotlight, Siri Suggestions, Action Button.

### AirDrop cross-device install

(`settings/14`) Mac companion app install uses AirDrop with embedded auth token. Phone is already authenticated → AirDrop one-tap install on Mac. No URL email/text friction.

### Implication for CareSupport

- A care-context Lock Screen Briefing (rendered every 30 min): "Mom's morning meds at 9 AM. Helper Mei arriving 10 AM." Same alarm-chain hack.
- A Magic Cue equivalent: Action Button → predicts whether to launch the iMessage Poppy thread, today's care plan, current shift card, med log — based on time, location, and recent activity.
- Expose CareSupport actions as iOS App Intents (`Log Med`, `Get Today's Schedule`, `Send Handoff Note`, `Mark Shift Confirmed`) so they're invokable from Shortcuts, Siri, Spotlight.
- Mac companion app for coordinators (care plan editing, family-message batching) installed via AirDrop from iPhone.

---

## 9. Multi-party direction (Plan with Poppy)

The Bloom-tier feature list (`settings/06-07`) includes:

> **Plan with Poppy** — "Brainstorm and lock in plans with friends in iMessage."

The agent can be added to GROUP iMessage threads to coordinate plans with friends. Not observed in captures (Liban was solo-testing) but explicitly named as a Bloom-tier capability.

**This is exactly the CareSupport multi-party paradigm.** Poppy generalized "agent in group iMessage" from social planning. CareSupport specializes it for caregiving. Both products are now betting on multi-party iMessage as a feature — the surface area is real.

### Implications

- The competitive risk: Poppy is one strategic decision away from "Plan with Poppy for caregivers." Their distribution + paid users already includes households.
- The validating risk: another team shipped this. The architecture (Apple-business iMessage account that can be added to threads) is feasible.
- The differentiation play: CareSupport must be DEEPER in care contexts — HIPAA, structured care records, medication safety, role-based access — than Poppy can become as a generalist.

---

## 10. What makes it feel "sophisticated" after 24 hours

Liban's word: "incredibly sophisticated." After 24 hours of use, three specific design choices land:

### a) **Agent across surfaces, not in one app**

The agent is in iMessage at 9:14 PM. The agent surfaces in home greetings at 12:05 AM the next day. The agent renders to Lock Screen wallpaper. The agent picks apps via Magic Cue. The agent reads aloud at home. Same agent, six surfaces. **Coherence across surface boundaries.**

The "iMessage-only" stance (CareSupport v1 doctrine) is correct as a positioning move but limited as an architecture. The agent should live everywhere the user looks.

### b) **The agent ROUTES intelligently**

Per-response routing decision: text bubbles vs `askpoppy.app` link. The agent doesn't dump JSON-ish artifacts into chat; it generates URL+preview when the right format is structured. **The agent decides which surface owns each response.**

This is the missing piece for "iMessage-as-UI" products. Without surface routing, the agent is forced to produce text-only outputs, which strain quickly. With routing, the agent has the full UI palette.

### c) **Coherence across time**

Greeting evolves every 15 minutes based on calendar, location, conversation history. User's vocabulary ("the Coven") gets absorbed silently and surfaced the next day. Goals mentioned in chat ("track Founders Day") get followed through after integrations are added.

The agent has **temporal continuity** — every interaction builds on prior context across hours and days, across iMessage and app surfaces.

This is what separates "ChatGPT" agents (amnesiac per session) from real agents (persistent, evolving understanding). Poppy's memory architecture (typed categories, source attribution, search) makes coherence visible.

### What does NOT make it feel sophisticated

Worth naming the things Poppy does that DON'T add to the feeling of sophistication:

- The cute cat image in first contact — charming, not load-bearing
- The botanical tier names — pleasant, not differentiating
- The orange brand color — neutral
- The widget styles — table stakes

The sophistication is in the **architecture choices**, not the surface aesthetics. CareSupport can have less-polished marketing and still feel sophisticated if it makes the same architectural choices.

---

## 11. The CareSupport-relevant invariants

Distilling everything above into a short list of patterns that I'd argue MUST appear in CareSupport's iOS companion:

1. **iMessage stays primary.** No competing "agent inbox" inside the app. The app is for structured artifacts, settings, feeds — never the place you "talk to" the agent.
2. **Cross-surface bridge.** `askcaresupport.app/{id}` URLs from iMessage open in the app as editable, materialized artifacts.
3. **Stateful home with evolving greeting** — top-of-screen one-line editorial updated every 15min based on care state.
4. **Status pills as ambient state** — care recipient status, current caregiver, today's activity, unhandled items. Tappable.
5. **Two feed modes** — Suggested (agent-opinionated) and Coming Up (schedule-ordered) selected by time-of-day.
6. **Source attribution + explainability modal** — every agent recommendation in care contexts MUST show CONTEXT + SOURCES + LAST UPDATED + 👍👎.
7. **Cascading Shortcuts** — bottom-of-home 2x2 grid of caregiver verbs (Log / Ask / Coordinate / Search) with color-coded cascades.
8. **Typed memory schema** — Care Network categories with fact-counts, two-path population, search.
9. **Locale baseline seed memory** — care-recipient setup facts auto-populated; Free tier = baseline; paid = personal accruals.
10. **Granular notification config** — three event classes (Care alerts / Coordination / Check-ins) × three channels (Push / Text / Call) × per-event limits + Quiet Hours.
11. **Graceful failure protocol** in agent thread — 5-step "Actually... probably why... fix path... future capability" script.
12. **Transparency before permissions** — multi-screen data-class explainer with concrete retention windows, sync intervals, negative-space disclosure ("we DON'T...").
13. **Per-integration / per-calendar granular consent** — surgical opt-in, not all-or-nothing.
14. **App Intents for caregiver actions** — Log Med, Get Schedule, Send Handoff, all invocable from Shortcuts / Siri / Action Button.
15. **Mac companion for coordinators** — installed via AirDrop, hosts care plan editing + batch operations.

---

## 12. Open questions

Patterns observed but not fully understood — worth investigating before adopting:

- **Plan with Poppy** wasn't observed in captures. How does Poppy join group iMessage threads? Apple-business iMessage account? Manual add? Worth testing.
- **Magic Cue's prediction model** — rule-based or ML? Cards suggest hybrid. For care contexts, deterministic rules likely safer initially.
- **Fact format** — single-sentence strings or structured key-value? Locale facts read as sentences ("Week starts on Sunday") but likely store as structured `{week_start: "Sunday"}`.
- **askpoppy.app auth model** — URLs are content IDs, but content is per-user. Likely scoped per phone number; iOS app deep-link auth via phone-number identity. Worth verifying for our equivalent.
- **The 7 Google services Poppy "already has access to"** (`settings/18-google-oauth-web.png`) when only 4 are user-facing. Scope creep risk; don't replicate without understanding.
- **Free tier daily message cap behavior** — what does the user see when they hit 10 messages and message #11? Worth checking for paywall-gate UX.
- **Voice call channel mechanics** — Push-to-talk in app launches what? FaceTime audio to the 510 number? PSTN call? Worth understanding before building voice into CareSupport.
- **What does Mac companion app's UI look like?** All evidence is via mentions; no captures. Worth installing Poppy + Mac app to see firsthand.

---

## 13. Index — find the receipts

For every claim in this document, the screenshots are filed:

| Topic | Primary evidence |
|-------|------------------|
| Architecture overview | `STUDY.md` (this doc) |
| iMessage agent voice | `agent-thread/01-08` + `agent-thread/README.md` |
| Home stateful canvas | `home/01-51` + `home/README.md` |
| Onboarding philosophy | `onboarding/01-41` + `onboarding/README.md` |
| Memory architecture | `memories/01-09` + `memories/README.md` |
| Settings + integrations | `settings/01-21` + `settings/README.md` |
| Lock Screen + Magic Cue + Voice Notifications | `experimental/01-12` + `experimental/README.md` |
| Edge states + failure handling | `edge-states/01` + `edge-states/README.md` (with cross-refs) |
| App Store positioning | `marketing/01-02` + `marketing/README.md` |
| Raw screenshot-by-screenshot notes | `00-MANIFEST.md` |

Phase 6 (`docs/product-decisions/companion-app-direction.md`) — the translation of this study into a concrete CareSupport companion-app direction — is gated and awaits explicit go-ahead.
