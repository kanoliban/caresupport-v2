# CareSupport Regulatory Reality Check

> What we assumed, what is actually true, and what this means for the path.

**Author:** Liban Kano, Founder
**Date:** 2026-05-25
**Status:** Critical research. This document corrects the "perfect-assumption" in the north star and platform master plan by mapping the actual regulatory landscape onto the gravity well.

---

## What We Assumed

The north star describes a gravity well where each layer leads inevitably to the next:

```
Coordination → Compliance → Billing → FMS → Marketplace
```

We assumed this cascade was primarily a technical and product progression — that building each capability naturally unlocked the next. We assumed the path from "coordination platform" to "fiscal intermediary" was a licensing formality.

**That assumption is wrong.**

Between Layer 4 (Compliance/EVV) and Layer 5 (FMS), there is not a step. There is a wall. The wall is regulatory, financial, political, and temporal. This document maps the wall.

---

## The Actual Landscape

### 1. You Cannot Just "Become" an FMS in Minnesota

Minnesota DHS contracts with FMS providers through a **competitive RFP process**. There is no open enrollment pathway. You cannot apply, register, or self-certify. You must:

1. Wait for DHS to issue an RFP (the last one was in 2023; the next timing is unpredictable)
2. Submit a competitive response demonstrating capacity, infrastructure, and compliance
3. Be selected by DHS
4. Complete MHCP (Minnesota Health Care Programs) enrollment
5. Integrate with state systems (HHAeXchange for EVV, MN-ITS for billing, MPSE for provider screening)
6. Post surety bonds ($50,000-$100,000) and fidelity bonds ($20,000 per location)
7. Begin operations under DHS oversight

There are currently **16 contracted FMS providers** in Minnesota. Adding a 17th requires winning the next RFP against incumbents with years of operational history.

### 2. The Timeline Is 3-5 Years, Not "Next Step"

Realistic timeline from zero to operational FMS:

| Phase | Duration | Activities |
|---|---|---|
| Corporate formation, capitalization, tech build | 6-12 months | Legal structure, IRS Section 3504 agent authorization, payroll infrastructure, compliance systems |
| Wait for DHS RFP | Unpredictable | Could be 1 year, could be 3. DHS issues FMS RFPs on their schedule, not ours. |
| RFP response and selection | 3-6 months | Competitive bid, evaluation, award |
| Enrollment, integration, testing | 6-12 months | MHCP enrollment, HHAeXchange integration, MN-ITS billing integration, staff hiring |
| Operational ramp | 12-24 months | Build client base against entrenched competitors |

**Total: 3-5 years minimum.** And that assumes we win the RFP on the first attempt.

### 3. Capital Requirements Are $2-5 Million

| Category | Estimate |
|---|---|
| Technology platform / integrations | $500K-$1M |
| Legal and compliance | $200K-$500K |
| Surety and fidelity bonds | $70K-$120K |
| Insurance (E&O, general liability, workers comp facilitation) | $100K-$300K |
| Staffing (compliance, payroll, client services) | $500K-$1M/year |
| Working capital (Medicaid reimbursement lag) | $500K-$1M |
| **Total to operational** | **$2-5M** |

### 4. The Enforcement Environment Is Hostile

Minnesota is in the middle of the largest Medicaid fraud crackdown in state history:

- The U.S. Attorney stated fraud "likely exceeds **$9 billion**" in Minnesota-run Medicaid services (December 2025)
- CMS deferred **$350 million+** in federal Medicaid matching funds
- DHS terminated **18,109+ providers** between October 2025 and March 2026
- Optum prepayment review is holding payments for 14 high-risk service types, including PCA and CFSS
- State AG Keith Ellison charged 18 individuals in a PCA fraud scheme
- Providers have sued DHS over payment withholding during fraud investigations

**This is the worst possible time to enter as a new entity handling Medicaid funds.** Any new FMS applicant will face heightened scrutiny. The regulatory environment is in crisis mode.

### 5. CDCS Is Being Replaced by CFSS

