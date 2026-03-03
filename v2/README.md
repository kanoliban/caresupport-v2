# CareSupport V2 Workspace

This workspace is the TypeScript rewrite track for CareSupport 2.0.

## What is implemented
- Strict contracts for Linq inbound payloads and pipeline output.
- Convex schema + function surface for core entities.
- Webhook-first processing endpoint: `POST /webhooks/linq/inbound`.
- Claude orchestration adapter with tool-aware, structured JSON output.
- File-system snapshot/export + Convex import pipeline scripts.
- Deterministic replay harness and gate-check script.
- Safety/perf/rollback drill scripts for release gating.
- Baseline tests for contracts, safety guards, and replay scoring.

## Run locally
```bash
cd v2
npm install
cp .env.example .env
npm run typecheck
npm run test
npm run dev
```

## Build migration artifacts
```bash
npm run snapshot
npm run import
npm run safety-check
npm run replay
npm run perf-check
npm run rollback-drill
npm run gate-check
```

Replay modes:
- `npm run replay` uses deterministic local rules (baseline harness validation).
- `npm run replay -- --live` runs model-backed dry-run processing for real parity scoring.
- `npm run perf-check -- --live` runs p95/error sampling in live mode.
- `npm run rollback-drill -- --live` validates rollback prerequisites and live health checks.
- `npm run linq-webhook -- --list` lists Linq webhook subscriptions.
- `npm run linq-webhook -- --to-env=v2 --apply --delete-old` switches active Linq webhook subscription to V2 target URL.

## Notes
- Convex function files live in `v2/convex/` for deployment with Convex CLI.
- The Node webhook server in `v2/src` is the orchestration edge and can run independently in staging.
- `family.md` in V2 is generated as a projection from Convex state.
