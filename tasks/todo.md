# Agnost analytics integration

Org: `ecc7ed31-c985-436d-b062-5ba9388f516b`
Route: `agnostai` conversation SDK (TypeScript), per `.agents/skills/agnost-ai`.

## Plan
- [x] Add `agnostai` dependency
- [x] `convex/lib/agnost.ts` — deferred-identity turn recorder that no-ops
      without `AGNOST_ORG_ID`, never throws into the care runtime, and flushes
      before the serverless action returns
- [x] Wire `handleMessage` (agent `care-coordinator`) — identity, input,
      output, success, per-turn properties
- [x] Wire `runDoorman` (agent `doorman`) — stranger-scoped identity, no PII
- [x] Unit tests for the recorder (11 tests)
- [x] `npx tsc --noEmit` clean + `npm test` 412/412
- [x] Confirm `agnostai` bundles into the Node action (pushed clean)
- [ ] Ship to prod `keen-raccoon-606` via the CONTRIBUTING.md gate:
      PR → CI green → `npx convex env set` (prod) → `npx convex deploy -y`
      → merge
- [ ] Drive one real turn: `testChat:send` is disabled under
      `APP_ENV=production`, so verification is a real iMessage to the live
      number, which sends a real reply.

## Notes
- Convex Node actions are serverless: the SDK's 100ms background drain is not
  reliable, so every recorded turn awaits `flush()` before returning.
- `begin()` fires session creation; it is called before the model runs so the
  session exists by the time the event lands.
- Identity is real Convex ids, never phone numbers: `users._id` /
  `careCases._id` for the care agent, `strangers._id` for the doorman.
- Message bodies are PHI-adjacent. Capture is on per the integration request;
  `AGNOST_DISABLE_CONTENT=true` redacts input/output without removing the
  telemetry.

## Deployment trap

`.env.local` still points at `dev:valiant-tortoise-962`, which is retired and
intentionally paused. Every Convex command without `--prod` targets it. The
live deployment is `keen-raccoon-606`. Worth pointing `.env.local` at prod or
deleting the dead deployment so the next session doesn't repeat this.

## Verification on prod

Set `AGNOST_DEBUG=true` on prod for the first turn — the Convex logs then print
`[agnost.events] Event sent successfully: <id>` on a 200 from api.agnost.ai,
which is server-side proof independent of the dashboard. Unset it once the
conversation shows up in Agnost.

## Review
- One Agnost event per real agent turn, never per model call: the deterministic
  reply paths (calendar connect, contact identity clarification, outreach
  approval) are turns too, and the approval path carries
  `tool=care_contact_outreach`.
- Turns that end before identity resolves emit nothing — group chats, known
  agents, velocity-flagged strangers, exhausted doorman budget. No empty
  sessions.
- `handleMessage` reports `users._id` / `careCases._id`; `runDoorman` reports
  `strangers._id`. Phone numbers are never sent.
