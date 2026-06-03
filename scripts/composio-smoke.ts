/**
 * Composio smoke test — validates the SDK end-to-end against a real account.
 *
 * Usage:
 *   COMPOSIO_API_KEY=<key> npx tsx scripts/composio-smoke.ts
 *
 * Optional flags via env:
 *   SMOKE_USER_ID    — defaults to "smoke_test_user". Pass a stable id to reuse
 *                      a connected account between runs.
 *   SMOKE_TOOLKIT    — defaults to "googlecalendar". Try "gmail" too.
 *   SMOKE_WAIT       — set to "1" to block on waitForConnection (up to 90s).
 *                      Otherwise the script prints the redirect URL and exits.
 *
 * Day-one workflow for Clinton:
 *   1. composio login                       (CLI auth — separate from app key)
 *   2. composio link googlecalendar         (connect dev's own Google)
 *   3. Run this with COMPOSIO_API_KEY set
 *   4. Open the printed redirect URL, complete consent
 *   5. Re-run with SMOKE_WAIT=1 and same SMOKE_USER_ID — should hit the
 *      execute step and print real calendar events.
 */

import {
  createComposioClient,
  startConnection,
  listConnectedAccounts,
  executeTool,
  waitForConnection,
  type Toolkit,
} from "../convex/lib/tools/composioClient.js";

async function main(): Promise<void> {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    console.error("COMPOSIO_API_KEY is required.");
    console.error("Set it: export COMPOSIO_API_KEY=<key>");
    process.exit(1);
  }

  const userId = process.env.SMOKE_USER_ID ?? "smoke_test_user";
  const toolkit = (process.env.SMOKE_TOOLKIT ?? "googlecalendar") as Toolkit;
  const shouldWait = process.env.SMOKE_WAIT === "1";

  console.log(`[smoke] user_id=${userId} toolkit=${toolkit}\n`);

  const client = createComposioClient(apiKey);

  console.log("[smoke] Listing existing connections...");
  const existing = await listConnectedAccounts(client, userId);
  const items = (existing as { items?: Array<{ status?: string; toolkit?: { slug?: string } }> }).items ?? [];
  for (const item of items) {
    console.log(`  - toolkit=${item.toolkit?.slug ?? "?"} status=${item.status ?? "?"}`);
  }
  if (items.length === 0) console.log("  (none)");

  const activeForToolkit = items.find(
    (i) => i.status === "ACTIVE" && i.toolkit?.slug === toolkit,
  );

  if (!activeForToolkit) {
    console.log(`\n[smoke] No active ${toolkit} connection. Starting OAuth...`);
    const req = await startConnection(client, userId, toolkit);
    console.log(`  request_id=${req.id}`);
    console.log(`  redirect_url=${req.redirectUrl}`);
    console.log("\n  → Open the URL above in a browser and complete consent.");

    if (shouldWait) {
      console.log("\n[smoke] Waiting up to 90s for connection to become active...");
      const account = await waitForConnection(req, 90_000);
      console.log(`  ✓ connected_account_id=${(account as { id?: string }).id ?? "?"}`);
    } else {
      console.log("\n[smoke] Exit. Re-run with SMOKE_WAIT=1 to block on completion.");
      return;
    }
  } else {
    console.log(`\n[smoke] Active ${toolkit} connection found, skipping OAuth.`);
  }

  if (toolkit === "googlecalendar") {
    console.log("\n[smoke] Executing GOOGLECALENDAR_LIST_EVENTS (next 7 days)...");
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = await executeTool(
      client,
      userId,
      "GOOGLECALENDAR_LIST_EVENTS",
      {
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: week.toISOString(),
        maxResults: 10,
      },
    );
    console.log(`  successful=${result.successful}`);
    if (result.error) console.log(`  error=${result.error}`);
    const events = (result.data as { items?: Array<{ summary?: string; start?: { dateTime?: string; date?: string } }> } | null)?.items ?? [];
    console.log(`  events_returned=${events.length}`);
    for (const ev of events.slice(0, 5)) {
      console.log(`    • ${ev.summary ?? "(no title)"} @ ${ev.start?.dateTime ?? ev.start?.date ?? "?"}`);
    }
  }

  console.log("\n[smoke] Done.");
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err);
  process.exit(1);
});
