# Execution Plan: Harness Engineering Transformation

**Goal:** Transform the repository from a research project that proved a thesis into a harness where agents do reliable work.

**Source:** OpenAI "Harness Engineering" article (Feb 11, 2026) + gap analysis against current repo.

**Status:** Wave 2 Step 3 complete (confirmation pipeline). Step 4 next.

---

## Wave 1: Structural Transformation

One coherent commit. Changes where things live and how agents find them. No behavioral changes.

| Step | Description | Status |
|------|-------------|--------|
| 1.1 | Restructure `docs/` — design-docs, exec-plans, product-specs, references | ✅ Done |
| 1.2 | Move existing docs into `docs/design-docs/` | ✅ Done |
| 1.3 | Move infrastructure docs to `docs/references/` | ✅ Done |
| 1.4 | Write `docs/design-docs/core-beliefs.md` | ✅ Done |
| 1.5 | Write `docs/design-docs/index.md` with verification status | ✅ Done |
| 1.6 | Write `docs/exec-plans/tech-debt-tracker.md` | ✅ Done |
| 1.7 | Write `docs/product-specs/sms-care-coordination.md` | ✅ Done |
| 1.8 | Write `docs/QUALITY_SCORE.md` | ✅ Done |
| 1.9 | Write `docs/SECURITY.md` | ✅ Done |
| 1.10 | Write `docs/RELIABILITY.md` | ✅ Done |
| 1.11 | Write `runtime/README.md` | ✅ Done |
| 1.12 | Write `runtime/config.py` — shared config loader | ✅ Done |
| 1.13 | Update runtime script imports | ✅ Done |
| 1.14 | Write `ARCHITECTURE.md` | ✅ Done |
| 1.15 | Write `AGENTS.md` — the 100-line map (last) | ✅ Done |
| 1.16 | Update all cross-references | ✅ Done |
| 1.17 | This execution plan (self-referential) | ✅ Done |

## Wave 2: Behavioral Wiring

Component by component. Each step is a separate commit with tests.

| Step | Description | Depends on | Status |
|------|-------------|------------|--------|
| 2.1 | Wire role_filter + phi_audit into handler | Wave 1 | ✅ Done — 122 tests, all passing |
| 2.2 | Close file-update loop + delivery verification | 2.1 | ✅ Done — edit-not-write, backup, validate, rollback, 61 tests |
| 2.3 | Confirmation/approval pipeline | 2.2 | ✅ Done — classify, gate, store, resolve, detect YES/NO, 75 tests |
| 2.4 | Heartbeat cron (real code) | 2.2 | Not started |
| 2.5 | Maintenance cron (garbage collection) | 2.2 | Not started |
| 2.6 | Structural tests | 2.1-2.5 | Not started |

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-18 | Two-wave approach (structural then behavioral) | Structural changes are low-risk and must land as one coherent state. Behavioral changes are higher-risk and need per-component testing. |
| 2026-02-18 | AGENTS.md written last in Wave 1 | It maps the final state — can't be accurate until the structure exists. |
| 2026-02-18 | Keep `the-machine-that-builds-the-machine.md` as-is | It's the philosophical foundation. Core-beliefs.md distills the operating principles. Both serve different purposes. |
| 2026-02-18 | Keep research/, fork/, clone/ unchanged | Completed work. Research is reference. Fork is the adaptation. Clone is the Viktor snapshot. Reorganizing them adds no value. |

## Acceptance Criteria

- [ ] An agent reading AGENTS.md can navigate to any component in the repo within 2 hops
- [ ] docs/ has indexed design docs with verification status
- [ ] Active/completed execution plans are tracked
- [ ] Tech debt is catalogued honestly
- [ ] Runtime scripts have no hardcoded absolute paths
- [ ] Runtime has a README documenting data flow and entry points
- [ ] Quality, security, and reliability are graded per layer
