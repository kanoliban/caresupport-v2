# Codex Handoff — v1→v2 Schema Alignment

One-time context for Codex's first session. **Read, assess, and report before executing anything.**

## Migration Summary

The v1 code referenced field names, roles, and table structures that no longer exist in the v2 schema. This migration aligned all runtime code with the v2 schema.

- **Started**: 69 type errors across 12 files
- **Ended**: 0 type errors, 187 tests passing, `tsc --noEmit` clean
- **Progression**: 69 → 54 → 47 → 42 → 0

### Three Design Decisions

1. **Access tiers**: Schema stores 5 values directly (`full`, `schedule+meds`, `schedule`, `provider`, `limited`). No mapping layer — enforcement reads DB values as-is.
2. **`messages` not `conversations`**: Renamed table and all references. `logConversation` → `logMessage`.
3. **`familyId` optional on audit**: `buildUnknownNumberEvent` can't resolve a family, so `familyId` is `Id<"families"> | undefined` in audit types.

## Who This Serves

This isn't abstract infrastructure. Every table, role, and access level exists because of three real families:

- **Family A — Kano** (5 people): Small, tight-knit. Liban (coordinator) manages care for his mother Degitu. Everyone knows each other. 1:1 messaging is primary.
- **Family B — Rob** (15 people): Rob is both care recipient AND coordinator. 9 professional caregivers need schedules and care tasks. Family members need updates. Access tiers exist because of this family — professionals get `schedule+meds` (no medical history), family gets `full`.
- **Family C — Amanti** (9 people): Amanti coordinates for his mother. 6 siblings are remote. Group chat is critical for keeping distributed family aligned. The `community_supporter` role exists for extended networks like this.

**Why this matters for your assessment**: When reviewing the schema changes, ask whether each role, access level, and table structure makes sense for these three families. The 5 access tiers exist because Rob's professional caregivers need different access than his family members — stored directly in the DB, no mapping layer.

Required reading for full context: `docs/design.md`, `SOUL.md`

## What Changed (21 modified + 2 untracked)

### Schema & Core

| File | Change |
|------|--------|
| `convex/schema.ts` | Complete rewrite (239 lines). New validators, optional fields, restructured approvals. |
| `convex/mutations.ts` | Complete rewrite. `logConversation` → `logMessage`, deleted `logTimeline`, new `applyContextUpdates`. |
| `convex/handler.ts` | `mapAccessLevel` bridging, field renames, deleted timeline calls. |
| `convex/http.ts` | `conversation` → `message` field mapping, optional `familyId`. |

### Enforcement & Types

| File | Change |
|------|--------|
| `convex/lib/enforcement/phiAudit.ts` | `familyId: Id<"families"> \| undefined`, `buildUnknownNumberEvent` returns `undefined`. |
| `convex/lib/enforcement/types.ts` | `SchemaAccessLevel` + `mapAccessLevel()`, new `AuditEventType` values. |
| `convex/lib/enforcement/index.ts` | Updated to use v2 access levels. |
| `convex/lib/enforcement/fixtures.ts` | `testFamilyId()` helper, `TEST_FAMILY_ARGS`, v2 roles/access. |
| `convex/lib/promptContent.ts` | Updated field references. Still uses v1 output field names (separate migration). |

### CRUD Files

| File | Change |
|------|--------|
| `convex/approvals.ts` | `familyId: v.id("families")`, v2 validators. |
| `convex/auditLogs.ts` | Same pattern. |
| `convex/families.ts` | Same pattern. |
| `convex/lessons.ts` | Same pattern. |
| `convex/medications.ts` | Same pattern. |
| `convex/members.ts` | Same pattern. |
| `convex/scheduleItems.ts` | Same pattern. |

### Tests

| File | Change |
|------|--------|
| `convex/lib/enforcement/approvalPipeline.test.ts` | Real family creation for DB tests, optional chaining for details. |
| `convex/lib/enforcement/phiAudit.test.ts` | Same pattern. |
| `convex/lib/pipeline/promptBuilder.test.ts` | Same pattern. |

### Seed & New Files

| File | Change |
|------|--------|
| `scripts/seed-from-files.ts` | v1→v2 role/access mapping, `messages` not `conversations`, no `timelineEvents`. |
| `convex/messages.ts` | **New** — CRUD file for messages table (seed script dependency). |
| `docs/training-pipeline.md` | **New** — Unstaged from a previous session. Include in commit. |

## Phase 1: Assessment (DO THIS FIRST)

Do NOT commit, push, deploy, or seed anything. Read, verify, and report.

### Step 1: Read these files in order
1. `AGENTS.md` — your role, project conventions, who we serve
2. `docs/design.md` — the three pilot families and why the system works the way it does
3. `SOUL.md` — agent voice and identity
4. `CLAUDE.md` — build commands and project rules

### Step 2: Generate Convex types (REQUIRED before type-checking)
```bash
npx convex dev      # generates convex/_generated/ (server, api, dataModel)
```
The `_generated/` directory is gitignored. Without it, every import from `"./_generated/server"` fails and `tsc` reports hundreds of errors. This is expected on a fresh clone — not a bug.

Once codegen completes, kill the dev server (Ctrl+C) and verify:
```bash
npx tsc --noEmit    # claimed: 0 errors
npm test            # claimed: 187/187 passing
```
If either fails AFTER codegen, STOP and report. Do not attempt fixes.

### Step 3: Review the diff
```bash
git diff             # 21 modified files
git status           # 2 untracked files
```
Read the changes. Form your own opinion on:
- Do the type changes make sense for the three pilot families?
- Does `mapAccessLevel()` correctly bridge DB values to enforcement tiers?
- Are the test fixtures realistic for Family A/B/C's structures?
- Anything that looks wrong, incomplete, or concerning?

### Step 4: Report back
Write up:
- What you verified (tsc, tests, diff review)
- What you think is solid
- What concerns you or what you'd change
- Any questions about design decisions

**Wait for review of your assessment before proceeding to Phase 2.**

---

## Phase 2: Execution (AFTER assessment is approved)

### Task 1: Commit + PR
```bash
git checkout -b feat/v1-v2-schema-alignment
git add convex/ scripts/seed-from-files.ts docs/training-pipeline.md docs/codex-handoff.md AGENTS.md CLAUDE.md
git commit -m "feat: align v1 code with v2 schema (69→0 type errors)"
git push -u origin feat/v1-v2-schema-alignment
gh pr create --title "feat: align v1 code with v2 schema" --body "..."
```
PR body should summarize: 21 modified + 2 new files, 69→0 type errors, 187 tests green, three design decisions.

### Task 2: Deploy to Convex
```bash
npx convex dev
```
Env vars (NOT in git): `ANTHROPIC_API_KEY`, `LINQ_API_TOKEN`, `LINQ_PHONE_NUMBER` — ask for values.

### Task 3: Seed + verify
```bash
npm run seed
```

### Task 4: E2E test
Text the Linq number → verify response → check audit log.

## Gotchas

- `import.meta.glob` errors from `convex codegen` are expected (vitest-only)
- `docs/training-pipeline.md` is untracked from a previous session — include in commit
- Seed script maps v1 roles/access from `fork/workspace/families/kano/routing.json` at runtime
- `promptContent.ts` still uses v1 output field names — separate migration, NOT this PR
- Convex env vars must be set via `npx convex env set`
