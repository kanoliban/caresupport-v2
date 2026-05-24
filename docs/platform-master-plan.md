# CareSupport Master Plan: Platform Revolution Applied

> CareSupport is not building a product. It is building a platform.
> This document maps the CareSupport north star to the framework established in
> *Platform Revolution* by Geoffrey G. Parker, Marshall W. Van Alstyne, and
> Sangeet Paul Choudary — and demonstrates that the gravity well we identified
> is, in the authors' language, a platform with compounding multi-sided network
> effects that structurally cannot be replicated by pipeline competitors.

**Author:** Liban Kano, Founder
**Date:** 2026-05-24
**Companion document:** `docs/north-star.md` (the founding revelation)
**Framework source:** *Platform Revolution: How Networked Markets Are Transforming the Economy — and How to Make Them Work for You* (W. W. Norton, 2016)

---

## Part I: The Fundamental Distinction — Pipeline vs. Platform

### What a pipeline is

A pipeline is a linear value chain. Value is created upstream and consumed downstream. The firm controls the entire process: design → manufacture → market → sell → deliver. Traditional home care agencies are pipelines:

```
Agency recruits caregivers
  → Agency trains and credentials them
  → Agency sells care services to families
  → Agency dispatches caregivers to shifts
  → Agency handles payroll, compliance, billing
  → Family receives care
```

The agency owns the process end to end. It controls the supply (caregivers), controls the demand channel (marketing, referrals, Medicaid contracts), and captures the spread between what Medicaid pays and what caregivers receive. Competitive advantage comes from supply-side economies of scale — more caregivers, more clients, more geographic coverage, lower per-unit overhead.

Accra is a pipeline. Care.com is a pipeline (a digital one, but still linear: caregiver posts profile → family searches → match → Care.com disappears). Every home care agency in the $130 billion industry is a pipeline.

### What a platform is

> "A platform is a business based on enabling value-creating interactions between external producers and consumers. The platform provides an open, participative infrastructure for these interactions and sets governance conditions for them."
> — Parker, Van Alstyne, Choudary

A platform does not create the value itself. It creates the infrastructure for others to create and exchange value with each other. The platform's competitive advantage comes from demand-side economies of scale — network effects — not from controlling supply.

**CareSupport is a platform.**

CareSupport does not employ caregivers. It does not provide care. It does not own the supply. What CareSupport does is create the intelligent infrastructure through which families and caregivers coordinate, verify, bill, and fulfill care — and the value of that infrastructure increases with every participant who joins.

```
                    CareSupport Platform
                          │
          ┌───────────────┼───────────────┐
          │               │               │
     Families        Caregivers       Agencies
   (demand side)    (supply side)   (institutional
                                     supply side)
          │               │               │
          └───────┬───────┘               │
                  │                       │
            Core Interaction:             │
         Coordinated care delivery    Connected via
          verified and compensated    shared context
          through the platform            │
                  │                       │
                  └───────────────────────┘
```

The shift: from controlling resources (the agency model) to orchestrating resources (the platform model). CareSupport does not own caregivers. It orchestrates the care network — families, caregivers, agencies, case managers — through an intelligent agent that holds the coordination context.

---

## Part II: The Core Interaction

> "Every platform must define its core interaction clearly, then design everything else around it."

The core interaction is the single most important exchange that takes place on the platform. It consists of three elements: participants, value unit, and filter.

### CareSupport's core interaction

**Participants:**
- **Producer:** The caregiver (family member or professional) who provides care
- **Consumer:** The care recipient and their family/coordinator who receives and directs care
- **Platform:** CareSupport — the agent, the companion app, the FMS layer

**Note:** Participants switch roles. The family coordinator is a consumer of caregiving services but a producer of care context (the information that makes coordination possible). The professional caregiver is a producer of care services but a consumer of context briefings, scheduling, and payroll. This role fluidity is a hallmark of platforms.

**Value unit:** The coordinated care shift — a verified unit of care delivered by a specific caregiver to a specific recipient, at a specific time and place, with context (handoff notes, medication administration, care activities) captured and exchanged through the platform.

The value unit is not the text message. The text message is the input mechanism. The value unit is the care shift that was coordinated, verified, documented, and (eventually) compensated through the platform. Every layer of the gravity well refines and enriches this value unit:

