# Napkin

## Corrections
| Date | Source | What Went Wrong | What To Do Instead |
|------|--------|----------------|-------------------|
| 2026-03-06 | self | Wrote handoff notes into the Desktop clone instead of `~/caresupport-v2`. | Treat `~/caresupport-v2` as the canonical repo for this branch work and update notes there. |
| 2026-03-06 | self | Treated Convex prod deploy failure as a code migration problem. | If deploy fails on schema validation against legacy seed rows, clear the throwaway data first rather than writing a migration. |
| 2026-03-06 | self | Assumed `npm run seed` would target prod after deploy. | Override `CONVEX_URL` explicitly when seeding prod; `.env.local` still points at dev. |
| 2026-03-06 | user | Framed the weak smoke-test answer as a bug in this PR. | Response quality is expected until structured table data is loaded into the prompt; do not treat that as a blocker for this schema PR. |

## User Preferences
- Keep `docs/agent-log.md` current in `~/caresupport-v2`; the user uses it as shift-change state across agents.
- For throwaway seed data, do not write migration scripts. Clear the old data and reseed.

## Patterns That Work
- `npx convex deploy --typecheck=disable` is required here because Convex CLI typechecks vitest files and trips on `import.meta.glob` even when repo `tsc` passes.
- Clearing prod with `npx convex import --table <table> --replace --prod -y /tmp/convex-empty.json` works cleanly for throwaway seed data, including legacy v1 tables.
- A signed POST to `https://<deployment>.convex.site/webhook/linq` is a practical smoke-test path when a physical phone is not in hand.
- For audit-only handler fixes, reuse existing `auditDetails` fields such as `recipientPhone` and `failureReason` instead of expanding the schema.
- For runtime enum validation, add the guard next to the shared type definition and default handlers to the most restrictive behavior instead of casting.
- Linq iMessage reply threading can stay schema-free: resolve `reply_to.message_id` through `messages.by_linq_message_id` and prepend a short quoted-body prefix for Claude context.
- SMS UX constraints need mechanical enforcement in the handler/Linq path: sanitize markdown after `extractJson`, cap bubbles in `splitIntoBubbles`, and pace sends from actual bubble counts instead of trusting prompt text.

## Patterns That Don't Work
- `npm test` is not hermetic here; `tests/seed.test.ts` can hit a real Convex deployment because importing `scripts/seed-from-files.ts` runs `main()`.
- Updating notes in the wrong local clone creates false handoff state even when the branch itself is correct.

## Domain Notes
- Response-quality limits are architectural right now: the handler does not yet load structured table data such as `scheduleItems` and `medications` into the prompt.
- Family-scoped data must be queried with `familyId`; phone-only lookups are only for member resolution and specific Linq callback paths called out in repo docs.
- Approval routing should resolve approvers from family coordinators (`members.by_family` + `isCoordinator`), not from the requester phone.
