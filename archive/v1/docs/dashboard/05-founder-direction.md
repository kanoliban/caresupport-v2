# Founder Direction — Dashboard Context

> Key decisions, context, and reasoning from the founder's articulation.
> This document preserves the intent behind the dashboard direction.

---

## The Moment

On 2026-02-21, after completing the product vision document, Liban shared the Tambo repo before sharing his own dashboard designs. This was intentional:

> _"Before I show you the dashboard I want to show you this most interesting opensource repo because it results in my dashboard UI becoming nothing more than inspiration if this technology holds up to be true."_

> _"When reviewing this repo, I want you to imagine what the experience would be like for users as their communications to CareSupport back and forth would generate as a dashboard UI."_

> _"I want to share this with you before sharing my design UI because this is a moment of precipice before you are influenced by my design. This is the moment you have agency to be creative."_

This sequencing matters. The founder wanted an uninfluenced technical vision of what's possible before layering in design preferences. The documents in this folder represent that uninfluenced vision.

---

## What's Settled

These decisions come from the product vision (VISION.md) and are non-negotiable for the dashboard:

### 1. The dashboard reflects, it doesn't demand
- Principle #8 from the vision
- Families look at the dashboard to see what's happening — they don't have to put data into it
- The dashboard is the organized output of iMessage conversations

### 2. No one downloads an app
- The dashboard is web-based
- Accessible via browser on any device
- Mobile-first for Rob's use case (phone controlled with his nose)

### 3. The input IS the care
- Family members text CareSupport while doing care
- Those texts ARE the data input
- The dashboard materializes from conversations, not from manual entry
- "Just dropped her off" → journal entry, schedule update, family notification

### 4. Not autonomous
- CareSupport reports to the coordinator
- The dashboard gives the coordinator visibility and control
- CareSupport proposes, the coordinator disposes
- Action buttons in components (like "Ask Haley") require coordinator initiation

### 5. Emotional intelligence is fundamental
- Dashboard components must feel warm, not clinical
- This is family software, not enterprise software
- The visual design carries the soul of CareSupport

---

## What's Open

These questions remain unresolved and will need founder input:

### 1. Agent Framework
From VISION.md open questions:
> _"What agent framework? Multi-agent like Poke? Single-agent like Viktor? Hybrid?"_

For the dashboard, this affects whether the Tambo dashboard agent is the *same* agent as the iMessage agent or a separate agent reading the same context. See [04-architecture.md](04-architecture.md) for the dual-agent problem.

### 2. Founder's Dashboard Designs
The founder has existing dashboard UI designs that haven't been shared yet. These will inform:
- Component visual design (colors, typography, layout)
- Information hierarchy within components
- The emotional feel of the interface
- Mobile layout patterns

The designs become the **component design language** — Tambo decides what to render, the designs decide how it looks.

### 3. Tambo vs. Build Custom
Tambo is the recommended approach, but alternatives exist:
- **Full Tambo:** Use Tambo's React SDK + self-hosted backend for the entire dashboard
- **Tambo-inspired:** Build a custom generative UI system using the same patterns (component registry, AI selection) without the Tambo dependency
- **Hybrid:** Use Tambo for the conversational/generative parts, custom code for the static dashboard layout

Trade-offs documented in [01-tambo-analysis.md](01-tambo-analysis.md).

### 4. Real-time vs. Polling
When a family member texts via iMessage and the context updates, how quickly does the dashboard reflect the change?
- **Polling (simple):** Dashboard checks for updates every 5-15 seconds
- **Real-time (complex):** WebSocket/SSE push when context changes
- **Hybrid:** Polling for background, real-time for active gaps/alerts

### 5. Monetization Interaction
From VISION.md open questions:
> _"Monetization model?"_

The dashboard may be part of a paid tier (free = iMessage only, paid = iMessage + dashboard). Or the dashboard could be the free hook that demonstrates value, with advanced features as paid.

### 6. Multi-Family Support
If the coordinator manages care for multiple family members (e.g., both Aunt Degitu and another relative), the dashboard needs family switching or a unified view. Not yet specified.

---

## The Founder's Product Instinct

Several patterns emerge from the founder's articulation that should guide all dashboard decisions:

### Friction Elimination as Core Philosophy
Every design decision should reduce friction. If a family member has to learn something, navigate somewhere, or fill in something — it's wrong. The dashboard should work the same way: the coordinator should never feel like they're "using software." They're checking on their family.

### Respect for People
The founder's description of Aunt Degitu's care network, of Rob navigating his phone with his nose — these aren't "user stories." They're real people. Dashboard components should reflect this respect. A `<MemberProfile>` should feel like looking at a family photo album entry, not a CRM contact card.

### The "Executive Assistant" Model
CareSupport is described as an executive assistant that reports to the coordinator. The dashboard is where the coordinator reviews what the assistant has organized and gives direction. This is fundamentally different from a self-service SaaS dashboard — it's more like opening your assistant's briefing book.

### Pattern Recognition from Viktor and Poke
The founder studied both products deeply before building CareSupport:
- **From Viktor:** Persistent context (SKILL.md → family.md), proactive behavior (crons → heartbeat/reminders), tool-based actions
- **From Poke:** Messaging-native interface, personality, zero-friction onboarding, conversational context building

The dashboard should feel like the natural extension of these patterns into a visual surface.

---

## Next Steps (When We Return to This)

1. **Founder shares dashboard designs** — These become the visual foundation for component design
2. **Evaluate Tambo maturity** — Clone, self-host, build one component (WeekSchedule) as proof of concept
3. **Define the sync mechanism** — How iMessage context changes reach the dashboard
4. **Build MVP components** — WeekSchedule + CareJournal + one generative component
5. **Test with real scenarios** — Run the Thursday morning scenario end-to-end
6. **Mobile validation** — Test with Rob's use case (phone, nose navigation, accessibility)

---

## Document Provenance

This folder was created from a deep working session between the founder and Viktor (AI coworker) on 2026-02-19 through 2026-02-21. The conversation covered:

1. **Product vision articulation** (2026-02-19) — The founder described CareSupport's thesis, users, soul, architecture, and principles. Captured in VISION.md.
2. **Tambo discovery** (2026-02-21) — The founder shared the Tambo repo and asked for an uninfluenced creative vision of how it could power the dashboard.
3. **Dashboard vision** (2026-02-21) — Viktor produced the component vision, architecture, and scenario walkthroughs documented in this folder.

Every word traces back to the founder's articulation or documented technical analysis. Nothing was inferred beyond what the evidence supports.
