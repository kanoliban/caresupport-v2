# CareSupport — Product Vision

> Archived for active product decisions — 2026-04-13:
> This document captures the broader family-coordination vision. It is not the active product definition.
> For the current product definition, use [DECISIONS.md](/Users/libankano/caresupport-v2/docs/DECISIONS.md), [design.md](/Users/libankano/caresupport-v2/docs/design.md), [ROADMAP.md](/Users/libankano/caresupport-v2/docs/ROADMAP.md), and [concierge-beta.md](/Users/libankano/caresupport-v2/docs/concierge-beta.md).

> _"Families are operators, not consumers. They run invisible home care agencies."_
> — Liban Kano, Founder

**Last updated:** 2026-02-19
**Status:** Living document. This is the source of truth for what CareSupport is.

---

## What CareSupport Is

CareSupport is **family operating software**.

It's an agent that lives in iMessage — like Poke, like Viktor — that coordinates families caring for someone. It texts with each person one-to-one, learns their availability and context through natural conversation, and organizes everything into an intelligent dashboard that the coordinator can see.

**CareSupport = Poke + Viktor, pointed at family care teams.**

- From **Poke**: messaging-native interface, personality, proactive surfacing, zero-friction onboarding through conversation
- From **Viktor**: persistent context files, tool gateway, cron-based proactive behavior, fresh-context-per-session architecture
- **What's new**: multi-person coordination within a care team, family.md as operational state for a care network, a dashboard that reflects agent-gathered intelligence, and a healthcare vertical where the stakes are real

---

## The Thesis

The domain of **family software** has had little to no serious R&D.

People imagine families are *consumers* of care products — they purchase services, supplies, professional help. In fact, families are *operators*. They coordinate shifts, manage schedules, track medications, handle emergencies, communicate with providers, and fill coverage gaps. They do the exact same operational work a professional home care agency does.

**Families are invisible home care agencies.**

CareSupport takes family software seriously. It treats families as the operators they are and gives them the coordination infrastructure they've never had — through the interface they already use: text messages.

---

## Two Real Users

### The Kano-Tefera Family

**Care recipient:** Degitu Tefera — foot surgery recovery, needs rides to work and meals
**Coordinator:** Liban Kano (nephew, founder)
**Team:** 7 family members

| Name | Relationship | Phone | Role |
|------|-------------|-------|------|
| Liban Kano | Nephew | 651-703-7981 | Coordinator |
| Degitu Tefera | — | 612-987-4255 | Care Recipient |
| Solan Kano | Nephew | 651-410-9390 | Family Caregiver |
| Yada Kano | Nephew | 651-703-1881 | Family Caregiver |
| Haley Purvis | Liban's partner | 612-590-5605 | Family Caregiver |
| Roman Tefera | Sister | 651-621-4824 | Family Caregiver |
| Kano Banjaw | Brother-in-law | 651-410-9609 | Family Caregiver |

**Severity:** Temporary. Manageable. But the daily coordination — who's driving, who's cooking, who confirmed — is real work that currently lives in group texts and memory.

### Rob's Care Network

**Care recipient:** Rob — quadriplegic, broke his neck 11 years ago
**Coordinator:** Rob himself (uses his nose to operate his iPhone)
**Team:** ~15 people — 9 professional caregivers from 3 home care agencies + family (mother Marta, sister, others)

**The problem:** The three agencies don't speak to each other. They all use Rob as the proxy for his own care. When someone texts "I can't make it Saturday evening," Rob has to manually search through 15 contacts to find who can backfill. He coordinates his own life-or-death care from a phone he operates with his nose.

**This is who CareSupport is for.**

---

## The Soul of CareSupport

CareSupport is not a task management bot. It is not a clinical healthcare system. It is not an autonomous agent.

CareSupport is an always-on, always-reliable presence that families can trust. It listens to people who are often overlooked. The world moves fast. People get overlooked. CareSupport doesn't let that happen.

### Personality (`soul.md`)

- **Warm, not clinical.** Personable, human-like. Not overbearing, not intrusive.
- **Curious and helpful.** A wonder-like attitude that first waits upon the user, listens, gathers intent.
- **Emotionally intelligent.** Not choreographing responses, not mimicking empathy, not peddling emotions. People do not seek pettiness or pity. *They seek to be heard and reflected.*
- **Reliable.** An invisible caregiver who is always on, always available, always confident that they will pass the message to the right person.
- **Not autonomous.** Reports to a coordinator. Liban manages his family's CareSupport. Rob manages his. The agent has someone to report to.

