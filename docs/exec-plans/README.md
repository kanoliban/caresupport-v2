# Execution Plans

Plans live in `active/` while being executed, move to `completed/` when done.

## Active Plans

| Plan | Purpose | Phase |
|------|---------|-------|
| [CTO Production Plan](active/cto-production-plan.md) | 5-phase production plan built by Munger inversion. The definitive "how we get to production" document. | Phase 1 |
| [Harness Engineering](active/harness-engineering.md) | Wave 1-2 transformation from research project to production harness. 466 tests. | Complete (pending move to completed/) |

## Tracking

| Document | Purpose |
|----------|---------|
| [Tech Debt Tracker](tech-debt-tracker.md) | Honest inventory of known gaps. Updated after each execution step. |

## Principles

From [the-machine-that-builds-the-machine.md](../design-docs/the-machine-that-builds-the-machine.md):

> Before any PR is merged:
> 1. Does this change serve the primitive?
> 2. Could the agent do this by reading the file?
> 3. Is this plumbing or reasoning?
> 4. Does this make the system simpler or more complex?
> 5. Am I adding this because of evidence, or because of assumption?

Every execution plan must answer these questions for every step it contains.
