# Core Beliefs

Operating principles for CareSupport. Every agent working in this repo should internalize these before writing code.

---

## 1. Most software is structured context plus decision-making

When intelligence becomes infrastructure, complex architectures collapse into: a context file, a system prompt, and tool access. We don't build scheduling engines, rules processors, or recommendation systems. The agent reasons. We pipe.

Full articulation: `docs/design-docs/primitive-shift.md`

## 2. The product is the accumulated context, not the file

A blank `family.md` has zero value. A populated `family.md` after six months of coordination — that's the product. Optimize the agent's ability to observe, learn, and write good context. Don't optimize the schema.

## 3. Plumbing vs. reasoning is the only distinction that matters

**Plumbing** moves bytes, routes messages, stores files, manages credentials. Build plumbing.
**Reasoning** makes decisions about care. Never build reasoning. The agent reasons.

Test: if you removed the LLM, would this component still need to exist?

## 4. Safety is non-negotiable

Care errors aren't inconvenient — they're dangerous. Hard rules (medication confirmation, PHI filtering, emergency escalation) must be enforced mechanically, not just in prose. When documentation falls short, promote the rule into code.

## 5. The correct posture with new information is student, not peer reviewer

When new evidence arrives, ask: what does this change about what we're building? Not: how does this validate what we already have. Confirmation bias is the default failure mode. Name it. Resist it.

Documented pattern: `research/viktor-interview/synthesis.md` — "My Biases, Named"

## 6. Optimize for agent comprehension

Anything an agent can't access in-context effectively doesn't exist. Repository-local, versioned artifacts are all it can see. Push more context into the repo over time. Favor boring, composable technologies.

Source: OpenAI Harness Engineering (`docs/references/openai-harness-engineering-2026-02-11.txt`)

## 7. Enforce invariants, not implementations

Strict boundaries enforced mechanically. Freedom within those boundaries. Care deeply about correctness and reproducibility. Allow agents significant freedom in how solutions are expressed. Once a rule is encoded, it applies everywhere at once.

## 8. The harness is never done

The machine that builds the machine must also maintain what the machine built. Entropy management is continuous: garbage collection, context pruning, doc freshness, quality grading. Build the maintenance into the system, not the schedule.