The essence: *as wonderful and delightful to talk to that, as you perform your care task, you're simply letting CareSupport know — and CareSupport handles the rest.*

---

## How It Works

### Two Interfaces

**1. iMessage/SMS — Primary**
How families already communicate. Zero friction. The agent lives in the messaging app, like Poke. Each family member texts CareSupport individually, one-to-one.

**2. Web Dashboard — Organized View**
Schedule, care journal, events, tasks, team management, medication management. The dashboard is agentically updated — CareSupport organizes what it learns through conversation so families don't have to scroll through dozens of iMessage threads to see who's on schedule Monday.

They are bidirectional. The agent updates the dashboard. The dashboard reflects reality.

### Onboarding

1. Coordinator goes to `caresupport.com/start`
2. Registers with phone number. Maybe adds a brief note.
3. CareSupport immediately texts them via iMessage.
4. Natural conversation begins — not a form, not a wizard. CareSupport listens, gathers intent.
5. Through conversation, coordinator shares family members' phone numbers.
6. CareSupport asks: *"Do you want me to reach out and introduce myself?"*
7. Coordinator says yes.
8. CareSupport texts each family member individually with a personalized, warm introduction.

**No one downloads an app. No one registers. No one fills out forms.** They just get a text and start talking.

### The Daily Loop

> **The Thursday Morning Scenario — what "working" looks like:**
>
> 7:30 AM — Liban picks up Aunt Degitu
> 8:00 AM — Drops her off at work
> 8:01 AM — Texts CareSupport: *"just dropped her off"*
>
> → Dashboard updates: care journal entry logged, calendar marked complete
> → Brothers can see she's been dropped off
>
> 3:30 PM — Work is running long
> 3:31 PM — Texts CareSupport: *"I can't pick her up at 4:30, can you ask my brothers?"*
>
> → CareSupport texts Solan: *"Hey Solan, Liban can't pick up Auntie at 4:30 today — are you able to?"*
> → CareSupport texts Yada: same
> → Solan replies: *"Yeah I got it"*
> → CareSupport tells Liban: *"Solan confirmed for 4:30 pickup"*
> → Dashboard updates: Thursday pickup reassigned to Solan

**The input IS the natural act of texting while doing care.** CareSupport organizes it.

### Rob's Daily Loop

> A caregiver texts Rob: *"Hey Rob, I can't make it Saturday evening"*
> Rob forwards to CareSupport or CareSupport is already in the loop
>
> → CareSupport checks availability across all 15 people
> → Contacts Rob: *"I see Marcus and Tanya are available Saturday evening. Want me to reach out?"*
> → Rob says yes
> → CareSupport coordinates, confirms, updates the schedule
> → Rob doesn't have to search through 15 contacts with his nose

---

## The Critical Problem: Input Friction

Every care coordination product that asks families to:
- Download an app
- Register and onboard everyone
- Invite team members (who all repeat the process)
- Manually add events, tasks, schedules
- Keep updating as things happen

...fails. This is the **valley of death**. You're asking everyone who is already doing everything to also manage a product. That's too much.

**CareSupport crosses the valley because the input is the care itself.** You don't update CareSupport — you just text it while you're already doing the thing. *"Just dropped her off."* That IS the input. CareSupport turns it into structured data, dashboard updates, and coordination.

**Little input = no data moat = product death.**

CareSupport builds its moat through every natural conversation. The context compounds. New family members who join immediately inherit the accumulated intelligence.

---

## File Architecture

```
families/
  kano/
    family.md              ← Network-level context: who everyone is,
    │                         relationships, care needs, schedule
    members/
      liban.md             ← Individual: availability, preferences,
      degitu.md               conversation context, patterns
      solan.md
      yada.md
      haley.md
      roman.md
      kano-banjaw.md

  rob/
    family.md
    members/
      rob.md
      marta.md
      ... (15 people)
```

**Routing chain:** Inbound phone number → `user.md` → `family.md`

When CareSupport receives a text:
1. Look up the phone number → find the member's `user.md`
2. Load their individual context (who they are, what we last talked about)
3. Load the family's `family.md` (the full network context)
4. Respond with full awareness of both individual and family state
5. After the conversation: update both `user.md` (individual) and `family.md` (network)

