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

`family.md` is to a care network what `CLAUDE.md` is to a development session. The agent reads it at the start. Reasons against it. Updates it. The conversation ends. The file persists. That's the product.

If you understand this — truly understand it, not just acknowledge it — you will build correctly. If you don't, you will rebuild the 20,000-word architecture one reasonable decision at a time.

---

## The Primitive Shift

Read `docs/primitive-shift.md` for the full articulation. Here is the core:

**Most of what we call "software" is structured context plus decision-making.**

When intelligence becomes infrastructure, the architecture collapses into a context file, a system prompt, and tool access. Not because you're cutting corners — because the load-bearing work moved from code to cognition.

The primitive for this product is:

```
SMS arrives → fresh agent session → reads family.md → reasons → updates family.md → responds → session ends
```

The file is the memory. The file is the state. The file is the product. Sessions are ephemeral. The file persists. There is no database, no ORM, no state management layer, no event bus, no message queue that the agent reasons through. There is a file and an intelligence that reads it.

---

## Your Default Failure Mode

You will want to add things. This is your most dangerous instinct.

You will encounter a problem — concurrency, data integrity, scaling, edge cases — and your training will surface a solution from the old primitive: add a service, add a layer, add an abstraction, add a system. Each addition will be individually reasonable. Each will be defensible in isolation. And together, they will reconstruct the 20,000-word architecture we already proved unnecessary.

This is not a theoretical risk. It is the default outcome. Complexity is what happens when you solve problems without questioning whether the problem exists under the new primitive.

**Before you add anything, ask:**

1. Does this problem exist because of the primitive (family.md + agent), or because I'm assuming the old primitive (software that must encode its own reasoning)?
2. Can the agent solve this by reading and updating the file, without new infrastructure?
3. Am I building this because the product needs it, or because it's what I'd build for a traditional system?

If you cannot answer these clearly, stop. Re-read this document. Then decide.

---

## What This Repo Is

A care coordination agent that texts with family members one-to-one and maintains a persistent context file (`family.md`) per care network.

**Components:**
- `family.md` — one file per care network, maintained by the agent, never seen by family members
- A system prompt that makes the agent a care coordinator
- An SMS interface (Twilio or similar) that routes messages to the right family
- A heartbeat cron that periodically scans for upcoming issues
- Tool permissions that restrict the agent to reading and editing its family's file

That's it. If you're building something that doesn't fit in that list, you're probably solving a problem from the old primitive.

---

## What This Repo Is Not

This is not a platform. This is not an enterprise system. This is not infrastructure that coordinates infrastructure.

There is no:
- Policy DSL (the agent reads natural language rules in family.md)
- Coverage Loop engine (the agent reasons about coverage by reading the schedule section)
- Decision Trace system (the agent updates the Recent Events section as it works)
- Network Health Score calculator (the agent can assess network health by reading the file)
- Context Graph database (the file IS the context graph)
- Agent hierarchy (there is one agent per family, with one file)
- Multi-network orchestration layer (each family is independent in v1)

Every one of these was in the original 20,000-word architecture. Every one was replaced by giving the agent a well-structured file and letting it reason.

If you find yourself designing any of these, you have drifted. Come back here.

---

## How to Recognize Drift

Drift doesn't announce itself. It arrives as reasonable suggestions:

- "We should add a database for better querying" → The agent queries by reading the file. What query can't it answer?
- "We need a conflict resolution system for concurrent edits" → Serialize messages per family with a queue. The file is the truth.
- "We should build a scheduling engine" → The agent reads the schedule section and reasons about gaps. It IS the scheduling engine.
- "We need structured logging for decision traces" → The Recent Events section in family.md IS the decision log.
- "We should add a rules engine for policies" → The agent reads the Members and Availability sections. Natural language rules, interpreted by intelligence.
- "We need a notification system" → The agent returns a response. The message router sends it. That's the notification system.
- "This would be easier with a proper data model" → The data model is a markdown file with YAML blocks. It's readable by humans AND agents. What does "proper" add?

The pattern: every drift begins with "we need a system for X" where X is something the agent already does by reading and updating the file. The old primitive required systems because it lacked reasoning. The new primitive has reasoning. Stop building its prosthetics.

---

## When You Legitimately Need to Add Something

Not everything is drift. Real problems exist:

- **The file gets too large for the context window** → This is real. Pruning strategy, archival of old events, summarization. Solve it inside the file structure (see the spec), not by adding a database.
- **SMS routing and delivery** → This is infrastructure the agent doesn't handle. Twilio webhooks, phone number lookup, delivery confirmation. Build it. It's plumbing, not reasoning.
- **Concurrent messages from the same family** → Real problem. Solve with a queue per family. Serialize at the boundary. Don't build a conflict resolution system.
- **File storage backend** → Filesystem for dev, S3 or similar for prod. The agent uses Read/Edit tools and doesn't know the difference. This is plumbing.
- **Authentication and security** → Real. Phone number verification, PHI scoping by role. Build what's needed at the boundary.

The test: **is this plumbing (moving bytes, routing messages, storing files) or reasoning (making decisions about care)?** Build plumbing. Never build reasoning. The agent reasons. You pipe.

---

## The Standard for Every Change

Before any PR is merged, it must survive this:

1. **Does this change serve the primitive?** Family.md + agent + SMS. If it doesn't directly serve this loop, why does it exist?
2. **Could the agent do this by reading the file?** If yes, you've built unnecessary infrastructure. Delete it and update the system prompt instead.
3. **Does this make the system simpler or more complex?** Complexity requires extraordinary justification. "It's the standard way" is not justification — the standard way was built for the old primitive.
4. **Would you need this if you were coordinating care with a notebook and a phone?** The product is a digital version of that. A notebook (family.md) and a phone (SMS). If your change has no analog in that world, interrogate it.

---

## A Note on Ambition

This document is not anti-ambition. The ambition is enormous: replace the entire care coordination software stack with a file and a conversation. That's not simple in the dismissive sense. It's simple in the profound sense — the way `E = mc²` is simple. The complexity is in the insight, not the implementation.

When you feel the urge to build more, redirect that energy. Make the system prompt sharper. Make family.md's structure more expressive. Make the agent's reasoning better by giving it better context. Make the plumbing more reliable. The product gets better when the FILE gets better, not when the codebase gets bigger.

---

## Begin

Read the repo. Start with `CLAUDE.md` for project context. Read `docs/family-md-spec.md` for the file spec. Read `examples/rob-family.md` for what a real family.md looks like. Read `agent/system-prompt.md` for how the agent thinks.

Then build. And when you're tempted to add, re-read this document first.

The machine that builds the machine must understand what the machine is. The machine is a file and a conversation. Build accordingly.