| Layer | What it adds to the value unit |
|---|---|
| Layer 1 (Solo agent) | Care context — medications, preferences, routines |
| Layer 2 (Multi-party) | Coordination — who covers what, when, with what handoff |
| Layer 3 (Companion app) | Visibility — the shift rendered as a structured, navigable artifact |
| Layer 4 (Compliance) | Verification — EVV-confirmed location, time, identity |
| Layer 5 (FMS) | Compensation — the shift becomes a billable, payable event |
| Layer 6 (Marketplace) | Fulfillment — the shift can be filled by anyone in the network |

Each layer adds a dimension to the value unit. By Layer 6, a "care shift" on CareSupport is not just scheduled — it is coordinated, briefed, verified, documented, billed, and compensated. No pipeline competitor produces a value unit this rich because no pipeline holds all six layers.

**Filter:** The agent's matching intelligence. When a care need arises, CareSupport does not show the family a list of all available caregivers. The agent filters by: capability match (can this caregiver administer medications?), availability (are they free during the required window?), proximity (how far do they live from the care recipient?), history (have they worked with this care recipient before?), reliability (what is their response rate and completion rate?), and preference (does the care recipient prefer this person?). The filter is powered by coordination data — it improves with every interaction.

---

## Part III: Network Effects — The Gravity Well in Platform Language

> "The fundamental source of competitive advantage in a platform business is the network of producers and consumers and the data captured from their interactions."

### Cross-side network effects (the primary engine)

Cross-side effects occur when the value to users on one side increases as more users on the other side join.

**More families → more value for caregivers:**
- More families on CareSupport = more shift opportunities for caregivers
- More shift opportunities = higher utilization, more income, better schedule flexibility
- Caregiver experience: "I used to hustle for shifts across 3 agencies. Now CareSupport fills my week from families I'm already coordinated with."

**More caregivers → more value for families:**
- More caregivers on CareSupport = faster gap coverage, better matching, more options
- Faster gap coverage = less stress for coordinators, fewer uncovered shifts
- Family experience: "When Angela cancelled, CareSupport had Marcus confirmed in 8 minutes. We used to spend 2 hours on the phone."

This is the textbook cross-side positive network effect. It is the same dynamic that powers Uber (more drivers → shorter waits → more riders → more drivers) — but applied to care.

### Same-side network effects

Same-side effects occur when the value to users on one side increases as more users on that same side join.

**Caregiver same-side (positive):** As more caregivers join in a geography, the platform's collective capability coverage improves. A family needing a caregiver with dementia experience AND medication administration AND overnight availability is more likely to find a match when 200 caregivers are in the network than when 20 are. Each caregiver's individual value increases because the network can serve more complex needs — and serving complex needs generates more coordination data, which deepens everyone's profiles.

**Family same-side (positive, indirect):** As more families join in a geography, the shared caregiver pool deepens, matching improves, and the FMS layer achieves economies of scale (lower per-family administrative cost). Families don't interact directly with each other, but they benefit from each other's presence through the shared supply side.

**Caregiver same-side (negative — must be managed):** Too many caregivers competing for the same shifts could reduce individual utilization. The platform must manage this through geographic expansion, demand generation, and ensuring that supply growth tracks demand growth. This is a governance challenge, not a structural flaw.

### The multi-nodal network effect (what we discovered)

Platform Revolution describes cross-side and same-side effects in two-sided markets. CareSupport has a more complex topology — it is a multi-sided platform where multiple participant types create bridge connections across networks:

**Caregivers are bridge nodes.** Angela works for Rob's family and the Johnsons and the Garcias. She is not on one "side." She is a connector between three family networks. When she joins through Rob, she becomes available supply for the Johnsons. This is a cross-network bridge effect that multiplies faster than simple cross-side effects.

**Case managers are bridge nodes.** A case manager who serves 35 families would rather interact with all of them through one platform. When she joins for one family, she pulls her other families toward the platform.

**Agencies are multiplier nodes.** When Agency A's caregivers are already on CareSupport (because their client families use it), Agency A joins as an organizational node. Now all of Agency A's caregivers across all their clients are connected.

The network grows geometrically because each participant bridges to multiple other networks:

