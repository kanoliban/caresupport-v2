# CTO Production Plan — Built by Inversion

**Date:** 2026-02-24
**Author:** Viktor (CTO), with Lee Kano (Founder & CEO)
**Method:** Charlie Munger's inversion — think backward from failure to build robust strategy
**Status:** 🔨 Active

> Munger: *"All I want to know is where I'm going to die, so I'll never go there."*

Before the plan — the deaths. Not hypothetical. These are the specific ways CareSupport ceases to exist. Every phase of the plan exists to avoid one or more of these. If a phase doesn't prevent a death, it doesn't belong in the plan.

---

## Part 1: The Seven Deaths of CareSupport

### Death 1 — Legal extinction

*How to guarantee it:* Ship with real PHI before the Anthropic BAA is signed. One family member's medication list leaks. No Business Associate Agreement means no HIPAA coverage. Liability is personal, not corporate at this stage. One incident and there is no CareSupport.

### Death 2 — Trust destruction

*How to guarantee it:* The agent gives wrong medication information. Or it tells Rob's mother about a medication she doesn't have access-level clearance to see. The family doesn't file a complaint — they just stop texting. Trust, once broken in healthcare, does not return. The family is gone, and every family they would have referred.

### Death 3 — Silence

*How to guarantee it:* Build for six months. Perfect the architecture. Implement Code Mode, protocol discovery, section-level family.md loading, healthcare MCP integrations. Never send a real text to a real family. Never learn that the agent's tone is wrong, or that families don't text about schedules the way the simulations assumed, or that the approval flow takes too many back-and-forths. Run out of time and energy building the machine that was supposed to build the machine. This is the machine doc's Failure Mode 1 at the company level.

### Death 4 — Indifference

*How to guarantee it:* The agent works correctly but isn't useful. It responds to "can someone drive mom tomorrow" with a technically accurate summary of the schedule instead of texting the two people who are usually free on Wednesdays. The family switches back to the group chat because it's faster. The agent was right. The product was wrong. This is the subtlest death — you can have 117 passing tests and a product nobody uses.

### Death 5 — Fragility

*How to guarantee it:* No CI pipeline. No commit gate. Ship a change that breaks the role filter. A family member with `schedule` access receives medication details for three hours before anyone notices. Or: no message queue, two messages arrive simultaneously, both trigger family.md updates, file corruption. Or: no backup strategy, a malformed edit wipes the schedule section, no rollback.

### Death 6 — Cost death

*How to guarantee it:* Every message loads 16 protocols + full family.md + full conversation history. Token cost: $0.15 per message. Family sends 30 messages/day = $4.50/day = $135/month per family. Unit economics never work. The more families we serve, the faster we burn.

### Death 7 — Complexity death

*How to guarantee it:* Build the platform before the product. Design the healthcare MCP ecosystem before a single pharmacy has an API we can connect to. Implement Code Mode sandbox before we know which protocols need composition. Add V8 isolates for structural safety before we've confirmed the Python enforcement layer holds under real load. Each addition is individually reasonable. Together they reconstruct the 20,000-word architecture the primitive shift collapsed. The machine doc calls this out explicitly: *"every drift begins with 'we need a system for X' where X is something the agent already does."*

---

## Part 2: The Plan — Sequenced by Existential Risk

The plan has five phases. Each one is named by what it prevents, not what it builds. If you can't name which death a phase prevents, it doesn't belong.

### Current State — Honest Inventory

| Asset | State |
|-------|-------|
| Enforcement (4 modules) | Wired into handler, 117 tests passing |
| 16 protocols | Written, not production-validated |
| Handler pipeline | Working (poll → resolve → filter → agent → post-check → send) |
| Approval pipeline | 381 lines, classify/resolve/expire, 16 tests |
| Heartbeat cron | 48-hour lookahead scanner, 18 tests |
| Maintenance cron | GC + consistency validation, 17 tests |
| Linq iMessage branch | PR-ready, separate branch |
| 52 simulations | 99.5% pass rate, 5 synthetic families |
| family.md spec + examples | Complete (rob-family.md, 5 sim families) |
| SOUL.md | Draft started (Claw identity, not finalized) |
| user.md | Schema not defined |
| Real family data | Zero. All synthetic. |
| CI/CD pipeline | Zero. Test suites ready, no GitHub Actions. |
| Anthropic BAA | Not signed. |
| A2P registration | Pending (external). |
| OpenClaw deployment | Zero. |
| Message queue | Zero. Concurrent messages can race. |
| Gateway consolidation | Two implementations (twilio_proxy + sms_gateway). |

