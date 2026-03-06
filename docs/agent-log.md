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

---

## 2026-03-06 — Codex

### What I did
- Added and pushed family-isolation fix commit `2dd701e` on `feat/v1-v2-schema-alignment`.
- Re-verified `npx tsc --noEmit` and `npm test` after that patch.
- Cleared legacy prod seed data via Convex CLI by replacing each existing table with an empty JSON array.
- Deployed prod successfully with `npx convex deploy --typecheck=disable`.
- Seeded prod successfully against `https://keen-raccoon-606.convex.cloud`.
- Ran a smoke test by posting a signed `message.received` webhook to the prod HTTP action for Liban's seeded chat.

### State I'm leaving
- PR #27 includes the family-isolation fix and is pushed.
- Prod Convex deployment `keen-raccoon-606` is on the current branch code.
- Prod has fresh Kano pilot seed data loaded.
- Smoke test produced an accepted webhook, inbound/outbound `messages` rows, `context_load` and `response_sent` audit rows, and successful Convex function executions with no runtime errors.

### What the next agent should know
- Convex prod deploy needed `--typecheck=disable` because Convex CLI still typechecks vitest files and trips on `import.meta.glob` even when repo `tsc` is clean.
- The fastest safe prod reset path was CLI-based: import `[]` with `--replace` for each existing table, including legacy v1 tables.
- Smoke test was webhook-simulated, not a physical phone interaction. It exercised the live prod handler and Linq send path.

### Concerns
- The smoke-test response quality is expected for the current architecture: the handler does not yet load structured table data (`scheduleItems`, `medications`) into the prompt, so the answer quality is limited until that future feature lands.
- `tests/seed.test.ts` still imports the seed script in a way that can write to a real Convex deployment during `npm test`.
