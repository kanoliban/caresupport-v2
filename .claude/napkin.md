# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-04-04 | self | Checked repo status and local instructions before reading `.claude/napkin.md`. | Read the repo napkin first on entry, then inspect git state and other instructions. |
| 2026-04-04 | user | Re-triggered Convex device auth after already discovering this machine re-prompts for `convex dev --once`. | Before any future dev sync on this machine, warn the user that Convex device auth will pop again and wait for explicit go-ahead. |
| 2026-03-06 | self | Wrote handoff notes into the Desktop clone instead of `~/caresupport-v2`. | Treat `~/caresupport-v2` as the canonical repo for this branch work and update notes there. |
| 2026-03-06 | self | Treated Convex prod deploy failure as a code migration problem. | If deploy fails on schema validation against legacy seed rows, clear the throwaway data first rather than writing a migration. |
| 2026-03-06 | self | Assumed `npm run seed` would target prod after deploy. | Override `CONVEX_URL` explicitly when seeding prod; `.env.local` still points at dev. |
| 2026-03-06 | user | Framed the weak smoke-test answer as a bug in this PR. | Response quality is expected until structured table data is loaded into the prompt; do not treat that as a blocker for this schema PR. |

| 2026-07-02 | user | Called Tomo "Series' AI companion" — they are two separate companies (tomo.ai vs series.so). | Verify company/product relationships with a web search before asserting; the founder knows this landscape. |
| 2026-07-02 | self | Based a new branch on origin/main; production actually deploys from feature branches via `vercel --prod` (main is stale). | Check which branch the LIVE site serves (probe a route only on the feature branch) before choosing a base. |
| 2026-07-02 | self | web/app/apple-icon.png silently missing from Vercel deploy. | Root .vercelignore blocks `*.png` except web/public/**; any image outside web/public needs an explicit `!` entry. |

| 2026-07-02 | incident | CLI `vercel --prod` deploys were silently replaced when the founder pushed a docs commit to main (Vercel productionBranch=main built stale code). | main is the ONLY deploy path: git push origin main. Never `vercel deploy --prod`. Ignored-build-step skips docs-only commits. |

## User Preferences
- Keep `docs/agent-log.md` current in `~/caresupport-v2`; the user uses it as shift-change state across agents.
- For throwaway seed data, do not write migration scripts. Clear the old data and reseed.

## Patterns That Work
- `npx convex deploy --typecheck=disable` is required here because Convex CLI typechecks vitest files and trips on `import.meta.glob` even when repo `tsc` passes.
- Clearing prod with `npx convex import --table <table> --replace --prod -y /tmp/convex-empty.json` works cleanly for throwaway seed data, including legacy v1 tables.
- A signed POST to `https://<deployment>.convex.site/webhook/linq` is a practical smoke-test path when a physical phone is not in hand.
- When webhook signing is blocked, `set -a && source .env.local && npx convex run handler:handleMessage '{...}'` is a viable live dev smoke-test path; it hits the deployed handler and writes real `messages` rows.
- On this machine, `npx convex dev --once --env-file .env.local --typecheck disable` was the reliable way to authenticate and sync code to the dev deployment after local changes; it also surfaced schema-validation blockers clearly.
- If dev sync fails on schema validation because a `families` row still has legacy slug field `familyId`, `admin:stripLegacyFields` can clean that row in place without wiping the rest of the throwaway deployment.
- For audit-only handler fixes, reuse existing `auditDetails` fields such as `recipientPhone` and `failureReason` instead of expanding the schema.
- For runtime enum validation, add the guard next to the shared type definition and default handlers to the most restrictive behavior instead of casting.
- Linq iMessage reply threading can stay schema-free: resolve `reply_to.message_id` through `messages.by_linq_message_id` and prepend a short quoted-body prefix for Claude context.
- SMS UX constraints need mechanical enforcement in the handler/Linq path: sanitize markdown after `extractJson`, cap bubbles in `splitIntoBubbles`, and pace sends from actual bubble counts instead of trusting prompt text.
- For TSX/ESM CLI scripts that are imported by tests, gate `main()` behind a direct-execution check so parser/helper tests stay hermetic.
- Approval replies are safer as a single internal mutation that resolves the approval and applies the approved family-context update atomically; splitting that across action calls risks “applied” confirmations without persisted state.
- Normalize section names through shared slug keys (`care_recipient`, `family members`, `Care Recipient`, etc.) before approval checks or context writes; this repo mixes slug keys and title-case headers.
- When the product is in transition, default runtime mode to the most restrictive path (`solo_beta`) and require explicit opt-in for broader capabilities; that enforces the pivot before operational resets are complete.
- To prevent product drift, lock direction in four places at once: repo-local `AGENTS.md`, a durable decision log, archive notes on legacy strategy docs, and regression tests that fail if runtime behavior broadens accidentally.
- On this machine, `convex run` is reliable only when targeting deployments explicitly by `--deployment-name`; the `--env-file` path can still fail with `MissingAccessToken` even right after a successful `convex dev --once` login.
- For destructive resets here, prefer an internal `admin:clearAppData` mutation plus `npx convex run ... --deployment-name ...` over `convex import --replace`; the latter was not operationally reliable in this environment.
- Explicit "save this to my profile" requests need a mechanical merge step, not just a prompt instruction. If the model returns unrelated or malformed `member_updates`, append the inferred explicit update anyway unless the exact content already exists.
- When the shipped product changes fundamentally and prod is empty, replace the active deterministic substrate to match the shipped truth instead of preserving legacy tables for convenience. Future agents should be able to infer the real product model from schema + docs alone.
- Production memory needs a narrow save discipline: respond to temporary caregiver stress with empathy, but do not automatically persist emotional paraphrases or “be warm/patient” coaching as durable memory unless the user explicitly asks or the fact is stable long-term context.

## Patterns That Don't Work
- `npm test` is not hermetic here; `tests/seed.test.ts` can hit a real Convex deployment because importing `scripts/seed-from-files.ts` runs `main()`.
- Updating notes in the wrong local clone creates false handoff state even when the branch itself is correct.
- Local Linq webhook signing secrets can drift from the deployed dev secret; when `/webhook/linq` returns `401 invalid_signature`, do not assume the handler is broken before checking secret parity.
- Separate noninteractive admin commands like `npx convex deploy --env-file .env.local ...` and `npx convex env list --env-file .env.local` can still fail with `MissingAccessToken` even right after a successful device-login flow inside `convex dev`.

## Domain Notes
- Response-quality limits are architectural right now: the handler does not yet load structured table data such as `scheduleItems` and `medications` into the prompt.
- Family-scoped data must be queried with `familyId`; phone-only lookups are only for member resolution and specific Linq callback paths called out in repo docs.
- Approval routing should resolve approvers from family coordinators (`members.by_family` + `isCoordinator`), not from the requester phone.
- A live dev repro now exists for the approval trust-break: deployed handler acknowledges `YES` with `Change applied` while leaving the approval row `pending`. Treat that as a deployment-state problem until proven otherwise.
- Deploy order for schema-touching changes: `npx convex deploy` FIRST, then web deploy — mutation args must exist before clients send them.
- The runtime treats every inbound phone as a 1:1 human by default; the doorman (convex/lib/doorman.ts + runDoorman in handler.ts, DOORMAN_ENABLED env) now screens unknown senders. Group chats are hard-gated via the groupChats registry + Linq is_group check.
- Founder feedback: Liban texts CareSupport (FOUNDER_PHONE); dev_feedback field files GitHub issues labeled founder-feedback. Sweep them at session start (see CLAUDE.md).
- Sentinel (convex/sentinel.ts) texts the founder on ai_failure / user_burst / outbound_velocity; thresholds live at the top of that file and mutations.ts logMessage.
- Incident context for all of the above: docs/incidents/2026-07-02-group-chat.md.