```
Family₁ brings Caregiver_A
  Caregiver_A also serves Family₂ → Family₂ joins
  Family₂ brings Caregiver_B and Caregiver_C
    Caregiver_B also serves Family₃ → Family₃ joins
    Caregiver_C is from Agency_X
      Agency_X has 40 caregivers across 25 families → multiplier
        Case_Manager_1 serves 8 of those families → bridge
```

One family joining can cascade to dozens of families through shared caregivers, agencies, and case managers. This is the network effect topology we identified in the north star conversation — and it maps directly to Platform Revolution's framework, extended to multi-sided dynamics.

### Data network effects (the compound layer)

> "Data-driven network effects arise when a platform collects data from user interactions, uses it to improve the service, and thereby attracts more users who generate more data."

CareSupport's data network effect is the coordination context:

```
More coordination interactions → more data about care patterns
More data → better matching (the filter improves)
Better matching → faster gap coverage, higher quality care
Higher quality → more families trust the platform
More families → more coordination interactions
→ cycle accelerates
```

The data captured is not generic user data. It is care-specific coordination intelligence: which caregivers work well with which care recipients, what shift patterns lead to burnout, how response times vary by time of day, which medication regimens require experienced caregivers, what handoff patterns reduce incidents. This data is a derivative of the coordination layer — it cannot be acquired by a marketplace that only matches and disappears.

---

## Part IV: The Pipeline-to-Platform Disruption

> "Platforms beat pipelines because platforms scale more efficiently by eliminating gatekeepers."

### How CareSupport disrupts the home care agency pipeline

The authors identify five patterns of platform disruption. CareSupport executes all five:

**1. Eliminate gatekeepers**

Home care agencies are gatekeepers. They control which caregivers serve which families. They decide who gets hired, who gets trained, who gets dispatched. The family has no choice — they receive whoever the agency sends.

CareSupport eliminates the agency gatekeeper. Families choose their caregivers — family members, independent professionals, or marketplace matches. The agent coordinates, but the family directs. The gatekeeper function (quality control, credential verification, matching) is replaced by the platform's curation mechanisms (coordination-verified profiles, reliability scores, capability matching).

**2. Unlock spare capacity**

53 million Americans provide informal (unpaid) care to family members. They are spare capacity — a massive, untapped workforce performing professional-grade care work without infrastructure, without compensation, and without support.

CDCS-style Medicaid programs unlock this capacity by paying family members to provide care. CareSupport makes the unlocked capacity effective by providing coordination, compliance, and operational infrastructure. The "spare capacity" is not idle — it is already working. CareSupport makes it visible, verifiable, and compensable.

**3. Create new supply**

CareSupport enables people who were not previously "professional caregivers" to participate in the care economy. A daughter caring for her father is not a professional caregiver today. With CareSupport + FMS, she is a paid, verified, profile-bearing care provider who could eventually serve other families through the marketplace.

The supply does not need to be recruited. It needs to be activated. The activation mechanism is the platform itself — coordination makes care manageable, compliance makes it billable, FMS makes it payable, and the marketplace makes it portable.

**4. Reduce transaction costs**

Today, coordinating care across 12 people requires Rob to manually text each person, track responses, assemble coverage, and relay handoff details. The transaction cost of coordination is enormous — physically, cognitively, emotionally.

CareSupport reduces the transaction cost to near zero. Rob reads two messages. The agent handles 6 parallel threads. The coordination cost that previously consumed hours of Rob's day (operating his phone with his nose) is absorbed by the platform.

**5. Enable community curation**

Agencies curate quality through hiring decisions, training programs, and supervision. This is expensive and doesn't scale.

CareSupport enables community curation through coordination data. A caregiver's quality is not assessed by an agency supervisor who sees them occasionally. It is reflected in months of coordination data: response times, shift completion rates, handoff note quality, family feedback, incident history. The community (families, other caregivers, case managers) produces the curation signal through normal platform interactions — not through deliberate review processes.

---

## Part V: Launch Strategy — Solving Cold Start

> "You don't need every user in the world. You need every user in a specific market where your platform can achieve liquidity."

### CareSupport's launch strategy: Micro-market + Follow the Rabbit + Single-side

The authors describe eight launch strategies. CareSupport combines three:

**1. Follow the rabbit — build a pipeline product first, then open it as a platform**

CareSupport begins as a solo care agent (Layer 1) — a pipeline product. One caregiver, one care situation, one text thread. This is not a platform. It is a useful tool that proves the core value proposition: CareSupport can listen, remember, organize, and respond usefully.

