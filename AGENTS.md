# AGENTS.md — CareSupport

You are an agent working on a care coordination system that texts with families via SMS.

## Start Here

- **What this is:** `docs/product-specs/sms-care-coordination.md`
- **Why it's built this way:** `docs/design-docs/core-beliefs.md`
- **How the system fits together:** `ARCHITECTURE.md`

## Repository Map

```
AGENTS.md                 ← You are here
ARCHITECTURE.md           ← System diagram, domains, dependency rules
docs/
  design-docs/            ← Architecture decisions (indexed: design-docs/index.md)
  exec-plans/             ← Active plans, completed plans, tech debt
    active/               ← Current work
    completed/            ← Done
    tech-debt-tracker.md  ← Known gaps, honest
  product-specs/          ← What the product is (indexed: product-specs/index.md)
  references/             ← External knowledge (Twilio, HIPAA, OpenAI article)
  QUALITY_SCORE.md        ← Grades per layer — read before claiming something works
  SECURITY.md             ← What's enforced vs. what's prompt-level
  RELIABILITY.md          ← What's tested vs. what isn't
agent/                    ← System prompt template
examples/                 ← rob-family.md — reference populated family
runtime/                  ← SMS pipeline (README.md has data flow diagram)
  config.py               ← All paths and settings. Import this, not hardcode.
  scripts/                ← sms_handler, poll_inbound, twilio_proxy, sms_gateway
fork/                     ← CareSupport adaptation of Viktor's architecture
  system-prompt.md        ← Production system prompt (forked from Viktor)
  PRODUCTION-PLAN.md      ← Phase 0-4 rollout plan
  ASSESSMENT.md           ← Viktor infrastructure assessment
  workspace/protocols/    ← 16 care protocols (PROTOCOL.md files)
  workspace/sdk/utils/    ← role_filter.py, phi_audit.py
  simulation/             ← 52 conversations, 5 families, results + synthesis
research/                 ← Completed research (Viktor interview, 13 rounds)
clone/                    ← Viktor factory default (reference snapshot)
```

## By Task

**Understand the architecture →** `ARCHITECTURE.md` then `docs/design-docs/core-beliefs.md`

**Work on the SMS pipeline →** `runtime/README.md` then `runtime/config.py`

**Add or modify a care protocol →** `fork/workspace/protocols/` — each has a PROTOCOL.md

**Understand the family.md format →** `docs/design-docs/family-md-spec.md` then `examples/rob-family.md`

**Check what's built vs. not built →** `docs/QUALITY_SCORE.md`

**Check security posture →** `docs/SECURITY.md`

**See what we're working on now →** `docs/exec-plans/active/`

**See known gaps →** `docs/exec-plans/tech-debt-tracker.md`

**Understand the simulation results →** `fork/simulation/results/SYNTHESIS.md`

**Understand why we built it this way →** `docs/design-docs/primitive-shift.md`

## Key Rules

1. **Import from `runtime/config.py`** — never hardcode absolute paths
2. **Read QUALITY_SCORE.md before claiming something works** — it's honest
3. **Check exec-plans/active/ before starting new work** — plans are first-class
4. **Safety enforcement must be mechanical, not just prompt-level** — see SECURITY.md
5. **family.md changes use Edit (surgical replacement), not Write (overwrite)**
6. **Update QUALITY_SCORE.md after adding enforcement or tests**

## Build & Run

```bash
# Type check (TS prototype)
npm install && npx tsc --noEmit

# Run SMS handler (Python runtime)
cd runtime/scripts && python sms_handler.py --from "+1..." --body "test" --dry-run

# Process inbound messages
cd runtime/scripts && python poll_inbound.py
```
