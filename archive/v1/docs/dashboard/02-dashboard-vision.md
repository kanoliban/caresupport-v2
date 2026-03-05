# Dashboard Vision — Generative UI for Family Care

> _"When reviewing this repo, I want you to imagine what the experience would be like for users as their communications to CareSupport back and forth would generate a dashboard UI."_
> — Liban Kano, 2026-02-21

---

## The Core Insight

The CareSupport dashboard is not a traditional SaaS application. It is the **organized output of conversations that are already happening.**

Family members text CareSupport via iMessage as a natural part of doing care. "Just dropped her off." "Can't pick her up at 4:30, ask my brothers?" "Brought dinner over." Each message updates the family's context (family.md + user.md files). Each update changes the state of care.

With Tambo, the dashboard becomes a **conversational surface** where CareSupport can respond with **interactive React components** instead of just text. The coordinator doesn't navigate pages or fill forms. They talk to CareSupport, and CareSupport renders what they need to see.

**Two surfaces. One agent. One context. Two ways to interact.**
- iMessage: for the family (zero-friction, no app download, natural conversation)
- Dashboard: for the coordinator (organized view, component-based, actionable)

---

## What the Coordinator Sees

When the coordinator opens the dashboard at `caresupport.com`, they see:

### The Persistent Layer (Interactable Components)

Three components that are always present, always current, always reflecting the state of care:

1. **`<WeekSchedule>`** — A 7-day grid. Who's covering each shift. Color-coded: green (confirmed), amber (pending), red (gap). Updates live as iMessage conversations resolve.

2. **`<CareJournal>`** — A timeline. Every meaningful interaction becomes an entry. "Liban dropped off Degitu at 8:01 AM." "Solan confirmed Friday pickup." "Degitu mentioned knee pain." Built entirely from conversation — no one writes in it directly.

3. **`<TeamRoster>`** — The care network. Who's active, availability patterns learned over time, last activity, reliability. For Rob's case: which agency each professional belongs to, certifications, weekend availability.

### The Conversation Layer

At the bottom: a chat input. The coordinator talks to CareSupport — the same agent that texts the family — but here it can respond with **components** alongside text.

### The Generative Layer (On-Demand Components)

When the coordinator asks a question or CareSupport proactively surfaces something, additional components render:

4. **`<AvailabilityCheck>`** — "Who can cover Friday?" → Renders each member's status, who's been asked, who responded. Actionable buttons: [Ask Haley] [Ask All] [Skip].

5. **`<DaySummary>`** — End of day: what happened, who did what, what's coming tomorrow. Generated from journal + schedule.

6. **`<GapAlert>`** — Proactive: CareSupport notices Thursday afternoon is uncovered. Renders the gap, who's been asked, suggested people to contact.

7. **`<MemberProfile>`** — "How's Solan been doing?" → Patterns, reliability, recent activity, conversation context.

---

## The Thursday Morning Scenario — Dashboard Edition

This extends the scenario from VISION.md, showing what the coordinator sees:

### 8:01 AM — Liban texts CareSupport via iMessage

> "just dropped her off"

**What happens on the dashboard:**
- `<WeekSchedule>` updates: Thursday morning shows ✅ Liban — confirmed, completed
- `<CareJournal>` adds entry: "8:01 AM — Liban dropped off Degitu at work"
- Brothers with dashboard access can see she's been dropped off

*No one opened the dashboard to do this. Liban just texted.*

### 3:31 PM — Liban texts CareSupport via iMessage

> "can't pick her up at 4:30, ask my brothers?"

**What happens on the dashboard:**
- `<WeekSchedule>` updates: Thursday 4:30 PM shifts from ✅ to 🔴 (gap)
- CareSupport texts Solan and Yada via iMessage (per existing flow)
- `<GapAlert>` renders on the coordinator's dashboard:

```
┌─────────────────────────────────────────┐
│  ⚠️  Gap: Thursday Pickup — 4:30 PM     │
│  Degitu needs pickup from work          │
│─────────────────────────────────────────│
│  📱 Solan   Asked 3:31 PM   ⏳ Waiting  │
│  📱 Yada    Asked 3:31 PM   ⏳ Waiting  │
│  ── Roman   Not contacted               │
│  ── Haley   Not contacted               │
│─────────────────────────────────────────│
│  [Ask Roman]  [Ask Haley]  [Ask All]    │
└─────────────────────────────────────────┘
```

### 3:35 PM — Solan replies via iMessage

> "yeah I got it"

**What happens on the dashboard:**
- `<GapAlert>` updates: Solan row shows ✅ Confirmed
- `<WeekSchedule>` updates: Thursday 4:30 PM turns green — Solan
- `<CareJournal>` adds entry: "3:35 PM — Solan confirmed Thursday 4:30 pickup"
- Gap resolved. Alert collapses.

**Total coordinator effort:** One text message ("can't pick her up at 4:30, ask my brothers?"). Everything else happened automatically.

---

## Rob's Dashboard

15 people. 3 agencies. Same components, richer data.

Rob types (with his nose, on his phone, through the dashboard's mobile view):

> "Maria can't make it Saturday evening"

CareSupport knows:
- Maria is from Agency B
- Saturday evening requires someone with medication administration certification
- Two people from Agency A and one from Agency C have the right certs
- James covered last Saturday

Tambo renders `<AvailabilityCheck>` — scoped to Saturday evening, filtered by certification, sorted by availability history. Rob taps one name. CareSupport texts them. The `<WeekSchedule>` updates when they confirm.

Rob doesn't search through 15 contacts. He doesn't call three agencies. He doesn't manage a group text. He says what happened, and CareSupport handles the coordination.

---

## Why This Is Different

### Traditional Dashboard
- Static pages: Schedule page, Journal page, Team page
- Manual data entry: someone has to update the schedule when plans change
- Predefined layouts: same view for every family, every situation
- Passive: shows data, doesn't act

### Tambo-Powered Dashboard
- Conversational: the coordinator talks, CareSupport renders
- Automatic data: conversations *are* the input — family.md updates flow to components
- Adaptive: different components render based on what's happening right now
- Active: components have action buttons that trigger real coordination (texts, confirmations)

### What the Founder's Designs Become

The founder's dashboard UI designs are not replaced — they become the **component design language**:
- How `<WeekSchedule>` *looks* — colors, typography, grid layout, mobile behavior
- How `<CareJournal>` *feels* — warm, readable, family-not-enterprise
- The emotional quality of the interface — the "soul" expressed visually

Tambo decides *when* and *what* to render. The designs decide *how it looks*. Both are essential.

---

## The Philosophical Shift

Your product vision says: _"The input IS the care."_

With Tambo, the dashboard embodies this:
- Family members never interact with the dashboard directly
- They text CareSupport while doing care
- The dashboard materializes from those conversations
- The coordinator sees the organized result
- When the coordinator needs to act, they talk to the same CareSupport — and it responds with actionable components

The dashboard doesn't demand. It reflects. It doesn't require learning. It responds to asking. It doesn't have a fixed layout. It has components that appear when they're needed.

This is what "family software" looks like when you take families seriously as operators.
