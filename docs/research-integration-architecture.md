# Research Integration Architecture

CareSupport should learn from research, live conversations, operator review, and
product experiments without letting unverified ideas leak directly into runtime
behavior.

This document describes how research should become product direction,
architecture, tests, and eventually runtime capability.

## Research Inputs

Useful inputs include:

- live conversation review
- smoke-test failures
- user corrections
- blocked or unsupported requests
- operator notes from concierge beta
- pilot-family interviews
- external product research
- architecture comparisons
- PR and issue discussions

Research is not a runtime source of truth by itself. It becomes durable only
when converted into decisions, docs, tests, schema, prompts, or product
requirements.

## Integration Path

Recommended path from research to runtime:

1. Capture the observation.
2. Identify the product loop it affects.
3. Decide whether it changes the active wedge, the long-term direction, or both.
4. Update canonical docs if it changes product meaning.
5. Add issue(s) for implementation work.
6. Add tests before or with behavior changes.
7. Ship narrowly.
8. Review live behavior and feed the next cycle.

## Product Loops To Prioritize

Research should be evaluated against the Rob heuristic:

> Does this reduce the number of times Rob has to use his nose to chase care coordination?

Highest-value research areas:

- coverage gaps
- caregiver fallback order
- agency communication
- operational status summaries
- reminder timing and delivery
- handoffs between caregivers
- what CareSupport should know and reveal contextually
- permission boundaries for outreach and tool use

Lower-priority research may still be useful, but it should not distract from the
core one-to-many coordination burden.

## Documentation Targets

Use these destinations:

- `docs/DECISIONS.md` for durable product or architecture decisions
- `docs/agent-log.md` for session-level handoff notes
- `docs/product-thesis.md` for product category and positioning
- `docs/design.md` for current design contract
- `docs/rob-care-operations-model.md` for Rob-specific operational modeling
- GitHub issues for scoped implementation work

Do not bury active product decisions only in chat history.

## Runtime Guardrail

Research should not directly expand assistant claims.

For example, if research shows users want CareSupport to text caregivers, the
runtime should not merely update the prompt to say it can. The repo needs:

- schema support
- permission checks
- action lifecycle records
- provider execution
- failure handling
- tests
- audit logs

Until then, the assistant should describe the current boundary and preserve the
future direction:

> I cannot text them for you yet. I can draft the message and track the issue here.

## Review Cadence

Weekly review should ask:

- What did users ask CareSupport to do that it could not do?
- Which unsupported asks map to Rob's coordination burden?
- Which asks require tools rather than better conversation?
- Did the assistant claim more than the runtime could perform?
- Which docs or tests need to change before implementation?

The goal is a tighter loop between research, product direction, and runtime
truth.
