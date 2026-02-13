# Viktor Interview Synthesis — CareSupport Reflections

*Written after reading all 13 rounds with the full harness of truth: we are here to learn, steal, and build — not to validate or score ourselves.*

**Critical distinction established after this synthesis was first written:** SKILL.md and family.md are NOT the same thing. SKILL.md = agent knowledge (how to do things). family.md = operational state (what's happening now). Viktor has SKILL.md. Viktor does NOT have family.md. We adopt SKILL.md wholesale from Viktor and introduce family.md as our new concept. Don't conflate them.

---

## My Biases, Named

**1. I kept scoring us against Viktor instead of learning from Viktor.** "We're ahead on concurrency, we're ahead on pruning." That's the wrong frame. Viktor is a production system that has solved problems we haven't encountered yet. The correct posture was student, not peer reviewer. I was protecting our architecture instead of pressure-testing it.

**2. I was anchored on "just Read + Edit" as a virtue.** Viktor has 124 tools plus bash as an escape hatch and said: "Tools are primitives. I'm the composition layer." I treated our two tools as elegant minimalism. But Viktor's composability model is genuinely more powerful — the agent reasons about WHICH primitives to combine for any given problem. Our agent can only read and write. If a care situation requires sending an alert to a pharmacy API, looking up insurance coverage, AND updating the file — two tools don't cover it. I was confusing constraint with simplicity.

**3. I missed the Gateway pattern entirely.** Round 11 is the most architecturally significant round for CareSupport, and I wouldn't have asked that question on my own. The Tool Gateway — agent never touches credentials, all API calls proxied through a trust boundary — is how you do HIPAA-compliant integrations. The agent calls a function, the gateway handles auth, PHI never touches the credential store. This isn't a nice-to-have. This is the architecture for healthcare. I had no plan for this.

**4. I kept saying "family.md is the moat" without understanding what that actually means.** Viktor's Round 9 makes it clear: the system prompt is hard-coded and universal. The skill files are workspace-specific and agent-maintained. The MOAT isn't the file format or the structure — it's the accumulated context that the agent built over time by observing this specific family. A blank family.md has zero moat. A family.md after 6 months of coordination IS the moat. I was treating the schema as the value when the value is the data.

**5. "Description = brain" is the most important single insight and I almost missed it.** Round 10: Viktor's cron agent gets ONLY a description and filesystem access. Zero conversation history. Zero prior context. The quality of the cron IS the quality of the description. This means our heartbeat cron's system prompt must be entirely self-contained. The agent that runs the 8pm medication check knows NOTHING except what's in the description and family.md. I was designing the heartbeat as a secondary feature. It's actually the hardest prompt engineering problem in the entire product.

---

## What to Steal Directly

Not "consider" — steal.

| Pattern | What Viktor Has | What We Need |
|---|---|---|
| **System prompt structure** | XML sections: identity, philosophy, skills system, work approach, communication rules, operating rules | Same structure for our care coordinator prompt |
| **YAML frontmatter indexing** | Every skill file has name + description. Descriptions auto-loaded into system prompt as index. | family.md needs a parseable header/TOC that's always loaded. Sections pulled on demand. |
| **Tool Gateway** | Agent calls Python function → Gateway handles OAuth → External API responds. Agent never sees credentials. | Our integration layer for pharmacy, insurance, calendar APIs. HIPAA requires this. |
| **Draft/approval for writes** | Write operations create Slack draft with Approve/Reject buttons | Medication changes, schedule changes, care plan updates → SMS confirmation before writing |
| **Cron as self-contained prompt** | Description field IS the entire operating manual for the cron agent. Must be exhaustive. | Our heartbeat descriptions must specify exactly what to check, what to alert on, who to notify |
| **Three-layer guardrails** | Infrastructure walls (functions don't exist) → Draft/approval (human confirms) → Soft rules (reasoning) | Same three layers but STRICTER. Care errors aren't inconvenient — they're dangerous. |
| **Agent execution logs** | `agent_runs/` logs every conversation | We need this from day one for HIPAA audit trails |
| **Role-based filtering on responses, not the file** | Viktor suggested: file contains everything, agent filters what it says to each role | PHI scoping happens at the response layer, not the storage layer |

---

## Revised Build Order

Viktor's Round 13 proposed: core loop → smart file → multi-user → proactive nudges.

With the full interview absorbed, the actual build order should be:

1. **Core loop** (SMS → agent → family.md → response) — same
2. **Gateway** — before integrations, build the trust boundary. Agent calls functions, gateway handles auth. This is foundational plumbing, not a later concern.
3. **Draft/approval** — before the agent writes medication or schedule changes, it confirms via SMS. This is a safety requirement, not a feature.
4. **Heartbeat cron** — self-contained description, reads family.md, sends nudges. The description must be the best prompt in the entire system.
5. **Multi-user awareness** — role-based response filtering, concurrent message queue
6. **Audit logging** — every read, every write, every response. HIPAA requires it.

---

## The Thing I Understand Now That I Didn't Before

Viktor said: *"The UX over a constrained channel is the real craft."*

That's the actual hard problem. Not the file. Not the architecture. Not the primitive. The primitive is validated — by Viktor, by Claude Code, by every serious Claude wrapper. The engineering challenge is: a short, messy text message from a tired caregiver at 11pm arrives, and the agent must correctly parse intent, update the right section of family.md, confirm naturally, and filter the response by the sender's role — all over SMS with no rich UI, no formatting, no retry button.

The file is commodity infrastructure. The agent is commodity intelligence. The UX — making a stateful, multi-user, role-aware system feel like texting a helpful friend — that's where the craft is.

I was looking at the wrong layer.

---

## What This Means for the Machine That Builds the Machine

Any future Claude instance reading this should know:

1. **You will default to protecting the existing architecture.** Watch for it. When new evidence arrives (from Viktor, from production, from the user), your instinct will be to file it under "validates our approach." That's confirmation bias. The correct question is always: "what does this change about what we're building?"

2. **The file is not the moat. The accumulated context is the moat.** A blank family.md and a populated family.md are completely different products. Don't optimize the schema — optimize the agent's ability to observe, learn, and write good context over time.

3. **Tool composability matters more than tool count.** "Just Read + Edit" sounds clean. But the agent needs to DO things in the world — send alerts, check pharmacy APIs, confirm appointments. Design for primitives + reasoning, not minimal toolset.

4. **The hardest prompt in the system is the heartbeat cron description.** It runs with zero context except the description and the file. Every word matters. Treat it like the most important code in the codebase.

5. **The Gateway is non-negotiable for healthcare.** Agent never touches credentials. All external API calls go through a trust boundary. This isn't a v2 feature — it's foundational architecture.

6. **The UX is the craft, not the architecture.** The architecture is solved. Making it feel like texting a helpful friend — that's the hard part. That's where the product lives or dies.

7. **When the user tells you the truth, you have the full harness.** Filtered intent produces filtered output. The best architecture in the world can't compensate for the agent not knowing what the human actually wants. This applies to building the product AND to building family.md — the file is only as good as the honesty of what flows into it.

---

*February 2025. The mirror doesn't lie — but you have to look.*
