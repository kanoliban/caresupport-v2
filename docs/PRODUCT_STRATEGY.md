# CLAUDE.md - CareSupport 2.0 — Complete Strategic & Architectural Understanding Project Guidelines

## Build/Lint/Test Commands
- Build: `npm run build` (tsc -b && vite build)
- Development: `npm run dev` (vite)
- Lint: `npm run lint` (eslint .)
- Preview: `npm run preview` (vite preview)
- Test single component: Use Vitest with `npm test -- <TestFileName>`


*Version: Aug 25, 2025 — Working Master Artifact*

---

## 0) One‑Page Executive Summary — Network‑by‑Network Focus

**Core Thesis.** CareSupport is **network‑specific infrastructure** that equips each **care network** to manage its care team effectively—**built for the whole network, with a **Coordination Lead** role (can be held by any member)**. Instead of universal protocols for everyone at once, we deliver specialized coordination tools tuned to **family networks**, **independent caregiver networks**, **agency networks**, and **platform networks**.

**The Insight.** Care coordination fails not from lack of compassion, but from lack of **coordination context**. Existing systems capture *state* (who's assigned to what shift) but not *reasoning* (why Sarah was assigned instead of James, what alternatives were considered, what exceptions were made). CareSupport builds the **Care Context Graph**—a living record of coordination decisions that captures not just what happened, but *why it was allowed to happen*. This is how the system gets smarter over time.

**Network‑by‑Network Product System.**

* **Family Networks** — *Family Platform* with professional integration.
* **Independent Caregiver Networks** — *CareGiver OS* for multi‑family coordination.
* **Agency Networks** — *Agency Platform* with family connectivity.
* **Platform Networks** — *Post‑match coordination* via APIs and tools.

**Differentiator (plain language).** *We don’t compete with existing players—we **equip each care network** with the infrastructure and tools needed to coordinate their specific network (built for the whole team, with a **Coordination Lead** role (can be held by any member)).*

Every member benefits: families get clarity, caregivers get clear shifts and handoffs, agencies gain shared context.

**North Star Outcome.** **Network Health Score** (per network): fewer gaps, better handoffs, faster time‑to‑fill, and reduced **coordinator** burden.

**Flagship product & brand.** ***CareGiver OS*** (capital “G”) elevates independent professionals to a **professional identity** with tools to manage **multi‑family networks**.

---

## 1) Network Types & People (Human‑Centered)

We focus on distinct care networks—how coordination is arranged and who benefits. The **Coordination Lead is a role**, not a fixed person; it can be held by the care recipient, a family member, a professional, or shared/rotating.

| Network Type                       | Who Coordinates + Who Benefits (human language)                                                                       | Primary Coordination Need                           | Infrastructure                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| **Family Networks**                | Coordinated by Rob (care recipient) with Marta as backup; benefits the full family care team (15 caregivers + family) | Unified view of all caregivers regardless of source | **Family Platform** (pro‑integrated)    |
| **Independent Caregiver Networks** | Coordinated by Sarah (independent caregiver); benefits all families she serves (multi‑family practice)                | Manage multiple families professionally             | **CareGiver OS**                        |
| **Agency Networks**                | Coordinated by agency coordinator; benefits workforce + Linked Circle families                                        | Enterprise ops with seamless family connectivity    | **Agency Platform**                     |
| **Platform Networks**              | Coordinated by platform ops; benefits matched families + caregivers post‑match                                        | Post‑match coordination and retention               | **Platform Integration (APIs + tools)** |

**Typescript model**

````typescript
const networkTypes = {
  familyNetworks: {
    whoCoordinates: 'Care recipient or family member (e.g., Rob; Marta as backup)',
    benefits: 'Entire family care team (15 caregivers + family)',
    coordination: 'Unified view of all caregivers regardless of source',
    infrastructure: 'Family Platform (pro-integrated)'
  },
  independentCaregiverNetworks: {
    whoCoordinates: 'Independent caregiver (e.g., Sarah)',
    benefits: 'All families they serve (multi-family practice)',
    coordination: 'Professional tools for managing multiple families',
    infrastructure: 'CareGiver OS'
  },
  agencyNetworks: {
    whoCoordinates: 'Agency coordination lead/manager',
    benefits: 'Agency workforce + Linked Circle families',
    coordination: 'Enterprise ops with family connectivity',
    infrastructure: 'Agency Platform'
  },
  platformNetworks: {
    whoCoordinates: 'Platform operations or shared leads',
    benefits: 'Matched families + caregivers post-match',
    coordination: 'Post-match coordination infrastructure',
    infrastructure: 'Platform Integration (APIs + tools)'
  }
};
```typescript
const circleModel = {
  circle: {
    definition: 'Care Network as graph container with a **Coordination Lead** role (can be held by any member)',
    ownership: 'coordinator owns and controls the circle',
    transfer: 'Circles can be linked or transferred between networks'
  },
  policyPack: {
    definition: 'Network-specific coordination rules and protocols',
    templates: ['Family.Basic','Family.Pro-Integrated','Pro.Multi-Family','Agency.Family-Linked','Platform.Post-Match']
  },
  networkHealthScore: {
    definition: 'Single score per network to prove coordination value',
    metrics: 'Coverage %, gap minutes, time-to-fill, adherence, handoffs'
  }
};
````

## 2) Roles & Permissions Model — Human Labels with a Flexible Coordination Lead Role

**Purpose.** Align product language and permissions to real‑world roles while keeping **coordinator** as a *role* any member can hold (or share), including the care recipient.

### 2.1 Human‑Facing Role Labels (onboarding copy)

* **Care Recipient** — *I’m receiving care and support.*
* **Family Caregiver** — *I care for a family member or loved one.*
* **Professional Caregiver** — *I provide professional care services.*
* **Community Supporter** — *I’m a friend, neighbor, or volunteer helper.*
* **Coordination Lead** *(role toggle)* — *I coordinate this care network (can be shared).*
  **Select all that apply.** Then ask: **“Do you also coordinate this care?”** (assigns Coordination Lead). If no one selects it, suggest a lead or allow shared leads.

### 2.2 Role Stacking & Flexibility (examples)

* **Rob** = *Care Recipient + Coordination Lead* (voice‑first + accessibility features)
* **Marta** = *Family Caregiver + Backup Coordination Lead* (can step in; receives escalations)
* **Sarah** = *Professional Caregiver* (multi‑family via **CareGiver OS**)
* **Agency Coordination Lead** = *Agency staff* linked via **Linked Circle** with scoped write permissions
* **Community Supporters** = limited, non‑PHI tasks with perimeter sharing

### 2.3 Default Permissions Matrix (overridable by Policy Pack) (overridable by Policy Pack)

| Role                           | View Timeline | View Schedule | Create/Claim Tasks | Care Notes (view/add)  | Accept/Log Sessions | Manage Members | Edit Policy Pack |
| ------------------------------ | ------------- | ------------- | ------------------ | ---------------------- | ------------------- | -------------- | ---------------- |
| **Care Recipient**             | ✅             | ✅             | ✅                  | ➖ / ➖ (scoped)         | ➖                   | ➖              | ➖                |
| **Family Caregiver**           | ✅             | ✅             | ✅                  | ➖ / ➖ (scoped)         | ➖                   | ➖              | ➖                |
| **Professional Caregiver**     | ✅             | ✅             | ✅                  | ➖ / ➖ (scoped by role) | ✅ (own)             | ❌              | ❌                |
| **Community Supporter**        | ✅ (limited)   | ➖ (free/busy) | ✅ (light tasks)    | ❌ / ❌                  | ❌                   | ❌              | ❌                |
| **Coordination Lead** *(role)* | ✅             | ✅             | ✅                  | ✅ / ✅ (per policy)     | ➖                   | ✅              | ✅                |
| **Agency Coordinator**         | ✅             | ✅             | ✅ (per link)       | ➖ / ➖ (per policy)     | ✅ (agency shifts)   | ➖ (linked)     | ➖ (linked)       |

Legend: ✅ = allowed • ➖ = scoped/limited • ❌ = not allowed by default.

### 2.4 Policy Pack Defaults (per network)

* **Family.Basic** — recipient + family caregivers; supporters perimeter; optional Coordination Lead.
* **Family.Pro‑Integrated** — adds professional caregivers; Coordination Lead + backup; handoff required.
* **Pro.Multi‑Family** — pro as Coordination Lead across families (CareGiver OS); strict PHI scopes.
* **Agency.Family‑Linked** — agency Coordination Lead + Linked Circle; minimal adapter; audit trail.
* **Platform.Post‑Match** — shared timeline initialized at match; retention metrics enabled.

### 2.5 Coordination Lead Mechanics (product behaviors)

* Set **Coordination Lead** when creating a Circle; add **Backup Coordination Lead** and enable **Rotation** (optional weekly).
* **Escalations:** unresolved gap > X hours → notify Coordination Lead(s); cascade to Backup; log to timeline.
* **Explainability:** for any proposal/assignment, show *why* and *who else* can act.

### 2.6 Copy Blocks (ready to ship)

* **Choose your role**
  *Care Recipient — I’m receiving care and support*
  *Family Caregiver — I’m caring for a family member or loved one*
  *Professional Caregiver — I provide professional care services*
  *Community Supporter — I’m a friend, neighbor, or volunteer helper*
  *Coordination Lead (role) — I coordinate this care network (can be shared).*

---

## 4) Differentiation — Care Network Empowerment (Built for the Whole Team)

**From universal infrastructure → to network‑specific infrastructure.** We win by **empowering each care network (built for the whole team, with a **Coordination Lead** role (can be held by any member))** in each network with specialized coordination tools and measurable **Network Health Score** gains.

**Answer on one line.** *"We equip each **care network** with the infrastructure to manage their care team effectively."*

**The Context Graph Advantage.** CareSupport sits in the **orchestration path** for care coordination. Every gap detection, candidate evaluation, assignment, acceptance, and handoff flows through the system. This means we capture **decision traces** as they happen—not reconstructed from logs after the fact. Over time, these traces accumulate into a **Care Context Graph** that enables:
- **Explainability:** "Why was Sarah assigned?" has a real, queryable answer
- **Precedent search:** "How did we handle similar gaps before?"
- **Simulation:** "What happens to coverage if Sarah takes vacation?"
- **Compounding intelligence:** The system learns patterns and gets smarter with use

**Why incumbents can't replicate this:**
- **Agency systems** store shift state, not coordination reasoning—that happens in the coordinator's head or on phone calls
- **Family apps** store tasks and calendars, not why tasks were assigned to whom
- **Marketplaces** store matches, not post-match coordination context

To capture decision traces, incumbents would need to rebuild their architecture from the ground up and insert themselves into coordination workflows they currently don't touch. This is a multi-year structural disadvantage.

**Moats**

* **Context graph moat:** Decision traces captured in orchestration path; learning that compounds over time.
* NHS‑driven ROI visible to coordinators.
* Policy Packs tuned to each network (hard to copy at depth).
* Professional identity & retention via *CareGiver OS*.
* Trust via consent scopes and auditability per network.

---

## 5) Messaging, Narrative, and Brand

**Master message:** *Care begins with Support.*

**Differentiator (updated):** *We don’t compete with existing players—we **equip families, caregivers, agencies, and platforms** with the coordination tools they need to make care work better.*

**Short answers**

* **10‑sec:** *Network‑specific coordination tools for families, independent pros, agencies, and platforms.*
* **30‑sec:** *Most tools optimize one slice. We deliver tuned infrastructure per network—Family Platform, CareGiver OS, Agency Platform, Platform APIs—so **whoever coordinates** sees measurable gains.*
* **90‑sec:** recap network types, Circle + Policy Pack model, NHS with human examples (Rob, Marta, Sarah).

---

## 6) Implementation Strategy — Network‑by‑Network Expansion

**Land & Expand Sequence:** **Land with Family → pull in Pro via invites → bring in Agency with shared‑timeline proof.** Seed each step with **clear wins**.

### Phase 1 — Land with Family (Rob’s Network)

**Goal:** Prove coordination value inside a single **Family Circle**.

* **Setup:** Create Circle → set coverage window → import calendars → invite close supporters.
* **Quick Wins (≤7 days):**

  * Baseline **Network Health Score (NHS)** auto‑generated.
  * First **gap alert** detected and resolved.
  * **Handoff summary** captured at least once.
  * **Coverage %** +10pp vs. baseline OR **gap minutes/week** −20%.
* **Features to emphasize:** Today/Timeline, Tasks, Schedule conflicts, Availability rules, Handoffs.
* **Trigger to Phase 2:** Uncovered hours >15% OR recurring tasks require pro skills → **Invite a Pro** nudge.

### Phase 2 — Pull in Pro via Invites (CareGiver OS)

**Goal:** Enable a professional to coordinate **multi‑family work** while plugging into the family’s Circle.

* **Flow:** Family → Invite Pro (SMS/email) → Pro joins **CareGiver OS** → sets availability → receives assignments → logs sessions → sends visit summaries.
* **Quick Wins (≤7 days):**

  * First **session logged & summarized**; family sees it in Timeline.
  * **Time‑to‑fill** for next gap < 24h.
  * **Adherence** improvement for at least one med/appointment.
  * Pro issues first **invoice/payout**.
* **Incentives:** 14‑day Pro trial; referral credit; “Verified Pro Profile”.
* **Trigger to Phase 3:** Pro/Family references an agency OR backup staffing need emerges → **Share Timeline with Agency** prompt.

### Phase 3 — Bring in Agency via Shared‑Timeline Proof

**Goal:** Demonstrate value to the agency **without heavy integration**.

* **Flow:** Invite agency coordinator → **Linked Circle** view (read/write per policy) → minimal adapter (CSV/ICS/API lite) → shifts appear in family view; incidents route back.
* **Quick Wins (≤14 days):**

  * **Coordinator calls/emails** reduced for that family.
  * **Coverage %** up; **support tickets** down.
  * Agency sees **NHS lift** and **handoff quality** metrics.
* **Next:** Offer deeper adapters (HR/payroll/EVV) based on demonstrated ROI.

**KPI Ladder (by stage):**

* P1 Family: NHS Δ, Gap minutes ↓, Time‑to‑first‑resolution, # helpers activated.
* P2 Pro: Time‑to‑first‑session, % visits with handoffs, Pro 30‑day retention, Invoice cycle time.
* P3 Agency: Linked clients count, Support contacts ↓, Coverage % ↑, NPS lift.

---

## 7) Success Metrics & North Star

**North Star:** **Network Health Score (NHS)** per network.

**Inputs:** Coverage %, gap minutes/week, median time‑to‑fill, adherence (meds, appts), handoff quality, **coordination time saved**.
**Product KPIs:** NHS delta over baseline; network NPS (coordination lead view); CareGiver OS retention; partner retention (platform/agency).

---

## 8) Representative Journeys (snapshots)

**A) Family‑only → add community → add independent pro**
Start in Family Hub → identify gaps → publish needs → independent pro joins via CareGiver OS → billing & documentation unified.

**B) Marketplace match → CareSupport handoff**
Care.com match → *Powered by CareSupport* → family+pro onboard into a shared timeline; higher stickiness, fewer post‑match failures.

**C) Agency intake → shared timeline with family**
Agency schedules shifts in their system → synchronized to Family Hub; incidents and notes share per policy; escalations route properly.

---

## 9) Product Requirements (selected)

**9.1 Family Platform**

* Task engine (recurrence, ownership, escalation)
* Calendar & conflict detection
* Notes (voice‑first), docs, search
* Roles/permissions, scoped links

**9.2 CareGiver OS**

* Multi‑client schedule; session logs
* Care checklists (templates + custom)
* Business line & boundaries
* Invoicing, payouts, tax reports
* Compliance prompts & signatures
* Reputation/profile vault

**9.3 Agency Platform**

* Workforce scheduling, credentialing
* Shared timeline sync & policy controls
* Incident routing, QA, analytics
* Integration adapters (HR/payroll/EVV/EMR)

**9.4 Platform & Compliance**

* Policy graph; consent receipts
* Immutable audit log
* Data export & right‑to‑be‑forgotten
* SSO/OIDC for enterprise

---

## 10) Risks & Mitigations

| Risk                                         | Why it matters                          | Mitigation                                                                      |
| -------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| Cold start in multi‑sided network            | Need families *and* pros *and* partners | Stage GTM; seed Family Hubs; recruit pros via value props; pilot partners       |
| Integration friction (agencies/marketplaces) | Partners are busy, legacy stacks        | Provide adapters, playbooks, commercial incentives (retention/NPS lift)         |
| Compliance variability by state              | Product behavior must adapt             | Policy graph + jurisdiction packs; local counsel & templates                    |
| Perception as competitor                     | Partners may fear overlap               | Strict neutral posture; published interoperability charter; white‑label options |
| Data trust & privacy                         | Must be trusted by families and pros    | Transparent controls, consent receipts, minimal data exposure by default        |

---

## 11) Strategic FAQ (truth‑based)

**Q: How are you different?**
A: *We equip each care network with network‑specific infrastructure (Circle + Policy Pack) and prove value via a **Network Health Score**. We expand **Land → Pro → Agency** with clear wins at each step.*

**Q: Are you a marketplace?**
A: No. We’re the **coordination layer** used **after** the match and **during** the relationship. Families, independent pros, agencies, and platforms each get tools tuned to their network.

**Q: Why *CareGiver OS*?**
A: It elevates independent caregivers into technology‑enabled professionals who can **run multi‑family practices**, while linking cleanly into family circles and agency views.

**Q: What’s the business model?**
A: B2C (Family), B2Pro (*CareGiver OS*), B2B (Agency), plus Platform APIs. All mapped to demonstrated NHS improvements.

**Q: Why will networks (and whoever coordinates) adopt this?**
A: Measurable NHS lift (fewer gaps, faster fills, better handoffs), reduced coordination burden, and simple adapters (CSV/ICS/API‑lite) with a path to deeper integrations.

---

## 12) Roadmap Sketch (next 90 days) — Rob Lighthouse Pilot

**Goal:** Prove NHS lift in a real **Family Network (Rob + Marta)**, then expand **Pro → Agency** with clear wins.

**0–30 days — Lighthouse: Family**

* Create **Family Circle**; set Policy Pack `Family.Pro‑Integrated`.
* Baseline metrics captured; NHS v0 displayed to coordinator.
* Quick wins: first **gap alert resolved**, first **handoff summary**, Coverage +10pp **or** Gap minutes −20%.
* Artifacts: before/after screenshots, mini case study.

**31–60 days — Pull in Pro (CareGiver OS)**

* Invite **Sarah** (independent caregiver); activate availability, session logs, payouts.
* Quick wins: first session + summary visible to family; **time‑to‑fill < 24h**; adherence lift on one med/appointment.
* Monetization: start **CareGiver OS** paid beta; gather NPS.

**61–90 days — Link an Agency**

* Invite coordinator; enable **Linked Circle** with Policy Pack `Agency.Family‑Linked`.
* Minimal adapter (CSV/ICS/API‑lite) to mirror shifts; incidents route back.
* Quick wins: support contacts ↓, Coverage % ↑, **NHS +10** vs. baseline; produce partner one‑pager.

**Exit criteria (90d):**

* Family NHS ≥ **+10** over baseline and sustained 2+ weeks.
* Pro retention 30‑day ≥ **70%**; ≥ **80%** sessions with handoffs.
* Agency pilot demonstrates measurable reductions in calls/tickets.

---

## 13) Appendices

**A. The “Capital G” Rationale (brand architecture)**

* Signals professional identity; supports subscription as business expense; fosters community and pride.

**B. “Answer Bank” — ready‑to‑use lines**

* *One‑liner:* **We equip each care network with network‑specific infrastructure.**
* *Why now:* care demand is rising while coordination remains fragmented; infrastructure beats yet‑another‑app.
* *Partner pitch:* *“Keep your core. Add our coordination. Retain more families.”*

**C. Quick Compare (cooperate, not compete)**

* Family apps → **Cooperate:** import/export timeline; invite flows.
* Marketplaces → **Cooperate:** post‑match handoff; retention KPIs.
* Agencies → **Cooperate:** shared timeline sync; policy controls; adapters.

---

> **Bottom line:** CareSupport’s superpower is simple to say and hard to replicate: **equip each care network** so the family at the center finally experiences care that feels coordinated, reliable, and human.

---

## 14) Removing Care Coordination Bottlenecks — Manifesto → CareSupport Translation

**Core thesis.** The bottleneck in care isn't compassion—it's **coordination context**. We remove it by running a continual loop that keeps plans covered without constant human shepherding: **Detect → Propose → Act → Verify → Learn**.

### 14.0 The Care Context Graph (Why This Architecture)

Care coordination has a **Two Clocks Problem**:

| Clock | What it captures | Examples | Infrastructure built |
|-------|------------------|----------|---------------------|
| **State clock** | What's true right now | "Sarah assigned to 2pm shift" / "Medication due at 3pm" | Trillion-dollar industry (CRMs, scheduling systems, task apps) |
| **Event clock** | What happened, why, with what reasoning | "Gap detected because James called sick; Sarah chosen over Linda (Sunday rule) and Maria (lacks med cert); Policy v1.2 applied; accepted in 7 min" | Almost nothing |

Existing care systems—agency software, family apps, marketplaces—capture **state**. The **reasoning** that connects observations to actions lives in:
- Group texts and phone calls
- The coordinator's mental model ("Sarah's reliable for afternoons")
- Institutional knowledge that walks out when someone burns out

This is the **fragmentation tax**: the cost of manually stitching together context that was never captured as data in the first place.

**CareSupport builds the Care Context Graph:** a living record of coordination decisions that captures not just *what* happened, but *why it was allowed to happen*.

**What a decision trace captures:**

```yaml
decision_trace:
  trigger: gap_detected
  context:
    gap_window: "14:00-18:00"
    required_capabilities: [mobility_assist, med_admin]
    urgency: medium (6h notice)
  candidates_evaluated:
    - sarah: {available: true, fairness: 0.82, proximity: 12min, composite: 0.89}
    - james: {available: false}  # triggered the gap
    - linda: {available: false}  # Sunday rule
    - maria: {available: true, capabilities_match: false}  # lacks med_admin
  policy_applied: Family.Pro-Integrated v1.2
  proposal: assign_sarah
  reasoning: "Highest composite score among qualified, available candidates"
  exceptions: none
  outcome: accepted (7 min)
  verification: shift_completed, handoff_logged
  learnings: sarah.reliability += 0.01; pattern_confirmed
```

This is fundamentally different from "Sarah assigned to 2pm shift."

**Why this matters:**

1. **Explainability** — Coordinator asks "Why Sarah?" → system shows candidates, scores, reasoning → trust increases, override rate decreases
2. **Precedent search** — "How do we usually handle overnight gaps?" / "Who accepts short-notice requests?" → queries against accumulated traces
3. **Simulation** — "What if Sarah takes vacation Dec 15-22?" → replay historical gaps with Sarah unavailable → proactive capacity planning
4. **Compounding intelligence** — New coordinators inherit accumulated context, not just current state; the system gets smarter with every decision

**The structural advantage:**

CareSupport sits in the **orchestration path**. Every gap detection, candidate evaluation, assignment, and handoff flows through the system. This means:
- Decision traces captured **as they happen** (not reconstructed from logs)
- Full context available (inputs gathered, policy applied, alternatives considered)
- Outcome linkage (trace connects proposal to verification—did it work?)

Incumbents are in the **read path** (querying state after decisions are made). CareSupport is in the **write path** (as decisions happen). To capture decision traces, incumbents would need to rebuild their entire architecture. This is a multi-year structural moat.

---

### 14.1 The Care Graph (source of truth)

The Care Graph implements both clocks:

**State clock (current truth):**
* **Entities:** people (roles), places, routines, tasks, meds, appointments, shifts, constraints.
* **Relations:** who‑depends‑on‑what, coverage windows, preferences, capability tags.
* **Current state:** availability & exceptions; permission scopes; active assignments.

**Event clock (accumulated reasoning):**
* **Timeline:** append‑only log of signed events with full context
* **Decision traces:** structured records of coordination decisions (see 14.0)
* **Precedent index:** searchable history of how similar situations were handled
* **Pattern corpus:** learned regularities (who takes evenings, who avoids Sundays, typical time-to-fill by gap type)

**Key insight:** The schema isn't fully predefined—it **emerges from use**. As agents traverse the Care Graph to complete tasks, their trajectories reveal which entities and relations actually matter for THIS network. Co-occurrence in decision traces reveals structure: "these caregivers play similar roles" or "these events predict coverage gaps."

### 14.2 The Coverage Loop (closed‑loop control)

Each step of the loop generates decision trace data:

| Step | What happens | What gets captured (decision trace) |
|------|--------------|-------------------------------------|
| **Detect** | Uncovered windows, conflicts, at‑risk meds/appointments, missing handoff notes | Trigger type, source event, context gathered, urgency assessment |
| **Propose** | Fill candidates ranked by rules (availability, proximity, history, fairness) | All candidates evaluated, scores, ranking reasoning, policy version applied, why top candidate was chosen |
| **Act** | One‑tap assign/split/shift; notify right roles; write to ledger | Who was notified, acceptance/decline, time-to-response, any exceptions granted and by whom |
| **Verify** | Acceptances; completion signals; incident capture | Shift completed (yes/no), quality signals (on-time, handoff logged, incidents), outcome linkage to proposal |
| **Learn** | Next proposals reflect patterns | Reliability score updates, pattern confirmations, precedent creation for future queries |

**The feedback loop:** Captured decision traces become searchable precedent. Every automated decision adds another trace to the graph. Over time, similar cases can reference how prior cases were resolved—turning exceptions into precedent instead of re-learning the same edge case in Slack every quarter.

### 14.3 Specialized Assistants (Informed Walkers)

These agents are **informed walkers**—they traverse the Care Graph to complete tasks, and their trajectories BUILD the context graph as exhaust of useful work.

| Assistant              | Watches                         | Proposes                           | Safeguards                            |
| ---------------------- | ------------------------------- | ---------------------------------- | ------------------------------------- |
| **Coverage Agent**     | Schedule health, gaps/conflicts | Assign/split/shift, re‑balance     | Quiet hours, escalation rules         |
| **Medication Agent**   | Due meds vs. coverage           | Assign med owner, adherence nudges | Consent scopes, explainability        |
| **Appointment Agent**  | Appointments + transport        | Escort + driver pairing, buffers   | Calendar collisions, travel time      |
| **Handoff Agent**      | Shift boundaries                | Auto summaries, next‑up primers    | PHI scope by role, audit trail        |
| **Availability Agent** | Patterns & stated rules         | Prevent invalid assignments        | Hard constraints first, fairness next |
| **Community Agent**    | Light, non‑PHI tasks            | Slot sign‑ups for helpers          | Perimeter scopes; no sensitive data   |

**How agents build the context graph:**

When an agent investigates an issue or completes a task, it traverses organizational state space—checking availability, evaluating capabilities, reading history, applying policies. This trajectory IS a walk through the Care Graph.

- **Problem-directed coverage:** Unlike random walks, agent trajectories are biased toward parts of the graph that matter for real problems. Entities appearing repeatedly in decision traces are entities that matter.
- **Structural discovery:** Co-occurrence statistics from trajectories reveal relationships. If Sarah and James are frequently evaluated together for afternoon gaps, they're structurally similar even if never directly connected.
- **Schema emergence:** The ontology of care for THIS network emerges from accumulated agent trajectories, not from predefined schemas.

**Economic elegance:** Agents aren't building the context graph as a separate task—they're solving problems worth solving. The context graph is the exhaust. Better context makes agents more capable; capable agents generate more trajectories; trajectories build context. Flywheel.

### 14.4 Policy DSL (human sets policies; system runs the play)

```yaml
policies:
  coverage.always_on: "07:00-22:00"
  meds.require_caregiver: true
  availability.rules:
    - user: linda
      no_days: [Sun]
    - user: james
      preferred: "07:00-12:00"
  escalate:
    when: "task.type == 'med' and due_in <= 4h and unassigned"
    to: [Organizer, NearestCareGiver]
  privacy.community_scope: ["tasks.light", "schedule.freebusy"]
```

### 14.5 Precedent Search & Simulation (Context Graph Capabilities)

As the Care Context Graph accumulates decision traces, new capabilities emerge:

**Precedent Search (queryable history)**

| Query type | Example | What it returns |
|------------|---------|-----------------|
| Similar situations | "How did we handle overnight gaps before?" | Past decision traces for overnight gaps: who was considered, who was assigned, what worked |
| Pattern recognition | "Who usually accepts short-notice requests?" | Caregivers ranked by historical acceptance rate for <4h notice |
| Exception history | "When have we overridden the fairness constraint?" | All traces where fairness was deprioritized, with reasoning and outcomes |
| Outcome analysis | "What's our typical time-to-fill by gap type?" | Aggregate metrics derived from decision traces |

**Simulation (counterfactual reasoning)**

The Care Context Graph becomes a **world model** for organizational physics of care—encoding how decisions unfold, how state changes propagate, how the network actually works.

| Simulation type | Example | How it works |
|-----------------|---------|--------------|
| Capacity planning | "What if Sarah takes vacation Dec 15-22?" | Replay historical gaps, substitute Sarah unavailable, show predicted coverage impact |
| Staffing changes | "What's the blast radius if James quits?" | Analyze which gaps James typically fills, simulate redistribution |
| Policy changes | "What if we tighten the fairness constraint?" | Re-run past proposals with new policy, show how assignments would differ |
| Growth planning | "Can we handle 2 more families with current caregivers?" | Project coverage capacity based on historical utilization patterns |

**Test of understanding:** If your context graph can't answer "what if?" questions, it's just a search index. True context graphs enable simulation—that's the difference between retrieval and reasoning.

**Implementation phasing:**
- **Phase 1 (now):** Rich decision trace capture in Coverage Loop
- **Phase 2 (next):** Precedent search UI ("Show me similar situations")
- **Phase 3 (later):** Simulation queries with predicted outcomes

### 14.6 Product implications (Home, Schedule, Handoffs)

* **Home** (persona‑based): today/week clarity; tasks & events; "why this suggestion" explainer.
* **Schedule** (coverage workspace): gap/conflict badges; availability overlays; fairness heatmap.
* **Handoffs:** auto‑summary at shift end; top‑of‑Home for next caregiver; incident hooks.
* **Explainability:** see rules, availability, history that drove any proposal—powered by decision traces.
* **Precedent hints:** "Similar to Nov 15 gap" links to past decision traces for context.

### 14.7 Metrics (bottleneck removed = proof)

* **Coverage %** (target window covered); **Gap minutes/week**; **Time‑to‑fill** median.
* **Adherence** (meds, appts) and **misses avoided**.
* **Coordination time saved** on scheduling & follow‑ups.
* **Caregiver clarity score** ("I know what's expected today").
* **Agent acceptance rate** & **overrides** (tune proposals).
* **Context graph metrics:** Decision traces accumulated; precedent queries served; simulation accuracy.

### 14.8 Roadmap framed by this lens

* **Now:** coverage workspace; gap/conflict detection; handoffs; availability rules; **decision trace capture**.
* **Next:** ranked proposals; fairness heatmaps; opt‑in automations; **precedent search UI**.
* **Later:** external calendar & wearable signals; proactive "coverage health" alerts; community routing; **simulation queries**.

### 14.9 Copy blocks (ready to ship)

**Core messaging:**
* **Headline:** *Care that maintains itself.*
* **Subhead:** *A coordination layer that watches coverage, closes gaps, and keeps your plan on track—so you don't have to.*
* **Pillars:** Coverage clarity • Handoff continuity • Availability‑aware scheduling • Calm, role‑based views.
* **Taglines:** *From firefighting to foresight.* • *Know who's on. Know what's next.* • *Care runs on clarity.*

**Context graph messaging (for investors, technical audiences):**
* **Headline:** *The context graph for care networks.*
* **Subhead:** *Capturing not just what happened, but why—so coordination gets smarter over time.*
* **One-liner:** *CareSupport builds the event clock for care coordination that existing systems structurally can't.*
* **Differentiator:** *We're in the orchestration path. Decision traces are captured as they happen, not reconstructed from logs. That's a moat.*
* **Taglines:** *Care coordination that learns from itself.* • *From state to reasoning.* • *The system that remembers why.*

---

## 15) Land → Pro → Agency — Playbook (Clear Wins + Assets)

**Activation checklist**

* **Family:** baseline NHS, coverage window set, 3 tasks scheduled, first handoff captured.
* **Pro:** availability set, first session logged, first summary sent, first payout.
* **Agency:** coordinator linked, shared view active, first shift mirrored, incident routing verified.

**Invite copy (snippets)**

* **Pro (SMS):** “Hi {{first}}, I’m {{coordinator}} with {{family}}. We use CareSupport to keep care organized. Tap to join our Circle and see schedule + notes: {{smart\_link}}.”
* **Agency (email):** “Subject: Shared Timeline for {{client}} — 2‑minute setup. We’re using CareSupport to reduce gaps and calls. View the live timeline and handoffs here: {{link}}. Happy to enable limited write access for shifts/notes.”

**Coordination Lead views**

* **Family Coordination Lead:** NHS card, upcoming gaps, at‑risk meds, invite Pro CTA.
* **Pro:** multi‑family agenda, accepted/available slots, handoff queue, invoice status.
* **Agency Coordination Lead:** client roster linked, free/busy sync, shift exceptions, incident feed.

**Experiments**

* “First Gap Free” pledge (resolve one uncovered window in 48h).
* Fairness heatmap for Pro scheduling transparency.
* Agency retention report: calls avoided, gaps closed, NHS lift.

**Risks & Mitigations**

* Low invite acceptance → shorten onboarding, add sample data, offer concierge setup.
* Data‑sharing hesitation → per‑network Policy Pack with explicit scopes + consent receipts.
* Integration drag → CSV/ICS starters before deep APIs; publish adapter playbooks.

---

## 16) Human‑Centered Language Guide (Care Coordination)

**Better Positioning:** *CareSupport equips each **care network** with network‑specific infrastructure—**built for the whole network, with a **Coordination Lead** role**.*

**Even Better:** *CareSupport gives families, caregivers, and agencies the coordination tools they need to make care work better.*

**Best:** *CareSupport helps **Rob** coordinate his care team, **Sarah** manage her families, and **agencies** provide seamless experiences — all through specialized coordination tools for the **entire network**.*

**Copy blocks (ready to use)**

* **Headline:** *Care that maintains itself.*
* **Subhead:** *Tools that help families, caregivers, and agencies coordinate their **care networks** with less chaos and more clarity.*
* **CTA:** *Start your family circle* • *Run your care practice* • *Link your agency clients*

**Words to Prefer → Avoid**

* **Prefer:** care network, coordinator (for adoption flows), care circle, family hub, shared timeline, handoff, coverage gap, invite, link.
* **Avoid:** decision maker, stakeholder alignment, resource orchestration, governance.
