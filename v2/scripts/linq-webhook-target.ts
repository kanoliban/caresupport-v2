import { config } from "../src/config.js";

interface LinqSubscription {
  id: string;
  target_url?: string;
  targetUrl?: string;
  is_active?: boolean;
  isActive?: boolean;
  subscribed_events?: string[];
  subscribedEvents?: string[];
}

interface ParsedArgs {
  command: "list" | "switch";
  to?: string;
  toEnv?: "v1" | "v2";
  deleteOld: boolean;
  apply: boolean;
  events: string[];
  version: string;
}

const DEFAULT_EVENTS = [
  "message.received",
  "message.sent",
  "message.read",
  "message.delivered",
  "message.failed",
  "reaction.added",
  "reaction.removed",
  "participant.added",
  "participant.removed",
  "chat.created",
  "chat.group_name_updated",
  "chat.group_icon_updated",
  "chat.group_name_update_failed",
  "chat.group_icon_update_failed",
  "chat.typing_indicator.started",
  "chat.typing_indicator.stopped",
  "phone_number.status_updated",
];

function parseArgs(argv: string[]): ParsedArgs {
  const hasList = argv.includes("--list");
  const toArg = argv.find((a) => a.startsWith("--to="));
  const toEnvArg = argv.find((a) => a.startsWith("--to-env="));
  const eventsArg = argv.find((a) => a.startsWith("--events="));
  const versionArg = argv.find((a) => a.startsWith("--version="));

  return {
    command: hasList ? "list" : "switch",
    to: toArg ? toArg.split("=")[1] : undefined,
    toEnv: toEnvArg ? (toEnvArg.split("=")[1] as "v1" | "v2") : undefined,
    deleteOld: argv.includes("--delete-old"),
    apply: argv.includes("--apply"),
    events: eventsArg ? eventsArg.split("=")[1].split(",").map((x) => x.trim()).filter(Boolean) : DEFAULT_EVENTS,
    version: versionArg ? versionArg.split("=")[1] : "2026-02-03",
  };
}

function withVersion(url: string, version: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}version=${encodeURIComponent(version)}`;
}

function normalizedEvents(events: string[]): string[] {
  return [...events].map((event) => event.trim()).filter(Boolean).sort();
}

function normalizeSubscription(sub: LinqSubscription): {
  id: string;
  targetUrl: string;
  active: boolean;
  events: string[];
} {
  return {
    id: sub.id,
    targetUrl: sub.target_url ?? sub.targetUrl ?? "",
    active: Boolean(sub.is_active ?? sub.isActive),
    events: sub.subscribed_events ?? sub.subscribedEvents ?? [],
  };
}

async function linqRequest(path: string, init: RequestInit): Promise<unknown> {
  if (!config.linq.apiToken) {
    throw new Error("LINQ_API_TOKEN is required.");
  }
  const response = await fetch(`${config.linq.baseUrl}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.linq.apiToken}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // keep text
  }
  if (!response.ok) {
    throw new Error(`Linq API ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function listSubscriptions(): Promise<Array<ReturnType<typeof normalizeSubscription>>> {
  const payload = (await linqRequest("/webhook-subscriptions", { method: "GET" })) as
    | { subscriptions?: LinqSubscription[] }
    | { data?: { subscriptions?: LinqSubscription[] } };

  const rawSubs = Array.isArray((payload as { subscriptions?: unknown }).subscriptions)
    ? (payload as { subscriptions: LinqSubscription[] }).subscriptions
    : Array.isArray((payload as { data?: { subscriptions?: unknown[] } }).data?.subscriptions)
      ? ((payload as { data: { subscriptions: LinqSubscription[] } }).data.subscriptions ?? [])
      : [];
  return rawSubs.map(normalizeSubscription);
}

async function createSubscription(targetUrl: string, events: string[]): Promise<string> {
  const payload = (await linqRequest("/webhook-subscriptions", {
    method: "POST",
    body: JSON.stringify({
      target_url: targetUrl,
      subscribed_events: events,
    }),
  })) as
    | { id?: string; subscription_id?: string; data?: { id?: string } }
    | { data?: { id?: string } };

  const id =
    (payload as { id?: string }).id ??
    (payload as { subscription_id?: string }).subscription_id ??
    (payload as { data?: { id?: string } }).data?.id;
  if (!id) {
    throw new Error("Linq API did not return subscription id.");
  }
  return id;
}

async function deleteSubscription(id: string): Promise<void> {
  try {
    await linqRequest(`/webhook-subscriptions/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Linq API 404")) {
      return;
    }
    throw error;
  }
}

function resolveTarget(args: ParsedArgs): string {
  if (args.to) return args.to;
  if (args.toEnv === "v1") {
    const v1 = process.env.V1_WEBHOOK_TARGET_URL;
    if (!v1) throw new Error("V1_WEBHOOK_TARGET_URL missing.");
    return v1;
  }
  if (args.toEnv === "v2") {
    const v2 = process.env.V2_WEBHOOK_TARGET_URL;
    if (!v2) throw new Error("V2_WEBHOOK_TARGET_URL missing.");
    return v2;
  }
  throw new Error("Switch mode requires --to=<url> or --to-env=v1|v2.");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const subscriptions = await listSubscriptions();

  console.log("Current subscriptions:");
  for (const sub of subscriptions) {
    console.log(
      `- ${sub.id} | active=${sub.active} | target=${sub.targetUrl || "(none)"} | events=${sub.events.join(",")}`,
    );
  }

  if (args.command === "list") {
    return;
  }

  const requestedTarget = resolveTarget(args);
  const targetWithVersion = withVersion(requestedTarget, args.version);
  console.log(`Requested target: ${targetWithVersion}`);
  console.log(`Events: ${args.events.join(",")}`);
  console.log(`Apply: ${args.apply}`);
  console.log(`Delete old: ${args.deleteOld}`);

  const existing = subscriptions.find((sub) => sub.active && sub.targetUrl === targetWithVersion);
  const requestedEvents = normalizedEvents(args.events);
  if (existing) {
    const existingEvents = normalizedEvents(existing.events);
    const sameEvents =
      existingEvents.length === requestedEvents.length &&
      existingEvents.every((event, index) => event === requestedEvents[index]);

    if (sameEvents) {
      console.log(`Active subscription already exists for target: ${existing.id}`);
      return;
    }

    if (!args.apply) {
      console.log(
        `Dry-run: existing subscription ${existing.id} has different events (${existing.events.join(",")}). Re-run with --apply --delete-old to replace.`,
      );
      return;
    }

    if (!args.deleteOld) {
      throw new Error(
        `Active subscription ${existing.id} has different events. Re-run with --delete-old to replace in-place.`,
      );
    }

    await deleteSubscription(existing.id);
    console.log(`Deleted existing subscription with mismatched events: ${existing.id}`);
  }

  if (!args.apply) {
    console.log("Dry-run only. Re-run with --apply to create/switch.");
    return;
  }

  const createdId = await createSubscription(targetWithVersion, args.events);
  console.log(`Created subscription: ${createdId}`);
  console.log(
    "IMPORTANT: Linq may rotate webhook signing secret on subscription create. " +
      "If signature verification is enabled, update LINQ_WEBHOOK_SECRET in .env and v2/.env from Linq dashboard.",
  );

  if (args.deleteOld) {
    const oldSubscriptions = subscriptions.filter((sub) => sub.id !== createdId && sub.active);
    for (const sub of oldSubscriptions) {
      await deleteSubscription(sub.id);
      console.log(`Deleted old subscription: ${sub.id}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
