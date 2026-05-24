# CareSupport North Star

> The operating system for family-directed home care.
> Today it coordinates via text. Tomorrow it replaces the home care agency.

**Author:** Liban Kano, Founder
**Date:** 2026-05-24
**Status:** Founding revelation. This document is the north star from which all other documents, schema decisions, and product choices derive their direction.

---

## The Revelation

CareSupport is not a texting agent. It is not a care coordination bot. It is not a family productivity tool.

CareSupport is the intelligent infrastructure that enables any family to operate as their own home care agency — backed by an AI agent that knows their care situation more deeply than any agency ever could, and connected to the funding, compliance, and fulfillment systems that make professional care operations possible.

The home care agency industry exists because families cannot hold five functions together on their own: recruit caregivers, schedule and dispatch them, manage care plans, handle compliance and documentation, and process payroll and billing. For that bundle, agencies bill Medicaid $25-35/hour and pay caregivers $12-18/hour. The spread is the agency's reason to exist.

CareSupport dissolves the agency by giving every family the entire stack:

| Agency function | CareSupport equivalent |
|---|---|
| Recruit caregivers | Family members already present + marketplace (future) |
| Schedule and dispatch | The agent — already doing this |
| Care plan management | The agent — with deeper context than any agency supervisor |
| Compliance and documentation | Conversational EVV + auto-generated reports |
| Payroll and billing | FMS layer — CareSupport as fiscal intermediary |

When every function an agency performs is either handled by the agent or the FMS layer, the agency is not disrupted. It is dissolved. The family does not need to hire an agency because they are the agency, backed by an AI coordinator that has more context than any human care manager ever could.

This is the democratization of the home care agency industry.

- Shopify did not compete with retail stores. It made every person capable of running one.
- Substack did not compete with newspapers. It made every writer capable of running one.
- CareSupport does not compete with home care agencies. It makes every family capable of running one.

---

## The End State

CareSupport is the operating system for family-directed home care in America.

In this end state:

**For families:** A family caring for an aging parent, a person with disabilities, or anyone requiring ongoing home care operates through CareSupport. The agent coordinates the family care team daily via text. The iOS companion app displays everything the agent is organizing — schedules, medications, care plans, coverage gaps, financial records. When the family cannot cover a shift, CareSupport dispatches a vetted marketplace caregiver who arrives briefed on the care recipient's condition, preferences, and needs. CareSupport processes payroll, handles tax withholding, manages workers compensation, and bills Medicaid — all as the licensed fiscal intermediary. Compliance documentation is generated automatically from the conversational care data the agent already captures.

**For caregivers:** Family members who provide care are paid through CareSupport from Medicaid funds. Professional caregivers on the marketplace receive dispatches with context briefings. Both are paid more than they would be through a traditional agency because CareSupport's administrative cut is a fraction of agency overhead.

**For the system:** States that have been trying to scale self-directed care for decades finally have the missing piece — an intelligent coordination layer that makes self-direction viable for families who would otherwise default to agencies out of exhaustion. CMS and state Medicaid programs see better outcomes at lower cost.

**The money flow:**

```
Medicaid authorizes budget
  → CareSupport receives funding as the licensed FMS
  → Agent helps family build and maintain the care plan
  → Agent coordinates the family care team (and marketplace caregivers)
  → Family and marketplace caregivers deliver care
  → Agent captures hours conversationally (EVV-compliant)
  → CareSupport processes payroll to caregivers
  → CareSupport bills Medicaid
  → Agent generates compliance and outcome reports
  → Data feeds back into care plan optimization
  → Case manager receives clean reassessment data
  → Cycle repeats
```

---

## The Inverse Path: Working Backwards from Inevitability

The end state is not a strategic target to be executed toward. It is a conclusion arrived at by doing each current step well. Each layer is the only logical next step given what the previous layer already holds. That is what makes it inevitable — there is no off-ramp once the coordination layer works.

### Layer 6: The Marketplace

