# Agent Log — CareSupport v2

Append-only shift-change log. Both Claude and Codex write here after every session.
Read the last 2-3 entries before starting work.

---

## 2026-03-05 — Claude

### What I did
- Completed v1→v2 schema alignment: 69 type errors → 0, 187 tests passing
- Rewrote `schema.ts` (239 lines), `mutations.ts`, `handler.ts`, and 18 other files
- Three design decisions: access tier bridging (`mapAccessLevel`), `messages` not `conversations`, `familyId` optional on audit
- Created `AGENTS.md`, `docs/codex-handoff.md`, updated `CLAUDE.md`

### State I'm leaving
- `npx tsc --noEmit`: 0 errors
- `npm test`: 187/187 passing
- Working tree: 21 modified + 2 untracked files, all unstaged
- Last commit on main: `0584d25`
- Nothing deployed. No PR created yet.

### What the next agent should know
- All changes are unstaged. Read `docs/codex-handoff.md` for file-by-file summary.
- `promptContent.ts` still uses v1 output field names — that's intentional, separate migration.
- `docs/training-pipeline.md` is untracked from a previous session — include in any commit.
- Seed script reads from `fork/workspace/families/kano/routing.json` and maps v1 roles at runtime.

### Concerns
- `VISION.md` is stale (last updated Feb 19). Open questions that are now answered elsewhere haven't been backfilled.
- `RELIABILITY.md` predates the Convex migration — may need a rewrite.
- Claude SDK choices (extended thinking, prompt caching, structured output via `extractJson`) are implemented but not documented in prose. Only exists in `convex/lib/anthropicClient.ts`.
