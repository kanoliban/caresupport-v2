# Composio Integration — Phase 1 (Rob Solo)

Plan: `docs/composio-integration-plan.md`. Spike: `convex/lib/tools/composioClient.ts` (already typechecks clean).

## Pre-flight

- [ ] Sign up at composio.dev (free tier, 20K tool calls/mo)
- [ ] Add `COMPOSIO_API_KEY` to macOS Keychain: `security add-generic-password -s claude-env -a COMPOSIO_API_KEY -w <key> -U`
- [ ] Add `COMPOSIO_API_KEY` to `~/.local/bin/claude-secure` SECRETS array
- [ ] Set Convex deployment env var: `npx convex env set COMPOSIO_API_KEY <key>`
- [ ] Install Composio CLI: `curl -fsSL https://composio.dev/install | bash` then `composio login`
- [ ] (Optional) Install Claude Code plugin for interactive testing during dev: `/plugin marketplace add ComposioHQ/composio-plugin-cc` then `/plugin install composio-mcp@composio`
- [ ] Connect dev's own Google account locally: `composio link googlecalendar` — used for smoke testing against real APIs without burning Rob's connection
- [ ] Run smoke script: `npx tsx scripts/composio-smoke.ts` — exercises createClient + startConnection + listConnectedAccounts + executeTool against real API
- [ ] Validate Convex deploy compatibility: `npx convex dev` — confirms `@composio/core` (and its `pusher-js` + `openai` transitive deps) bundle cleanly in Convex's Node runtime
- [ ] Configure Composio dashboard callback URL: set to `${CONVEX_SITE_URL}/composio/callback` (CONVEX_SITE_URL is already in Convex env vars)

## Schema migration

- [ ] Add `connectedAccounts` table (userId, toolkit, composioAccountId, status, scopes, connectedAt, updatedAt) with indexes by_user and by_user_toolkit
- [ ] Add `toolActions` table (careCaseId, requestedByUserId, executedAsUserId, toolSlug, capability, args, status, result, error, requestedByMessageId, approvedByMessageId, timestamps) with indexes by_care_case, by_care_case_status, by_requested_by
- [ ] Add `externalRefs` table (careCaseId, localTable, localId, toolkit, externalId, externalUrl, timestamps) with indexes by_local and by_external
- [ ] Add `userToolPermissions` table (userId, capability, granted, grantedAt, revokedAt) with indexes by_user and by_user_capability
- [ ] Add `users.role` field — union of "primary_owner" | "participant" | "care_recipient". Default `primary_owner` for first texter on a careCase, `participant` for subsequent texters
- [ ] Migrate existing users — backfill `role="primary_owner"` for any active user (we have one careCase per user today)
- [ ] Add audit event types: `tool_action_proposed`, `tool_action_approved`, `tool_action_executed`, `tool_action_failed`, `connected_account_linked`, `connected_account_revoked`, `connection_link_sent`
- [ ] Extend `auditDetails` union in `convex/schema.ts` with optional fields: `toolSlug`, `toolStatus`, `composioAccountId`, `connectedToolkit`, `capability`, `connectionRequestId`. Without these, Convex will reject the new event inserts.
- [ ] Add `lastConnectionLinkSentAt: v.optional(v.number())` to `connectedAccounts` table — used for rate limiting (max one link per toolkit per user per 10 minutes)
- [ ] Generate typed stubs after API key is configured: `composio generate ts --toolkits googlecalendar,gmail --output-dir convex/lib/tools/generated` — refactor `composioClient.ts` to use these instead of the current `as unknown as` casts

## Composio client + dispatch

- [x] `convex/lib/tools/composioClient.ts` (done in spike)
- [ ] `convex/lib/tools/registry.ts` — exports a curated list: GOOGLECALENDAR_LIST_EVENTS, GOOGLECALENDAR_CREATE_EVENT, GOOGLECALENDAR_UPDATE_EVENT, GOOGLECALENDAR_DELETE_EVENT, GMAIL_LIST_MESSAGES, GMAIL_SEND_EMAIL. Each entry pairs Composio slug → CareSupport capability name → requires-confirmation flag
- [ ] `convex/lib/tools/dispatch.ts` — accepts a parsed Anthropic tool_use block + actor user, persists toolAction (pending), checks userToolPermissions, either asks for confirmation (returns conversational ask) or executes via Composio, updates toolAction + externalRef, returns ToolResult
- [ ] `convex/connectedAccounts.ts` — mutations: upsert, updateStatus, list by user. Queries: getByUserToolkit, listByCareCase
- [ ] `convex/toolActions.ts` — mutations: insertProposed, markApproved, markExecuted, markFailed. Queries: listPendingForUser, listRecentForCareCase
- [ ] `convex/userToolPermissions.ts` — mutations: grant, revoke. Queries: isGranted(userId, capability)

## OAuth onboarding flow