Then it opens up. The solo agent becomes the multi-party coordinator (Layer 2). The pipeline becomes a platform the moment a second participant joins the care network and begins interacting through CareSupport. The "rabbit" was the solo texting agent. The platform is what it becomes when the coordination goes multi-party.

Amazon followed this exact path: started as a bookseller (pipeline), then opened to third-party sellers (platform). OpenTable started as restaurant reservation software (pipeline), then added consumers who could book through the platform. CareSupport starts as a care coordination tool (pipeline), then opens to the full care network (platform).

**2. Single-side strategy — build value for one side first, then open the other**

CareSupport builds value for families first (the demand side). The solo agent and multi-party coordinator serve the family's needs — medication tracking, schedule management, gap coverage. This is the OpenTable playbook: give restaurants (supply side) useful software first, then add diners (demand side) later.

In CareSupport's case, the family IS both sides initially — family members are both the coordinators (demand) and the caregivers (supply). The platform only becomes truly two-sided when professional caregivers and marketplace participants join. By that point, the family side is already engaged, the coordination data is already rich, and the professional caregiver side is attracted by a platform where families are already active and shifts are already structured.

**3. Micro-market strategy — achieve density in one geography first**

> "Start with a tiny market where you can achieve critical mass quickly, prove the model, and then expand concentrically."

CareSupport starts in Minneapolis-St. Paul. The founder lives there. The church ICP is there. Rob is there. The CDCS program is a Minnesota Medicaid waiver. Accra operates there. The regulatory landscape is known. The micro-market is defined by geography AND by program (CDCS families in the Twin Cities metro).

At sufficient density in Minneapolis — enough families and caregivers that gap coverage is fast and matching is reliable — CareSupport achieves liquidity. Then it expands concentrically: to other Minnesota metros, to other states with self-directed care programs, eventually nationwide.

This is the Uber playbook (San Francisco → city by city), the DoorDash playbook (Palo Alto → metro by metro), and the Facebook playbook (Harvard → Ivy League → all colleges → everyone). Geographic density first. Network effects second. Expansion third.

---

## Part VI: Platform Metrics — What CareSupport Measures

> "For platforms, the critical metrics center on the rate of successful interactions and the factors that contribute to them."

The authors argue that platforms should not be measured by pipeline metrics (revenue, margin, customer acquisition cost) but by interaction metrics. CareSupport's metrics, mapped to the framework:

### Liquidity (the most important metric)

> "A platform has achieved liquidity when there are enough producers and consumers that interactions happen with a reliable rate of success."

For CareSupport, liquidity means: **when a care gap occurs, it is filled reliably and quickly.**

- **Gap-to-fill rate:** What percentage of coverage gaps are resolved through the platform?
- **Time-to-fill:** How long from gap detection to confirmed coverage?
- **First-attempt success rate:** How often does the first-contacted caregiver accept?

Liquidity is CareSupport's product-market fit signal. When families trust that CareSupport will fill gaps reliably, they stop maintaining their own backup systems. When caregivers trust that CareSupport will provide consistent shifts, they stop hustling independently. Liquidity is the moment the platform becomes load-bearing.

### Matching quality

How well does CareSupport connect the right caregiver with the right care situation?

- **Care recipient satisfaction:** Does the care recipient feel comfortable with the matched caregiver?
- **Caregiver context match:** Did the caregiver have the right skills for the care need?
- **Handoff quality:** Were transitions between caregivers smooth?
- **Repeat match rate:** How often do families request the same caregiver again?

### Trust

- **Coordinator delegation rate:** How many coordination actions does the coordinator delegate to the agent vs. handle manually? (Rising delegation = rising trust)
- **Permission stage:** What permission level has the family granted the agent? (Stage 1: confirm every action → Stage 2: approved playbooks → Stage 3: exception-only interruption, per `docs/rob-care-operations-model.md`)
- **Caregiver response rate:** How reliably do caregivers respond to platform-mediated shift requests?

### Network health

- **Active participants per care network:** How many of the care team members actively interact through CareSupport?
- **Cross-network caregiver density:** How many caregivers serve multiple families on the platform?
- **Geographic coverage density:** In the target metro, what percentage of CDCS families use CareSupport?

### Value unit quality