The program we've been discussing — Consumer-Directed Community Supports (CDCS) — is being transitioned into **Community First Services and Supports (CFSS)** as of October 1, 2024. CFSS replaces both PCA and CSG. Existing CDCS participants are being transitioned at their annual reassessments.

This doesn't invalidate the vision (CFSS is still self-directed with FMS requirements), but it means:
- The regulatory framework is actively changing
- The specific program rules we'd need to comply with are CFSS rules, not CDCS rules
- The transition creates both uncertainty and opportunity

### 6. Accra Is Not a Startup-Disruptable Target (Short Term)

Accra's actual position:

- **Founded:** 1992 (33 years of operations)
- **Structure:** Multiple nonprofit entities (Accra Care Inc., Accra Home Care Inc., Accra Home Health Inc., Accra Consumer Choice Inc.)
- **Assets:** ~$75.9 million
- **Clients:** 11,000+ statewide
- **Coverage:** All 87 Minnesota counties, 19 office locations
- **Licenses:** 245D HCBS licenses, MHCP enrollment, DHS FMS contract
- **Services:** PCA/CFSS agency model, PCA Choice, CDCS, CSG, CFSS Budget Model, 245D waivered services, home health care

Accra is not a payroll company. Accra is a comprehensive home care organization with 245D direct service provision, FMS operations, and home health services. Displacing Accra requires matching their statewide coverage, 30+ years of institutional relationships, and multi-service capability.

### 7. The Union Factor

Minnesota home care workers are unionized (SEIU). FMS providers must comply with collective bargaining agreement requirements, including:
- Wage minimums
- Holiday pay (1.5x for 9 designated holidays, effective July 2025)
- PTO payout (up to 120 hours upon separation, effective January 2026)

This adds compliance complexity and cost that we did not account for.

### 8. Worker Classification Is Non-Negotiable

In the budget model (self-directed care), caregivers are **W-2 employees** of the participant, not 1099 contractors. The F/EA processes W-2s on behalf of the participant-employer using the F/EA's EIN under IRS Section 3504. Both the F/EA and the participant-employer are **jointly and severally liable** for employment taxes.

Misclassification is not a "different approach" — it is illegal and triggers back taxes, penalties, DOL enforcement, and potential criminal liability.

### 9. HIPAA Surface Area Is Real

A technology platform handling PHI is almost certainly a **business associate** under HIPAA. Requirements include:
- BAA with every covered entity we interact with
- HIPAA Security Rule compliance (encryption, access controls, audit logging, risk assessments)
- MARS-E compliance if handling Medicaid data (FIPS 140-2 encryption standards)
- Breach notification procedures
- Penalties: up to $2.1 million per violation category, criminal penalties up to $250,000 and 10 years imprisonment

### 10. The Agency vs. Budget Model Distinction

This is the fundamental structural distinction:

| Dimension | Agency Model | Budget Model (Self-Directed) |
|---|---|---|
| Who employs the caregiver? | The agency | The participant (care recipient/family) |
| Who directs the care? | The agency dispatches | The participant chooses and directs |
| Who handles payroll? | The agency | The FMS/F/EA on behalf of the participant |
| Who bills Medicaid? | The agency | The FMS/F/EA |
| Licensing required | 245D + MHCP enrollment | FMS contract through DHS RFP |
| Caregiver flexibility | Agency assigns | Participant hires anyone (including family) |
| Revenue model | Per-unit billing to Medicaid | Administrative fee from participant budget |

**CareSupport's vision maps to the budget model** — families directing their own care with CareSupport as the intelligent FMS. But operating in the budget model requires winning the DHS FMS contract. Operating in the agency model requires 245D licensing (1.5-2 year process).

There is also a **hybrid: Agency With Choice (AWC)**, where the agency is employer of record but the participant selects and directs workers. This could be a middle path.

---

## What This Means for the Gravity Well

The gravity well is not wrong. But it has a regulatory gate between Layers 4 and 5 that we did not account for:

