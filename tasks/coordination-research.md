# Coordination Research Plan

Research objective: `docs/coordination-research-objective.md`.

This plan replaces the premature MVP implementation checklist. The task is to
research and synthesize the existing repo before defining new implementation
work.

## Phase 1A — Branch And Artifact Hygiene

- [x] Work on a separate branch from the Composio WIP.
- [x] Replace the blank-slate MVP spec with a research objective.
- [x] Replace speculative implementation tasks with this research plan.
- [x] Review the research objective with Liban.
- [ ] Commit the research objective only after review.

Validation:

- [x] No runtime code changed.
- [x] No speculative tests added.
- [x] Composio work remains separate from this research path.

## Phase 1B — Product Doctrine Research

Read and summarize:

- [x] `AGENTS.md`
- [x] `CLAUDE.md`
- [x] `SOUL.md`
- [x] `docs/design.md`
- [x] `docs/product-thesis.md`
- [x] `docs/onboarding.md`
- [x] `docs/rob-care-operations-model.md`
- [x] `docs/agent-knowledge-visibility.md`
- [x] `docs/tasks/scheduling.md`
- [x] `docs/tools-and-capabilities-thought-experiment.md`
- [x] `docs/integrations-and-tool-bearing-agent.md`
- [x] `docs/implementation-plan-family-care-agent.md`
- [x] `docs/DECISIONS.md`

Research questions:

- [x] What is the central product thesis already present in the docs?
- [x] Where do docs already answer onboarding-to-coordination behavior?
- [x] Where do docs conflict on current capability vs future direction?
- [x] Where is Rob a heuristic/fixture vs a hard-coded target?
- [x] Where is scheduling the first operational loop vs the whole identity?

Output:

- [x] Product doctrine synthesis.
- [x] Contradiction list.
- [x] Candidate docs/rules that need later revision.

## Phase 1C — Runtime Architecture Research

Audit:

- [x] `convex/schema.ts`
- [x] `convex/handler.ts`
- [x] `convex/http.ts`
- [x] `convex/crons.ts`
- [x] `convex/careContacts.ts`
- [x] `convex/coordinationEvents.ts`
- [x] `convex/scheduleItems.ts`
- [x] `convex/messages.ts`
- [x] `convex/memoryEntries.ts`
- [x] `convex/mutations.ts`
- [x] `convex/lib/promptContent.ts`
- [x] `convex/lib/anthropicClient.ts`
- [x] `convex/lib/pipeline/*`

Research questions:

- [x] What already exists for contacts, schedules, memory, messages, and events?
- [x] What is true substrate vs active behavior?
- [x] What outbound messaging can the runtime perform today?
- [x] Where is outreach intentionally blocked?
- [x] What old one-to-many fields or flows were removed or retired?
- [x] What would be redundant to rebuild?

Output:

- [x] Capability matrix.
- [x] Data-model overlap map.
- [x] Preserve/reactivate/remove recommendations.

## Phase 1D — Validation Research

Audit existing tests:

- [x] `convex/admin.test.ts`
- [x] `convex/careContacts.test.ts`
- [x] `convex/coordinationEvents.test.ts`
- [x] `convex/handler.test.ts`
- [x] `convex/http.test.ts`
- [x] `convex/mutations.test.ts`
- [x] `convex/scheduleItems.test.ts`
- [x] `convex/lib/*.test.ts`
- [x] `convex/lib/pipeline/*.test.ts`
- [x] `tests/*.test.ts`

Research questions:

- [x] What behaviors are already validated?
- [x] Which tests validate obsolete behavior?
- [x] Which tests guard safety boundaries?
- [x] Which existing tests can be extended later instead of duplicated?
- [x] What missing validation should be added only after implementation gaps are
      confirmed?

Output:

- [x] Existing validation map.
- [x] Missing validation list.
- [x] Redundant/stale test risk list.

## Phase 1E — Companion App Research

- [x] Confirm active iOS companion app path.
- [x] Read app architecture and data flow.
- [x] Identify Convex queries/mutations consumed by the app.
- [x] Identify screens that already map to CareSupport's visible working
      understanding.
- [x] Identify what schedule/contact/status state the app needs from Convex.

Research questions:

- [x] What is already implemented in the companion app?
- [x] What needs to be app-visible vs text-visible?
- [x] How do we avoid making Rob manage a dashboard?

Output:

- [x] Companion app capability map.
- [x] Required runtime surface for the app.

## Phase 1F — Research Synthesis

Produce a single synthesis document after the audit.

Required sections:

- [x] Thesis anchor.
- [x] Existing architecture summary.
- [x] Current capability matrix.
- [x] Product doctrine synthesis.
- [x] Agent inference model.
- [x] Runtime state responsibilities.
- [x] Gaps and contradictions.
- [x] Preserve/reactivate/remove recommendations.
- [x] Implementation objective for the next phase.
- [x] Validation map.

Acceptance criteria:

- [x] Claims cite the files they came from.
- [x] Existing work is reused where appropriate.
- [x] No duplicate architecture is proposed.
- [x] Rob remains the launch fixture and heuristic.
- [x] CareSupport remains broader than scheduling while scheduling/coverage
      stays the first operational loop.
- [x] The next implementation phase can be planned from evidence.

## Standard Checks

Because this phase is documentation/research only, code checks are baseline
health checks rather than proof of product behavior.

```bash
git diff --check
npm run typecheck
npm test
```
