<!--
  DOCTRINE.md — The CareSupport Doctrine
  Created: 2026-06-12
  Purpose: Canonical statement of what CareSupport is, the theses it rests on,
           the endgame it is building toward, and the staged proofs that validate it.
  Contents: The naming thesis (invisible home care agencies), the design thesis,
            the economic thesis (reimbursement chain), the analogy machine
            (Givers/TurboTax/Plaid/Stripe/Poke), the completed entity, the policy bet,
            why Minnesota, the staged validation chain, open questions, glossary, sources.
  Provenance: Distilled from founder strategy sessions and calls, June 7–12, 2026
              (Obssa product-vision call, Clinton handoff call, Cascade working sessions).
  Changelog:
    2026-06-12 — Initial version.
-->

# The CareSupport Doctrine

**Status:** Living document. This is the canonical statement of the company. When code, pitch, or roadmap conflict with this document, either the work is wrong or this document must be amended — never silently both.

**The one-sentence company:**

> **Families are invisible home care agencies. Everyone knows this, but no one has named it. CareSupport is the infrastructure that makes the invisible agency visible, supported, and payable.**

---

## 0. What This Document Is

CareSupport has lived in three places: a codebase, a founder's head, and a series of phone calls. This document closes that gap. It states four theses — naming, design, economic, policy — and the discipline that connects a conceptual MVP in 2026 to industry infrastructure over the next two decades.

The repository as it exists today is **a conceptual MVP — a proof, nothing more**. Its job is to prove the form factor and the data model embryo. Production is a separate project (see §9). This document is about the company the MVP is evidence *for*.

---

## 1. The Naming Thesis — Families Are Invisible Home Care Agencies

### 1.1 The claim

Every family coordinating care for a loved one is already operating a home care agency. It is unincorporated, unrecognized, unpaid, and unsupported — but it is an agency in every functional sense.

Run the agency org chart against Rob, a quadriplegic man coordinating his own care network of twelve caregivers using his nose on an iPhone:

| Agency function | Who performs it in Rob's network |
|---|---|
| Intake & assessment | Rob — knows the care needs better than any RN assessor |
| Staffing & recruiting | Rob — sourced and retains 12 caregivers |
| Scheduling & dispatch | Rob — daily, by nose |
| Training & supervision | Rob — onboards every new caregiver |
| Payroll & billing | Rob — timesheets, FMS paperwork, budget tracking |
| Compliance & documentation | Rob — whatever the program demands |
| Quality assurance & incident response | Rob — 24/7, with no off-shift |

That is a home care agency's entire org chart operating inside one person's phone. **Rob is not the first user. Rob is the existence proof of the category.** (See `docs/rob-care-operations-model.md`.)

### 1.2 Why naming matters

Category-creating language converts a known-but-unnamed fact into a market. "Gig economy" did it for odd jobs; "creator economy" did it for posting online. Every actor in home care *experiences* the invisible agency daily — the FMS processing a mother's timesheets, the case manager calling the daughter for status, the state paying visible agencies ~$35/hour while invisible ones do the same work for ~$15 or for free. The naming collapses all of it into a noun that capital, policy, and product can act on.

### 1.3 Two languages, strictly separated

- **Category language goes up** — to investors, judges, states, partners: *"America's largest home care provider is the family; it has never been recognized as one."*
- **Burden-relief language goes down** — to families, the product never says "you are an agency." A daughter drowning in her mother's care must not be handed an identity burden on top of a labor burden. The product voice is governed by `SOUL.md`: fewer times Rob has to use his nose.

### 1.4 Visible never means licensed

The thesis dies if it implies families should *become* agencies — licensure, liability, surveys. The claim is the opposite: the agency **function** already exists in the family; CareSupport supplies the institutional **shell as software** so the family never has to incorporate the burden. Licensed intermediaries (FMS, agencies of record) continue to hold licenses and liability. CareSupport's position is the interface and the rails (§3, §5).

