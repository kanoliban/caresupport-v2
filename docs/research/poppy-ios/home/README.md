# home — the iOS app's primary surface

51 screenshots. The largest bucket. Everything you see "in the Poppy app" lives here: the greeting bar, the status pills, the two feed modes (Suggested For You / Coming Up), the four cascading Shortcuts, the suggestion-detail modals, deep-link landings from iMessage, day view, inbox of reminders, the multi-action drawer, and the home's evolution across hours and days.

The home is best understood as a **stateful canvas** with five layers stacking from top to bottom:

```
┌──────────────────────────────────────┐
│ 1. Greeting (time/context-aware)     │ ← evolves: "It's a bit late" → "Your schedule is clear" → "Busy Wednesday ahead with Leanda" → "Leave by 9am for the Coven tomorrow"
│ 2. Status pills (live state)         │ ← location · weather · date|reminders|events · inbox state
│ 3. Section heading (current feed)    │ ← "Suggested For You" or "Coming Up" (changes by time-of-day)
│ 4. Card feed (3 display modes)       │ ← long-form prose / grid tiles / Coming Up structured event cards
│ 5. Bottom Shortcuts + voice          │ ← 4-button cascade grid OR push-to-talk pill
└──────────────────────────────────────┘
```

---

## File index by sub-flow

### Canonical home variants
- `01-home-suggestions-first.png` — first post-onboarding home (Suggested For You)
- `02-home-shortcuts-first.png` — swiped pane: Shortcuts grid
- `03-home-shortcuts-canonical.png` — same Shortcuts state, after settings
- `27-home-push-to-talk-pill.png` — push-to-talk pill state (alternate to floating mic)
- `36-home-longform-cards-with-why.png` — Suggested For You as long-form prose cards
- `40-home-source-badged-cards.png` — long-form cards with "via 📅 📧" attribution
- `41-home-founders-day-followthrough.png` — calendar-linked event surfaced after integration was added (cross-surface follow-through)
- `46-coming-up-feed.png` — first "Coming Up" feed appearance
- `50-home-next-day-the-coven.png` — next-morning home with greeting echoing user's vocabulary ("the Coven")

### Shortcut cascades — Create
- `04-cascade-create-tap.png` → `05-cascade-create-event.png` → `06-cascade-create-event-tomorrow.png` (Create → Event → Tomorrow)
- `07-cascade-event-date-picker.png` (Create → Event → Pick time)
- `16-cascade-create-revisit.png` (returned to Create cascade later)

### Shortcut cascades — Order
- `23-cascade-order-status-pill-changed.png` (Order tapped, pill green)
- `24-cascade-order-ride.png` → `25-cascade-order-restaurant.png` → `26-cascade-order-groceries-instacart.png`

### Shortcut cascades — Go
- `14-cascade-go-tap.png` → `15-cascade-go-other-input.png`

### Shortcut cascades — Search
- `11-cascade-search-with-imessage-banner.png` → `12-cascade-search-web.png` → `13-cascade-search-web-input.png`

### Create modals (deeper builders)
- `17-reminder-builder-templates.png` → `18-reminder-builder-typed.png` → `19-reminder-builder-triggers.png` → `20-reminder-builder-onetime.png`
- `21-timer-modal.png`
- `22-alarm-modal.png`
- `08-event-calendar-not-connected.png` → `09-event-timeline-view.png` (event creator)

### Day View / Inbox
- `29-day-view.png` — hourly timeline with current-time line
- `30-inbox-reminders-banner.png` — Inbox with "Meet Smart Reminders" banner
- `31-inbox-alarms-empty.png` — Inbox Alarms tab, empty

### Status pill drill-down
- `32-weather-pill-drilldown.png` — tap weather → expanded weather sheet