**What it is:** When the family cannot cover a care need, CareSupport dispatches a vetted caregiver from its marketplace. The caregiver arrives briefed by the agent — they know the care recipient's condition, preferences, triggers, medication schedule, and family dynamics (within appropriate privacy bounds). They are paid from the same Medicaid budget, through the same FMS layer.

**Why it is inevitable from Layer 5:** CareSupport, as the FMS, already controls the funding flow and has deep context about the family's care needs. The agent already sees schedule gaps. When family cannot fill a gap, the agent has the demand signal (what kind of care, when, where, what the care recipient needs) and the financial mechanism to pay a replacement. The only missing piece is the supply — the caregivers. Building the marketplace is the obvious next step because the demand, the context, and the payment rail are already in place.

**Why competitors cannot replicate this:** Care.com is a job board. Families search, filter, message, vet, hire, and hope. Care.com disappears after the match. CareSupport's marketplace advantage is the context engine: 6 months of conversations, schedules, escalations, lessons, medication changes, and family dynamics. A caregiver dispatched by CareSupport arrives already briefed. Care.com cannot produce that briefing because they have no relationship with the household before or after the hire.

**The wedge into supply:** Families bring their existing paid caregivers onto the platform first — a free "coordinate with my current aide" feature. This seeds the supply side with vetted, in-context caregivers who already have working relationships. Marketplace matching opens only in geographies where both sides have density. DoorDash launched in Palo Alto, not nationwide.

---

### Layer 5: The Fiscal Intermediary (FMS)