```
Layer 1: Solo Agent                    ← Buildable now
Layer 2: Multi-Party Coordination      ← Buildable now
Layer 3: Companion App                 ← Buildable now
Layer 4: Compliance/EVV                ← Achievable (EVV vendor certification is accessible)
                                       
         ══════ REGULATORY WALL ══════
         - DHS RFP (unpredictable timing)
         - IRS Section 3504 authorization
         - Surety/fidelity bonds ($70K-$120K)
         - MHCP enrollment
         - State system integrations
         - Fraud scrutiny environment
         - $2-5M capital
         - 3-5 year timeline
         ══════════════════════════════
                                       
Layer 5: FMS                           ← Requires winning DHS RFP
Layer 6: Marketplace                   ← Requires FMS or partnership
```

The cascade from coordination to compliance is real and achievable. The cascade from compliance to FMS is gated by state contracting, federal tax authorization, and capital. The vision holds, but the path through the wall is not inevitable — it requires deliberate regulatory strategy.

---

## Alternative Paths (Ranked by Feasibility)

### Path 1: Technology Vendor to Existing FMS Providers (Fastest)

Build CareSupport as a SaaS platform that FMS providers use. Sell coordination, communication, scheduling, and care intelligence tools to the 16 contracted FMS providers in Minnesota. **No state licensure. No Medicaid enrollment. No RFP.**

The pitch to a mid-tier FMS provider: "Your competitors have 30 years of relationships. You can have the best technology. CareSupport gives your families AI-powered coordination, conversational EVV, and a companion app — your enrollment grows because families prefer you."

**Pros:** Fastest to market. Zero regulatory burden. Revenue from SaaS. Builds relationships with FMS providers and the Medicaid ecosystem. Demonstrates value before pursuing own license.
**Cons:** CareSupport does not control the financial layer. Revenue is SaaS, not FMS margin. Dependent on FMS partner adoption.

### Path 2: EVV Vendor (Accessible Technical Entry Point)

Become a certified third-party EVV vendor through HHAeXchange integration. The process:
1. Complete HHAeXchange Third Party EVV Attestation form
2. HHAeXchange contacts within 2 business days with integration steps
3. Complete Phase I Certification (API integration testing)
4. Appear on Minnesota's approved third-party EVV systems list

**This is a technical certification, not a regulatory license.** It gets CareSupport's name on a state-published list and establishes credibility in the Medicaid ecosystem.

**Pros:** Relatively fast (months, not years). Technical, not regulatory. Gets CareSupport into the Medicaid ecosystem. Can be sold to FMS providers and agency providers.
**Cons:** EVV alone is not the vision. Must be combined with other paths.

### Path 3: Partner With an Existing FMS Provider (Strategic)

Rather than becoming an FMS, partner with one of the 16 contracted providers. CareSupport handles coordination, communication, and family engagement. The FMS partner handles payroll, billing, and compliance. The family experiences CareSupport as the front end; the FMS is the back end.

**Target partners:** Mid-tier FMS providers who want technology differentiation but can't build it — not Accra (too large, too entrenched), but a provider like Mains'l, Heritage, or Orion who would benefit from a technology partnership.

**Pros:** Fast to market. FMS regulatory burden stays with the partner. CareSupport builds track record in the ecosystem. Revenue sharing or SaaS fees.
**Cons:** CareSupport does not control the financial layer or the full experience. Partner dependency.

### Path 4: Support Planner Services (Lightweight Medicaid Entry)

Support planners help CDCS/CFSS participants write community support plans, manage budgets, recruit workers, and coordinate services. Must be DHS-certified but do not need 245D or FMS enrollment.

CareSupport's AI coordination could enhance support planning — helping families build better care plans, optimize budget allocation, and identify care needs. This puts CareSupport in the room with families, case managers, and FMS providers.

**Pros:** Direct family relationship. Builds care context. Lighter regulatory path.
**Cons:** Limited scope. Does not control financial layer.

### Path 5: Acquire a Small Existing FMS Provider (Capital-Intensive)

