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
| 7 | Tool inventory + composability | [round-07](round-07-tool-inventory.md) | 124 tools across 12 modules. Bash as escape hatch. "Tools are primitives, I'm the composition layer." |
| 8 | Context loading sequence | [round-08](round-08-context-loading.md) | 4 layers: system prompt → skill index → conversation → message. Pull-based, not pre-loaded. |
| 9 | Operating manual + hard-coded DNA | [round-09](round-09-operating-manual.md) | Always/never/priority rules. System prompt XML structure. "Great coworker, not compliant one." |
| 10 | Cron/autonomy mechanics | [round-10](round-10-cron-mechanics.md) | Agent vs script crons. Description = brain. 3 crons already running. |
| 11 | Integration plumbing | [round-11](round-11-integration-plumbing.md) | Tool Gateway proxies API calls. Agent never sees OAuth tokens. MCP protocol. Two data patterns. |
| 12 | Constraint boundaries | [round-12](round-12-constraint-boundaries.md) | 3 guardrail layers: infrastructure walls, draft/approval, soft reasoning. Pragmatic trust model. |
| 13 | "Build something like you" | [round-13](round-13-build-your-own.md) | 4-phase build order. 8 transferable patterns. "UX over constrained channel is the real craft." |

## Summary Findings

### Validated
- The file primitive is sound (production proof)
- Fresh sessions with file-based persistence works at scale
- Markdown over database for context (system with Postgres still chooses files)
- Human-readability as a product feature
- No schema rigidity — each context file shaped by reality
- Tool composability > fixed feature set (primitives + reasoning layer)
- Gateway pattern for credential isolation (directly maps to HIPAA compliance)
- Cron-as-heartbeat for proactive agent behavior (= our care nudges)

### Where We're Ahead
- Concurrency (queue per family — Viktor hasn't solved this)
- Structured pruning (explicit rules vs. Viktor's judgment-based approach)
- Decision history (Recent Events + Patterns vs. Viktor's entity-only snapshots)
- Single-file co-location (vs. Viktor's multi-file cross-referencing)

### Where We're Behind
- Audit trails / change tracking (Viktor suggested git-style versioning)
- Preference capture per member (Viktor identified tone drift as failure mode #1)
- Delivery reliability and escalation paths (SMS ≠ Slack)
- Text-only onboarding flow design

### Refinements to Adopt
1. Two-tier section architecture (Current always loaded, Reference on demand)
2. Per-member preferences/communication style field
3. Audit trail strategy designed earlier than planned
4. Draft/approval pattern for medication and care plan changes
5. "Index in prompt, detail on demand" context loading strategy
6. Role-based read filtering on agent responses (HIPAA)
7. Proactive nudge system modeled on Viktor's heartbeat cron

### 8 Transferable Design Patterns (Round 13)

| # | Viktor Pattern | CareSupport Implementation |
|---|---|---|
| 1 | File-as-brain, conversation-as-interface | family.md + SMS/WhatsApp |
| 2 | Section-level architecture | Current (always loaded) / Reference (on demand) |
| 3 | Skill files as persistent memory | Care protocols as reference docs |
| 4 | Cron-as-heartbeat | Proactive care nudges |
| 5 | Draft/approval for writes | Confirmation before care plan changes |
| 6 | Gateway for credential isolation | HIPAA-compliant integration layer |
| 7 | Conversation logs → flat files | SMS/WhatsApp logs for searchable history |
| 8 | Index in prompt, detail on demand | family.md TOC always loaded, sections on demand |

## How to Use This Research

This directory is raw interview material. For the synthesized conclusions, see:
- `docs/architecture-validation.md` — full synthesis with CareSupport mapping
- `docs/primitive-shift.md` — the underlying insight
- `docs/the-machine-that-builds-the-machine.md` — building guidelines for agents

Future interview rounds should be added as `round-NN-topic.md` files and indexed in this README.
