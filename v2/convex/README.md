# V2 Convex Functions

This folder defines the Convex data model and function surface for CareSupport 2.0.

## Files
- `schema.ts` — table definitions
- `families_v2.ts` — v2 family context queries and family updates
- `members_v2.ts` — v2 actor resolution and routing/member updates
- `conversations_v2.ts` — v2 inbound/outbound conversation logs
- `audit_v2.ts` — v2 immutable audit log writes
- `process_v2.ts` — v2 outreach queue and ingress bridge actions
- `importer_v2.ts` — v2 snapshot import functions
- `projections_v2.ts` — v2 `family.md` markdown projection + materialized context
- `medications_v2.ts` — normalized medication mutations
- `schedule_v2.ts` — normalized schedule mutations
- `lessons_v2.ts` — lesson upserts + embedding backfill action
- `families.ts`, `members.ts`, `conversations.ts`, `auditLogs.ts`, `process.ts`, `importer.ts`, `projections.ts`, `ops.ts` — compatibility wrappers (one release window)
- `http.ts` — HTTP route for inbound Linq webhook

## Deploy
From `v2/`:

```bash
npx convex dev
# or
npx convex deploy
```

Use the Convex deployment URL as `CONVEX_URL` in `.env`.
