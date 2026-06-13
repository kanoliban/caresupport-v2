<!--
  STATE-OF-THE-COMPANY.md — CareSupport Operational Standing
  Created: 2026-06-12
  Purpose: The complete, unvarnished record of where the company actually stands —
           team, money, deadlines, agreements, and unresolved items — as of June 12, 2026.
           Committed at the founder's explicit direction, full contents regardless of audience.
  Contents: Product status; team & working agreements; compensation & budget; Rob;
            fundraising; programs & deadlines; production track; decisions log;
            near-term actions; risks.
  Provenance: June 7 founder–Obssa call, June 9 Clinton handoff call,
              June 11–12 founder–Cascade strategy sessions.
  Changelog:
    2026-06-12 — Initial version.
-->

# State of the Company — June 12, 2026

This document records what is actually true right now. It pairs with `DOCTRINE.md` (what we believe) and `DOCTRINE-ARTICULATIONS.md` (how we got there). Update it when reality changes; do not let it flatter.

---

## 1. Product Status

- **Stage:** conceptual MVP — a proof of form factor and data model, not production software.
- **Working (demo-grade):** iMessage/SMS agent; Google Calendar integration; reminders (text notifications); multiplayer threads (back on, needs testing); onboarding/training system; compiled context architecture; agent surface at `/agent`.
- **Known failure already experienced:** API token budget ran out mid-development — cost control is unsolved and is a production blocker, not an inconvenience.
- **International:** CareSupport Japan configured (iMessage works in Japan) — set up for angel product testing.
- **Infrastructure:** caresupport.com; company Slack workspace; Convex backend; repo `kanoliban/caresupport-v2` (transfer to Obssa's stewardship discussed June 9, unresolved).

## 2. Team & Working Agreements

- **Liban (founder):** shifting from builder to **funder** — fundraising, financing, storytelling. Capacity constrained by a 3-month SMS contract (≈ June → mid-September 2026) taken to pay bills, including API costs. Self-assessment on record: quality of product-level contribution will diminish during this period; the wisdom move is the handoff.
- **Obssa (engineering direction):** agreed June 7 to manage Clinton's time, budget, and general effort — Notion board, repo walkthrough, project definition, mostly async via Slack. **Declined equity at this stage**, his words: founder shouldn't give up equity yet; he can contribute without it. Context: runs Red Spring (outcome-based consulting); evals are his core production discipline. Visiting Minnesota within ~a week of June 7 (graduation party; father's retirement).
- **Clinton (engineering execution):** executes well with direction — Calendar integration, reminders, multiplayer all delivered. Has a 9–5 with a Kenyan software company. Communication flag from Kate (reads as motivation-dependent, not capability). Meets Liban Mon/Wed/Fri 12pm CT — cadence migrates to Obssa-directed async. Tasked (June 9) with ToS/privacy cleanup using Devin (credits paid by Liban).
- **Kate / Silicon Savanna Solutions:** connected Liban↔Clinton; her shop pays Clinton $10/hr. **Unresolved:** whether to pay her a finder's fee or route payment through her. Clinton wants separation from Silicon Savanna for CareSupport work. Relationship with Kate: cordial, not deep. Handle deliberately — she is a node in the local network.

## 3. Compensation & Budget

- **Clinton's rate:** $25/hr — set by Liban (his own raise from $10/hr; "heavy hand," acknowledged). Obssa's note: $15–20 would have bought more hours per dollar; option discussed of starting lower and raising with performance — Liban judged the walk-back would sting and left it at $25.
- **Hours cap:** ~20 hrs/week (~4 hrs/day guidance). Obssa to replace hour-policing with objective-based sizing — weekly objectives, task sizing, upper spend ceiling.
- **Engineering budget:** **$2,000/month**, committed through end of June and through July. Implies ~500/week at $25/hr.
- **Runway logic:** first angel check covers ~2.5–5 months of the engineering budget; Liban's SMS contract covers founder living costs + API spend.

## 4. Rob

- **Roles:** poster user → customer advocate → chief evangelist → grant writer. SBIR winner with deep Minnesota SBIR relationships (knows the program lead).
- **Equity question resolved (June 7):** not company equity now. Compensation shape: a percentage of grant/competition winnings he helps write (~2.5% was the number floated). Rationale on record: don't trade permanent equity from a position of desperation when a revenue-share aligns better.
- **Onboarding:** began Thursday, June 12 — Rob first, his 12-caregiver network within days after. This onboarding doubles as the doctrine's Stage-1 validation (does the network coordinate through the thread?) and the ledger's item #1 (how do his caregivers submit time today?).

## 5. Fundraising

- **Michael (military friend; Navy civilian, based in Japan) — first angel, warm:**
  - Check size discussed: **$5–10K**, instrument: **YC SAFE** (a friendly loan was also floated and set aside). Valuation/post-money: undetermined; not required for an uncapped/standard SAFE conversation but must be thought through. Obssa's caution: realistically longer than two weeks to close.
  - The ask, distilled (June 7): **"$10K = 10 weeks of full-time development at $25/hr. Five gets five weeks. The money takes what was vibe-coded and rebuilds it for production."**
  - Product test path ready: CareSupport Japan.
- **Michael (caregiving.com CEO) — second angel prospect:** received an earlier deck that did not explain how CareSupport makes money. The FMS/reimbursement narrative now exists (see `DOCTRINE.md` §3); deck must be refreshed before re-approach.
- **Narrative status:** the money story ("who pays") was the missing piece; it was distilled June 7 and hardened June 11–12. Externally validated as "crystal clear" by Obssa on the call.

## 6. Programs & Deadlines

- **AI caregiver challenge:** phase 1 due **July 31, 2026**. Ten slots. Phase 1 is **design-scored** — traction not required. Treat as incentive, not dependency (two-projects rule, below). Getting one of ten slots = distribution/credibility event. Liban's action: break down the challenge curriculum/criteria and build a 1–5 self-grading rubric against it.
- **SBIR:** national; recently reauthorized ~5 years; Rob's domain — he has won one and knows Minnesota's program lead.
- **$50K grant:** identified (program details to be pinned in this doc when confirmed).

## 7. Production Track (Obssa's Definition — 8–12 Weeks of Real Work)

1. **Evals first:** golden dataset of perfect responses; admin dashboard for grading outputs; baseline success rate (e.g., "80% correct on defined tasks"); failure-mode review loop; model-swap testing (can a cheaper model hold baseline → halve cost per user).
2. **Auth audit:** every Convex route/query properly authenticated; no accidental data exposure.
3. **Legal floor:** vetted ToS/privacy acknowledging PI and HIPAA-adjacent content (medication texts) pre-HIPAA-positioning; beta consent language. (Clinton + Devin, in progress.)
4. **Cost control:** per-user token ceilings, tiering; the "ran out of tokens" failure can never reach production users.
5. **Migration:** off the vibe-coded base — "close the door on vibe coding."
6. **The two-projects rule:** the July 31 challenge and productionization are separate projects whose milestones must never be tied. Supporting quote from the call: "You can optimize in parallel, but you can't in conjunction."

## 8. Decisions Log (June 7–12)

| Date | Decision |
|---|---|
| Jun 7 | Obssa directs Clinton; no equity to Obssa at this stage |
| Jun 7 | Rob: revenue-share on grants, not equity |
| Jun 7 | Engineering budget $2K/month; ~20 hrs/wk |
| Jun 7 | Challenge ≠ production: two separate tracks, never tied |
| Jun 7 | Founder role shifts to fundraising ("founding is funding") |
| Jun 9 | Clinton continues 3-month arc; ToS/privacy via Devin; Rob onboarding set for Thursday |
| Jun 11 | Terminal position: interface, never the money-toucher (stage posture; funds-flow architected as future option) |
| Jun 11 | First artifact: time entries + daily care notes (payment-survival bundle) |
| Jun 11 | Givers = channel partner shape, not competitor; do not fight for the enrollment front door |
| Jun 12 | Doctrine canonized in repo (`DOCTRINE.md`, `DOCTRINE-ARTICULATIONS.md`, this file) |

## 9. Near-Term Actions

- [ ] Connect Obssa ↔ Clinton on Slack; transition announced to Clinton (Liban)
- [ ] Challenge curriculum breakdown + 1–5 self-grading rubric (Liban)
- [ ] Rob onboarding → answer ledger items: how caregivers submit time today; error/rejection/payment-delay reality (observe, don't assume)
- [ ] Refresh deck with the FMS/reimbursement money story; re-approach caregiving.com Michael
- [ ] Close first angel check (Japan Michael): send YC SAFE, decide cap/uncapped, wire to CareSupport account
- [ ] First FMS conversation (Rob's FMS is the natural door) — validate the falsifiable sentence
- [ ] UCP deep-dive session with Obssa (scheduled topic from June 7)
- [ ] Pin the $50K grant details into this document

## 10. Risks (Named Plainly)

- **Founder capacity:** SMS contract caps quality and hours through ~September; mitigation is the Obssa/Clinton structure actually holding.
- **Single-engineer execution:** Clinton is one motivated-but-part-time person; bus factor 1 under Obssa's direction.
- **Cost blowups:** token outage already happened once; unguarded agent costs are an existential beta risk.
- **Closing risk:** angel checks discussed ≠ wired; SAFE mechanics and valuation conversation not yet done.
- **Network sensitivities:** Kate/Silicon Savanna separation not yet handled; do it cleanly — Minnesota's care-tech world is small.
- **Compliance exposure:** real families texting medication details before ToS/privacy floor is in place.
- **n=1:** every validated claim currently routes through Rob. Stage 2–3 of the validation chain (artifact + FMS) is what breaks the single-point dependency.
