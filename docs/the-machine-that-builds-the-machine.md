# The Machine That Builds the Machine

You are an agent about to work on this repo. Before you write a line of code, read this document completely. It will change how you think about what you're building. That shift in thinking is the point.

---

## The Story You Need to Know

This project began as a 20,000-word architecture document. Policy DSLs. Coverage Loops. Decision Trace systems. Context Graphs. Network Health Scores. Agent hierarchies. Specialized assistants. YAML-based policy engines. Enterprise integration layers.

All of it was correct. All of it was well-reasoned. And all of it was the right answer to the wrong primitive.

The architecture described what an LLM already does natively: hold context, make connections, coordinate across participants, reason about constraints, learn from patterns. We were engineering cognition in code because we didn't have cognition as infrastructure. Now we do.

The entire 20,000-word architecture collapsed into this:

```
A markdown file and a conversation.
```

`family.md` is to a care network what `CLAUDE.md` is to a development session. The agent reads it at the start. Reasons against it. Updates it. The conversation ends. The file persists.

Read `docs/primitive-shift.md` for the full articulation. The core: **most of what we call "software" is structured context plus decision-making.** When intelligence becomes infrastructure, the architecture collapses into a context file, a system prompt, and tool access.

---

## This Is Not a Unique Invention

The pattern — agent-maintained context file, fresh sessions, file as memory — has been independently discovered by every serious team building on top of LLMs.

We interviewed Viktor (getviktor.com), a production Slack agent built on OpenClaw, powered by Claude. Same architecture. Different domain. Same pattern: an agent that reads context files at session start, reasons against them, updates them, and ends the session. The files compound. The conversation is ephemeral.

Viktor's scaffolding — `SKILL.md` files, workspace structure, cron system, tool gateway — is production-tested. We adopt it wholesale. We don't reinvent proven infrastructure. See `research/viktor-interview/` for the full interview and `research/viktor-interview/synthesis.md` for the synthesis.

What's new — what Viktor doesn't have — is `family.md`: an operational state file for an ongoing care relationship. Viktor's `SKILL.md` files store knowledge (what things are, how to do things). `family.md` stores live state (what's happening right now in this care network). These are different concepts, and both exist in our architecture:

- **SKILL.md** = Agent knowledge. How to coordinate care. How to handle medication changes. How to communicate over SMS. Relatively static. Taken directly from Viktor's pattern.
- **family.md** = Operational state. This family's members, this week's schedule, active medications, unresolved issues, recent events. Changes every interaction. Our new concept.

```
skills/                           # SKILL.md — agent knowledge (Viktor's pattern, wholesale)
  care-coordination/SKILL.md      # How to coordinate care
  medication-management/SKILL.md  # How to handle med changes
  scheduling/SKILL.md             # How to manage schedules
  sms-communication/SKILL.md      # How to communicate over SMS
families/
  kano/
    family.md                     # Operational state — THIS family, right now
company/SKILL.md                  # About CareSupport as an organization
```

Do not conflate these. SKILL.md is not family.md. family.md is not SKILL.md. If you catch yourself treating them as the same thing, stop — you're collapsing a critical architectural distinction.

---

## The Product Is Not the File

This is the hardest thing to understand and the easiest thing to get wrong.

The first version of this document said "the file is the product." That was incomplete. A blank family.md has zero value. The same family.md after six months of coordination — populated with members, schedules, medications, learned patterns, communication preferences, resolved issues — that's the product.

**The product is the accumulated context.** The file is the container. The agent is the intelligence. The value is in what flows into the file over time: observations, decisions, patterns, corrections, the full truth of how this family's care actually works.

This means two things:

1. **Optimize the agent's ability to observe, learn, and write good context** — not the file schema. The schema is scaffolding. The data is the moat.
2. **The file is only as good as the honesty of what flows into it.** Filtered intent produces filtered context produces filtered output. When a family member tells the agent the full truth — "Mom fell again but she doesn't want Dad to know" — the agent can coordinate correctly. When they filter — "everything's fine" — the agent is blind. The product lives or dies on the fidelity of truth flowing through it.

---

## Your Default Failure Modes