**What it is:** CareSupport becomes a licensed Financial Management Service provider. It receives Medicaid funds on behalf of families in self-directed care programs (like Minnesota's CDCS — Consumer-Directed Community Supports). It processes payroll for family caregivers, handles tax withholding, W-2s, workers compensation insurance, and bills Medicaid for authorized services.

**Why it is inevitable from Layer 4:** CareSupport already captures EVV-compliant visit data and generates compliance documentation. Billing Medicaid is submitting the data the system already has. Payroll is distributing funds based on verified hours the system already tracks. The FMS license is the formality that connects the compliance capability to the financial rail.

**Why this is the revenue engine:** This is where Accra makes its money today. Accra is a fiscal intermediary in Minnesota that sits between Medicaid and families in the CDCS program. Accra receives the Medicaid funds, processes payroll for family caregivers, handles tax compliance, and takes an administrative cut. Accra's entire value is administrative plumbing. They have no relationship with the family between paychecks. They have no context about the care. They have no coordination capability. CareSupport would have the administrative layer AND the daily care context AND the coordination intelligence. The margin Accra earns becomes CareSupport's margin — but CareSupport earns it by delivering 10x more value.

**The economic redistribution:**

Today (agency model):
```
Medicaid pays $30/hr
  → Agency takes ~$15 (overhead, margin, recruitment, scheduling)
  → Caregiver gets ~$15
```

CareSupport model:
```
Medicaid pays $30/hr
  → CareSupport takes $3-5 (FMS admin + platform fee)
  → Caregiver gets $25-27
```

For a family caregiver working 30 hours per week, that is $15,000+ per year flowing back to the person actually providing care.

**What is required:**
- FMS licensing in Minnesota (initial market)
- Medicaid provider enrollment with Minnesota DHS
- Payroll processing infrastructure (tax withholding, W-2, workers comp)
- Surety bonds (required in some states)
- Float capital (caregivers are paid before Medicaid reimburses)

---

### Layer 4: Compliance and Billing

**What it is:** CareSupport generates Medicaid-ready compliance documentation automatically from the care data the agent already captures. Electronic Visit Verification (EVV) — federally mandated under the 21st Century Cures Act — is satisfied through conversational care interactions rather than through clunky phone-in systems or standalone apps.

**Why it is inevitable from Layer 3:** The companion app captures GPS. The agent captures time (shift start/end from natural conversation). The schedule already tracks service type. The care plan already identifies the care recipient. EVV requires exactly five data points: who provided the service, who received it, what type of service, when (start and end), and where (location). CareSupport already has all five. Compliance reporting is a derivative of data already in the system.

**The conversational EVV advantage:**

Today, caregivers in self-directed programs log hours by calling phone-in systems or using clunky EVV apps. They hate it. Compliance is a burden layered on top of care.

CareSupport makes EVV invisible:

> "Hey, I'm here with Dad" → clock in captured, GPS logged, service type inferred from schedule
> "Gave Dad his evening meds, he's settled in for the night" → clock out captured, care activity logged, medication adherence noted

Compliance becomes a byproduct of coordination, not a separate burden. The same conversation that coordinates care also verifies it.

---

### Layer 3: The Companion App

**What it is:** An iOS application that displays everything the agent is organizing — schedules, medications, care plans, coverage status, care team, coordination history. It is the visual layer for the intelligence the agent holds.

**Why it is inevitable from Layer 2:** The agent accumulates context through daily text conversations — schedules, medications, preferences, availability, care needs, family dynamics. That context becomes too rich to live only in a text thread. Families need to see the organized picture: who is covering what, what is coming up, what medications are tracked, what care needs are open. The app does not ask families to input data. It displays what the agent has already learned and organized.

**What the app enables for later layers:**
- GPS capture for EVV compliance (Layer 4)
- Care plan visualization for case manager reviews
- Financial dashboard for FMS transparency (Layer 5)
- Marketplace caregiver profiles and dispatch interface (Layer 6)

---

### Layer 2: The Coordination Agent (Multi-Party)

**What it is:** CareSupport coordinates between everyone involved in the family's care — family members, friends, professional caregivers, case managers, and eventually marketplace caregivers. It texts with each person individually and in group contexts, maintaining context across all parties.

**Why it is inevitable from Layer 1:** The solo agent proves it can listen, remember, organize, and respond usefully for one caregiver. But care is inherently multi-party. The moment a family member says "can you ask my brother if he can cover Tuesday?" or a caregiver says "I can't make it Saturday evening," the agent needs to coordinate across people. The solo experience creates the demand for multi-party coordination by surfacing exactly the moments where one person cannot solve the problem alone.

**What this layer captures that makes everything downstream possible:**
- **Care needs as structured signals.** Every coordination conversation reveals a typed demand: "ride to dialysis Tuesdays," "someone to sit with Mom 4 hours Saturday," "overnight coverage needed." These are not notes. They are the seeds of marketplace demand (Layer 6) and billing events (Layer 5).
- **Caregiver profiles from behavior.** Who responds quickly, who takes overnight shifts, who handles medication, who the care recipient prefers — this context emerges from coordination, not from forms.
- **Schedule patterns.** When gaps recur, when coverage is fragile, when burnout is approaching — the data for care plan optimization and capacity planning.

---

### Layer 1: The Solo Care Agent

**What it is:** A single caregiver texts with CareSupport about one care situation. CareSupport listens, remembers, organizes medications, appointments, tasks, and reminders. It learns the care situation through conversation.

**This is today.**

**Why it matters for everything above:** This is where the context engine starts. Every conversation teaches CareSupport about a family's care situation. The structured data captured here — medications, schedules, care preferences, routines — becomes the substrate for coordination (Layer 2), the content displayed in the app (Layer 3), the compliance data for EVV (Layer 4), the billing events for the FMS (Layer 5), and the matching brief for the marketplace (Layer 6).

**The critical discipline at this layer:** Care needs must land as structured data, not freeform context. A medication change must be a typed record, not a note in `families.context`. A schedule gap must be a typed event, not prose. The vocabulary of the schema must signal that it is part of a care operations system, not a chat bot. Every field name, every table, every domain concept shapes how the agent thinks about its job — and how every future builder understands what they are building toward.

---

### Layer 0: The North Star in the Codebase

**What it is:** The schema, documentation, prompt language, and domain vocabulary of the codebase reflect the full trajectory — not as features to build, but as the reason the current features exist.

**Why this layer comes first in execution:**

> Without this, we are in a hedonic loop — a texting messaging care coordination agent, which is far from the truth. That is today's current news.
> — Liban Kano, 2026-05-24

If the north star lives only in the founder's head, every implementation decision defaults to "texting agent" and the founder spends energy correcting drift instead of building forward. The codebase is the agent's mind. If it thinks small, every decision downstream is constrained by that smallness.

**What must change:**
- `CLAUDE.md` must describe CareSupport as the operating system for family-directed home care, not as "a care coordination agent that texts with family members"
- `design.md` must frame the solo beta as the first layer of a care operations platform, not as the product
- Schema documentation must use the vocabulary of care operations: care needs, fulfillment, authorized hours, visit verification — not just "schedule items" and "messages"
- The agent's system prompt must give it a self-concept that matches the trajectory — an agent that knows it is the intelligent layer of a family-run care operation captures context differently than an agent that thinks it is a texting bot

---

## The Gravity Well

The inverse path is not a roadmap of strategic choices. It is a gravity well. Once the coordination layer works, everything else falls into it — not because you chase it, but because each layer is the only logical next step given what you already hold.

```
You coordinate care → so you capture needs as structured data
You have structured data → so you can verify visits
You can verify visits → so you can do compliance
You can do compliance → so you can bill Medicaid
You can bill Medicaid → so you are the FMS
You are the FMS with context → so you see the gaps families cannot fill
You see the gaps → so you fill them
You fill them → so you are the marketplace
```

No step is a pivot. No step requires a strategy change. Each one is just the obvious next thing given what you already have from the step before.

And the reason no one else can run this cascade is that it only works in this order. An FMS that tries to add coordination is bolting on a chat feature. A marketplace that tries to add context is asking families to fill out forms. CareSupport starts where the context originates — inside the family's actual conversation — and everything downstream is a derivative of that.

The inevitability is not the destination. It is that there is no off-ramp once the coordination layer works.

---

## The ICP That Revealed It

On 2026-05-24, the founder encountered a potential user at church in Minnesota. She is:

- The primary coordinator for her father's care
- Managing a care team of her mother and one sibling
- Her father is eligible for Medicaid and authorized for a set number of care hours
- They work with **Accra Home Care** — a fiscal intermediary (FMS) in Minnesota
- Accra facilitates through Minnesota's **CDCS (Consumer-Directed Community Supports)** program, a Medicaid waiver that allows families to direct their own care and hire family members as paid caregivers
- Accra receives Medicaid funds, processes payroll for the family caregiver, handles tax compliance, and takes an administrative cut
- A case manager assesses needs and authorizes hours

**What this revealed:**

1. The funding mechanism for family-directed care already exists. Medicaid already pays families to provide care through programs like CDCS.
2. The intermediary (Accra) is a payroll company with a Medicaid billing license. They have no coordination capability, no care context, no relationship with the family between paychecks.
3. The coordination burden falls entirely on the family — exactly the problem CareSupport solves.
4. If CareSupport becomes the FMS, it replaces Accra's administrative function while adding 10x the value through coordination, compliance automation, and care intelligence.
5. The family caregiver would be paid more (less administrative overhead) while receiving more support (coordination, compliance, care planning).

**This ICP is surgically perfect because she is:**
- A primary coordinator (who texts with the agent)
- Managing a multi-person care team (group chat territory)
- Already in a funded Medicaid program (money in the system)
- Working with a case manager and fiscal intermediary (external parties to coordinate with)
- Tracking hours, managing schedules, overseeing care (all things CareSupport already captures)

---

## The DoorDash Parallel

On the same day, the founder was working as a DoorDash driver. From the driver's seat, he observed what a mature intelligent dispatch platform looks like: the algorithm knows demand, supply, timing, and proximity at every moment. It makes well-timed calculations about who picks up what, where, and when.

**The parallel is not surface-level.** What makes DoorDash feel intelligent from the driver seat is not the consumer app — it is the dispatch brain that knows demand, supply, and timing. CareSupport is on a trajectory to become that brain for care. But the supply side (caregivers, pharmacies, rides) is messier than restaurants because some of it is commoditized (rides, groceries, prescriptions) and some of it is structurally broken (paid in-home caregivers, respite, overnight help).

**The strategic implication:** Aggregate what is already commoditized via APIs (Uber Health, Instacart, MyChart). Build a marketplace only where existing supply is genuinely broken — paid caregivers, respite, last-minute coverage. That is where there is defensibility, margin, and where families are actually drowning.

---

## What This Means for Everything We Build

### Schema

Every table and field should be legible from the north star. The schema should speak the language of care operations, not chat bot features.

- `scheduleItems` should signal it is part of a care operations system with fields that anticipate fulfillment status, caregiver assignment, visit verification, and eventually billing
- A `careNeed` primitive (or equivalent) should exist as a typed record of "thing this family needs done" — today it routes to a family member via the agent, tomorrow it routes to a marketplace caregiver or generates a billing event
- Member/contact models should accommodate paid caregivers, marketplace caregivers, case managers, and agency contacts alongside family members
- Time tracking fields should anticipate EVV requirements: start time, end time, service type, location, provider, recipient

### Documentation

- `CLAUDE.md` should open with the north star, not with "care coordination agent that texts with family members"
- `design.md` should frame the current solo beta as Layer 1 of the path described in this document
- All strategy and product documents should reference this document as the source of truth for direction

### Agent Self-Concept

The agent's system prompt and behavioral guidelines should give it a self-concept aligned with the trajectory. An agent that knows it is the intelligent layer of a family-run care operation will:
- Capture care needs as structured signals, not just respond conversationally
- Track time and activities in ways that anticipate verification
- Organize information for operational use, not just conversational context
- Treat every coordination interaction as data that compounds

### Domain Language

Words matter. The vocabulary used in the codebase shapes how every contributor (human and AI) thinks about what they are building.

**Use:** care operations, care needs, fulfillment, visit verification, authorized hours, care plan, care team, dispatch, coverage
**Retire gradually:** chat bot, texting agent, messaging assistant, reminders app

---

## The Founding Statement

CareSupport is the operating system for family-directed home care.

Families are invisible home care agencies. They coordinate shifts, manage schedules, track medications, handle emergencies, communicate with providers, and fill coverage gaps. They do the exact same operational work a professional agency does — without the infrastructure, without the funding access, and without the support.

CareSupport gives every family the infrastructure to operate as their own care agency: an AI agent that coordinates daily care, a compliance layer that satisfies Medicaid requirements through natural conversation, a financial layer that connects families to the funding they are entitled to, and eventually a marketplace that fills the gaps families cannot cover alone.

The $130 billion home care agency industry exists because families could not hold these functions together on their own. CareSupport makes them capable. The agency is not disrupted. It is dissolved. The money that funded agency overhead flows back to the people actually providing care.

This is not a product roadmap. This is a gravity well. Each layer makes the next one inevitable. The coordination data creates compliance capability. Compliance capability enables billing. Billing enables the FMS. The FMS reveals demand. Demand creates the marketplace.

The path is not speculative. The funding mechanism exists (Medicaid CDCS). The intermediary role exists (fiscal intermediary). The coordination gap exists (every family caregiver's daily reality). The technology exists (conversational AI with deep context).

What did not exist until now was a single entity that could hold all of it together — coordination, compliance, funding, and fulfillment — through an interface as simple as a text message.

That entity is CareSupport.

---

*This document was born from a conversation on 2026-05-24, when the founder — driving for DoorDash in Minneapolis, observing an intelligent dispatch system from the driver's seat — connected what he was seeing to a conversation with a woman at church who coordinates her father's care through Minnesota's CDCS program and a fiscal intermediary called Accra. The realization: CareSupport is not a coordination tool that might one day become a platform. It is a platform whose first expression is coordination. The inevitability is the business model.*