### Suggestion drill-downs
- `33-suggestion-directions-modal.png` — "Late night at Little Tijuana" with Apple Maps inline
- `34-suggestion-uber-request.png` — Order ride alternative path, Uber selected
- `35-suggestion-lyft-request.png` — Lyft tab selected (pink-themed CTA)
- `37-why-suggested-salmon.png` — "Why was this suggested?" explainer with Context/Sources/Last Updated/Feedback
- `38-why-suggested-sql.png` — second example, thinner reasoning
- `44-suggestion-usaa-bill.png` — bill-payment suggestion → USAA web link
- `45-suggestion-join-setup-meeting.png` — calendar event with Google Meet join CTA

### Deep-link landings (from `askpoppy.app/...` URLs in iMessage)
- `39-deeplink-grocery-list-event.png` — grocery list materializes as event-creator
- `47-deeplink-recipe-event.png` — recipe materializes as event-creator
- `48-recipe-as-reminder.png` — same content as Create Reminder variant (form-field swap)
- `49-deeplink-directions.png` — directions materialize as Maps modal

### Feed evolution
- `10-home-suggestion-completed-state.png` — completed suggestion (faded + checkmark)
- `28-suggestions-grid-evolved.png` — 4-card grid with mixed states
- `42-suggestions-grid-mode.png` — 8-card grid view, all "Open X" verb-titled
- `43-suggestions-strikethrough-completed.png` — strikethrough on completed
- `51-coming-up-multiaction-drawer.png` — "2 actions" inline expansion

---

## UI patterns

### 1. Stateful greeting

The top-most heading evolves continuously. Across captures:

| Time | Greeting | Source |
|------|----------|--------|
| 9:16 PM | "It's a bit late, Liban" | Time-of-day inference |
| 9:33 PM | "Your schedule is clear for a peaceful evening" | Calendar empty inference |
| 9:48 PM | "Rest up, tomorrow's a big day for the fund" | Email/calendar — knows about fundraising event |
| 10:15 PM | "Busy Wednesday ahead with Leanda" | Calendar event with attendee name extracted |
| 12:05 AM | "Leave by 9am for the Coven tomorrow" | User's iMessage at 11:54 PM absorbed |