- **EVV completion rate:** What percentage of shifts have all five verification data points?
- **Handoff note rate:** What percentage of shift transitions include documented handoffs?
- **Medication adherence tracking:** What percentage of scheduled medications are confirmed administered?

---

## Part VII: Monetization — Following the Framework

> "The fundamental rule of platform pricing: don't charge for the interaction that generates your core network effect."

### Identifying the subsidy side and the money side

Every successful platform subsidizes the side that is harder to attract and charges the side that receives disproportionate value.

**CareSupport's subsidy side: families.**

Families are the demand side. They are harder to attract because they are exhausted, skeptical of new tools, and burned by care products that added friction without reducing burden. They must be subsidized — CareSupport's core coordination (texting, scheduling, medication tracking, gap coverage) should be free or near-free for families.

This is the core interaction. Charging for it would kill the network effect before it starts.

**CareSupport's money side: the FMS layer.**

The FMS administrative margin is CareSupport's primary revenue. This money does not come from the family — it comes from Medicaid, through the administrative fee built into the authorized budget. The family caregiver receives their full pay. CareSupport takes the same administrative cut that Accra takes today — but delivers 10x more value.

This is elegant because:
- The family never pays CareSupport directly
- The caregiver receives more than they would through an agency
- The revenue comes from Medicaid's existing administrative budget line
- CareSupport is compensated for coordination, compliance, and payroll — services it provides as a natural byproduct of the platform

**Secondary monetization (later):**
- **Marketplace transaction fee:** When a marketplace caregiver fills a shift, CareSupport takes a percentage — similar to Uber's model. The caregiver still earns more than through an agency.
- **Premium features (freemium):** Advanced analytics, capacity planning, simulation queries ("what if Sarah takes vacation?") for coordinators. Basic coordination is free. Operational intelligence is premium.
- **Agency access fees:** Agencies that want shared-timeline visibility into their clients' care networks pay for platform access — because the alternative (phone calls and fragmented communication) costs them more in coordinator time.

### What is never monetized

The core coordination interaction — texting with CareSupport, receiving shift requests, confirming availability, getting handoff notes — is never charged. This is the interaction that generates the network effect. Charging for it would reduce participation, weaken the network, and destroy the data flywheel.

> "Don't charge for value creation. Monetize where you don't destroy value creation."

---

## Part VIII: Governance — Openness, Trust, and Safety

### The openness-control spectrum

CareSupport operates in healthcare — a domain where too much openness creates safety risks (unvetted caregivers, PHI exposure, medication errors) and too much control kills the participation that generates network effects.

**Where CareSupport is open:**
- Any family can join and begin coordinating through the agent
- Family members can be added to the care network through conversation
- Professional caregivers can be invited by families
- Caregivers can serve multiple families

**Where CareSupport is controlled:**
- Marketplace caregivers must be credentialed (background checks, certifications)
- PHI access is role-scoped (per `CLAUDE.md`: five access levels — `full`, `schedule+meds`, `schedule`, `provider`, `limited`)
- Medication changes require coordinator approval (hardcoded safety rule)
- Medical information is 1:1 only — never shared in group contexts
- Financial transactions are audited and compliant

### Trust architecture

The authors emphasize that trust is a core platform metric, not a feature. CareSupport's trust architecture, mapped to the framework:

**Reputation systems:** Caregiver reliability scores built from coordination data (response times, shift completion rates, handoff quality). These are not self-reported — they are derived from verified platform interactions.

**Transparency:** Source attribution for every agent recommendation. The companion app's explainability pattern (from the Poppy study: CONTEXT + SOURCES + LAST UPDATED + feedback) ensures families understand why the agent made each decision.

**Graduated permissions:** The three-stage permission model from `docs/rob-care-operations-model.md` — Stage 1 (confirm every action), Stage 2 (approved playbooks), Stage 3 (exception-only interruption) — is a trust escalation ladder. The platform earns autonomy through demonstrated competence.

**Safety enforcement:** Mechanical, not prompt-level (per `CLAUDE.md`). Access control, PHI filtering, and approval gates are enforced in code (`convex/lib/enforcement/`), not in the agent's judgment. This is governance through architecture — the strongest form described in Platform Revolution.

---

## Part IX: Platform Envelopment — The Gravity Well as Expansion Strategy