- [ ] New skill content in `convex/lib/promptContent.ts` — `INTEGRATION_SKILLS` block: "When user wants calendar/email integration, emit a `connection_requests` JSON entry, not a tool_use block"
- [ ] Extend `AGENT_RESPONSE_FORMAT` in `convex/lib/anthropicClient.ts` with `connection_requests` array: `{ toolkit: "googlecalendar"|"gmail", reason: string }[]`. Extend `AgentResponse` TypeScript type in `convex/lib/pipeline/types.ts` to match.
- [ ] Handler block in `handler.ts` after `extractJson` — iterate `parsed.connectionRequests`. For each entry: check rate limit (`connectedAccounts.lastConnectionLinkSentAt > now - 10min` → skip), call `composioClient.startConnection`, upsert `connectedAccounts` row with status=`initiated` + `composioAccountId` + `lastConnectionLinkSentAt=now`, send link via Linq ("Tap to connect: <url>"), log audit event `connection_link_sent`
- [ ] New HTTP route `convex/http.ts` → **GET** `/composio/callback` (Composio uses GET redirects with query params `status`, `connected_account_id`, `user_id`). Updates connectedAccounts row to `active`, sends Linq confirmation: "Calendar connected. I can add appointments for you now." Returns a simple HTML acknowledgement page so the user's browser doesn't show blank
- [ ] Pass our Convex `users._id` (string) as Composio `user_id` everywhere. On callback, match `user_id` query param against `users._id` to locate the right row

## Prompt contract upgrade (hybrid)

- [ ] Extend `convex/lib/anthropicClient.ts` — add optional `tools` param to AnthropicInput, plumb through to `client.messages.stream`
- [ ] Update `handler.ts` to assemble `tools` from registry filtered by user's active connectedAccounts (no `request_connection` here — that's the JSON-side `connection_requests` field handled above)
- [ ] After `extractJson`, also iterate `response.content` for `tool_use` blocks. Run each through `dispatch.ts`
- [ ] If any dispatched tool returns a result the model needs (e.g. calendar.list), make a second Claude call with `tool_result` blocks. Otherwise use the first response's text as `smsResponse`
- [ ] Add audit event `tool_use_dispatched` to logAudit details
- [ ] Update `pipeline.ts` Intent enum if needed — likely no change; tools are orthogonal to intent

## Auto-mirror scheduleItems → Google Calendar

- [ ] On scheduleItem upsert: if `userToolPermissions(userId, "calendar.auto_mirror") == granted` AND user has active googlecalendar connection, dispatch GOOGLECALENDAR_CREATE_EVENT (or update if externalRef exists). On success, write externalRef row
- [ ] On scheduleItem delete: lookup externalRef, dispatch GOOGLECALENDAR_DELETE_EVENT, delete externalRef on success
- [ ] One-time prompt: first scheduleItem after Google connection — agent asks "Want me to put appointments on your Google Calendar automatically?" → on yes, grant `calendar.auto_mirror` permission. Add this to onboarding skills
- [ ] Failure handling: GCal failure does not roll back scheduleItem. Failure surfaces in next outbound message ("I saved it here but couldn't add it to your calendar — try reconnecting Google?")

## Confirmation gate UX

- [ ] Loose affirmative parser in handler — extends existing PROFILE_SAVE_PATTERNS style. Matches /^\s*(yes|yeah|yep|y|go|do it|sure|ok|okay|please|confirmed?)\b/i on inbound when there's a pending toolAction for the user
- [ ] On affirmative match: flip most recent pending toolAction to approved, mark approvedByMessageId, dispatch
- [ ] On any other inbound while pending exists: model has the pending action in its context block, can re-ask or change intent. After N minutes (default 60), pending auto-cancels

## Tests

- [ ] Unit: dispatch.ts logic (permission check branches, mock Composio client)
- [ ] Unit: registry exports correct tool defs
- [ ] Unit: toAnthropicTool adapter shape
- [ ] Integration: handler flow with a mock Composio that returns a `redirectUrl` and a fake tool result
- [ ] Integration: auto-mirror happy path (user grants permission, schedules an appointment, externalRef written)
- [ ] Integration: auto-mirror failure path (Composio errors, scheduleItem stays, audit logged)
- [ ] E2E manual: smoke against real Composio sandbox once API key is in

## Companion app surface

- [ ] Convex query: `connectedAccounts.listForUser` (returns toolkit, status, scopes)
- [ ] Convex query: `toolActions.feedForCareCase` (paginated, ordered by createdAt desc, joined with externalRef.externalUrl when present)
- [ ] Convex mutation: `connectedAccounts.disconnect(toolkit)` — calls `composio.connectedAccounts.delete`, updates row to revoked

## Verification (Definition of Done)

- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` green
- [ ] `npx convex dev` deploys without errors
- [ ] Manual smoke: Rob (test phone) texts "I have PT next Tuesday at 2." → scheduleItem persists + GCal event created + externalRef row written + confirmation text sent
- [ ] Update `docs/agent-log.md` with Phase 1 completion entry
- [ ] Confirm `CLAUDE.md` "current prompt/runtime cannot yet" list updated to reflect new capabilities
