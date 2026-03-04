# ADR-001: CareSupport V2 Migration Strategy

**Status:** Proposed
**Date:** 2026-03-03
**Authors:** Liban Kano
**Deciders:** Liban Kano

---

## Context

CareSupport has two competing architectures on the same repository — the result of parallel development by Claude (PRs #1-#11, all merged) and Codex (PRs #12-#14, all closed without merge). The codebase needs a clear migration path from its current Python/file-backed architecture to a TypeScript/Convex backend.

### The Two Architectures

**Claude's architecture** (merged, working on `main`):
- File-backed operational state (`family.md` IS the database)
- Python SMS pipeline with 13-step enforcement
- Mechanical safety (pre-filter, post-check, approval gating)
- Learning loop (self-corrections → lessons → graduation)
- 148 passing tests, battle-tested from 50+ real pilot conversations
- Philosophy: "primitive shift" — everything collapses into context file + agent reasoning

**Codex's architecture** (unmerged, PRs closed):
- Convex-backed structured database (14 tables)
- TypeScript pipeline (port of Python sms_handler)
- Schema-enforced types (mostly — some `v.any()` escapes)
- Import/export with integrity verification
- Never fully compiled or tested
- Philosophy: proper backend — structured data, typed APIs, queryable state

These are not complementary — they're competing visions. The Python pipeline reads `family.md`. The TypeScript pipeline reads Convex tables. They can't both be the source of truth.

### Why This Decision Is Needed Now

1. `family.md` doesn't scale beyond a single family (no cross-family queries, no concurrent access, no referential integrity)
2. The strategy doc describes capabilities (Network Health Score, Coverage Loop, decision traces, simulation) that are impossible against a markdown file
3. Three Codex PRs with 13,000+ lines of unmerged work need disposition
4. A dangerous branch (`feat/blocks-4-6`) exists that would destroy the working production system if merged

---

## Current State Audit

### What's Working on `main`

| Component | Status |
|---|---|
| Python SMS pipeline (sms_handler, poll_inbound, CareRouter, enforcement) | Working, 148 tests passing |
| Family data (family.md, routing.json, members/, conversations/) | Intact |
| Learning system (lessons.md, review_loop, graduation pipeline) | Intact |
| Protocols (16 directories) | Stubs (.gitkeep), unchanged |
| CI (.github/workflows/ci.yml) | Working, Python 3.11 |

### Codex PR Disposition (All Closed)

| PR | Title | Lines | Verdict | Reason |
|---|---|---|---|---|
| #12 | Import local v2 automation | +83 | **Closed** | `rsync --delete` targeting repo root — destructive migration tool |
| #13 | V2 import + latency fixes | +10,130 | **Closed (reference)** | Best Convex schema, real engineering, but never compiled. ~12 unresolved imports, `v.any()` escapes, regressed access model |
| #14 | Big-bang Convex rebuild | +2,939 | **Closed** | Subset of #13, never typechecked or tested |

### Dangerous Branches

**`feat/blocks-4-6`** (+16,149/-10,557 lines): Parallel rewrite that DELETES review_loop.py, care_router.py, agent_tools.py, prompt_builder.py, session.py, and most of runtime/learning/. Would destroy the working production system.

**Stale branches** (from merged PRs): `feat/linq-imessage-migration`, `feat/self-aware-agent`, `feat/ship-ready`, `docs/cto-production-plan`, `docs/dashboard-vision`, `data/*`, `fix/*`, `feat/conversation-summarization-*`.

---

## The Codified Context Analysis

Reference: "Codified Context: Infrastructure for AI Agents in a Complex Codebase" (Vasilopoulos, Feb 2026)

### How the Paper Informs This Migration

The paper documents a three-tier knowledge architecture built during 70 days of AI-assisted development. CareSupport already has an analogous tiered structure, but for **operational context** rather than development context:

| Tier | Paper | CareSupport (current) | CareSupport (post-migration) |
|---|---|---|---|
| **Tier 1 — Hot** | Constitution (always loaded) | SOUL.md + capabilities + lessons | Same — always in system prompt |
| **Tier 2 — Warm** | Agent specs (per-task) | family.md + member profiles | **Convex projections** (per-interaction) |
| **Tier 3 — Cold** | Spec docs via MCP (on-demand) | Protocol stubs (empty) | Cross-family patterns, precedent search, historical traces |

**Key insight from the paper:** The primitive shift thesis ("everything collapses into context file + agent reasoning") mirrors the paper's starting point — a single CLAUDE.md. That file was sufficient for the first 10 days. Then it wasn't. The evolution to tiered infrastructure wasn't planned — it was forced by failures.

CareSupport's `family.md` will hit the same wall:
- At 10 families: cross-family queries (shared caregivers, aggregate metrics) won't fit in a single file
- The agent is both fact-checker AND fact-writer — circular trust with no external verification for non-medication state changes
- No mechanism to compute NHS, run simulations, or search precedent against prose

**The synthesis:** Convex gives CareSupport its Tier 3 cold memory. `family.md` evolves from "the database" to a **computed projection** from structured data — the context file for the agent, generated from the source of truth, not the source of truth itself.

---

## Decision

**Phased migration to full TypeScript/Convex. Not a big-bang rewrite.**

### Why Not Big Bang

Codex's PR #13 is 10,130 lines that were never compiled. The Python enforcement layer (role_filter, phi_audit, approval_pipeline, message_lock) has 67+ tests covering PHI safety. This is HIPAA-relevant code. Rewriting it all at once and hoping it works is how you get a data breach.

### Why Not Keep Python Permanently

Two languages is friction. Convex functions are TypeScript. The frontend will be TypeScript. Having a Python runtime creates deployment complexity. The destination IS full TypeScript — the question is how safely you get there.

---

## Migration Phases

### Phase 1 — Convex as Data Layer Under Python

**Entry criteria:** ADR approved, Convex project set up
**Duration:** 1-2 weeks

**What happens:**
1. Set up Convex project with schema derived from PR #13 (cleaned up)
2. Expand access model from PR #13's `full | limited` to the existing 5-level model
3. Python pipeline writes to Convex via HTTP mutations (replaces family_editor.py writes)
4. `family.md` becomes a **read-only projection** generated from Convex data (eager, on-write — triggered by Convex mutation hook)
5. ALL existing safety code (enforcement, PHI, approvals) stays in Python unchanged

**Dual-write cutover sequence:**
1. Deploy Convex schema + seed data from current files
2. Update `family_editor.py` to dual-write (files + Convex)
3. Validate: diff Convex projection vs current `family.md` after each write for N interactions
4. Switch `family.md` reads to use the Convex-generated projection
5. Remove file writes

Step 2-3 is the risky part — the validation diff catches projection fidelity issues early before we trust the projection as source of truth.

**What to extract from PR #13:**
- Convex schema design (14 tables, good index strategy)
- Idempotency pattern (two-tier: in-memory + persistent)
- UX pacing logic (read receipts, typing indicators, natural delay)
- Import/export scripts and integrity verification concept

**What needs rework from PR #13:**
- `processInbound.ts` — ~12 unresolved imports, `ctx: any` and `(internal as any)` casts
- `projections_v2.ts` — good concept but needs proper types
- Medication/schedule import — currently lossy (`dosage: "unknown"`)
- Compatibility wrappers — fragile string-based function references

**Exit criteria:**
- `python -m pytest runtime/ -v` — all 148 tests green
- Convex dashboard shows data imported correctly
- SMS pipeline works end-to-end with Convex as persistence
- `family.md` is generated from Convex, not hand-maintained

### Phase 2 — Port Pipeline to TypeScript

**Entry criteria:** Phase 1 stable for 1+ week
**Duration:** 2-4 weeks

**What happens (in order):**
1. Port webhook receiver (simplest — HTTP routing)
2. Port enforcement layer (role_filter, phi_audit, approval_pipeline) — **critical safety code, most tests**
3. Port CareRouter and prompt_builder
4. Each port gets tested before the next starts

**Use PR #13 as reference, not starting point** (too many unresolved dependencies).

**Test migration strategy:** Use Python tests as golden output generators. Run each Python test, capture expected inputs/outputs, and use those as fixtures for TypeScript tests. This turns "port 148 tests" from "rewrite from scratch" into "match known-good behavior."

**Exit criteria:**
- `npm test` — equivalent coverage to Python tests (148+ tests)
- Enforcement tests covering: PHI pre-filter, PHI post-check, approval gating, role-based access (5 levels)
- End-to-end SMS test through Linq

### Phase 3 — Cut Over and Remove Python

**Entry criteria:** Phase 2 passes all tests, 1-week soak period
**Duration:** 1 week

**What happens:**
1. TS pipeline has feature parity with Python (same tests, same safety guarantees)
2. Remove Python runtime directory
3. Update CI to run TypeScript tests only

**Exit criteria:**
- Clean single-language TypeScript codebase
- All tests green
- No Python files in runtime/

---

## Consequences

### What We Gain

- **Structured queryable data** — Convex tables replace flat markdown files
- **Scalability** — multi-family support becomes possible
- **Computability** — NHS, coverage analysis, simulation queries against real data
- **Type safety** — schema-enforced data model, end-to-end TypeScript
- **Deployment simplicity** — single language stack
- **Decision traces** — structured records of coordination decisions (the Care Context Graph)

### What We Lose

- **Simplicity of family.md** — the "primitive shift" elegance of one file = one family. The mental model shifts from "edit a markdown file" to "mutate database records"
- **Development velocity** — phased migration is slower than big-bang (but big-bang failed)
- **Direct human readability** — family.md is human-readable. Convex tables require a dashboard or projection

### What Risks Remain

- **family.md projection fidelity** — the generated projection must contain everything the agent needs. If the projection is lossy, agent quality degrades
- **Enforcement port correctness** — the PHI safety layer is HIPAA-relevant. Each port must be verified test-by-test against the Python original
- **Convex vendor lock-in** — Convex is the persistence layer. Evaluate exit costs before committing

---

## Immediate Actions

These can happen regardless of migration decision:

- [x] Fix Python 3.9 compat — `from __future__ import annotations` (already done)
- [x] Fix test fixtures — reaction_handler tests (already using /tmp, no fix needed)
- [x] Update repo root CLAUDE.md — already reflects Python commands (commit `7b22ac3`)
- [ ] Delete stale remote branches (merged PR branches + dangerous `feat/blocks-4-6`)
- [ ] Clean up closed Codex PR branches

---

## Resolved Questions

1. **Convex pricing at scale** — Not a blocker. At 100 families (~25K function calls/day), Convex costs ~$50-100/mo. LLM token costs dominate 10x over database costs — the token budget per-interaction matters more.

2. **Projection strategy** — Eager (on-write), triggered by Convex mutation hook. Writes are less frequent than reads (~1 in 5 interactions). Lazy introduces cold-start latency at the exact moment a family member is waiting. If projection generation fails, underlying structured data remains correct.

3. **Learning loop migration** — Maps to a `lessons` table with `family_id`, `category`, `content`, `created_at`, `graduated_at`. Graduation becomes a scheduled Convex action. Self-correction detection uses the same pattern (cheap Haiku call via Anthropic SDK). Projection must include recent lessons so the agent sees its own corrections.

4. **Protocol activation** — After Phase 1. Protocols need structured data to query — activating them against flat files means rewriting during migration anyway.

---

## References

- Codified Context paper (Vasilopoulos, Feb 2026) — Three-tier knowledge architecture
- CareSupport CLAUDE.md — Product strategy and domain model
- PR #13 (`codex/v2-import-and-latency-fixes`) — Codex's Convex schema and pipeline port
- CareSupport pilot data — 50+ real SMS conversations, 148 passing tests
