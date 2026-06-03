# AGENTS.md - CareSupport v2

## Project

CareSupport is a multiplayer family care agent: a text-native operational
coordination runtime for one care situation and the people around it.

Repo: `kanoliban/caresupport-v2`

## Product Direction

The current solo-thread product is the wedge, not the destination.

The solo thread is useful as:

- the first relationship
- onboarding
- trusted narration
- initial memory-building
- the safest way to prove the core loop

The long-term product is one-to-many family care coordination across care
recipients, family caregivers, professional caregivers, agencies, schedules,
reminders, outreach, and operational coordination events.

## Rob Heuristic

Rob is the most important user model.

He is quadriplegic, uses his nose to operate his iPhone, and coordinates 12
people himself: 9 professional caregivers and 3 family members across 3
disconnected agencies.

Core product question:

> Does this reduce the number of times Rob has to use his nose to chase care coordination?

If no, the feature is probably not central.

## Current Runtime

The active Convex runtime is still intentionally small:

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

The current prompt/runtime can text one user, build memory, save medication and
schedule records, load active care contacts and open coordination events into
prompt context, create contacts/events from structured model output, persist
permissioned outreach attempts, execute approved one-to-one outreach through
Linq, resolve caregiver replies back into the care graph, and audit the
exchange. It does not yet create group chats, sync external tools, or run broad
role/permission systems.

Those are implementation boundaries, not product non-goals.

## Emerging Runtime Concepts

Started substrate:

- `careContacts`
- `coordinationEvents`

Expected future primitives:

- `toolActions`
- `connectedAccounts`
- `externalRefs`
- `userToolPermissions`

Likely runtime folders:

- `convex/lib/tools/`
- `convex/lib/providers/`
- `convex/lib/coordination/`
- `convex/lib/knowledge/`

Do not overbuild these before a real product loop requires them. The first
multiplayer loop should likely be coverage-gap coordination.

## Safety And Data Boundaries

Safety is mechanical, not prompt-only.

- No outbound outreach without explicit permission rules.
- No external tool execution without persisted action/audit state.
- No assistant claim of completed work unless the runtime actually did the work.
- Future family-scoped or care-case-scoped reads must filter by the owning
  `careCaseId` or `familyId`.
- Phone-only lookup is acceptable only for inbound identity resolution or
  verified provider callbacks.
- Do not resurrect the old v1 `families`/`members`/access-tier architecture as
  a compatibility shortcut. Reintroduce multiplayer primitives through a current
  schema design.

## Canonical Docs

Start with:

- `README.md`
- `CLAUDE.md`
- `SOUL.md`
- `docs/design.md`
- `docs/product-thesis.md`
- `docs/caresupport-model-constitution.md`
- `docs/convex-memory-retrieval-architecture.md`
- `docs/caresupport-learning-retrieval-implementation.md`
- `docs/rob-care-operations-model.md`
- `docs/tools-and-capabilities-thought-experiment.md`
- `docs/integrations-and-tool-bearing-agent.md`
- `docs/research-integration-architecture.md`
- `docs/agent-knowledge-visibility.md`
- `docs/implementation-plan-family-care-agent.md`
- `docs/DECISIONS.md`

If these disagree, stop and resolve the product decision before coding.

## Engineering Conventions

- No `as any`, `@ts-ignore`, or `@ts-expect-error`
- Use Convex typed IDs everywhere (`Id<"careCases">`, not bare strings)
- Prefer extending the current deterministic core over reviving archived v1
  abstractions
- Test with `convex-test` and Vitest
- Commit messages: imperative mood, concise
- Keep unrelated local changes intact

## Agent Roles

| Agent | Domain |
|-------|--------|
| Claude | Architecture, design decisions, enforcement logic, prompt engineering, complex reasoning |
| Codex | Execution, deployment, CI/CD, PR management, seed data, mechanical migrations |

## Communication

| Channel | Purpose | Who writes |
|---------|---------|------------|
| `AGENTS.md` | Identity, context, conventions. Stable reference. | Claude or Codex with Liban's approval |
| `docs/agent-log.md` | Shift-change log. What happened, what's next, concerns. | Both agents, append-only |
| PR comments | Code-level dialogue on specific changes | Both agents |
| Commit messages | What was done | Whoever commits |

After every substantive session, append to `docs/agent-log.md`:

- what you did
- what state you left things in
- what the next agent should know
- concerns or open questions

Read the last 2-3 log entries before starting work.
