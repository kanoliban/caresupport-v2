# Viktor Interview — Reverse Engineering OpenClaw's Architecture

**Date:** February 2025
**Subject:** Viktor (getviktor.com), a Slack-based workspace agent built on OpenClaw (open source), powered by Claude
**Method:** Direct conversation with the agent, user as proxy
**Purpose:** Validate family.md primitive against a production system running the same architecture

## What Is Viktor

A paid, production Slack agent that uses:
- Claude as the reasoning engine
- Markdown skill files for persistent context (read at session start)
- Fresh sessions per invocation (no persistent conversation state)
- Python tools for integrations (Linear, GitHub, Google Ads, 3000+)
- Cron scheduling for autonomous tasks
- Flat file logging of all Slack history

Viktor independently converged on the same architecture as CareSupport's family.md because the primitive demands it.

## Interview Rounds

| Round | Topic | File | Key Finding |
|---|---|---|---|
| 1 | Workspace layout | [round-01](round-01-workspace-layout.md) | Three-layer architecture: Knowledge → Skills → Tools. 16+ skills, 10+ tool modules. |
| 2 | Skill file contents | [round-02](round-02-skill-files.md) | Entity snapshots, not operational state. Prose + bullets, no YAML. Captured old CareSupport. |
| 3 | Persistence & pruning | [round-03](round-03-persistence-model.md) | YAML frontmatter indexing. Progressive disclosure. Pruning is judgment-based (rough edge). |
| 4 | Failure modes | [round-04](round-04-failure-modes.md) | Tone drift, "already tried that", offline context, half-finished work. SMS > Slack for capture rate. |
| 5 | Files vs. database | [round-05](round-05-files-vs-database.md) | Has Postgres, still chooses files. "Files for context, databases for structured workflows." |
| 6 | Architecture review | [round-06](round-06-architecture-review.md) | Validated our architecture. Suggested Current/Reference split. "I'd take that bet." |

## Pending Rounds (not yet conducted)

| Round | Question | Target |
|---|---|---|
| 7 | Full tool/capability inventory | Complete tool manifest — what Claude can do inside the Viktor harness |
| 8 | Context loading sequence | What happens before Viktor responds — initialization, file reads, system prompt |
| 9 | System prompt / operating manual | Behavioral rules, constraints, priority hierarchy |
| 10 | Cron/autonomy mechanics | How autonomous tasks work — trigger, context, fresh session or not |
| 11 | Integration plumbing | Direct API calls vs. mediated layer, authentication model |
| 12 | Constraint boundaries | What Viktor CAN'T do, permission model, safety guardrails |
| 13 | "Build something like you" | Viktor architects its own replacement — hardest parts, what they'd do differently |

## Summary Findings

### Validated
- The file primitive is sound (production proof)
- Fresh sessions with file-based persistence works at scale
- Markdown over database for context (system with Postgres still chooses files)
- Human-readability as a product feature
- No schema rigidity — each context file shaped by reality

### Where We're Ahead
- Concurrency (queue per family — Viktor hasn't solved this)
- Structured pruning (explicit rules vs. Viktor's judgment-based approach)
- Decision history (Recent Events + Patterns vs. Viktor's entity-only snapshots)
- Single-file co-location (vs. Viktor's multi-file cross-referencing)

### Where We're Behind
- Audit trails / change tracking (Viktor suggested git-style versioning)
- Preference capture per member (Viktor identified tone drift as failure mode #1)

### Refinements to Adopt
1. Two-tier section architecture (Current always loaded, Reference on demand)
2. Per-member preferences/communication style field
3. Audit trail strategy designed earlier than planned

## How to Use This Research

This directory is raw interview material. For the synthesized conclusions, see:
- `docs/architecture-validation.md` — full synthesis with CareSupport mapping
- `docs/primitive-shift.md` — the underlying insight
- `docs/the-machine-that-builds-the-machine.md` — building guidelines for agents

Future interview rounds should be added as `round-NN-topic.md` files and indexed in this README.
