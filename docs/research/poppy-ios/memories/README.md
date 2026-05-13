# memories — named-category structured agent memory

9 screenshots. The memory architecture: a hub screen with categorical sub-screens. Memory isn't a free-form long-context blob; it's a **typed schema** with named buckets, fact counts, and per-category empty/populated states.

---

## File index

- `01-memories-hub.png` — hub: Your Places + Your Preferences + Your People + search
- `02-people-empty.png` — Your People empty state with + add
- `03-calls-empty.png` — Your Calls with Poppy empty state
- `04-likes-empty.png` — Likes category empty state
- `05-dislikes-empty.png` — Dislikes empty state
- `06-habits-routines-empty.png` — Habits & Routines empty
- `07-food-diet-empty.png` — Food & Diet empty
- `08-personal-info-locale-facts.png` ⭐ — Personal Info populated with 10 locale facts
- `09-places-home-work-cards.png` — Your Places with Home/Work suggestion cards

---

## Memory schema (observed)

```
Memories
├── Your Places              ← geographic facts (Apple Maps preview)
│   ├── Home (preset)
│   ├── Work (preset)
│   └── [custom places]
├── Your Preferences
│   ├── Likes                ← positive valence
│   ├── Dislikes             ← negative valence
│   ├── Habits & Routines    ← temporal patterns
│   ├── Food & Diet          ← dietary facts (separate from general Likes)
│   └── Personal Info        ← locale + identity facts
├── Your People              ← relational memories (auto-extracted from mentions)
└── Your Calls with Poppy    ← call history with transcripts/summaries
```

Eight top-level categories. Each is independently populated. Each has a fact COUNT.

---

## Critical insight — Personal Info IS the locale baseline

`08-personal-info-locale-facts.png` shows 10 auto-populated facts:

1. Week starts on Sunday
2. Primary language is English
3. Uses the imperial measurement system (miles, feet, pounds)
4. Uses US Dollar (USD) as their currency
5. Uses 12-hour (AM/PM) time format
6. Prefers temperatures in Fahrenheit
7. Uses the Gregorian calendar
8. Timezone is America/Chicago (UTC CDT)
9. Prefers date format like 12/31/05
10. Located in United States

These are **device-locale facts** automatically extracted from iOS. Zero user effort, 100% accurate, immediately useful for any agent output (currency formatting, date formatting, unit conversions, etc.).

**The 10-fact count is the Free tier's memory cap.** Free users get only the locale baseline. Sprout/Bloom unlock personal facts beyond locale. This is brilliant economic design: Free tier isn't crippled, it's just baselined.

---

## UI patterns

### 1. Per-category empty-state template

Likes, Dislikes, Habits & Routines, Food & Diet all share the same empty-state structure:

```
[Back chevron]                [+ add button (orange)]

[Category Title]

   [Category-specific grey icon]

   No facts yet
   Add things Poppy should know about your [category].

   [⊕ Add a fact (orange CTA)]
```

Category-specific icons (heart, thumbs-down, clock, fork-and-knife) maintain visual identity even when empty. Two redundant + entry points (top-right + center CTA) — friction-free.

### 2. Two memory-population paths

Every category supports two ways for facts to appear:

- **Implicit extraction** — agent observes user mentioning something in conversation and adds it ("People you mention to Poppy will appear here")
- **Explicit user addition** — + button or "Add a fact" CTA opens a creation modal

Pattern: don't force users into either path — let them choose how to teach the agent.

### 3. Map inline for Places

Places sub-screen embeds an Apple Maps tile inline (visible in the hub at `01`). The map shows the user's current location with a "Tap to label this location" overlay — the agent invites the user to NAME the current place. Geographic memory has a visual interface.

### 4. Preset suggestion cards before empty state

`09-places-home-work-cards.png`:

```
Your Places

[🏠 Add Home / Set your home location...]  [⊕]
[💼 Add Work / Set your work location...]  [⊕]

   [empty-state icon]
   No saved places
   Add Home and Work above to get started, or tap + to mark a custom place.
```

Two preset-suggestion cards (Home + Work) ABOVE the empty state. Suggest the obvious cases; leave the empty space for custom.

### 5. Search the memory

The hub has a search icon top-right (`01-memories-hub.png`) — users can search their memories. Means memory has indexable text content per fact.

### 6. Fact counts as growth signal

Each category shows count: "10 facts" / "No facts yet" / etc. Memory accretes visibly. Pattern matches the "User since May 2026" gamification — both quantify the user's relationship with Poppy.

---

## Verbatim copy

- **Hub heading**: "Memories"
- **Sub-section headings**: "Your Places" / "Your Preferences" / "Your People" / "Your Calls with Poppy"
- **Empty-state instructions**: "Add things Poppy should know about your [category]."
- **People empty**: "People you mention to Poppy will appear here."
- **Calls empty**: "Your calls with Poppy will appear here."
- **Places empty**: "Add Home and Work above to get started, or tap + to mark a custom place."

---

## Steal for CareSupport

1. **Named-category memory schema** — Don't store agent memory as free-form text. Use typed categories:

   ```
   Care Network (per-recipient)
   ├── Care Recipient profile (name, age, diagnoses, allergies, preferences)
   ├── Caregivers (per-person — role, access level, schedule, preferences)
   ├── Family Members (relationships, contact preferences, communication style)
   ├── Care Routines (medications, mealtimes, sleep schedule, mobility)
   ├── Medical Context (providers, recent appointments, conditions)
   ├── Incidents (logged events, severity, follow-up status)
   └── Notes (free-form coordinator observations)
   ```

   Each category typed; each has fact-count surfaces; each has implicit + explicit population.

2. **Memory seed from setup data** — Free tier should auto-populate care-recipient locale facts + the explicit setup info coordinator provides (name, primary diagnoses, primary caregiver, address). That's the "Personal Info" equivalent — agent has baseline awareness immediately.

3. **Per-category empty-state with category icon** — Empty Likes is not empty Dislikes. Each care-context category needs its own icon + empty-state copy.

4. **Two-path memory population** — Both implicit (agent extracts from coordinator's iMessage) and explicit (coordinator types facts directly via the memory UI). Critical: COORDINATORS should be able to override agent-extracted facts in the memory surface, not via re-conversation.

5. **Map inline for Places** — Care recipient's home address with map; "Tap to label" for things like "back yard access path" / "neighbor — emergency contact at #5." Spatial memory matters in caregiving.

6. **Search memory** — Searchable text across all care memories: "find every fact mentioning ankle pain" / "show me Mei's preferences." Privacy: search must respect role-based access controls.

7. **Calls with Poppy as memory** — Voice call transcripts/summaries are first-class memory items. For CareSupport: phone conversations with the coordinator are stored summaries (with consent) — they're how the agent learns context.

8. **Fact counts as relationship-depth signal** — Counts show how much the agent knows. For care contexts, this can be a coordination signal — "Helper Mei has 47 facts about Mom; Helper Diego has 12. Diego is new; allocate more handoff time to him."

---

## Open questions

- The "Memories" surface is reached from settings — is there a more proximate entry point? (Status pill drill-down on the day-greeting could be one.)
- Are memories per-user or per-relationship? (For CareSupport: definitely per-care-recipient, since memories about Mom aren't memories about Dad.)
- Fact format unknown — single-sentence strings? Structured key-value? The locale facts read as sentences ("Week starts on Sunday") but probably store as structured `{week_start: "Sunday"}` under the hood.
- Search behavior on populated memories not observed (Liban had only locale facts) — worth verifying with a populated account.