> "Successful platforms can 'envelope' adjacent markets by extending their network effects into new domains."

Platform envelopment is when a platform leverages its existing network effects to expand into adjacent markets. Amazon: books → everything → AWS → logistics. Apple: hardware → iTunes → App Store → Services.

CareSupport's gravity well IS platform envelopment, expressed as an inevitability:

```
Care coordination (core platform)
  → envelopes visit verification (EVV compliance)
  → envelopes payroll and billing (FMS)
  → envelopes caregiver hiring (marketplace)
  → envelopes transportation (Uber Health API)
  → envelopes pharmacy (CVS/MyChart integration)
  → envelopes grocery/meal delivery (Instacart API)
```

Each envelope is possible because the coordination platform already holds the context — the data about what the family needs, when, where, and for whom. The platform does not enter these adjacent markets from scratch. It enters them with the demand signal already in hand.

The critical insight: **CareSupport does not compete in each adjacent market.** It aggregates commodity services (rides, groceries, prescriptions) via APIs and builds a marketplace only where existing supply is broken (caregivers, respite, last-minute coverage). The platform envelops adjacent markets without owning them — it orchestrates them.

---

## Part X: The CareSupport Platform Canvas

Mapping CareSupport to the Platform Canvas framework:

| Dimension | CareSupport |
|---|---|
| **Producers** | Family caregivers, professional caregivers, marketplace caregivers, agencies |
| **Consumers** | Care recipients, family coordinators, case managers |
| **Value unit** | The coordinated care shift — scheduled, briefed, delivered, verified, documented, compensated |
| **Core interaction** | A care need is identified → matched to a caregiver → coordinated through the agent → delivered → verified → compensated |
| **Filter/matching** | Agent intelligence powered by coordination data: capability, availability, proximity, reliability, care recipient preference, behavioral history |
| **Network effects** | Cross-side (more families ↔ more caregivers), same-side positive (caregiver pool depth improves matching), multi-nodal (caregivers bridge family networks), data (coordination improves matching) |
| **Governance** | Role-scoped access, mechanical safety enforcement, graduated trust permissions, credential verification for marketplace |
| **Monetization** | FMS administrative margin (primary), marketplace transaction fee (secondary), premium features (tertiary). Core coordination is free. |
| **Launch strategy** | Follow the rabbit (solo agent → platform) + single-side (family first) + micro-market (Minneapolis CDCS families) |
| **Key metric** | Liquidity — gap-to-fill rate and time-to-fill |

---

## Part XI: Why This Platform Cannot Be Replicated

> "In a world of platforms, competition is not product vs. product but ecosystem vs. ecosystem."

### The structural moat, in Platform Revolution language

**1. The core interaction originates in conversation.**

CareSupport's data — the coordination context, the caregiver profiles, the care intelligence — is a derivative of daily text conversations. A competitor cannot acquire this data without being inside the family's daily care communication. Being inside the daily communication requires being useful for coordination. Being useful for coordination requires the context that only comes from being inside the daily communication. The moat is circular.

**2. The network effect is multi-nodal, not two-sided.**

Two-sided network effects can be attacked by subsidizing one side aggressively (Uber vs. Lyft). Multi-nodal effects — where caregivers bridge family networks, agencies multiply supply, case managers bridge caseloads — are exponentially harder to replicate because each node type reinforces the others. A competitor would need to simultaneously attract families, caregivers, agencies, AND case managers in the same geography to compete.

**3. The value unit is the richest in the industry.**

A care shift on CareSupport is coordinated + briefed + verified + documented + compensated. A care shift on Care.com is just matched. A care shift through an agency is dispatched + documented. No competitor produces a value unit with all six dimensions because no competitor holds all six layers of the gravity well.

**4. Multi-homing is expensive.**

The authors note that platforms are vulnerable when multi-homing is cheap (users can easily be on multiple platforms). For CareSupport, multi-homing is structurally expensive:
- A family using CareSupport for coordination AND another platform for payroll would need to maintain two systems, reconcile data, and lose the integration between coordination and compliance.
- A caregiver on CareSupport AND an agency dispatch system would need to manually sync schedules, duplicate time tracking, and lose the unified professional profile.
- The FMS layer makes multi-homing financially painful — the money flows through CareSupport. Splitting financial operations across platforms creates tax, compliance, and audit complexity.