The greeting is the agent's **headline editorial position on what's pertinent right now**. It changes every ~15 minutes and references concrete data (people, places, fundraising context, user's idioms).

### 2. Status pills as ambient state

Four pills, always present, evolving:

```
[📍 location] [🌧 weather + opinion] [📅 date|events|reminders] [📬 inbox state]
```

- **Location pill**: live current location, updates when user moves
- **Weather pill**: temp + opinionated recommendation ("Layers needed" → "Wear a jacket" as time gets colder)
- **Calendar pill**: morphs based on what's most relevant — date "May 11th" → "1 reminder" → "2 events today"
- **Inbox pill**: "Inbox clear" when caught up; otherwise count-based

Tapping a pill opens a detail sheet — weather pill expands to a full forecast modal (`32-weather-pill-drilldown.png`). Each pill is a portal to its underlying domain.

### 3. Two feed modes — Suggested For You vs Coming Up

The section heading changes by time-of-day:
- **Earlier evening** (9–10 PM): "Suggested For You" — ad-hoc opinionated suggestions across recipes, errands, places, events
- **Late evening + morning** (10 PM onward): "Coming Up" — temporally-ordered upcoming events with structured detail

The agent has two ways to organize the same "things worth surfacing":
- *What might be useful right now* (Suggested For You)
- *What's coming next in your timeline* (Coming Up)

### 4. Three card formats

Cards within the feed render in three formats depending on density and content:

**Long-form prose cards** (`36`, `40`, `41`):
```
🥗 For a quick seasonal 📅 dinner tonight, try a sheet-pan salmon with asparagus
and snap peas; these spring greens are currently in peak season and require
minimal cleanup.

[Why was this suggested to me? ↗]
via 📅
```

**Grid tiles** (`42`, `43`):
```
┌─────────────────┐ ┌─────────────────┐
│ 📅 Open Setup    │ │ 📅 Open See Cafe │
│    -AI.com       │ │    Astoria menu  │
└─────────────────┘ └─────────────────┘
```

**Coming Up structured event cards** (`46`, `50`, `51`):
```
┌──────────────────────────────────────────┐
│ 📅 Leanda x Liban at 📅 9:00 AM Wednesday │
│ — Cafe Astoria, ↗ 180 Grand Ave...        │
│ via 📅                          2 actions> │
└──────────────────────────────────────────┘
```

Same card system, three render modes selected by content type. Patterns: prose for the agent's editorial voice, grid for high-density actionables, structured for timeline events.

### 5. Three card states

- **Active**: full opacity + blue dot in corner
- **Stale**: faded opacity, no dot
- **Completed**: faded + checkmark in corner + **strikethrough title text**

The strikethrough is the strongest "this is done" signal. Pattern: don't archive completed items; visually downgrade them so they recede but stay scrollable.

### 6. Source attribution badges

Long-form cards include a footer like `via 📅` (calendar) or `via 📅 📧` (calendar + email) — single or multi-source. This is the same idea as the "Why was this suggested?" modal but inline: every card says where its data came from.

Pair this with the explainer modal (`37`, `38`) which shows:
- **CONTEXT** (natural-language reasoning)
- **SOURCES** (which integrations contributed)
- **LAST UPDATED** (freshness)
- 👍/👎 feedback buttons

Two-tier transparency: footer badge for quick scanning, modal for full audit.

### 7. Cascading Shortcuts (color-coded)

Bottom of home has a 2x2 Shortcuts grid. Tapping a Shortcut starts a **cascade**:
- Pill changes color to match the verb (Create=purple, Order=green, Go=blue, Search=yellow)
- Sub-options appear below as a new mini-heading + pill set
- Tapping a sub-option further cascades — eventually resolving into either a free-form input + action CTA, or a deeper modal

```
[Create] → "What would you like to create?" → [Reminder|Alarm|Timer|Event] → ...
[Order]  → "What would you like to order?"  → [Ride|Restaurant|Groceries]  → ...
[Go]     → "Where would you like to go?"    → [Other|...saved places]     → ...
[Search] → "Where would you like to search?"→ [YouTube|Web|Places]        → ...
```

Each verb cascade has its own sub-tree. **This is form-construction by tap, not by typing.** A user who doesn't know what to "ask the agent" can navigate by clicking through options.

### 8. Modal sheet pattern

Suggestion drill-downs, deep-link landings, status-pill expansions, Inbox — all use the same bottom-sheet modal pattern with consistent affordances:
- X close OR ◀ Messages back (depending on entry point)
- Heading with leading icon
- Inline preview (Maps, weather chart, item list, etc.)
- Primary action CTA (orange, full-width)
- Secondary action ("Remind me instead" / "Order ride instead")
- Escape ("Not now")

The **Primary / Secondary / Not now** triplet shows up across many modals — three-action ladders are the standard CTA pattern.

### 9. Multi-action drawer

Coming Up cards have a "N actions >" chevron that **expands inline** to reveal action options (`51`). Two actions per card on Coming Up:
- "📌 Get directions to X"
- "📅 Open X"

Inline expansion keeps user in the feed, no full-screen modal. Pattern: reveal-in-place for high-frequency actions.

### 10. Deep-link landing as embedded suggestion

When `askpoppy.app/...` URLs from iMessage open in the app, they don't drop the user on a generic content page. They land on **home with the content materialized as a suggestion card + action form** (e.g., recipe → event-creator pre-filled). Pattern: deep-links resolve into editable INTENTS, not static views.

---

## Verbatim copy worth preserving

- **Greetings**: "It's a bit late, Liban" / "Your schedule is clear for a peaceful evening" / "Rest up, tomorrow's a big day for the fund" / "Busy Wednesday ahead with Leanda" / "Leave by 9am for the Coven tomorrow"
- **Weather pill opinions**: "Layers needed" / "Wear a jacket"
- **Inbox state**: "Inbox clear"
- **Suggestion explainer**: "Poppy noticed that you recently searched for recipes for quick dinners and mentioned enjoying salmon. It also saw that you have a favorite grocery store near your location that sells fresh asparagus and snap peas, so it thought these ingredients would be a great combination for your meal."
- **Long-form suggestion**: "Wednesday morning is packed with two back-to-back meetings. You'll start with the Rotary Club at the Minneapolis Club at 7:00 AM, followed immediately by coffee with Leanda at Cafe Astoria in St. Paul at 9:00 AM."
- **Follow-through suggestion**: "The Founders Day event at the University of Minnesota is confirmed for Wednesday at 4:30 PM at the Walter Library & Toaster Innovation Hub. This is the event you recently mentioned wanting to track in your schedule."
- **Inbox banner**: "Smart reminders let Poppy check in on things for you automatically. Set an objective, pick a schedule, and Poppy handles the rest."
- **Edge-state event**: "Calendar Not Connected / Calendar access hasn't been granted yet. Enable it to create and manage your events."
- **Push-to-talk affordance**: "Press and hold to tell Poppy what to do"

---

## Steal for CareSupport

1. **Stateful greeting bar** — Top of the companion app should evolve every ~15min based on shift state, upcoming caregiver activity, recent family messages, current care recipient status. Examples: "Mei's shift starts in 20 minutes" / "All meds confirmed for today" / "Aunt Lara sent 2 photos this morning" / "Quiet morning, no incidents reported."

2. **Status pills as ambient state** — A 4-pill row: care recipient status, current caregiver, today's shift count, unhandled tasks. Tappable; each opens its domain detail.

3. **Two feed modes** — Suggested (proactive, agent-opinionated: "Mei mentioned Mom didn't eat lunch — check in?") vs Coming Up (schedule-ordered: "Mei → Diego handoff at 3pm").

4. **Three card formats** — Long-form prose for high-stakes synthesis (med change discussions, care plan summaries), grid tiles for high-frequency quick actions ("Confirm Friday shift" / "Approve med change"), structured event cards for shifts/appointments with multi-action chevrons.

5. **Source attribution + explainer modal** — Every agent recommendation in care contexts MUST show CONTEXT + SOURCES + LAST UPDATED + 👍👎. Caregivers and coordinators need to verify reasoning, especially around meds and schedules.

6. **Cascading Shortcuts** — A 2x2 grid at the bottom for the most common caregiver intents:
   - **Log** (purple) — log a med dose, vitals, incident, note
   - **Ask** (blue) — ask agent about schedule, member, history
   - **Coordinate** (green) — request coverage, send handoff, ping a member
   - **Search** (yellow) — search history, photos, notes, member files
   Each cascades into sub-options. Tap-to-construct beats type-to-prompt for many caregivers.

7. **Deep-link landings as editable intents** — Care plan summary URL from iMessage opens not as a read-only doc but as an editable preview with Apply / Modify / Discuss CTAs.

8. **Strikethrough completed** — Completed care tasks (med given, shift confirmed, etc.) stay visible in the feed with strikethrough + checkmark. History as a scrollable trail without cluttering active items.

9. **Inline multi-action drawer** — Shift cards expand to reveal [Get directions] [Confirm with member] [Add to your calendar] [Send reminder to recipient] without leaving the feed.

10. **Push-to-talk pill** — A bottom-of-screen affordance: "Hold to log a quick voice note to Poppy." For caregivers whose hands are full, voice-first is the most accessible input.

---

## Open questions

- How is the feed RANKED? Is it chronological, agent-priority, or hybrid?
- The "Why was this suggested?" feedback — does 👎 train a per-user model, or globally? (Affects whether to copy the affordance for care-context suggestions.)
- Are the Shortcut cascades configurable, or fixed at 4 verbs? (For CareSupport, would we need different verbs per role — Caregiver vs Coordinator vs Family Member?)
- The Day View (`29-day-view.png`) is reachable but the entry point isn't documented in these captures — likely via a date pill tap or calendar icon somewhere.
