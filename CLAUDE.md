# CLAUDE.md

This file orients Claude and other coding agents working in this repo.

CareSupport is a multiplayer family care agent: a text-native operational
coordination runtime for one care situation and the people around it.

The current implementation starts from one trusted coordinator thread. That
thread builds memory, starts the care record, and can now expand into
permissioned one-to-one outreach with care contacts. Do not confuse the first
thread with the long-term product identity.

## North Star

CareSupport should reduce the operational coordination burden in family care.
For Rob, that means fewer nose-driven interactions to chase caregivers,
agencies, schedule gaps, reminders, handoffs, and status updates.

The test for a major feature is:

> Does this reduce the number of times Rob has to use his nose to chase care coordination?

If the answer is no, the feature is probably not central.

## Current Runtime Contract

The active Convex schema is intentionally small:

- `users`
- `careCases`
- `messages`
- `medications`
- `scheduleItems`
- `memoryEntries`
- `careContacts`
- `coordinationEvents`
- `outreachAttempts`
- `auditLogs`

The current prompt/runtime can:

- reply over text
- remember user and care-case facts
- persist medication and schedule records
- load active care contacts and open coordination events into prompt context
- create care contacts and coordination events from model output
- persist pending outreach attempts
- detect exact primary-coordinator approval
- send approved one-to-one outreach through Linq
- map care contact replies back to the correct care case, contact, event, and
  outreach attempt
- record self-corrections
- keep an audit trail

The current prompt/runtime cannot yet:

- operate group chats as a multiplayer runtime
- execute external tools
- sync calendars or email
- autonomously resolve coverage gaps

Those limitations are implementation status, not product philosophy.

## Direction Of Travel

The first multiplayer loop now exists as care-case-scoped contact, event,
outreach, reply-mapping, and audit state. `docs/multiplayer-runtime-architecture.md`
is the canonical architecture reference.

Future multiplayer/runtime concepts are expected to include:

- `toolActions`
- `connectedAccounts`
- `externalRefs`
- `userToolPermissions`

Likely code organization:

- `convex/lib/tools/`
- `convex/lib/providers/`
- `convex/lib/coordination/`
- `convex/lib/knowledge/`

Add these only when a concrete product loop needs them. The first serious loop
is coverage-gap coordination: detect the gap, identify possible coverage, ask
permission, perform outreach, track replies, escalate when needed, and close the
loop with minimal user interaction.

## Safety Rules

Safety must be enforced mechanically, not only by model instruction.

- No outbound outreach without an explicit permission model.
- No tool execution without a persisted `toolAction`-style audit trail.
- No future family-scoped or care-case-scoped query should read broad state and
  filter in memory.
- Phone-only lookup is acceptable only as an identity-resolution step for an
  inbound message or verified provider callback.
- When multiplayer tables exist, queries must scope by `careCaseId` or
  `familyId`, depending on the chosen schema boundary.
- Do not revive the old `families`/`members`/access-tier schema by accident.
  Reintroduce multiplayer primitives through an explicit product decision and a
  current schema design.

## Prompt And Parser Contract

Current structured response fields are:

- `smsResponse`
- `internalNotes`
- `userProfileUpdate`
- `careCaseProfileUpdate`
- `userMemoryUpdates`
- `careCaseMemoryUpdates`
- `selfCorrections`
- `reactions`
- `effect`
- `medicationUpdates`
- `scheduleUpdates`

Do not use retired v1 fields such as `familyFileUpdates`, `memberUpdates`,
`needsOutreach`, or `routingUpdates` in current prompts.

When adding tool-bearing behavior, update the prompt, parser, schema, handler,
and tests together. Do not let the assistant claim it performed an action unless
the runtime has persisted and executed that action.

## Product Language

Use:

- family care agent
- text-native care coordination runtime
- one-to-many care orchestration
- tool-bearing assistant
- solo-thread wedge
- trusted narrator
- operational coordination

Avoid as product identity:

- solo caregiver app
- reminder bot
- dashboard
- care journal
- generic personal assistant

## Founder Feedback Loop

Liban texts feedback directly to CareSupport (founder mode: his number is
`FOUNDER_PHONE` in Convex env). The runtime captures it via the
`dev_feedback` structured field and files each item as a GitHub issue
labeled `founder-feedback`.

**At the start of every session in this repo, sweep the queue:**

```bash
gh issue list --repo kanoliban/caresupport-v2 --label founder-feedback --state open
```

Triage anything open: propose fixes, turn them into PRs, and close issues
with the commits that resolve them. These issues are the founder's direct
voice — treat them as the top of the backlog.

## Shipping — read CONTRIBUTING.md, it is binding

**Main only moves by pull request. Never push directly to main. Never `vercel deploy --prod`.** The full process (branch → PR → CI green → squash merge → auto-deploy) is in `CONTRIBUTING.md`.

At session start, verify the push guard is active in this clone:

```bash
git config core.hooksPath   # must print .githooks — if empty:
git config core.hooksPath .githooks
```

- Convex schema/function changes: `npx convex deploy -y` BEFORE the web PR merges.
- Docs-only commits do not trigger site rebuilds (Vercel ignored-build-step).
- Production = Vercel git integration building `main` (project `caresupport`, root `web/`). Nothing else deploys the site.

## Verification

Common checks:

```bash
npx convex dev
npx tsc --noEmit
npm test
```

If `_generated/` is missing, run `npx convex dev` before typechecking.
