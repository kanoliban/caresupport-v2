# Composio Integration Plan

## What This Builds On

- `docs/integrations-and-tool-bearing-agent.md` — strategic case for tool-bearing CareSupport, schema sketches, build order
- `docs/research-integration-architecture.md` — vendor-neutral research on integration patterns
- `CLAUDE.md` — runtime contract, safety rules, naming primitives (`toolActions`, `connectedAccounts`, `externalRefs`, `userToolPermissions`)

Those documents intentionally leave the vendor decision open. This one closes it.

## Decision

CareSupport will use **Composio** (composio.dev) as the execution and OAuth layer for external provider tools (Google Calendar, Gmail, and later additions). We will **not** build our own OAuth flows, token refresh, or provider-specific HTTP clients.

We will continue to own the **safety layer** ourselves: `toolActions` audit table, `userToolPermissions` policy, confirmation gates, and the `coordination_boundary` override pattern. Composio is the execution engine. CareSupport is the policy engine.

## Why Composio Over Rolling Our Own

| Concern | Rolling our own | Composio |
| --- | --- | --- |
| OAuth flow + token refresh | We write and maintain it per provider | Hosted Connect Link + automatic refresh |
| Provider clients (Calendar, Gmail, future) | One file per provider, kept in sync with API changes | Single `tools.execute()` call |
| Tool catalog | What we build | 1000+ toolkits available, used on demand |
| Scope upgrades, multi-account, revocation | We own all of it | Built in |
| Free tier headroom | n/a | 20K tool calls/month — large for our scale |
| What we still own | Everything | `toolActions`, policy, confirmation UX, prompt contract |

The single real cost: caregiver OAuth tokens live on Composio's servers (SOC 2 Type II, not HIPAA). Acceptable for v1 pilot scale (Rob + small number of families). Revisit before HIPAA-covered care contracts.

## Spike Findings

A working spike lives at `convex/lib/tools/composioClient.ts` (typechecked clean). Key learnings:

1. **`@composio/anthropic` provider package is unusable.** Peer-pinned to `@anthropic-ai/sdk@^0.52.0`; the repo uses `0.78.0` (needed for current `output_config` API). Bypassed with the low-level path — `composio.tools.execute()` and our own thin adapter to Anthropic's tool block format (`toAnthropicTool` in the spike).
2. **Session/ToolRouter model is overkill.** Built for chat-UI auto-discovery across the entire catalog. We curate ~10 tools — the direct `tools.execute()` + `toolkits.authorize()` path is cleaner.
3. **`ConnectionRequest` returns `{ id, status, redirectUrl, waitForConnection() }`.** The `redirectUrl` is what we text Rob via Linq. The `id` is persisted so we can poll status later if a 60s `waitForConnection` exceeds a Convex action limit.
4. **SDK generic types are extremely deep.** Explicit return types required on all exported functions or TS7056 fires. **Resolution**: Composio CLI ships `composio generate ts --toolkits googlecalendar,gmail` which produces concrete typed stubs per tool. Run this during Phase 1 setup; replace the `as unknown as` casts in the spike with the generated types.
5. **Dependency footprint.** Pulls in `pusher-js` (for Triggers/webhooks) and `openai` (for default provider). Tree-shakeable when we don't import those entry points. Verify after Convex deploy.

## Developer Tooling — Composio CLI

Composio ships a CLI (`composio` binary) installable via `curl -fsSL https://composio.dev/install | bash`. It's the right developer surface for this project, separate from the runtime SDK:

| Command | Used for |
| --- | --- |
| `composio login` | Authenticate the dev (separately from the app's `COMPOSIO_API_KEY`) |
| `composio link googlecalendar` | Connect dev's own Google account locally to test against real APIs |
| `composio dev toolkits info googlecalendar` | Inspect available tools and their schemas |
| `composio dev auth-configs create` | Create / inspect the project's auth configs |
| `composio dev connected-accounts list` | Debug what's connected during development |
| `composio generate ts --toolkits googlecalendar,gmail` | Generate TypeScript types for the tools we use |
| `composio execute GOOGLECALENDAR_LIST_EVENTS --get-schema` | Inspect any tool's argument shape from the terminal |

Optional but recommended: install the **Composio Claude Code plugin** (`/plugin install composio-mcp@composio` from within Claude Code) so the AI agent can call Composio tools during development for interactive testing. Auth is in-flow OAuth, no API key in config files.

## OAuth Callback (Corrected)

Composio's hosted Connect Link redirects users back to your callback URL via **GET** with query parameters:

```
GET /composio/callback?status=success&connected_account_id=ca_abc123&user_id=user_123&source=onboarding
```

The path must be registered in the Composio dashboard. Our HTTP route handles the GET, looks up the user by the `user_id` query param (we pass our Convex user `_id` as `user_id` when calling `startConnection`), updates `connectedAccounts` to `active`, and fires a Linq confirmation message.

## Architecture

```
iMessage in
  └─ Linq webhook → convex/handler.ts (existing)
       └─ buildSystemBlocks + buildMessages (existing)
       └─ callAnthropic with [JSON output schema + native tool defs]
            ├─ JSON output → existing handler-owned writes (memory, profile, medication, schedule, lessons)
            └─ tool_use blocks → convex/lib/tools/dispatch.ts (NEW)
                 ├─ persist toolAction row (status: pending)
                 ├─ check userToolPermissions for capability
                 ├─ require confirmation → reply with question, keep pending
                 └─ permission granted → composio.tools.execute()
                      ├─ on success: update toolAction (status: executed), write externalRef
                      └─ on failure: update toolAction (status: failed), surface to user

Composio (external)
  ├─ Hosted Connect Link for OAuth
  ├─ Token storage + refresh
  └─ Provider API calls (Google Calendar, Gmail, ...)
```

Composio is the right-edge box. Everything inside Convex is ours, including the audit and policy layer.

## Schema Additions

Refinements of the sketches in `integrations-and-tool-bearing-agent.md`, adjusted for Composio.

### `connectedAccounts` (mirror table)

We do not store OAuth tokens. We mirror Composio's connection state for fast lookup and companion-app surfacing.

```ts
connectedAccounts: defineTable({
  userId: v.id("users"),
  toolkit: v.union(
    v.literal("googlecalendar"),
    v.literal("gmail"),
  ),
  composioAccountId: v.string(),
  status: v.union(
    v.literal("initiated"),
    v.literal("active"),
    v.literal("expired"),
    v.literal("failed"),
    v.literal("revoked"),
  ),
  scopes: v.array(v.string()),
  connectedAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_toolkit", ["userId", "toolkit"])
```

Source of truth lives on Composio; we sync on connect, webhook events, and lazy refresh.

### `toolActions` (audit + policy gate)

```ts
toolActions: defineTable({
  careCaseId: v.id("careCases"),
  requestedByUserId: v.id("users"),
  executedAsUserId: v.id("users"), // == requestedByUserId in Phase 1
  toolSlug: v.string(),             // e.g. "GOOGLECALENDAR_CREATE_EVENT"
  capability: v.string(),           // e.g. "calendar.write.own"
  args: v.string(),                 // JSON-stringified arguments
  status: v.union(
    v.literal("pending"),
    v.literal("approved"),
    v.literal("executed"),
    v.literal("failed"),
    v.literal("cancelled"),
  ),
  result: v.optional(v.string()),   // JSON-stringified result
  error: v.optional(v.string()),
  requestedByMessageId: v.optional(v.id("messages")),
  approvedByMessageId: v.optional(v.id("messages")),
  createdAt: v.number(),
  updatedAt: v.number(),
  completedAt: v.optional(v.number()),
})
  .index("by_care_case", ["careCaseId"])
  .index("by_care_case_status", ["careCaseId", "status"])
  .index("by_requested_by", ["requestedByUserId"])
```

### `externalRefs` (link CareSupport rows to Composio-managed provider objects)

```ts
externalRefs: defineTable({
  careCaseId: v.id("careCases"),
  localTable: v.string(),       // "scheduleItems"
  localId: v.string(),
  toolkit: v.string(),          // "googlecalendar"
  externalId: v.string(),       // GCal event ID
  externalUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_local", ["localTable", "localId"])
  .index("by_external", ["toolkit", "externalId"])
```

### `userToolPermissions` (capability-level policy)

```ts
userToolPermissions: defineTable({
  userId: v.id("users"),
  capability: v.string(),       // "calendar.write.own", "calendar.auto_mirror"
  granted: v.boolean(),
  grantedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_user_capability", ["userId", "capability"])
```

### `users` extension

```ts
// added to users table:
role: v.union(
  v.literal("primary_owner"),
  v.literal("participant"),
  v.literal("care_recipient"),
),
```

Default for first texter on a careCase: `primary_owner`. Field is dormant in Phase 1; activates with multiplayer in Phase 2.

## Phase 1 — Rob Solo

**Goal:** Rob says "PT next Tuesday at 2" → CareSupport persists the `scheduleItem` AND creates the matching Google Calendar event AND confirms in one bubble.

Surface area (in order):

1. **Schema migration.** Add tables above. `users.role` defaults `primary_owner` for first texter, `participant` for subsequent.
2. **Convex env vars.** `npx convex env set COMPOSIO_API_KEY <key>`. Also add to Keychain (`security add-generic-password -s claude-env -a COMPOSIO_API_KEY -w <key>`) and `~/.local/bin/claude-secure` SECRETS list.
3. **`convex/lib/tools/composioClient.ts`.** Done in spike. Exports `createComposioClient`, `startConnection`, `listConnectedAccounts`, `getToolDefinition`, `toAnthropicTool`, `executeTool`.
4. **`convex/lib/tools/dispatch.ts`.** Takes a parsed tool_use block, persists `toolAction`, checks `userToolPermissions`, executes via Composio (or asks for confirmation), updates `toolAction` + `externalRef`.
5. **`convex/connectedAccounts.ts` and `convex/toolActions.ts`.** Mutations/queries for the new tables.
6. **OAuth onboarding flow.**
   - New skill in `promptContent.ts`: "If user wants calendar/email integration, emit a `connection_requests` entry in the JSON response."
   - Extend `AGENT_RESPONSE_FORMAT` in `anthropicClient.ts` with a `connection_requests` array field (parallel to `scheduleUpdates`, `medicationUpdates`). Each entry: `{ toolkit: "googlecalendar" | "gmail", reason: string }`.
   - Handler dispatches each entry through `composioClient.startConnection`, writes a `connectedAccounts` row in `initiated` status, sends the `redirectUrl` over Linq with rate-limiting (max one link per toolkit per user per 10 minutes — tracked by `lastConnectionLinkSentAt` on the connectedAccounts row).
   - This stays in the **JSON-output side of the hybrid contract**. It is a bootstrap action, not a provider tool call — no Anthropic `tool_use` block needed. Tool-use blocks are reserved for actual provider operations (read calendar, create event, etc.) which only fire after a connection is active.
   - New HTTP route in `convex/http.ts`: `GET /composio/callback` — receives Composio's redirect (status, connected_account_id, user_id as query params), updates `connectedAccounts` row to `active`, fires a Linq confirmation: "Calendar connected."
   - Alternative path: Composio webhooks (Phase 3-style) — for v1, the redirect callback is simpler.
7. **Prompt contract upgrade — hybrid.**
   - Keep existing `output_config` JSON schema for handler-owned writes (memory, profile, medication, schedule, lessons).
   - Add Anthropic `tools` parameter alongside, populated from a curated registry of Composio tool defs (calendar list, calendar create, calendar update, calendar delete, gmail list, gmail send).
   - The model returns a single response containing both: a text/JSON block with the existing structured output, *and* zero or more `tool_use` blocks.
   - Handler runs handler-owned writes (existing flow), then iterates tool_use blocks through `dispatch.ts`.
   - If any tool_use blocks need their results fed back to the model (e.g. calendar.list informing the smsResponse), a second Claude call follows with `tool_result` blocks. Otherwise, the first response's text is the final smsResponse.
8. **Auto-mirror `scheduleItems` → Google Calendar.**
   - On first detected calendar-relevant utterance after Google connection, agent asks: "Want me to put appointments on your Google Calendar automatically going forward?"
   - "Yes" → write `userToolPermissions(capability="calendar.auto_mirror", granted=true)`.
   - Going forward, when handler creates a `scheduleItem` AND `auto_mirror` is granted, also dispatch `GOOGLECALENDAR_CREATE_EVENT` and persist `externalRef`.
   - Failure of GCal call does NOT roll back the scheduleItem. Failure surfaces in next message.
   - Updates and deletes propagate via `externalRef` lookup.
9. **Tests.**
   - Unit: dispatch logic, permission check, externalRef linking.
   - Integration: mock Composio client, verify full flow through handler.
   - Real-end: manual smoke against Composio sandbox once API key is in.

## Phase 2 — Multiplayer

**Goal:** Sarah texts CareSupport about Rob's mom. Agent records, routes write-asks back to Rob, completes when Rob says yes.

- `requestedByUserId` ≠ `executedAsUserId` paths through `dispatch.ts`. The `executedAsUserId` is always the primary owner of the careCase in v2; we look it up by `careCaseId` + `users.role == "primary_owner"`.
- Confirmation gate: when a non-primary user requests a write, agent texts Rob asking permission. On Rob's "yes", `toolAction` flips to `approved`, dispatcher executes.
- `userToolPermissions` extension: per-participant write-rights (Rob can pre-authorize Sarah for `calendar.write.own`). Not v2 mandatory; nice-to-have once we see usage.
- careContact-to-user upgrade path: when a careContact starts texting CareSupport, agent creates a `users` row with `role=participant` linked to the same careCase.

## Phase 3 — Triggers and Inbound

**Goal:** CareSupport reacts to changes initiated outside the iMessage thread.

- Composio Triggers for `googlecalendar.event_updated`, `gmail.message_received` (filtered).
- Webhook route in `convex/http.ts` handles signed payloads, runs reaction logic (e.g., "your Thursday appointment got moved to Friday — want me to update the team?").
- This is where Pusher dependency in `@composio/core` becomes load-bearing.

## Companion App Readiness

The iOS Companion App (see `~/Downloads/caresupport-ios-app/` and memory `project_caresupport_ios_companion.md`) is "the agent's visible mind." For Composio readiness it needs:

- **Connections view.** Reads `connectedAccounts` table, shows each toolkit's status with connect/disconnect actions. Disconnect calls a Convex mutation that hits `composio.connectedAccounts.delete()`.
- **Tool action history feed.** Reads `toolActions` ordered by `createdAt`, shows "CareSupport added Thursday's appointment to your calendar."
- **External link affordance.** Each `toolAction` with an `externalRef` deep-links to the provider object (e.g., open the GCal event).
- **Deferred to Phase 2:** Pending-confirmation push notifications (companion as parallel confirmation channel to iMessage).

All of this reads from existing or to-be-added Convex tables — no companion-side Composio integration required. The companion app does not talk to Composio directly.

## Open Decisions (Deferred)

- **Token residency revisit.** Trigger: any care contract requiring HIPAA, or any tool that exposes care-recipient PHI. Action: evaluate Composio Enterprise self-hosted plan or migrate provider clients in-house.
- **Premium tool cost.** Some Composio tools cost 3x. Audit our tool set before scale; for v1, Calendar and Gmail core actions are standard tier.
- **MCP path vs SDK path.** Composio also exposes a remote MCP URL. For Phase 1, SDK is the right choice (single integration surface). MCP becomes interesting if we expose CareSupport tools to the user's other agents (Claude Desktop, etc.).
- **Apple Calendar.** Native iOS Calendar would be a meaningful unlock for some users but doesn't go through Composio (no OAuth provider). Address in Phase 4+ if demand exists.

## Build Sequence (Concrete)

See `tasks/todo.md` for the Phase 1 checklist.

## Locked Decisions From Session

| Decision | Value |
| --- | --- |
| Vendor | Composio |
| Token residency | Acceptable for v1 (pre-HIPAA scale) |
| OAuth UX | Tap-out link from iMessage to Composio-hosted consent |
| Scope on day one | Read + Write for Calendar and Gmail |
| First user | Primary owner (Rob) only |
| First tool | `GOOGLECALENDAR_LIST_EVENTS` (validate read path) |
| Then | `GOOGLECALENDAR_CREATE_EVENT` + auto-mirror |
| Prompt contract | Hybrid — keep JSON output for internal writes, add native tool-use blocks for Composio |
| Anthropic SDK | Keep `0.78.0`, bypass `@composio/anthropic` provider package |
| Confirmation gate UX | Loose affirmative ("yes", "yeah", "go") on most recent pending toolAction |
| GCal auto-mirror | One-time onboarding consent, silent thereafter |
| Multi-texter writes | Defer to Phase 2; route to primary owner for confirmation |
| Companion app surface | Connections page + tool action history (Phase 1); pending-confirmation push deferred to Phase 2 |
