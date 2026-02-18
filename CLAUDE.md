# CLAUDE.md — CareSupport Family

> **For agents:** Read `AGENTS.md` — it's the navigational entry point for this repo.
> This file explains the core concepts for human readers.

## What This Is

CareSupport is a care coordination agent that texts with family members 1-to-1. It uses two types of persistent files:

- **PROTOCOL.md** files — agent knowledge: how to coordinate care, how to handle medications, how to communicate over SMS. Relatively static. Adopted wholesale from Viktor/OpenClaw's production-tested pattern.
- **family.md** — operational state for one care network: members, schedule, medications, active issues, recent events. Changes every interaction. Our new concept — Viktor doesn't have this because it doesn't maintain ongoing care relationships.

These are different things. Don't conflate them.

## How It Works

```
SMS arrives ("Marta: Can't make Tuesday 2pm")
  → Message router identifies family by phone number
  → Fresh query() session (never resumed — the file IS the memory)
      System prompt: care coordinator role
      User prompt: SMS content + sender identity
      Tools: Read, Edit (restricted to this family's family.md)
  → Agent reads family.md → processes → updates family.md → responds
  → Response sent via SMS
  → Session ends
```

Every interaction follows this loop. No session persistence, no database, no state outside the file.

## Architecture

See `ARCHITECTURE.md` for the full system diagram and domain map.

See `AGENTS.md` for the repository navigation map.

## Key Locations

| What | Where |
|------|-------|
| System diagram | `ARCHITECTURE.md` |
| Agent navigation map | `AGENTS.md` |
| Design documents | `docs/design-docs/` (see `index.md`) |
| Active work | `docs/exec-plans/active/` |
| Known gaps | `docs/exec-plans/tech-debt-tracker.md` |
| Quality grades | `docs/QUALITY_SCORE.md` |
| Security posture | `docs/SECURITY.md` |
| family.md spec | `docs/design-docs/family-md-spec.md` |
| Reference family | `examples/rob-family.md` |
| SMS runtime | `runtime/` (see `README.md`) |
| Runtime config | `runtime/config.py` |
| Care protocols | `fork/workspace/protocols/` |
| System prompt | `fork/system-prompt.md` |
| Simulation results | `fork/simulation/results/SYNTHESIS.md` |

## Build & Run

```bash
npm install
npx tsc --noEmit     # Type check (TS prototype)
cd runtime/scripts && python sms_handler.py --from "+1..." --body "test" --dry-run
```

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Session model | Fresh per SMS | File is memory; session resume leaks context across users, costs grow linearly |
| Knowledge persistence | PROTOCOL.md files (Viktor's pattern wholesale) | Agent knowledge, capabilities, protocols — read on demand |
| State persistence | family.md (one file per network) | Operational state — agent reads at start, updates at end |
| Structured data | YAML blocks inside markdown | Readable, parseable, less corruption-prone than raw JSON in markdown |
| Concurrency | Queue per family | Serialize within a family; parallel across families |
| Tools | Read + Edit (built-in) | Simpler than Memory Tool; direct control; Edit does surgical replacement |
| Proactive | Heartbeat cron | Periodic scan, not long-running process |
| Interface | SMS (1-to-1) | Each family member texts independently |
| Enforcement | Mechanical (code), not just prompt | Harness engineering: invariants enforced by linters/checks, not instructions |
| Repository structure | Harness pattern | AGENTS.md → docs/ → exec-plans/. Progressive disclosure. Agent-legible. |
