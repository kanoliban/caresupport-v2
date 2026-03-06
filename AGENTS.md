# AGENTS.md — CareSupport v2

## Project

CareSupport is an iMessage-based care coordination agent. Convex backend, Linq SMS gateway, Claude LLM. No app, no dashboard — iMessage is the UI.

Repo: `kanoliban/caresupport-v2`

## Architecture Decisions (locked)

- **Access tiers**: 3 DB values (`full`, `standard`, `view_only`) → `mapAccessLevel()` → 5-tier enforcement
- **Tables**: `messages` (not conversations), no `timelineEvents`, `familyId` optional on audit logs
- **Roles**: `care_recipient`, `family_caregiver`, `professional_caregiver`, `community_supporter`
- **Enforcement**: Safety is mechanical (code in `convex/lib/enforcement/`), not prompt-level

## Who We Serve

Three pilot families. Read `docs/design.md` (lines 9–28) for full detail.

- **Family A — Kano** (5 people): Small, tight-knit. Liban coordinates for his mother Degitu.
- **Family B — Rob** (15 people): Rob is both care recipient AND coordinator. 9 professional caregivers + family. Large, mixed team.
- **Family C — Amanti** (9 people): Amanti coordinates for his mother. 6 siblings are remote. Group chat is critical.

Every schema decision, access level, and role exists to serve these families. If a change doesn't make sense for at least one of them, question it.

## Where We're Going

The three pilot families are step one. The arc:

**Now → Pilot hardening**: Get the v2 backend deployed, seeded, and handling real iMessage traffic for Family A. Prove the Convex schema, Linq webhook pipeline, and Claude reasoning loop work end-to-end under real conditions.

**Next → Scalability testing**: Onboard Family B (15 people, mixed pro/family) and Family C (9 people, distributed). This stress-tests multi-family isolation, access tier enforcement at scale, and group chat coordination. Linq has a 3K msg/day/line limit — we'll need to shard across numbers.

**Then → Training pipeline**: We have a design (`docs/training-pipeline.md`) for extracting training signal from real conversations — 8 signal types scored across 5 dimensions by Opus nightly. The goal is a quality evaluation and prompt iteration loop, not weight updates. Schema tables don't exist yet. This is aspirational, not active.

**Eventually → Platform**: `PRODUCT_STRATEGY.md` describes four network types (Family, Independent Caregiver, Agency, Platform). The pilot proves the core loop before any of that matters.

### Tech stack reasoning
- **Convex**: Real-time reactive backend, typed end-to-end, handles concurrent mutations. Chosen over file-backed markdown (can't scale) — see `docs/adr/001-v2-migration.md`.
- **Linq**: iMessage gateway. Blue bubble delivery, group chat support, webhook-driven. Setup and limits in `docs/references/linq-setup.md`.
- **Claude SDK**: Extended thinking enabled (10K token budget), prompt caching on system blocks, Haiku→Sonnet→Opus fallback chain. Model routing rules in `docs/tasks/model_routing.md`, implementation in `convex/lib/anthropicClient.ts`.

## Agent Roles

| Agent | Domain |
|-------|--------|
| **Claude** | Architecture, design decisions, enforcement logic, prompt engineering, complex reasoning |
| **Codex** | Execution, deployment, CI/CD, PR management, seed data, mechanical migrations |

## Current State

- `npx tsc --noEmit`: 0 errors (requires `npx convex dev` first — `_generated/` is gitignored)
- `npm test`: 187/187 passing
- Last commit: `0584d25` on main
- Working tree: 21 modified + 2 untracked files (unstaged v1→v2 schema alignment)

## How We Communicate

| Channel | Purpose | Who writes |
|---------|---------|------------|
| `AGENTS.md` | Identity, context, conventions. Stable reference. | Claude (with Liban's approval) |
| `docs/agent-log.md` | Shift-change log. What happened, what's next, concerns. | Both agents, append-only |
| PR comments | Code-level dialogue on specific changes | Both agents |
| Commit messages | What was done (imperative mood) | Whoever commits |

**After every session**, the active agent appends to `docs/agent-log.md`:
- What you did
- What state you left things in
- What the next agent should know
- Any concerns or open questions

Read the last 2-3 entries before starting work.

## Conventions

- No `as any`, `@ts-ignore`, `@ts-expect-error`
- Convex typed IDs everywhere (`Id<"families">`, not strings)
- Test with `convex-test` + vitest
- Commit messages: imperative mood, concise
- Safety enforcement is code, not prompts