**5. The platform envelops adjacent markets with existing context.**

When CareSupport integrates Uber Health for rides to appointments, or CVS for prescription refills, it enters those markets with the demand signal already in hand. A ride-hailing company entering care coordination would need to build the entire context engine from scratch. CareSupport envelops adjacent services; they cannot envelop CareSupport.

---

## Part XII: The Master Plan — From Rabbit to Platform

Connecting the north star (founding revelation) to the Platform Revolution framework, the CareSupport master plan is:

### Phase 1: The Rabbit (Today → Layer 1-2)

Build the pipeline product: the solo care agent, then the multi-party coordinator. Prove the core value proposition — CareSupport can coordinate care through text better than the family can on their own. Achieve single-user utility (the agent is useful even before network effects). Begin capturing care needs as structured data.

**Platform Revolution principle:** "Follow the rabbit — build a pipeline product first, then open it as a platform."

### Phase 2: The Gate (Layer 3)

Ship the iOS companion app. The app surfaces the agent's intelligence AND introduces the sensor layer (GPS, timestamps) that enables EVV. The pipeline becomes a platform: multiple participants, multiple surfaces, structured artifacts crossing between iMessage and app.

**Platform Revolution principle:** "The value unit is the fundamental element that begins every interaction." The app enriches the value unit from "coordinated text exchange" to "visible, structured, verifiable care operation."

### Phase 3: Liquidity (Layer 2-3 at density)

Achieve liquidity in Minneapolis. Enough families and caregivers that gap coverage is reliable and fast. Measure gap-to-fill rate and time-to-fill. When these metrics stabilize — when families trust that CareSupport will resolve gaps without their manual intervention — the platform has achieved product-market fit.

**Platform Revolution principle:** "Liquidity is the platform's equivalent of product-market fit."

### Phase 4: The Financial Layer (Layer 4-5)

Obtain FMS licensing. Connect the compliance capability (EVV from the app) to the billing rail (Medicaid). Begin processing payroll for family caregivers. The platform now carries money, not just messages. This hardens the network effect into financial lock-in and creates the primary revenue engine.

**Platform Revolution principle:** "Monetize where you don't destroy value creation." Coordination is free. The FMS margin funds the platform.

### Phase 5: The Marketplace (Layer 6)

Open the marketplace. Families who cannot cover shifts through their own network receive matched, briefed, dispatched caregivers from the platform's supply side. Caregivers who built profiles through coordination across multiple families are now marketplace-visible. The supply was seeded by families bringing their existing caregivers onto the platform (the "follow the rabbit" seed from Phase 1).

**Platform Revolution principle:** "Subsidize the side that is harder to attract." Families (demand) were subsidized with free coordination. Caregivers (supply) were seeded through family invitations. The marketplace is the moment both sides achieve independent critical mass.

### Phase 6: Envelopment (Beyond Layer 6)

Integrate adjacent services — transportation (Uber Health), pharmacy (CVS), grocery (Instacart), medical records (MyChart) — using the care context as the demand signal. The platform envelops adjacent markets without owning them. CareSupport becomes the orchestration layer for all care-adjacent services, not just caregiving.

**Platform Revolution principle:** "Successful platforms envelope adjacent markets by extending their network effects into new domains."

---

## The Closing Frame

> "In the platform world, the assets that are hardest to copy are the community and the resources its members own and contribute."

CareSupport's asset is not the code. It is not the agent. It is not the app. It is the network — the families, caregivers, agencies, and case managers who coordinate care through the platform, and the coordination data their interactions produce. Every day the network operates, the data deepens, the matching improves, the profiles verify, and the switching cost increases.

The home care agency industry is a $130 billion collection of pipelines. CareSupport is a platform. Platforms beat pipelines because platforms scale more efficiently, produce richer value units, generate self-reinforcing network effects, and envelop adjacent markets.

The pipeline controls the supply. The platform orchestrates the network. The network is the moat.

---

*This document maps the CareSupport north star — conceived on 2026-05-24 during a DoorDash shift in Minneapolis — to the platform economics framework of Parker, Van Alstyne, and Choudary. The mapping reveals that the gravity well is not a metaphor. It is the mechanical description of a multi-sided platform with compounding network effects, data flywheels, and platform envelopment dynamics. The inevitability is not aspiration. It is platform economics.*