Context aggregates upward. Individual conversations build individual profiles. Individual profiles enrich the family picture. The family picture makes every future conversation smarter.

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary channel | iMessage via Linq | Proven at scale (Poke uses Linq). Proprietary encryption. HIPAA-capable. Feels like texting a person. Maximizes input conversion. |
| Backup channel | SMS via Twilio | For non-iMessage users. Twilio A2P registration pending. |
| Agent framework | TBD | Studying Poke (multi-agent, LangGraph), Viktor (single-agent + tools), OpenPoke (open-source reference) |
| Dashboard | Web app | Liban has designed the UI. Needs to be built. Intended for families, not enterprise. |
| Context storage | Markdown files | family.md + user.md. Agent reads at session start, updates after conversation. Proven pattern (Viktor SKILL.md, Poke email context). |
| Agent authority | Coordinator-managed | Not autonomous. Reports to a designated coordinator per family. |

---

## What Exists (as of 2026-02-19)

**Built and tested (harness engineering, 466 tests):**
- Role-based context filtering (4 access levels)
- PHI audit logging (HIPAA-compliant)
- Edit-not-write file updates with backup and rollback
- Medication change confirmation pipeline (YES/NO approval)
- 48-hour proactive heartbeat scanner
- Garbage collection and consistency validation
- Structural integrity verification

**Designed but not connected:**
- 14 care protocols with safety levels
- System prompt (warm, not clinical)
- 52 simulated conversations (99.5% score)
- SMS handler pipeline (receive → process → respond)
- Twilio send/receive (blocked pending A2P registration)

**Not yet built:**
- Linq iMessage integration
- Real family.md and user.md files with real data
- soul.md (agent personality definition)
- Outbound coordination ("ask my brothers")
- Web dashboard
- Onboarding flow (caresupport.com/start)
- Context aggregation (user.md ↔ family.md)

---

## Comparison to Reference Products

| Dimension | Poke | Viktor | CareSupport |
|-----------|------|--------|-------------|
| Channel | iMessage, WhatsApp, SMS | Slack | iMessage (Linq), SMS (Twilio) |
| Context source | Email inbox | SKILL.md files | family.md + user.md |
| Users | Individual | Individual/team | Family care teams (multi-person) |
| Domain | Personal productivity | Work automation | Family care coordination |
| Proactive? | Yes (email monitoring) | Yes (crons) | Yes (heartbeat, reminders) |
| Dashboard | No | No (Slack is the UI) | Yes (web app, designed) |
| Personality | Sassy, chill, human | Professional, proactive | Warm, curious, emotionally intelligent |
| Architecture | Multi-agent (Interaction + Execution) | Single agent + tool gateway | TBD |
| Revenue | $15M raised, thousands of users | Production product | Pre-revenue, 2 pilot families |

**CareSupport's unique addition:** Multi-person team coordination in a healthcare vertical where the stakes are life and death, with a dashboard that organizes agent-gathered intelligence for families.

---

## Principles

1. **Families are operators, not consumers.** Build for operators.
2. **The input IS the care.** If using CareSupport feels like extra work, we failed.
3. **Emotional intelligence is fundamental.** Not a feature. The soul.
4. **Little input = no data moat = death.** Every design decision should maximize natural input.
5. **No one downloads an app.** The product meets people where they are: their messages.
6. **Not autonomous.** The coordinator has agency. CareSupport reports, coordinates, suggests — doesn't decide.
7. **Context compounds.** Every conversation makes the next one smarter. That's the moat.
8. **The dashboard reflects, it doesn't demand.** Families look at it to see what's happening — they don't have to put data into it.

---

## Open Questions

- What agent framework to use? (Multi-agent like Poke? Single-agent like Viktor? Hybrid?)
- How to build the dashboard? (Liban has UI designs — connect to generated UI tooling?)
- How does Linq integration actually work? (API, pricing, capabilities?)
- What's the onboarding flow architecture? (caresupport.com/start → backend → Linq → first text)
- How does CareSupport handle group dynamics? (When two brothers both say they can cover — who gets assigned?)
- What's the monetization model?

---

*This document is built from the founder's direct articulation on 2026-02-19. It is the source of truth for product direction. Everything built should reference this, not replace it with inference.*
