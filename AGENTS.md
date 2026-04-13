# AGENTS.md — CareSupport Repo Overrides

This file overrides the global `/Users/libankano/AGENTS.md` for this repository.

## Active Product Direction

CareSupport is currently a **solo-caregiver concierge beta**.

The active wedge is:
- one user
- one loved one / care situation
- one 1:1 iMessage thread with CareSupport

The current goal is to learn from 20–50 users quickly and optimize for **weekly retained users**.

## Non-Goals For The Active Product

Do not expand or re-center the product around:
- family/team invites
- multiplayer coordination
- outreach to other people
- group chat behavior
- access-tier/product packaging work
- upgrade/paywall work

Those capabilities may remain in code as dormant infrastructure, but they are **not** the active product path.

## Canonical Docs

Use these as the current source of truth:
- `docs/design.md` — what the product is now
- `docs/ROADMAP.md` — current sequencing
- `docs/concierge-beta.md` — operator runbook
- `docs/DECISIONS.md` — durable product decisions
- `docs/onboarding.md` — active onboarding contract

Historical strategy docs such as `docs/PRODUCT_STRATEGY.md` and `docs/VISION.md` are context only unless `docs/DECISIONS.md` says otherwise.

## Runtime Expectations

The active runtime should default to the most restrictive solo-safe behavior.

That means:
- missing or unknown `productMode` should resolve to `solo_beta`
- solo beta must not create invites, outreach, or upgrade flows
- tests should fail if the active prompt/runtime drifts back toward multiplayer behavior

## Operational Rules

- Before any `npx convex dev --once ...` or similar flow that may trigger Convex auth, warn the user first and wait for explicit approval.
- Before any destructive reset (`npm run reset:dev`, `npm run reset:prod`, `npx convex import --replace ...`), warn the user first and wait for explicit approval.
- Deploy the new runtime before wiping data.
- Keep `docs/agent-log.md` current at the end of substantive work.

## Documentation Discipline

If product direction changes:
- update `docs/DECISIONS.md`
- update the canonical docs listed above
- add or strengthen archive/status notes on legacy docs

Do not let strategy drift live only in chat.