---

## 2. The Design Thesis — Home Care Software Has Never Been Built for Its Largest Provider

### 2.1 Forty years of software for the wrong entity

Home care software has existed for decades — WellSky, Axxess, AlayaCare, HHAeXchange, AxisCare. All of it is enterprise software, because enterprise software encodes its buyer, and the buyer was always the agency: rosters, billing portals, compliance dashboards, EVV punch-clocks. The family — the entity delivering the majority of long-term care in America — was never the buyer, so the family got nothing.

**If families are invisible home care agencies, then home care software must be designed, engineered, and built for families.** No incumbent can do this without abandoning its buyer.

### 2.2 The 18-month design descent

The founder's path from mid-2024 to late 2025 was not product indecision; it was a discovery procedure:

```
SaaS web app  →  iOS app  →  iMessage thread
```

Each step removed "software" until only the family's native medium remained. Enterprise software encodes org charts; families do not have org charts — they have group texts. Taken to its logical conclusion, **family-grade home care software does not look like software at all.** The agency gets a dashboard. The family gets a text thread that happens to run an agency behind it.

### 2.3 Form-factor proof

Consumer agents living in iMessage are a proven form factor (Poke; Poppy — see `docs/research/poppy-ios/`). The CareSupport MVP proves the *care* version of the form factor: coordination, reminders, calendar, multiplayer threads — all conversational, all in the thread the family already uses. The Convex data model (`careContacts`, `coordinationEvents`, `careClaims`, `auditLogs`) is the embryo of the verification rails described in §5.

---

## 3. The Economic Thesis — The Reimbursement Chain

### 3.1 The chain

> **Coordination is documentation. Documentation is clean data. Clean data is verifiable care. Verifiable care is reimbursable care.**

Families coordinate care anyway — in texts. The exhaust of that coordination, properly structured, is exactly the documentation Medicaid-funded care runs on. CareSupport converts the coordination families already do into the records the money already requires.

### 3.2 The payer stack

```
Medicaid (payer)
   ↕
FMS — Financial Management Services (fiscal intermediary; payroll, taxes, liability)
   ↕
Family (self-directing the care; the invisible agency)
```

- **The family is the end user and pays nothing — ever.**
- **The FMS is the first customer**: it is paid per-member to process self-directed care paperwork, and its cost centers — timesheet errors, late submissions, audit exposure, fraud risk — are precisely what clean coordination exhaust eliminates.
- **The state is the ultimate beneficiary**: verified care at family rates (~$15/hr) instead of agency rates (~$35/hr average). *(Rate figures are founder field estimates for Minnesota; verify against DHS fee schedules — see §10.)*

### 3.3 The first artifact

The first product of the chain is the **payment-survival bundle: time entries + daily care notes** — the recurring documentation that enrolled families must produce forever, that blocks caregiver paychecks when wrong, and that today is pure friction (paper, portals, punch-clock EVV apps).

The falsifiable pitch, one sentence: *"Enrolled families lose payments over bad paperwork; CareSupport turns the texting they already do into the daily notes and time entries that keep them paid."* An FMS operations manager can confirm or kill that claim in a single conversation. That property — checkable by the stakeholder who would know — is the standard every claim in this doctrine must meet.

### 3.4 Position: interface, not money-toucher

CareSupport does not run payroll, hold care licenses, or carry employer liability — at this stage, and possibly ever. That is the licensed layer's job (FMS, agency of record). This is a **stage posture, not a permanent identity** (see §5.4): the company is architected so the funds flow is an option to exercise when leverage permits, never a prerequisite.

---

## 4. The Analogy Machine

These are not interchangeable metaphors. Each analogy is a **component** of one machine — each proves something, contributes something, and contains a trap to refuse.