Instead of building FMS capability from scratch or waiting for an RFP, acquire one of the smaller contracted FMS providers. This gives CareSupport the DHS contract, MHCP enrollment, IRS authorization, and operational infrastructure.

**Pros:** Fastest path to FMS status if capital is available. Inherited contract, relationships, and regulatory approvals.
**Cons:** Requires significant capital. Integration risk. Cultural alignment with acquired entity.

### Path 6: Pursue FMS Licensing Directly (Long-Term)

Apply for IRS Section 3504 authorization, wait for the next DHS FMS RFP, submit a competitive bid, and build the operation from scratch.

**Pros:** Full control. Own the financial layer.
**Cons:** 3-5 year timeline. $2-5M capital. RFP timing is unpredictable. Competing against 16 incumbents. Hostile enforcement environment.

---

## The Revised Gravity Well

The gravity well still holds — but it passes through the regulatory wall via partnerships, not brute force:

```
Layer 1: Solo Agent (today)
  ↓
Layer 2: Multi-Party Coordination (build)
  ↓
Layer 3: Companion App (build)
  ↓
Layer 4: EVV Vendor Certification (HHAeXchange integration)
  ↓
Layer 4.5: Technology vendor to FMS providers (SaaS revenue)
  ↓
Layer 4.7: FMS partnership (CareSupport front-end + FMS back-end)
  ↓
  ════ REGULATORY WALL (traversed via partnership track record) ════
  ↓
Layer 5: Own FMS license (via RFP win or acquisition)
  ↓
Layer 6: Marketplace
```

The cascade is the same. The path through the wall is: prove the technology, partner with an FMS, demonstrate value to families and the state, then pursue the license (or acquire one) from a position of demonstrated credibility.

---

## What We Got Wrong

1. **We assumed FMS was a licensing formality.** It is a competitive state contract with unpredictable timing.
2. **We assumed the path was purely technical.** It is regulatory, political, and relational.
3. **We assumed Accra was "just a payroll company."** Accra is a comprehensive home care organization with 33 years of operations, $75.9M in assets, and 245D services.
4. **We assumed the enforcement environment was neutral.** Minnesota is in crisis — $9B in suspected fraud, 18,000+ provider terminations, CMS deferrals.
5. **We assumed CDCS was the stable program.** It is being replaced by CFSS.
6. **We did not account for the union.** SEIU compliance adds cost and complexity.
7. **We did not account for joint tax liability.** Under Section 3504, the F/EA is jointly liable for employment taxes — real financial risk.

## What We Got Right

1. **The coordination layer IS the entry point.** Building from the conversation outward is correct.
2. **The companion app IS the gate to EVV.** GPS + timestamps from the app enable visit verification.
3. **EVV vendor certification IS accessible.** HHAeXchange integration is a technical process, not a regulatory one.
4. **Families directing their own care IS the trend.** CFSS expands self-direction. CMS is pushing it. The market is growing.
5. **FMS providers DO lack technology.** The coordination gap is real. FMS providers are administrative pipes. The technology vendor path is viable and valuable.
6. **The network effect IS real.** Nothing in the regulatory landscape invalidates the platform economics. It changes the timeline, not the destination.
7. **The economic redistribution argument holds.** Agency overhead IS where the money goes. Self-directed care IS cheaper for the state and better for families. CareSupport making self-direction viable IS the value proposition.

---

## The Honest Statement

The gravity well is real. The destination is real. The economics are real. The network effects are real.

The path is longer, harder, and more expensive than we assumed. The regulatory wall between Layer 4 and Layer 5 is not a step — it is a multi-year, multi-million-dollar journey that passes through partnerships, EVV certification, demonstrated credibility, and either an RFP win or an acquisition.

The vision does not change. The sequencing does. And the sequencing is the difference between a founder with a vision and a founder who builds a company.

---

*This document was born from the founder's recognition that "we're caught in perfect-assumption" — the pattern where internal logic is so coherent that the premises go unchecked. The premises have now been checked. The vision survives. The timeline is honest.*