---

### Phase 1: Prevent Deaths 1, 2, 5 — "Make it safe to exist"

*No real family touches the system until these are done. Non-negotiable. This is the Munger logic: the cost of moving fast here is extinction. The cost of moving slow is weeks.*

#### 1a. Sign the Anthropic BAA
**Prevents:** Death 1

This is a legal document, not a technical task. Without it, every real family.md with real names and medications is a liability. Anthropic offers BAAs for Claude API — execute it. Until this is signed, all testing uses synthetic data only.

*Owner: Lee. Dependency: None. Blocker for everything after Phase 1.*

#### 1b. Configure CI pipeline
**Prevents:** Death 5

The 8 test suites (117 tests) are ready. No code is written here — just wire them:
- GitHub Actions workflow: on every push and PR
- Gate: syntax → structural → unit tests. Any failure blocks merge.
- The structural tests (AST-based) verify enforcement modules are imported in the handler. This means no one can accidentally unwire safety.

*Owner: Viktor. Dependency: None.*

#### 1c. Consolidate gateway
**Prevents:** Death 5

Two implementations is ambiguity. Ambiguity in a safety-critical pipeline is a bug. Pick one (sms_gateway.py has draft approval support, that's the winner), delete the other, update all references.

*Owner: Viktor. Dependency: None.*

#### 1d. Add message serialization per family
**Prevents:** Death 2, Death 5

Two messages from the same family arriving within seconds must not race on family.md. File-based lock or queue. Simple. The machine doc says: *"serialize with a queue. The file is the truth."*

*Owner: Viktor. Dependency: None.*

#### 1e. Finalize SOUL.md and define user.md schema
**Prevents:** Death 4

The agent needs a soul before it talks to anyone. The user.md schema resolves the VISION.md ↔ PRD tension: does individual member context live in family.md or alongside it? Recommendation: alongside. `families/kano/members/liban.md` — preferences, patterns, conversation history that's too individual for the family file. The family.md stays operational. user.md stays personal.

*Owner: Viktor + Lee. Dependency: Architectural decision from Lee on user.md placement.*

---

### Phase 2: Prevent Death 3 — "Ship to one family"

*The single highest-risk failure for a startup is silence — building without shipping. This phase exists solely to make that impossible. We ship to the Kano-Tefera family. Not Rob's network. Not a synthetic family. The Kano-Tefera family.*

**Why Kano-Tefera first, not Rob?**

Inversion says: how do we guarantee Death 3? By starting with the hardest case. Rob's network has 15 people across 3 agencies, complex medical needs, a quadriplegic coordinator. If we start there and something goes wrong, the consequences are real and the debugging surface is enormous. Kano-Tefera is a foot surgery recovery — manageable, temporary, and the coordinator is the founder. If the agent makes a mistake, Liban catches it instantly. *Start where failure is cheapest.*

#### 2a. Populate real family.md for Kano-Tefera

7 members. Real phone numbers (they're in VISION.md). Real schedule. Real needs. Lee provides the ground truth — he lives this coordination daily.

*Owner: Lee provides data, Viktor structures it per family-md-spec.*

#### 2b. Create user.md for each member

Liban: coordinator, tech-savvy, likely texts in short bursts. Degitu: care recipient, may text about needs directly. Solan, Yada, Haley, Roman, Kano: caregivers with different availability patterns. These start thin and thicken through conversation.

*Owner: Lee provides character, Viktor writes initial files.*

#### 2c. Deploy on OpenClaw

The handler pipeline works locally. Deploy it. Wire Twilio webhook (or use poll_inbound.py as interim until webhook is stable). Verify: text in → enforcement → agent → enforcement → text out.

*Owner: Viktor. Dependency: 1a (BAA signed), 1c (single gateway).*

#### 2d. First real text

Liban texts the CareSupport number. A real message enters the real pipeline. The agent reads the real family.md, reasons against it, responds through the real enforcement layer, and delivers a real SMS.

*This is the moment CareSupport exists.* Everything before this is preparation. Everything after this is learning.

*Dependency: 2a, 2b, 2c complete. A2P cleared or toll-free verified (external blocker).*

---

### Phase 3: Prevent Deaths 4 and 6 — "Learn what we don't know"

*This phase has zero building and maximum observation. The machine doc says: "if you haven't seen this problem in production, you're guessing. Ship without it and see if it breaks." Phase 2 shipped. Phase 3 watches.*

#### 3a. Instrument everything
**Prevents:** Death 6

Before the first real text, add counters for:
- Tokens per message (input + output)
- Which protocols activate per message
- Latency: message received → response sent
- family.md reads vs. writes per conversation
- Approval requests generated vs. resolved
- Messages per member per day

This is plumbing. The agent can't measure itself.

#### 3b. Run for 30 days with the Kano-Tefera family

Daily review against the 8-dimension rubric from Doc 7. But focus on two things:

1. **Does the agent reduce coordination burden?** If Liban still has to coordinate in the group chat AND text CareSupport, we've added work, not removed it. This is Death 4.
2. **What does the agent get wrong?** Not in simulations — in real life. The 52 simulations had 99.5% pass rate. Real conversations will surface what simulations can't: ambiguous messages, typos, bilingual texts, messages at 2am, sarcasm, messages meant for the group chat sent to CareSupport by accident.

#### 3c. Document what we learn

Every surprise, every failure, every thing we didn't anticipate. This becomes the input for Phase 4. Not the PRDs. Not the architecture. *Production evidence.*

*Owner: Lee (daily user review), Viktor (instrumentation, analysis).*
*Timeline: 30 days minimum. Don't cut this short.*

---

### Phase 4: Prevent Death 2 under real stress — "Second family"

*Kano-Tefera is the learning case. Rob's network is the stress test. The enforcement layer either holds here or it doesn't.*

**Why Rob is Phase 4, not Phase 2:**

- 15 people across 3 agencies. Access levels range from full (Rob) to provider (external caregivers who should see schedule only).
- Medication management with real consequences — missed medication for a quadriplegic isn't inconvenient, it's dangerous.
- The coordinator operates the phone with his nose. Response time and message length matter differently.
- Three agencies that don't talk to each other, using Rob as proxy — this is the multi-party coordination the product thesis is built on.

What we learn from Phase 3 shapes how we onboard Rob. Maybe the protocols need tuning. Maybe the approval flow has too many steps. Maybe the agent's tone doesn't work for professional caregivers the way it works for family. We need 30 days of Kano-Tefera evidence before we know.

#### 4a. Populate Rob's family.md

~15 members, 3 access tiers, 3 agency affiliations. This is the most complex family.md that will exist in v1.

#### 4b. Stress-test enforcement

Manually test every access boundary: provider sees schedule but not medications, family sees medications but not provider notes, emergency override temporarily elevates access. The 67 role_filter tests + 36 phi_audit tests were built for this. Now we verify they hold with real data, real edge cases.

#### 4c. Validate the agent handles multi-party coordination

The backfill scenario from VISION.md: someone cancels Saturday evening. Rob texts CareSupport. The agent must check availability across agencies, propose options, get Rob's approval, notify the replacement. This is the product thesis in one interaction.

*Owner: Lee (relationship with Rob), Viktor (technical onboarding + stress testing).*
*Dependency: Phase 3 learnings applied. 30 days of Kano-Tefera data.*

---

### Phase 5: Prevent Deaths 6 and 7 — "Optimize what evidence demands"

*This is where Code Mode, protocol discovery, and everything from the Cloudflare review earns its place — or doesn't. The key word is "evidence."*

**Only if Phase 3 data shows these specific problems:**

| Problem | Threshold | Solution | Pattern Source |
|---------|-----------|----------|----------------|
| >60% of protocol tokens go to protocols that never activate | Measured in Phase 3a | Protocol discovery (index in prompt, load on demand) | Cloudflare search() + execute() directory |
| Multi-step coordination takes >3 LLM round-trips | Measured in Phase 3a | Code Mode composition (agent writes coordination code against typed protocol API) | Cloudflare createCodeTool() wrapping protocol primitives |
| family.md >15K tokens and growing | Measured in Phase 3a | Section-level loading (Current always, Reference on demand) | Machine doc: "index in prompt, detail on demand" |
| Token cost per message >$0.05 | Measured in Phase 3a | Prune conversation history, compress family.md, lazy-load protocols | Cloudflare maxPersistedMessages, pruneMessages() |

**If the data doesn't show these problems, we don't build these solutions.** The machine doc: *"Am I building this because the product needs it, or because it's what I'd build for a traditional system?"*

The ecosystem layer (healthcare MCP, pharmacy APIs, insurance portals) gets designed but not built. The Tool Gateway architecture accepts new bindings. When a pharmacy API exists, `addMcpServer("pharmacy", url)` is a one-line addition. Until then, the agent coordinates via SMS like the humans do.

*Owner: Viktor. Dependency: Phase 3 + 4 data.*
*Timeline: Only after evidence. Not before.*

---

## Part 3: The Discipline — What We Refuse to Do

The plan is defined as much by what's absent as by what's present. Inversion demands we name the things we will *not* build, because each one is a path to Death 7.

**We will not** build a scheduling engine. The agent reads the schedule section of family.md and reasons about gaps. It IS the scheduling engine.

**We will not** build a healthcare MCP ecosystem. It doesn't exist. Designing for it is free. Building for it is Death 3.

**We will not** build Code Mode sandbox execution before Phase 5. The enforcement layer is Python, tested, and working. Replacing it with V8 isolates to match Cloudflare's architecture is building for aesthetic consistency, not for the product.

**We will not** build a dashboard before the SMS loop works end-to-end with real families. VISION.md describes the dashboard. It's real. It's coming. But it's not Phase 1-4. A dashboard nobody looks at is worse than no dashboard — it creates the illusion of visibility.

**We will not** add a database. The machine doc: *"We should add a database for better querying — the agent queries by reading the file. What query can't it answer?"*

**We will not** build multi-network orchestration. Each family is independent. v1 has one agent per family, one file per family, no cross-family anything. When we need multi-network, the evidence will be unmistakable.

Every item on this list is something we would naturally gravitate toward. That's why Munger's inversion matters — it's not protecting against bad ideas. It's protecting against individually reasonable ideas that collectively reconstruct the 20,000-word architecture.

---

## Summary

```
Phase   Prevents             What                        Dependency
─────   ────────────────     ──────────────────────────  ─────────────
  1     Deaths 1,2,5         Legal + safety + CI          None
  2     Death 3              First family live             Phase 1 + A2P
  3     Deaths 4,6           30-day observation            Phase 2
  4     Death 2 (stress)     Rob's network                 Phase 3
  5     Deaths 6,7           Optimize with evidence        Phase 3+4 data
```

**The critical path:** Anthropic BAA → real family.md → first real text → 30 days of learning → everything else.

**Three things can happen in parallel right now, today:**
1. Lee initiates BAA with Anthropic
2. Viktor configures CI pipeline + consolidates gateway + adds message serialization
3. Lee and Viktor finalize SOUL.md + define user.md schema

The A2P registration is the external wildcard. If it clears, Twilio SMS is the transport. If it doesn't by the time everything else is ready, we use the Linq iMessage branch (PR-ready, separate branch) or toll-free as fallback.

The entire plan is built on one Munger principle: **survive first, optimize later.** The deaths are ordered by how fast they kill. Legal extinction is instant. Trust destruction is weeks. Silence is months. Cost death is years. The plan follows the same order.

---

## Cross-References

| Document | Relevance |
|----------|-----------|
| [primitive-shift.md](../../design-docs/primitive-shift.md) | Why this architecture exists — the collapse that this plan protects |
| [the-machine-that-builds-the-machine.md](../../design-docs/the-machine-that-builds-the-machine.md) | The two failure modes, eight validated patterns, and the standard for every change |
| [family-md-spec.md](../../design-docs/family-md-spec.md) | The file spec that Phase 2 populates with real data |
| [core-beliefs.md](../../design-docs/core-beliefs.md) | Operating principles this plan is built on |
| [tech-debt-tracker.md](../tech-debt-tracker.md) | Granular tracking of known gaps |
| [VISION.md](../../../VISION.md) | Product vision — the Kano-Tefera and Rob narratives this plan sequences |
| [harness-engineering.md](harness-engineering.md) | The execution plan that got us to 117 tests — Phase 1 of this plan inherits that work |

---

*The machine doc ends with: "The craft is not the architecture. The craft is the UX. A short, messy text message from a tired caregiver at 11pm arrives. Making a stateful, multi-user, role-aware system feel like texting a helpful friend. That's where the product lives or dies."*

*That's the real work. Everything in this plan exists to get us there as fast as possible without dying on the way.* 🐾