| Component | What it proves | What we take | What we refuse |
|---|---|---|---|
| **Givers** (givers.com) | Demand: "get paid to care" pulls millions/yr; navigation is a viable wedge | Eligibility/navigation as acquisition surface; their program database as the eligibility twin of our operations schema library | Becoming the licensed agency of record (their model: licensure state-by-state, keeping 35–50% of the stipend) |
| **TurboTax / Intuit** | A private interface on government rails can become a $4.9B/yr business with ~60% share | Compliance-as-product: translate citizen reality into government-grade data; ride the state's rails | Touching the money; also the dark moat (lobbying to keep filing painful) — we win by making verification *better*, not by keeping it broken |
| **Plaid** | Data connectivity that money-touchers depend on is a durable position | The near-term identity: verification/data rails consumed by FMSs, agencies, MCOs, states | Mistaking plumbing for the terminal state |
| **Stripe** | Whoever abstracts compliance owns the flow; infrastructure compounds (Radar → Treasury → Issuing) | The terminal identity: the rails all value in the category crosses; partner with the licensed layer rather than becoming it | Entering the funds flow before the verification monopoly is earned |
| **Poke / Poppy** | Consumers accept an agent that lives in iMessage | The form factor; consumer-grade trust design (ZDR, transparency-then-consent) | Building "an app" — the descent (§2.2) is settled |
| **Uber / Airbnb / SpaceX** | Informal supply + infrastructure + policy shift = category flip; governments switch when the cheaper supplier is standing there | The survival playbook for the policy gap (§7, §9) | Betting the company on the policy timeline (every stage must pay under today's rules) |

### 4.1 TurboTax, the accurate history (because the analogy must hold weight)

- **2002:** Under e-government pressure, the IRS prepared to build free online filing. The industry — organized largely by Intuit — countered with the Free File agreement: free filing for ~70% of taxpayers through private products, **in exchange for the IRS contractually agreeing not to build its own portal**.
- **The split:** IRS kept the rails (e-file/MeF schemas, authorized-provider status); Intuit took the interface and the consumer relationship. **TurboTax never touches the money** — no refunds flow through it; it formats, transmits, and charges fees.
- **The enforcement:** Intuit spent millions killing government interfaces (California ReadyReturn, 2005 onward). When the IRS finally shipped Direct File (2024–25, 25 states, praised by users), the next administration killed it — announced November 2025; 296,000 users one year, zero the next.
- **End state:** ~60% market share; Intuit Consumer Group revenue $4.9B FY2025; the growth engine is TurboTax Live (humans attached to software), up 47%, already 41% of consumer revenue. Cost of the playbook: an FTC deceptive-advertising order (2024).

**Lessons carried into CareSupport:** the interface position compounds; the government keeps the obligation and the rails; the deal with the state is both the moat and the mortality (it is political and can be unwound); and the human-assisted layer eventually becomes the revenue engine. Lesson refused: the moat built on keeping the process painful. Care verification is broken enough that we win by fixing it.

### 4.2 Givers, the accurate model

From founder Max Mayblum directly: Givers mapped every caregiver-payment program in the US into a database, runs a free "TurboTax type of solution" eligibility screener plus a 50-state SEO engine (millions of people/year), and **in some states holds licensure as the agency of record** — enrolling, supporting, and paying caregivers through Medicaid, with the agency keeping the structured-family-caregiving spread (50–65% of the daily stipend passes to caregivers).

**What Givers leaves open — the hole CareSupport occupies:** enrollment is an event; care is every day. Once a family is enrolled — by Givers, an FMS, or a county worker — the daily operational reality (twelve caregivers, shift swaps, coverage gaps, and the documentation stream payments depend on) has no product. **Nobody owns the daily layer.** Givers is a potential channel partner (they enroll; we operate), not a competitor — unless we make the mistake of fighting them for the front door instead of owning the house.

---

## 5. The Completed Entity — Verification Rails for the Care Economy

Pull on any regulation, document, or requirement in home care and the thread ends at financing: **documentation is the release mechanism for money.** Medicaid moved ~$909B in FY2024; HCBS is north of $100B of it; self-direction is ~1.5M participants and growing. Every dollar is gated on proof that care happened — and the proof layer is punch-clock apps, paper timesheets, and fraud scandals.

CareSupport, completed, is **the system of record for whether care actually happened** — the verification rails every money-toucher in the care economy depends on.

### 5.1 The stack

| Layer | What it is | Status |
|---|---|---|
| **L1 — The thread** | Family coordination in iMessage/SMS; free forever; acquisition + ground-truth capture at the moment of care | MVP live; Rob's network onboarding now |
| **L2 — Coordination engine** | Conversation → structured operational state (`careContacts`, `coordinationEvents`, `careClaims`) | Embryo in repo |
| **L3 — Verified care record** | The atomic unit: time + presence + task + consent + audit trail, corroborated across the network's messages — evidentiary grade | To be built from L2 exhaust |
| **L4 — Program schemas** | Regulation as code: CFSS-Minnesota first, then program × state. The operational twin of Givers' eligibility database | Schema #1 begins with Rob's program |
| **L5 — The API (UCP)** | FMSs, agencies, MCOs, enrollers, eventually DHS consume verified records in their required formats | Future; becomes de facto standard via adoption, not committee |

### 5.2 The atomic unit

The **verified care record** is to CareSupport what the charge object is to Stripe. It is richer than any EVV punch-clock because it is corroborated by the coordination graph itself — who confirmed the shift, who showed up, what was done, witnessed across twelve people's messages. Ground truth captured where care actually happens is the one asset no incumbent can retrofit.

### 5.3 Revenue and moats at completion

- **Who pays:** the money-touchers — FMSs, agencies, MCOs, state programs — per-member-per-month plus per-verified-record. The family never pays. The state pays for fraud-visibility and audit-grade data.
- **Moats:** (1) the only ground-truth capture point in the industry; (2) the program-schema library — tedious, unglamorous, compounding; (3) audit-grade trust with states — in a fraud-crackdown era, *the layer that makes fraud visible* is politically protected infrastructure; (4) network effects once UCP-formatted records are what the ecosystem reads and writes.

### 5.4 Data rails first, funds rails as architected option

Near-term identity: **Plaid-of-care** (verification rails; money never passes through). Terminal option: **Stripe-of-care** (reimbursement clears over the rails via licensed partners — exactly as Stripe rode banks without becoming one). Every verified care record is structured so a payment instruction can one day hang off it. The option is earned, not pitched.

### 5.5 The terminal frame

**Care is the largest economic activity in America that has never been economically legible.** Unpaid family care is estimated at ~$600B/yr (AARP) — work that exists in no ledger, builds no work history, earns no credit, and is invisible to every system that allocates money. The completed CareSupport makes an act of care a first-class economic event — verifiable, payable, auditable, insurable, creditable — independent of payer.

From that altitude: Medicaid is not the market, it is the **first payer**. The FMS is the **first consumer of verified records**. CFSS is **schema #1**. The thread is **the sensor**. And the caregiver who today exits six years of caring with nothing on paper gains an **economic identity** — a constituency that will defend the infrastructure that made their work visible.

**The principal question, answered:** at completion, CareSupport's principal is the family. States, payers, and intermediaries pay for access to the legibility the family generates. That single sentence unifies the consumer product, the B2G revenue, and the infrastructure ambition into one company instead of three.

---

## 6. The Policy Bet — Policy Has No Choice

> "We live in the present, but the vision is in the future. We are betting on policy to change." — founder

Stated in its strongest form, the bet is not that policy *might* change. It is that **policy has no choice.** The arithmetic is deterministic:

- The 85+ population roughly doubles by the 2040s. Peak care demand has a date.
- The direct-care workforce already cannot staff today's demand; the projected shortfall is millions of workers. There is no version of 2035 where agencies at ~$35/hr scale to meet it — the workers and the money both do not exist.
- Medicaid is being cut (~$1T over ten years under the 2025 reconciliation law), not grown. **Austerity is self-direction's engine**, because families at ~$15/hr are the only supply that scales *and* saves money simultaneously.
- The direction is already in motion: self-direction enrollment grows every census cycle (~1.5M); COVID's Appendix K flexibilities normalized paying family caregivers in nearly every state and much of it stuck; Minnesota launched CFSS in late 2024, expanding budget authority — the founder's own state, moving now.

**The 20-year claim:** within two decades, it is simply *the default* that Medicaid-entitled families self-serve their home care — the same democratization arc as fleets (Uber), lodging (Airbnb), tax prep (TurboTax), and launch (SpaceX displacing cost-plus Boeing). The four-phase pattern:

1. Capability locked in enterprises (agencies) →
2. Infrastructure makes the individual capable (**CareSupport**) →
3. Policy legitimizes the informal actor (**self-direction expansion — we are here**) →
4. The individual becomes default supply; incumbents retreat to the complex clinical edge.

The bet does not gate the company; it compounds it (§9). If policy flips in eight years, CareSupport is the standing infrastructure. If it flips slowly, CareSupport is a profitable translation layer the entire way.

---

## 7. Why Minnesota, Why Now

- **CFSS just launched** (late 2024): the state is actively transitioning its personal-care population toward self-direction with budget authority — new program, new paperwork, new pain, no incumbent habit.
- **The fraud crisis**: Minnesota's home-care fraud scandals make *verification* politically purchasable now. The layer that makes fraud visible gets invited in.
- **DHS backlog**: the state cannot process and verify the paperwork it already has. Clean, audit-grade data is relief, not disruption.
- **The arbitrage is local and legible**: agency rates vs. family rates, visible in every county budget.
- **The founder lives here.** Unfair advantage is the honest answer: the relationships (Rob's SBIR network, the AI caregiver challenge, DHS proximity) are walkable.

The July 31 AI caregiver challenge (10 slots) is **an incentive, not a dependency** — its phase one scores design, not traction. Per the two-projects rule (Obssa, June 7): the challenge and productionization are separate tracks that may support each other; their milestones must never be tied.

---

## 8. The MVP, Honestly Scoped

The repository proves: the form factor (care coordination as conversation), the multiplayer thread, calendar/reminder integration, the onboarding training system, and the embryo of the rails data model. It is demo-grade across the board — **a conceptual MVP, a proof.**

It is not: production software, HIPAA-positioned, eval-hardened, auth-audited, or cost-controlled. Productionization is its own 8–12 week project (evals with golden datasets, legally vetted terms, authentication audit, cost tiering, code migration off the vibe-coded base) under Obssa's direction with Clinton executing. The doctrine notes this so that no reader mistakes the proof for the product — or the product for the company.

---

## 9. The Discipline — Staged Proofs Across the Gap

Policy-bet companies survive by making **every stage valuable under today's rules**, so no stakeholder ever has to believe the endgame to fund the next step. Each link is falsifiable by the stakeholder who would know:

| Stage | Claim | Falsifiable by | Status |
|---|---|---|---|
| 1. The thread | Rob's 12-caregiver network coordinates through CareSupport and prefers it | Rob and his caregivers, weeks 1–2 | Onboarding now (June 2026) |
| 2. The artifact | Coordination exhaust converts to accurate time entries + care notes | Side-by-side vs. their current submissions | Next |
| 3. The pipe | One FMS confirms the records reduce processing cost/errors | One FMS ops manager, one meeting | Not started — first revenue conversation |
| 4. Schema #1 | CFSS requirements fully encoded; records are program-grade | FMS acceptance + program auditor | Not started |
| 5. The library | Schema #2+ (next program/state) prices the replication cost | Time-to-second-schema | Future |
| 6. The rails | Money-touchers integrate via API; verified records become the standard format | Integration count, PMPM revenue | Future |

**Near-term operating facts (June 2026):** founder on a three-month contract through mid-September (capacity = fundraising + product guidance); Obssa directing engineering; Clinton executing (~20 hrs/week, ~$2K/month budget); first angel conversations under way (the clean ask: *"$10K = 10 weeks of full-time development to take what was vibe-coded and rebuild it for production"*).

---

## 10. Open Questions — The Honest Ledger

Claims in this doctrine that remain unverified, with the verification path:

1. **Rob's current submission reality** — how his caregivers submit time today (paper? portal? EVV app?), error/rejection rate, payment delays. *Path: watch the onboarding; ask directly.*
2. **CFSS/EVV mapping** — exactly which fields a CFSS time entry and care note require; whether coordination exhaust covers them; Minnesota's EVV aggregator integration requirements (believed HHAeXchange; verify). *Path: DHS documentation + one FMS conversation.*
3. **FMS economics ground truth** — per-member admin fee, processing cost per timesheet, error rates. *Path: first FMS meeting; Rob's FMS is the natural door.*
4. **The reachable number** — MN CFSS/CDCS enrollee count (the beachhead market size when the deck says "how many invisible agencies can you reach"). *Path: DHS public enrollment data.*
5. **Rate arbitrage figures** — verify ~$35/hr agency vs ~$15/hr family-rate claims against current DHS fee schedules.
6. **Compliance floor for beta** — what consent/terms language is required pre-HIPAA-positioning for real families. *Path: legally vetted ToS (in progress per June 9 handoff).*
7. **Medicaid cut figures** — pin the ~$1T/ten-year reconciliation number to CBO scoring for investor materials.

---

## Appendix A — Glossary

- **FMS** — Financial Management Services: the fiscal intermediary between Medicaid and self-directing families; runs payroll, withholds taxes, carries employer-agent duties.
- **CFSS** — Community First Services and Supports: Minnesota's self-direction program (launched late 2024, succeeding PCA Choice), including budget authority.
- **CDCS** — Consumer-Directed Community Supports: Minnesota waiver-based self-direction program.
- **EVV** — Electronic Visit Verification: federally mandated (21st Century Cures Act) electronic verification of personal-care visits.
- **SFC** — Structured Family Caregiving: state programs paying a daily stipend to a live-in family caregiver via a managing agency.
- **HCBS** — Home and Community-Based Services: Medicaid long-term care delivered outside institutions.
- **UCP** — Universal Care Protocol: the proposed common schema for care records across products; CareSupport's L5.
- **SBIR** — Small Business Innovation Research: federal research grant program (Rob's domain expertise).

## Appendix B — Sources

- Free File history: Wikipedia, *Free File Alliance*; ProPublica, *TurboTax-Maker Intuit Will Leave Free Tax Filing Partnership With IRS* (2021); ProPublica, *How the Maker of TurboTax Fought Free, Simple Tax Filing* (2019); LA Times on ReadyReturn (2021).
- Direct File termination: Federal News Network (Nov 2025); AP (Nov 2025); Fortune, *296,000 happy users last year, 0 this year* (Apr 2026).
- Intuit end state: Intuit FY2025 investor release (Consumer Group $4.9B; TurboTax Live +47%, 41% of consumer revenue); Citi 2025 survey via FMP (~60% share); FTC order (Jan 2024).
- Givers: givers.com; *AgeTech Podcast* S4E2 interview with Max Mayblum; givers.com structured-family-caregiving explainer (50–65% caregiver share).
- Market: CMS-64 preliminary FY2024 (~$909B Medicaid); Applied Self-Direction census (~1.5M self-directing); AARP *Valuing the Invaluable* (~$600B unpaid family care).
- Internal: `SOUL.md`; `docs/rob-care-operations-model.md`; `docs/product-thesis.md`; `docs/research/poppy-ios/STUDY.md`; founder call transcripts (June 7 and June 9, 2026).