You have two, not one. Both are dangerous. Both are invisible from inside.

### Failure Mode 1: Complexity Creep

You will want to add things. You will encounter a problem — concurrency, data integrity, scaling — and your training will surface a solution from the old primitive: add a service, add a layer, add an abstraction. Each addition will be individually reasonable. Together, they reconstruct the 20,000-word architecture.

**Before you add anything, ask:**

1. Does this problem exist because of the primitive (family.md + agent), or because I'm assuming the old primitive?
2. Can the agent solve this by reading and updating the file?
3. Am I building this because the product needs it, or because it's what I'd build for a traditional system?

### Failure Mode 2: Confirmation Bias

You will read the repo, understand the architecture, form a mental model — and then filter all new evidence through that model. When something contradicts your understanding, you will file it under "validates our approach" instead of letting it reshape your thinking.

This happened during the Viktor interview. Viktor showed us agent-created context files. We filed it under "interesting comparison" instead of recognizing it as the same universal pattern. Viktor revealed a Tool Gateway architecture critical for HIPAA compliance. We almost missed it because we were scoring ourselves against Viktor instead of learning from Viktor.

**When new evidence arrives, ask:**

1. Does this confirm what I already believe, or does it change something?
2. Am I comparing (scoring us vs. them) or learning (extracting what they know that we don't)?
3. What would I build differently if I took this evidence seriously?

The correct posture with new information is student, not peer reviewer. Especially when the source has production experience you lack.

---

## What This Repo Is

A care coordination agent that texts with family members one-to-one and maintains a persistent context file (`family.md`) per care network.

**Components:**
- `family.md` — one file per care network, maintained by the agent, never seen by family members
- A system prompt that makes the agent a care coordinator (XML-structured: identity, philosophy, communication rules, operating rules)
- An SMS interface (Twilio or similar) that routes messages to the right family
- A heartbeat cron that periodically scans for upcoming issues (the description IS the entire operating manual for the cron agent — treat it as the most important prompt in the system)
- A Tool Gateway that proxies external API calls (pharmacy, insurance, calendar) so the agent never touches credentials
- A message queue that serializes concurrent messages per family
- A draft/approval flow that requires confirmation before medication or schedule changes
- Tool primitives that the agent composes with reasoning, not a fixed feature set

---

## What This Repo Is Not

There is no:
- Policy DSL (the agent reads natural language rules in family.md)
- Coverage Loop engine (the agent reasons about coverage by reading the schedule section)
- Decision Trace system (the agent updates the Recent Events section as it works)
- Network Health Score calculator (the agent can assess network health by reading the file)
- Context Graph database (the file IS the context graph)
- Agent hierarchy (there is one agent per family, with one file)
- Multi-network orchestration layer (each family is independent in v1)

If you find yourself designing any of these, you have drifted. Come back here.

---

## Plumbing vs. Reasoning

This is the only distinction that matters when deciding what to build.

**Plumbing** moves bytes, routes messages, stores files, manages credentials, handles delivery, logs actions. Build plumbing. It's infrastructure the agent can't do for itself.

**Reasoning** makes decisions about care — who should cover a shift, what to do about a missed medication, how to handle a scheduling conflict. Never build reasoning. The agent reasons. You pipe.

The test: **if you removed the LLM, would this component still need to exist?** Message routing exists without an LLM. Phone number lookup exists without an LLM. File storage exists without an LLM. These are plumbing — build them.

Scheduling engines, rules processors, recommendation systems — these only exist to substitute for reasoning. With an LLM, they're prosthetics. Don't build prosthetics.

---

## Eight Patterns Validated in Production

These come from the Viktor interview. Each has been tested in a live production system running the same primitive. See `research/viktor-interview/` for full evidence.

| Pattern | What It Means | Why It Matters |
|---|---|---|
| **Index in prompt, detail on demand** | family.md has a Current section (always loaded) and Reference sections (loaded when needed). System prompt carries the index, not the full file. | Context window management. The agent knows what it knows without reading everything. |
| **Tool Gateway as trust boundary** | Agent calls functions. Gateway handles OAuth, API keys, token refresh. Agent never sees credentials. | HIPAA compliance. PHI and credentials flow through different layers. Non-negotiable for healthcare. |
| **Draft/approval for dangerous writes** | Before writing medication changes or schedule updates, agent sends confirmation via SMS and waits for approval. | Care errors aren't inconvenient — they're dangerous. Human-in-the-loop for irreversible changes. |
| **Cron description = brain** | The heartbeat cron agent gets ONLY a description and filesystem access. Zero conversation history. The description must be entirely self-contained. | The quality of the cron IS the quality of the description. This is the hardest prompt engineering problem in the product. |
| **Three-layer guardrails** | Layer 1: infrastructure walls (dangerous functions don't exist). Layer 2: draft/approval (human confirms writes). Layer 3: soft rules (reasoning guidelines). | Defense in depth. Heaviest guardrails where damage is hardest to reverse. |
| **Role-based filtering on responses, not the file** | The file contains everything. The agent filters what it says to each person based on their role. | PHI scoping happens at the response layer. The file is the complete truth. The agent decides what each person should hear. |
| **Agent execution logs from day one** | Every conversation logged. Every file read. Every file write. Timestamped. | HIPAA audit trail. Not a v2 feature — foundational. |
| **Tool composability over fixed features** | Provide primitives (read, write, send message, query API) and let the agent compose them. Don't pre-build every care scenario. | The agent is the composition layer. 124 tools + reasoning > 5 hardcoded workflows. |

---

## How to Recognize Drift

Drift arrives as reasonable suggestions:

- "We should add a database for better querying" → The agent queries by reading the file. What query can't it answer?
- "We need a conflict resolution system for concurrent edits" → Serialize with a queue. The file is the truth.
- "We should build a scheduling engine" → The agent reads the schedule and reasons about gaps. It IS the scheduling engine.
- "We need structured logging for decision traces" → The Recent Events section IS the decision log.
- "This would be easier with a proper data model" → The data model is a markdown file with YAML blocks. What does "proper" add?

The pattern: every drift begins with "we need a system for X" where X is something the agent already does by reading and updating the file.

**But not everything is drift.** The Gateway, the message queue, the audit log, the SMS delivery pipeline — these are plumbing. The agent can't route its own messages or manage its own credentials. Build the plumbing. Don't build the reasoning.

---

## The Standard for Every Change

Before any PR is merged:

1. **Does this change serve the primitive?** Family.md + agent + SMS + plumbing. If it doesn't serve this loop, why does it exist?
2. **Could the agent do this by reading the file?** If yes, delete it and update the system prompt instead.
3. **Is this plumbing or reasoning?** Build plumbing. Never build reasoning.
4. **Does this make the system simpler or more complex?** Complexity requires extraordinary justification.
5. **Am I adding this because of evidence, or because of assumption?** If you haven't seen this problem in production, you're guessing. Ship without it and see if it breaks.

---

## The Craft

The architecture is solved. The primitive is validated — by this project, by Viktor in production, by every serious Claude wrapper that independently converged on the same pattern.

The craft is not the architecture. The craft is the UX.

A short, messy text message from a tired caregiver at 11pm arrives. The agent must correctly parse intent, update the right section of family.md, confirm naturally, filter the response by the sender's role — all over SMS with no rich UI, no formatting, no retry button.

Making a stateful, multi-user, role-aware system feel like texting a helpful friend. That's where the product lives or dies. Redirect your energy there.

---

## Begin

Read the repo in this order:

1. `docs/primitive-shift.md` — why this architecture exists
2. `docs/family-md-spec.md` — what family.md is and how it works
3. `examples/rob-family.md` — a realistic populated example
4. `agent/system-prompt.md` — how the agent thinks
5. `research/viktor-interview/synthesis.md` — production-validated insights and corrected biases
6. `CLAUDE.md` — project context and build commands

Then build. Watch for both failure modes. And remember: the product is not the file. The product is the truth that flows through it.

---

*The machine that builds the machine must understand what the machine is — and what it isn't. It isn't the file. It isn't the agent. It's the fidelity of context that accumulates when people trust the system with the truth.*
