# Coordination Research Objective

## Status

Research-phase objective for the next CareSupport product/runtime synthesis.

This is not an implementation spec. It is the research brief that should guide
the repo audit before any new runtime work is planned.

## Thesis Anchor

CareSupport is a text-native care coordination agent that learns a care
situation through conversation, turns that understanding into operational state,
and reduces the amount of manual chasing the primary coordinator has to do.

Rob's caregiver scheduling loop is the first proof case, not the entire product
identity.

## Research Purpose

The purpose of this phase is to understand how the existing CareSupport repo
already expresses that thesis, where it contradicts it, and what should be
preserved, reactivated, rewritten, or deleted.

The output should not be a blank-slate MVP spec. The output should be a grounded
synthesis of:

- the current product doctrine in the docs
- the current Convex runtime
- the current prompt/parser/handler contracts
- the current iMessage/Linq coordination path
- the current cron/follow-up substrate
- the current iOS companion app surface
- the remnants of prior one-to-many work

Only after that research should we define implementation tasks.

## White Paper Frame

Treat the research like a white paper:

1. **Thesis** — what CareSupport is.
2. **Evidence** — what the repo already implements or says.
3. **Contradictions** — where docs, code, or tasks disagree.
4. **Operating model** — how the agent should infer the next useful action.
5. **Runtime implications** — what deterministic state must exist.
6. **Preserve / reactivate / remove** — what to do with current code and docs.

The research should make an argument from repo evidence, not impose a new
product structure from outside.

## Core Questions

### Product Doctrine

- How do existing docs define CareSupport's product identity?
- Where do they already support the thesis anchor?
- Where do they over-narrow the product to solo-only behavior?
- Where do they over-broaden into premature platform or tool-bearing work?
- How should Rob remain the central acceptance fixture without hard-coding the
  product to Rob-only behavior?

### Agent Reasoning

- How should CareSupport infer the next useful step from context?
- What does the existing onboarding doctrine already say about acting on what
  the user provides?
- How should the agent move from onboarding into coordination without requiring
  a rigid list of every possible step?
- What should the model reason about, and what must deterministic code own?
- How does the agent preserve broader beta learning while focusing current
  capability on scheduling and coverage?

### Runtime Architecture

- Which existing tables already support the thesis?
- What are `careContacts` and `coordinationEvents` capable of today?
- How do `scheduleItems`, `memoryEntries`, and `messages` already overlap with
  the desired context graph?
- Where would reactivating one-to-many create redundancy or conflict?
- Which old v1 concepts should not be resurrected?

### Messaging And Coordination

- What outbound messaging capability exists today?
- What inbound identity resolution exists today?
- How did one-to-many coordination work before, if it did?
- What guardrails currently prevent outreach?
- What minimal permission/approval concept is required for reactivation without
  rebuilding a full role system?

### Companion App

- What does the iOS companion app currently expect from Convex?
- Which views already map to the agent's visible working understanding?
- What state does the app need to show Rob without becoming a burden?
- What should stay text-first rather than app-first?

### Validation

- What tests already cover onboarding, scheduling, contacts, coordination
  events, messages, crons, and prompt parsing?
- Which tests are stale or mismatched to the current runtime?
- What behavior lacks validation after the audit?

No new speculative tests should be written in this research phase. The research
should map existing validation first, then identify missing validation for later
implementation planning.

## Research Corpus

Start with:

- `AGENTS.md`
- `CLAUDE.md`
- `SOUL.md`
- `docs/design.md`
- `docs/product-thesis.md`
- `docs/onboarding.md`
- `docs/rob-care-operations-model.md`
- `docs/agent-knowledge-visibility.md`
- `docs/tasks/scheduling.md`
- `docs/tools-and-capabilities-thought-experiment.md`
- `docs/integrations-and-tool-bearing-agent.md`
- `docs/implementation-plan-family-care-agent.md`
- `docs/DECISIONS.md`

Then audit runtime files:

- `convex/schema.ts`
- `convex/handler.ts`
- `convex/http.ts`
- `convex/crons.ts`
- `convex/careContacts.ts`
- `convex/coordinationEvents.ts`
- `convex/scheduleItems.ts`
- `convex/messages.ts`
- `convex/memoryEntries.ts`
- `convex/mutations.ts`
- `convex/lib/promptContent.ts`
- `convex/lib/anthropicClient.ts`
- `convex/lib/pipeline/*`
- relevant tests under `convex/*.test.ts` and `tests/*.test.ts`

Then audit the companion app once its active path is confirmed.

## Expected Outputs

The research phase should produce:

1. A repo-grounded product/architecture synthesis.
2. A current capability matrix:
   - already works
   - exists as substrate
   - disabled or blocked
   - stale
   - missing
3. A redundancy/conflict map.
4. A preserve/reactivate/remove recommendation.
5. A revised implementation objective for the next build phase.
6. A validation map of existing tests and missing coverage.

## Non-Goals

Do not use this research phase to:

- implement new outreach behavior
- write speculative tests before the audit
- decide on Composio or Google Calendar as the critical path
- rewrite prompts before understanding current prompt contracts
- revive v1 `families` / `members` / access-tier architecture
- create a rigid flowchart that enumerates every possible user conversation

## Working Principle

The research should preserve the central product insight:

CareSupport should not become a conditioned scheduling bot. Scheduling and
coverage are the first operational loop because they are the clearest way to
reduce Rob's manual chasing. The agent should still learn broader care needs as
users reveal them and route those needs into the current capability ladder:

1. remember
2. summarize
3. draft
4. ask permission
5. act
6. track
7. follow up
8. close the loop

The implementation plan comes after we know how much of that ladder the current
repo already supports.
