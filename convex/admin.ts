import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { migrateScheduleRow } from "./lib/scheduleBackfill";
import { normalizePhone } from "./mutations";

const robContactOverrideValidator = v.object({
  key: v.string(),
  phone: v.optional(v.string()),
  linqChatId: v.optional(v.string()),
  canReceiveTexts: v.optional(v.boolean()),
});

const controlledContactKeyValidator = v.union(
  v.literal("jim"),
  v.literal("jennifer"),
);

const ROB_SCENARIO_CONTACTS = [
  {
    key: "luann",
    name: "Luann Wudlick",
    relationship: "mom",
    contactType: "family" as const,
    role: "Family, Nurse, PCA",
    availabilityNotes:
      "Fills empty slots, but has dementia. Treat as sensitive family context and confirm with Rob before relying on her for coverage.",
    notes: "Has dementia; do not make autonomous scheduling assumptions.",
    contactPriority: 90,
    defaultCanReceiveTexts: false,
  },
  {
    key: "marta",
    name: "Marta Snow",
    relationship: "sister",
    contactType: "family" as const,
    role: "Family, Scheduler, General Administration, Backup PCA",
    availabilityNotes: "On-call; also helps care for Luann.",
    contactPriority: 20,
    defaultCanReceiveTexts: true,
  },
  {
    key: "jim",
    name: "Jim Nelson",
    relationship: "primary caregiver",
    contactType: "professional_caregiver" as const,
    role: "Nurse",
    availabilityNotes: "Routine coverage Monday-Friday 9am-5pm.",
    contactPriority: 1,
    defaultCanReceiveTexts: true,
  },
  {
    key: "jennifer",
    name: "Jennifer",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "Routine overnight coverage Monday and Tuesday 8pm-8am.",
    contactPriority: 2,
    defaultCanReceiveTexts: true,
  },
  {
    key: "sarah",
    name: "Sarah",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "Routine overnight coverage Wednesday and Thursday 8pm-8am.",
    contactPriority: 3,
    defaultCanReceiveTexts: true,
  },
  {
    key: "ella",
    name: "Ella",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "Routine overnight coverage Friday, Saturday, Sunday 8pm-9am.",
    contactPriority: 4,
    defaultCanReceiveTexts: true,
  },
  {
    key: "alex",
    name: "Alex",
    relationship: "PCA",
    contactType: "professional_caregiver" as const,
    role: "PCA",
    availabilityNotes: "Random availability; clarify before scheduling.",
    contactPriority: 30,
    defaultCanReceiveTexts: true,
  },
  {
    key: "olena",
    name: "Olena",
    relationship: "PCA",
    contactType: "professional_caregiver" as const,
    role: "PCA",
    availabilityNotes: "Routine weekend daytime coverage Saturday and Sunday 9am-1pm.",
    contactPriority: 5,
    defaultCanReceiveTexts: true,
  },
  {
    key: "isabela",
    name: "Isabela",
    relationship: "family",
    contactType: "family" as const,
    role: "Family, PCA",
    availabilityNotes: "On-call.",
    contactPriority: 40,
    defaultCanReceiveTexts: true,
  },
  {
    key: "lucy",
    name: "Lucy",
    relationship: "family",
    contactType: "family" as const,
    role: "PCA, Family",
    availabilityNotes: "On-call.",
    contactPriority: 41,
    defaultCanReceiveTexts: true,
  },
  {
    key: "grace",
    name: "Grace",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "On summer break; exclude from routine scheduling until Rob confirms.",
    contactPriority: 80,
    defaultCanReceiveTexts: false,
  },
  {
    key: "kathleen",
    name: "Kathleen",
    relationship: "backup caregiver",
    contactType: "professional_caregiver" as const,
    role: "Backup PCA",
    availabilityNotes: "Random on-call backup.",
    contactPriority: 50,
    defaultCanReceiveTexts: true,
  },
  {
    key: "annie",
    name: "Annie",
    relationship: "backup caregiver",
    contactType: "professional_caregiver" as const,
    role: "Backup PCA",
    availabilityNotes: "Random on-call backup.",
    contactPriority: 51,
    defaultCanReceiveTexts: true,
  },
  {
    key: "uncle-jim",
    name: "Uncle Jim",
    relationship: "family",
    contactType: "family" as const,
    role: "Family, Backup PCA",
    availabilityNotes: "On-call backup.",
    contactPriority: 60,
    defaultCanReceiveTexts: true,
  },
  {
    key: "dan",
    name: "Dan",
    relationship: "brother-in-law",
    contactType: "family" as const,
    role: "Family, Backup PCA",
    availabilityNotes: "On-call backup.",
    contactPriority: 61,
    defaultCanReceiveTexts: true,
  },
] as const;

const ROB_SCENARIO_SCHEDULE_ITEMS = [
  {
    title: "Jim Nelson coverage",
    time: "09:00",
    endTime: "17:00",
    recurrence: "weekly:mon,tue,wed,thu,fri",
    provider: "Jim Nelson",
    notes: "Routine weekday nurse coverage.",
  },
  {
    title: "Jennifer overnight coverage",
    time: "20:00",
    endTime: "08:00",
    recurrence: "weekly:mon,tue",
    provider: "Jennifer",
    notes: "Routine overnight PCA coverage.",
  },
  {
    title: "Sarah overnight coverage",
    time: "20:00",
    endTime: "08:00",
    recurrence: "weekly:wed,thu",
    provider: "Sarah",
    notes: "Routine overnight PCA coverage.",
  },
  {
    title: "Ella weekend overnight coverage",
    time: "20:00",
    endTime: "09:00",
    recurrence: "weekly:fri,sat,sun",
    provider: "Ella",
    notes: "Routine weekend overnight PCA coverage.",
  },
  {
    title: "Olena weekend daytime coverage",
    time: "09:00",
    endTime: "13:00",
    recurrence: "weekly:sat,sun",
    provider: "Olena",
    notes: "Routine weekend daytime PCA coverage.",
  },
] as const;

function testPhoneForIndex(index: number): string {
  return `+16515558${String(index + 1).padStart(2, "0")}`;
}

function overrideByKey(
  overrides: Array<{
    key: string;
    phone?: string;
    linqChatId?: string;
    canReceiveTexts?: boolean;
  }> | undefined,
  key: string,
) {
  return overrides?.find((override) => override.key === key);
}

function normalizeOptionalFixturePhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return normalizePhone(value) ?? undefined;
}

function contactByName(
  contacts: Array<Doc<"careContacts">>,
  name: string,
): Doc<"careContacts"> | undefined {
  return contacts.find((contact) => contact.name.toLowerCase() === name.toLowerCase());
}

function fixtureForKey(key: string): (typeof ROB_SCENARIO_CONTACTS)[number] | undefined {
  return ROB_SCENARIO_CONTACTS.find((contact) => contact.key === key);
}

function fixtureIndexForKey(key: string): number {
  return ROB_SCENARIO_CONTACTS.findIndex((contact) => contact.key === key);
}

function isGeneratedFixturePhone(key: string, phone: string | undefined): boolean {
  const index = fixtureIndexForKey(key);
  return index >= 0 && phone === testPhoneForIndex(index);
}

interface ControlledContactReadiness {
  key: string;
  name: string;
  contactId?: Id<"careContacts">;
  phonePresent: boolean;
  canReceiveTexts: boolean;
  consentToContact?: boolean;
  active: boolean;
  linqChatIdPresent: boolean;
  generatedFixturePhone: boolean;
  inPendingEvent: boolean;
}

interface RobScenarioReadiness {
  readyForControlledOutreach: boolean;
  fixturePresent: boolean;
  blockers: string[];
  warnings: string[];
  userId?: Id<"users">;
  careCaseId?: Id<"careCases">;
  robChatIdPresent?: boolean;
  contactCount?: number;
  expectedContactCount?: number;
  scheduleItemCount?: number;
  expectedScheduleItemCount?: number;
  controlledEventId?: Id<"coordinationEvents">;
  controlledEventStatus?: "open" | "waiting" | "resolved" | "cancelled";
  controlledContacts?: ControlledContactReadiness[];
}

interface AdminCareCaseDetail {
  careCase: Doc<"careCases">;
  user: Doc<"users"> | null;
  recentMessages: Array<Doc<"messages">>;
  memoryEntries: Array<Doc<"memoryEntries">>;
  careContacts: Array<Doc<"careContacts">>;
  coordinationEvents: Array<Doc<"coordinationEvents">>;
  outreachAttempts: Array<Doc<"outreachAttempts">>;
}

interface RobScenarioDryRunItem {
  key: string;
  contactName: string;
  outreachAttemptId?: Id<"outreachAttempts">;
  replyStatus?: string;
  statusMessageId?: Id<"messages">;
}

interface RobScenarioDryRunResult {
  ran: boolean;
  reason?: "not_ready" | "care_case_detail_missing";
  readiness: RobScenarioReadiness;
  simulated: RobScenarioDryRunItem[];
}

interface RobScenarioLoopContactReport {
  key: string;
  name: string;
  contactId?: Id<"careContacts">;
  phone?: string;
  linqChatId?: string;
  sentOutreachAttemptIds: Array<Id<"outreachAttempts">>;
  latestSentOutreachAttemptId?: Id<"outreachAttempts">;
  outboundMessageId?: Id<"messages">;
  inboundReplyMessageId?: Id<"messages">;
  replyStatus?: string;
  confirmedOnEvent: boolean;
  pendingOnEvent: boolean;
  declinedOnEvent: boolean;
  followUpClockClearedOrDeferred: boolean;
  extraCareCaseUserId?: Id<"users">;
  extraCareCaseId?: Id<"careCases">;
  audit: {
    outreachRequested: boolean;
    outreachApproved: boolean;
    outreachSent: boolean;
    liveReplyReceived: boolean;
    statusSentToRob: boolean;
  };
  blockers: string[];
  warnings: string[];
  passed: boolean;
}

interface RobScenarioLoopReport {
  passed: boolean;
  fixturePresent: boolean;
  blockers: string[];
  warnings: string[];
  userId?: Id<"users">;
  careCaseId?: Id<"careCases">;
  controlledEventId?: Id<"coordinationEvents">;
  controlledEventStatus?: "open" | "waiting" | "resolved" | "cancelled";
  robStatusMessageIds: Array<Id<"messages">>;
  contacts: RobScenarioLoopContactReport[];
}

interface RobScenarioLoopResetResult {
  reset: boolean;
  reason?:
    | "invalid_rob_phone"
    | "rob_user_missing"
    | "rob_care_case_missing"
    | "controlled_event_missing"
    | "controlled_contacts_missing";
  careCaseId?: Id<"careCases">;
  controlledEventId?: Id<"coordinationEvents">;
  restoredPendingContactIds: Array<Id<"careContacts">>;
  cancelledDryRunAttemptIds: Array<Id<"outreachAttempts">>;
  clearedContactReplyIds: Array<Id<"careContacts">>;
}

interface CoordinationContactReadiness {
  name: string;
  contactId?: Id<"careContacts">;
  phonePresent: boolean;
  canReceiveTexts: boolean;
  consentToContact?: boolean;
  active: boolean;
  linqChatIdPresent: boolean;
  inPendingEvent: boolean;
}

interface CoordinationReadiness {
  readyForControlledOutreach: boolean;
  existingCoordinatorPresent: boolean;
  blockers: string[];
  warnings: string[];
  userId?: Id<"users">;
  careCaseId?: Id<"careCases">;
  coordinatorChatIdPresent?: boolean;
  contactCount?: number;
  openEventCount?: number;
  controlledEventId?: Id<"coordinationEvents">;
  controlledEventTitle?: string;
  controlledEventStatus?: "open" | "waiting" | "resolved" | "cancelled";
  controlledContacts?: CoordinationContactReadiness[];
}

interface CoordinationLoopContactReport {
  key: string;
  name: string;
  contactId?: Id<"careContacts">;
  phone?: string;
  linqChatId?: string;
  sentOutreachAttemptIds: Array<Id<"outreachAttempts">>;
  latestSentOutreachAttemptId?: Id<"outreachAttempts">;
  outboundMessageId?: Id<"messages">;
  inboundReplyMessageId?: Id<"messages">;
  replyStatus?: string;
  confirmedOnEvent: boolean;
  pendingOnEvent: boolean;
  declinedOnEvent: boolean;
  followUpClockClearedOrDeferred: boolean;
  extraCareCaseUserId?: Id<"users">;
  extraCareCaseId?: Id<"careCases">;
  audit: {
    outreachRequested: boolean;
    outreachApproved: boolean;
    outreachSent: boolean;
    liveReplyReceived: boolean;
    statusSentToCoordinator: boolean;
  };
  blockers: string[];
  warnings: string[];
  passed: boolean;
}

interface CoordinationLoopReport {
  passed: boolean;
  existingCoordinatorPresent: boolean;
  blockers: string[];
  warnings: string[];
  userId?: Id<"users">;
  careCaseId?: Id<"careCases">;
  controlledEventId?: Id<"coordinationEvents">;
  controlledEventTitle?: string;
  controlledEventStatus?: "open" | "waiting" | "resolved" | "cancelled";
  coordinatorStatusMessageIds: Array<Id<"messages">>;
  contacts: CoordinationLoopContactReport[];
}

function isActiveCoordinationEvent(event: Doc<"coordinationEvents">): boolean {
  return event.status === "open" || event.status === "waiting";
}

function contactIdsForEvent(event: Doc<"coordinationEvents">): Array<Id<"careContacts">> {
  return [
    ...(event.pendingContactIds ?? []),
    ...(event.confirmedContactIds ?? []),
    ...(event.declinedContactIds ?? []),
  ];
}

function uniqueIds<T extends string>(ids: T[]): T[] {
  return [...new Set(ids)];
}

function eventIncludesContacts(
  event: Doc<"coordinationEvents">,
  contactIds: Array<Id<"careContacts">>,
): boolean {
  const eventContactIds = new Set(contactIdsForEvent(event));
  return contactIds.every((id) => eventContactIds.has(id));
}

export const listCareCases = internalQuery({
  args: {},
  handler: async (ctx) => {
    const careCases = await ctx.db.query("careCases").collect();

    return Promise.all(
      careCases.map(async (careCase) => {
        const [user, lastMessage] = await Promise.all([
          ctx.db
            .query("users")
            .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
            .first(),
          ctx.db
            .query("messages")
            .withIndex("by_care_case_timestamp", (q) => q.eq("careCaseId", careCase._id))
            .order("desc")
            .first(),
        ]);

        return {
          id: careCase._id,
          title: careCase.title,
          status: careCase.status,
          userName: user?.name ?? null,
          lastMessageAt: lastMessage?.timestamp ?? null,
          createdAt: careCase.createdAt,
        };
      }),
    );
  },
});

export const getCareCaseDetail = internalQuery({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    const careCase = await ctx.db.get(args.careCaseId);
    if (!careCase) return null;

    const [
      user,
      messages,
      memoryEntries,
      careContacts,
      coordinationEvents,
      outreachAttempts,
    ] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .first(),
      ctx.db
        .query("messages")
        .withIndex("by_care_case_timestamp", (q) => q.eq("careCaseId", args.careCaseId))
        .order("desc")
        .take(50),
      ctx.db
        .query("memoryEntries")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("careContacts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("outreachAttempts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
    ]);

    return {
      careCase,
      user,
      recentMessages: messages.reverse(),
      memoryEntries,
      careContacts,
      coordinationEvents,
      outreachAttempts,
    };
  },
});

export const getLinqChatMessageSummary = internalAction({
  args: {
    chatId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const apiToken = process.env.LINQ_API_TOKEN ?? "";
    if (!apiToken) {
      return {
        ok: false,
        status: null,
        error: "LINQ_API_TOKEN is not configured in this deployment",
        messages: [],
      };
    }

    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
    const url = new URL(
      `https://api.linqapp.com/api/partner/v3/chats/${args.chatId}/messages`,
    );
    url.searchParams.set("limit", String(limit));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: "application/json",
      },
    });
    const body = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = body ? JSON.parse(body) as Record<string, unknown> : {};
    } catch {
      data = { raw: body.slice(0, 500) };
    }

    const rawMessages = messageArrayFromLinqResponse(data);
    return {
      ok: response.ok,
      status: response.status,
      topLevelKeys: Object.keys(data),
      error: response.ok ? null : summarizeLinqError(data),
      count: rawMessages.length,
      nextCursor:
        stringValue(data.next_cursor) ??
        stringValue(data.nextCursor) ??
        null,
      messages: rawMessages.slice(-limit).map(summarizeLinqMessage),
    };
  },
});

export const getLinqWebhookSubscriptionSummary = internalAction({
  args: {},
  handler: async () => {
    const apiToken = process.env.LINQ_API_TOKEN ?? "";
    if (!apiToken) {
      return {
        ok: false,
        status: null,
        error: "LINQ_API_TOKEN is not configured in this deployment",
        count: 0,
        activeCount: 0,
        subscriptions: [],
      };
    }

    const response = await fetch(
      "https://api.linqapp.com/api/partner/v3/webhook-subscriptions",
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      },
    );
    const body = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = body ? JSON.parse(body) as Record<string, unknown> : {};
    } catch {
      data = { raw: body.slice(0, 500) };
    }

    const subscriptions = subscriptionArrayFromLinqResponse(data)
      .map(summarizeLinqSubscription);
    return {
      ok: response.ok,
      status: response.status,
      topLevelKeys: Object.keys(data),
      error: response.ok ? null : summarizeLinqError(data),
      count: subscriptions.length,
      activeCount: subscriptions.filter((subscription) => subscription.isActive).length,
      subscriptions,
    };
  },
});

export const setLinqWebhookSubscriptionActive = internalAction({
  args: {
    subscriptionId: v.string(),
    isActive: v.boolean(),
    expectedHost: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiToken = process.env.LINQ_API_TOKEN ?? "";
    if (!apiToken) {
      return {
        ok: false,
        status: null,
        error: "LINQ_API_TOKEN is not configured in this deployment",
        subscription: null,
      };
    }

    const currentResponse = await fetch(
      `https://api.linqapp.com/api/partner/v3/webhook-subscriptions/${args.subscriptionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
        },
      },
    );
    const currentBody = await currentResponse.text();
    const currentData = parseLinqJsonBody(currentBody);
    if (!currentResponse.ok) {
      return {
        ok: false,
        status: currentResponse.status,
        error: summarizeLinqError(currentData),
        subscription: null,
      };
    }

    const currentSubscription = summarizeLinqSubscription(currentData);
    if (
      args.expectedHost &&
      currentSubscription.target?.host !== args.expectedHost
    ) {
      return {
        ok: false,
        status: null,
        error: "target_host_mismatch",
        expectedHost: args.expectedHost,
        actualTarget: currentSubscription.target,
        subscription: currentSubscription,
      };
    }

    const response = await fetch(
      `https://api.linqapp.com/api/partner/v3/webhook-subscriptions/${args.subscriptionId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: args.isActive }),
      },
    );
    const body = await response.text();
    const data = parseLinqJsonBody(body);
    return {
      ok: response.ok,
      status: response.status,
      error: response.ok ? null : summarizeLinqError(data),
      subscription: response.ok ? summarizeLinqSubscription(data) : currentSubscription,
    };
  },
});

function messageArrayFromLinqResponse(data: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [data.messages, data.data, data.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
      );
    }
  }
  return [];
}

function subscriptionArrayFromLinqResponse(data: Record<string, unknown>): Record<string, unknown>[] {
  const candidates = [data.subscriptions, data.data, data.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
      );
    }
  }
  return [];
}

function parseLinqJsonBody(body: string): Record<string, unknown> {
  try {
    return body ? JSON.parse(body) as Record<string, unknown> : {};
  } catch {
    return { raw: body.slice(0, 500) };
  }
}

function summarizeLinqError(data: Record<string, unknown>): unknown {
  const error = data.error;
  if (!error || typeof error !== "object") return error ?? null;
  const record = error as Record<string, unknown>;
  return {
    code: record.code,
    message: record.message,
    status: record.status,
  };
}

function summarizeLinqSubscription(subscription: Record<string, unknown>) {
  const subscribedEvents = subscription.subscribed_events;
  return {
    id: stringValue(subscription.id) ?? null,
    target: summarizeTargetUrl(stringValue(subscription.target_url)),
    subscribedEvents: Array.isArray(subscribedEvents)
      ? subscribedEvents.filter((event): event is string => typeof event === "string")
      : [],
    isActive: typeof subscription.is_active === "boolean"
      ? subscription.is_active
      : subscription.isActive === true,
    createdAt:
      stringValue(subscription.created_at) ??
      stringValue(subscription.createdAt) ??
      null,
    updatedAt:
      stringValue(subscription.updated_at) ??
      stringValue(subscription.updatedAt) ??
      null,
  };
}

function summarizeLinqMessage(message: Record<string, unknown>) {
  const parts = messageParts(message);
  return {
    id:
      stringValue(message.id) ??
      stringValue(message.message_id) ??
      stringValue(message.messageId) ??
      null,
    createdAt:
      stringValue(message.created_at) ??
      stringValue(message.createdAt) ??
      stringValue(message.sent_at) ??
      stringValue(message.sentAt) ??
      stringValue(message.timestamp) ??
      null,
    direction:
      stringValue(message.direction) ??
      stringValue(message.role) ??
      stringValue(message.sender_type) ??
      stringValue(message.senderType) ??
      booleanDirection(message.is_from_me) ??
      booleanDirection(message.isFromMe) ??
      null,
    status:
      stringValue(message.status) ??
      stringValue(message.delivery_status) ??
      stringValue(message.deliveryStatus) ??
      booleanStatus(message.is_delivered, "delivered") ??
      booleanStatus(message.isDelivered, "delivered") ??
      null,
    service: stringValue(message.service) ?? null,
    partCount: parts.length,
    text: parts.join(" ").slice(0, 240),
  };
}

function messageParts(message: Record<string, unknown>): string[] {
  const direct =
    stringValue(message.text) ??
    stringValue(message.body) ??
    stringValue(message.content);
  if (direct) return [direct];

  const directParts = partsFromUnknown(message.parts);
  if (directParts.length > 0) return directParts;

  const nestedMessage = message.message;
  if (!nestedMessage || typeof nestedMessage !== "object") return [];
  return partsFromUnknown((nestedMessage as Record<string, unknown>).parts);
}

function partsFromUnknown(parts: unknown): string[] {
  if (!Array.isArray(parts)) return [];
  return parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      return (
        stringValue(record.value) ??
        stringValue(record.text) ??
        stringValue(record.content) ??
        ""
      );
    })
    .filter(Boolean);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function summarizeTargetUrl(url: string | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol,
      host: parsed.host,
      path: `${parsed.pathname}${parsed.search}`,
    };
  } catch {
    return { invalid: true };
  }
}

function booleanDirection(value: unknown): "outbound" | "inbound" | undefined {
  return typeof value === "boolean" ? (value ? "outbound" : "inbound") : undefined;
}

function booleanStatus(value: unknown, truthyStatus: string): string | undefined {
  if (typeof value !== "boolean") return undefined;
  return value ? truthyStatus : undefined;
}

export const getCoordinationReadiness = internalQuery({
  args: {
    coordinatorPhone: v.string(),
    coordinatorChatId: v.optional(v.string()),
    controlledContactNames: v.optional(v.array(v.string())),
    coordinationEventTitle: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CoordinationReadiness> => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const coordinatorPhone = normalizePhone(args.coordinatorPhone);
    if (!coordinatorPhone) {
      return {
        readyForControlledOutreach: false,
        existingCoordinatorPresent: false,
        blockers: ["invalid_coordinator_phone"],
        warnings,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", coordinatorPhone))
      .first();
    if (!user) {
      return {
        readyForControlledOutreach: false,
        existingCoordinatorPresent: false,
        blockers: ["coordinator_user_missing"],
        warnings,
      };
    }

    const careCase = await ctx.db.get(user.careCaseId);
    if (!careCase) {
      return {
        readyForControlledOutreach: false,
        existingCoordinatorPresent: true,
        userId: user._id,
        blockers: ["coordinator_care_case_missing"],
        warnings,
      };
    }

    if (user.status !== "active") blockers.push("coordinator_user_not_active");
    if (!user.chatId) blockers.push("coordinator_chat_id_missing");
    if (args.coordinatorChatId && user.chatId !== args.coordinatorChatId) {
      blockers.push("coordinator_chat_id_mismatch");
    }
    if (careCase.status !== "active") blockers.push("coordinator_care_case_not_active");

    const [contacts, events, outreachAttempts] = await Promise.all([
      ctx.db
        .query("careContacts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("outreachAttempts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
    ]);

    const requestedContactNames = args.controlledContactNames ?? [];
    const requestedContacts = requestedContactNames.map((name) => {
      const contact = contactByName(contacts, name);
      if (!contact) blockers.push(`controlled_contact_missing:${name}`);
      return contact;
    }).filter((contact): contact is Doc<"careContacts"> => Boolean(contact));
    const requestedContactIds = requestedContacts.map((contact) => contact._id);

    const openEvents = events.filter(isActiveCoordinationEvent);
    let controlledEvent = args.coordinationEventTitle
      ? events.find((event) => event.title === args.coordinationEventTitle)
      : undefined;
    if (!controlledEvent && requestedContactIds.length > 0) {
      controlledEvent = openEvents.find((event) =>
        eventIncludesContacts(event, requestedContactIds)
      );
    }
    if (!controlledEvent) {
      controlledEvent = openEvents.find((event) =>
        (event.pendingContactIds ?? []).length > 0
      );
    }
    if (!controlledEvent) {
      blockers.push("coordination_event_missing");
    } else if (!isActiveCoordinationEvent(controlledEvent)) {
      blockers.push(`coordination_event_not_open:${controlledEvent.status}`);
    }

    const controlledContacts = requestedContacts.length > 0
      ? requestedContacts
      : contacts.filter((contact) =>
          controlledEvent?.pendingContactIds?.some((id) => id === contact._id)
        );
    if (controlledEvent && controlledContacts.length === 0) {
      blockers.push("controlled_contacts_missing");
    }

    const controlledContactReadiness = controlledContacts.map((contact) => {
      const inPendingEvent = Boolean(
        controlledEvent?.pendingContactIds?.some((id) => id === contact._id),
      );
      if (!contact.active) blockers.push(`controlled_contact_inactive:${contact.name}`);
      if (!contact.phone) blockers.push(`controlled_contact_phone_missing:${contact.name}`);
      if (!contact.canReceiveTexts) {
        blockers.push(`controlled_contact_texting_disabled:${contact.name}`);
      }
      if (contact.consentToContact === false) {
        blockers.push(`controlled_contact_consent_denied:${contact.name}`);
      }
      if (controlledEvent && !inPendingEvent) {
        blockers.push(`controlled_contact_not_pending:${contact.name}`);
      }

      return {
        name: contact.name,
        contactId: contact._id,
        phonePresent: Boolean(contact.phone),
        canReceiveTexts: contact.canReceiveTexts ?? false,
        consentToContact: contact.consentToContact,
        active: contact.active,
        linqChatIdPresent: Boolean(contact.linqChatId),
        inPendingEvent,
      };
    });

    const controlledContactIds = new Set(
      controlledContacts.map((contact) => contact._id),
    );
    const sentControlledAttempts = controlledEvent
      ? outreachAttempts.filter((attempt) =>
          attempt.coordinationEventId === controlledEvent._id &&
          controlledContactIds.has(attempt.careContactId) &&
          attempt.status === "sent"
        )
      : [];
    if (sentControlledAttempts.length > 0) {
      warnings.push("controlled_outreach_already_sent");
    }

    return {
      readyForControlledOutreach: blockers.length === 0,
      existingCoordinatorPresent: true,
      userId: user._id,
      careCaseId: careCase._id,
      coordinatorChatIdPresent: Boolean(user.chatId),
      contactCount: contacts.length,
      openEventCount: openEvents.length,
      controlledEventId: controlledEvent?._id,
      controlledEventTitle: controlledEvent?.title,
      controlledEventStatus: controlledEvent?.status,
      controlledContacts: controlledContactReadiness,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
    };
  },
});

export const getCoordinationLoopReport = internalQuery({
  args: {
    coordinatorPhone: v.string(),
    controlledContactNames: v.optional(v.array(v.string())),
    coordinationEventTitle: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CoordinationLoopReport> => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const coordinatorPhone = normalizePhone(args.coordinatorPhone);
    if (!coordinatorPhone) {
      return {
        passed: false,
        existingCoordinatorPresent: false,
        blockers: ["invalid_coordinator_phone"],
        warnings,
        coordinatorStatusMessageIds: [],
        contacts: [],
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", coordinatorPhone))
      .first();
    if (!user) {
      return {
        passed: false,
        existingCoordinatorPresent: false,
        blockers: ["coordinator_user_missing"],
        warnings,
        coordinatorStatusMessageIds: [],
        contacts: [],
      };
    }

    const careCase = await ctx.db.get(user.careCaseId);
    if (!careCase) {
      return {
        passed: false,
        existingCoordinatorPresent: true,
        userId: user._id,
        blockers: ["coordinator_care_case_missing"],
        warnings,
        coordinatorStatusMessageIds: [],
        contacts: [],
      };
    }

    if (user.status !== "active") blockers.push("coordinator_user_not_active");
    if (careCase.status !== "active") blockers.push("coordinator_care_case_not_active");

    const [contacts, events, outreachAttempts, messages, auditLogs] =
      await Promise.all([
        ctx.db
          .query("careContacts")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("coordinationEvents")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("outreachAttempts")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("messages")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("auditLogs")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
      ]);

    const requestedContactNames = args.controlledContactNames ?? [];
    const requestedContacts = requestedContactNames.map((name) => {
      const contact = contactByName(contacts, name);
      if (!contact) blockers.push(`controlled_contact_missing:${name}`);
      return contact;
    }).filter((contact): contact is Doc<"careContacts"> => Boolean(contact));
    const requestedContactIds = requestedContacts.map((contact) => contact._id);

    let controlledEvent = args.coordinationEventTitle
      ? events.find((event) => event.title === args.coordinationEventTitle)
      : undefined;
    if (!controlledEvent && requestedContactIds.length > 0) {
      controlledEvent = events.find((event) =>
        event.status !== "cancelled" &&
        eventIncludesContacts(event, requestedContactIds)
      );
    }
    if (!controlledEvent) {
      controlledEvent = events.find((event) =>
        event.status !== "cancelled" &&
        outreachAttempts.some((attempt) =>
          attempt.coordinationEventId === event._id && attempt.status === "sent"
        )
      );
    }
    if (!controlledEvent) {
      controlledEvent = events.find((event) =>
        event.status !== "cancelled" && contactIdsForEvent(event).length > 0
      );
    }
    if (!controlledEvent) {
      blockers.push("coordination_event_missing");
    }

    const eventContactIds = controlledEvent
      ? uniqueIds(contactIdsForEvent(controlledEvent))
      : [];
    const sentAttemptContactIds = controlledEvent
      ? outreachAttempts
          .filter((attempt) =>
            attempt.coordinationEventId === controlledEvent?._id &&
            attempt.status === "sent"
          )
          .map((attempt) => attempt.careContactId)
      : [];
    const contactsToReport = requestedContacts.length > 0
      ? requestedContacts
      : contacts.filter((contact) =>
          uniqueIds([...eventContactIds, ...sentAttemptContactIds]).some((id) =>
            id === contact._id
          )
        );
    if (controlledEvent && contactsToReport.length === 0) {
      blockers.push("controlled_contacts_missing");
    }

    const coordinatorStatusMessages = controlledEvent
      ? messages.filter((message) =>
          message.coordinationEventId === controlledEvent._id &&
          message.direction === "outbound" &&
          message.actorType === "assistant" &&
          !message.careContactId
        )
      : [];

    const contactReports: CoordinationLoopContactReport[] = [];
    let latestInboundReplyAt: number | undefined;

    for (const contact of contactsToReport) {
      const contactBlockers: string[] = [];
      const contactWarnings: string[] = [];

      let extraCareCaseUserId: Id<"users"> | undefined;
      let extraCareCaseId: Id<"careCases"> | undefined;
      if (contact.phone) {
        const usersWithContactPhone = await ctx.db
          .query("users")
          .withIndex("by_phone", (q) => q.eq("phone", contact.phone ?? ""))
          .collect();
        const extraUser = usersWithContactPhone.find(
          (candidate) => candidate.careCaseId !== careCase._id,
        );
        if (extraUser) {
          extraCareCaseUserId = extraUser._id;
          extraCareCaseId = extraUser.careCaseId;
          contactBlockers.push(`extra_care_case_for_controlled_contact_phone:${contact.name}`);
        }
      }

      const sentAttempts = controlledEvent
        ? outreachAttempts
            .filter((attempt) =>
              attempt.coordinationEventId === controlledEvent?._id &&
              attempt.careContactId === contact._id &&
              attempt.status === "sent"
            )
            .sort((a, b) => (b.sentAt ?? b.updatedAt) - (a.sentAt ?? a.updatedAt))
        : [];
      const latestSentAttempt = sentAttempts[0];
      if (controlledEvent && sentAttempts.length === 0) {
        contactBlockers.push(`sent_outreach_missing:${contact.name}`);
      }

      const sentAttemptIds = sentAttempts.map((attempt) => attempt._id);
      const outboundMessage = controlledEvent && sentAttemptIds.length > 0
        ? messages
            .filter((message) =>
              message.coordinationEventId === controlledEvent?._id &&
              message.careContactId === contact._id &&
              message.direction === "outbound" &&
              message.actorType === "assistant" &&
              message.outreachAttemptId &&
              sentAttemptIds.includes(message.outreachAttemptId)
            )
            .sort((a, b) => b.timestamp - a.timestamp)[0]
        : undefined;
      if (controlledEvent && !outboundMessage) {
        contactBlockers.push(`outbound_message_missing:${contact.name}`);
      }

      const inboundReply = controlledEvent && sentAttemptIds.length > 0
        ? messages
            .filter((message) =>
              message.coordinationEventId === controlledEvent?._id &&
              message.careContactId === contact._id &&
              message.direction === "inbound" &&
              message.outreachAttemptId &&
              sentAttemptIds.includes(message.outreachAttemptId)
            )
            .sort((a, b) => b.timestamp - a.timestamp)[0]
        : undefined;
      if (controlledEvent && !inboundReply) {
        contactBlockers.push(`inbound_reply_missing:${contact.name}`);
      }
      if (inboundReply) {
        latestInboundReplyAt = Math.max(latestInboundReplyAt ?? 0, inboundReply.timestamp);
      }

      const confirmedOnEvent = Boolean(
        controlledEvent?.confirmedContactIds?.some((id) => id === contact._id),
      );
      const pendingOnEvent = Boolean(
        controlledEvent?.pendingContactIds?.some((id) => id === contact._id),
      );
      const declinedOnEvent = Boolean(
        controlledEvent?.declinedContactIds?.some((id) => id === contact._id),
      );
      const eventReflectsReply = Boolean(
        inboundReply &&
          (confirmedOnEvent ||
            declinedOnEvent ||
            controlledEvent?.lastReplyMessageId === inboundReply._id),
      );
      if (inboundReply && !eventReflectsReply) {
        contactBlockers.push(`event_reply_state_missing:${contact.name}`);
      }
      if (inboundReply && pendingOnEvent && !confirmedOnEvent && !declinedOnEvent) {
        contactWarnings.push(`reply_left_contact_pending:${contact.name}`);
      }

      const followUpClockClearedOrDeferred = Boolean(
        latestSentAttempt &&
          (!latestSentAttempt.nextActionAt ||
            (inboundReply && latestSentAttempt.nextActionAt > inboundReply.timestamp)),
      );
      if (inboundReply && latestSentAttempt && !followUpClockClearedOrDeferred) {
        contactBlockers.push(`follow_up_clock_still_due:${contact.name}`);
      }

      const auditFor = (event: Doc<"auditLogs">["event"]): boolean =>
        Boolean(
          controlledEvent &&
            auditLogs.some((audit) =>
              audit.event === event &&
              audit.details.coordinationEventId === controlledEvent?._id &&
              audit.details.careContactId === contact._id &&
              (sentAttemptIds.length === 0 ||
                !audit.details.outreachAttemptId ||
                sentAttemptIds.includes(audit.details.outreachAttemptId as Id<"outreachAttempts">))
            ),
        );
      const audit = {
        outreachRequested: auditFor("outreach_requested"),
        outreachApproved: auditFor("outreach_approved"),
        outreachSent: auditFor("outreach_sent"),
        liveReplyReceived: auditFor("care_contact_reply_received"),
        statusSentToCoordinator: false,
      };
      if (latestSentAttempt && !audit.outreachRequested) {
        contactBlockers.push(`outreach_requested_audit_missing:${contact.name}`);
      }
      if (latestSentAttempt && !audit.outreachApproved) {
        contactBlockers.push(`outreach_approved_audit_missing:${contact.name}`);
      }
      if (latestSentAttempt && !audit.outreachSent) {
        contactBlockers.push(`outreach_sent_audit_missing:${contact.name}`);
      }
      if (inboundReply && !audit.liveReplyReceived) {
        contactWarnings.push(`live_reply_audit_missing:${contact.name}`);
      }

      contactReports.push({
        key: contact.name,
        name: contact.name,
        contactId: contact._id,
        phone: contact.phone,
        linqChatId: contact.linqChatId,
        sentOutreachAttemptIds: sentAttemptIds,
        latestSentOutreachAttemptId: latestSentAttempt?._id,
        outboundMessageId: outboundMessage?._id,
        inboundReplyMessageId: inboundReply?._id,
        replyStatus: contact.lastReplyStatus,
        confirmedOnEvent,
        pendingOnEvent,
        declinedOnEvent,
        followUpClockClearedOrDeferred,
        extraCareCaseUserId,
        extraCareCaseId,
        audit,
        blockers: [...new Set(contactBlockers)],
        warnings: [...new Set(contactWarnings)],
        passed: contactBlockers.length === 0,
      });
    }

    const freshCoordinatorStatusMessages = coordinatorStatusMessages.filter((message) =>
      latestInboundReplyAt === undefined || message.timestamp >= latestInboundReplyAt
    );
    const freshStatusAuditPresent = controlledEvent
      ? auditLogs.some((audit) =>
          audit.event === "response_sent" &&
          audit.details.triggerMessage === "coordination_status_follow_up" &&
          audit.details.coordinationEventId === controlledEvent?._id &&
          (latestInboundReplyAt === undefined || audit.timestamp >= latestInboundReplyAt)
        )
      : false;
    if (controlledEvent && freshCoordinatorStatusMessages.length === 0) {
      blockers.push(
        coordinatorStatusMessages.length === 0
          ? "coordinator_status_message_missing"
          : "coordinator_status_message_stale",
      );
    }
    if (controlledEvent && !freshStatusAuditPresent) {
      blockers.push(
        auditLogs.some((audit) =>
          audit.event === "response_sent" &&
          audit.details.triggerMessage === "coordination_status_follow_up" &&
          audit.details.coordinationEventId === controlledEvent?._id
        )
          ? "coordinator_status_audit_stale"
          : "coordinator_status_audit_missing",
      );
    }
    for (const contactReport of contactReports) {
      contactReport.audit.statusSentToCoordinator = freshStatusAuditPresent;
      blockers.push(...contactReport.blockers);
      warnings.push(...contactReport.warnings);
    }

    return {
      passed: blockers.length === 0,
      existingCoordinatorPresent: true,
      userId: user._id,
      careCaseId: careCase._id,
      controlledEventId: controlledEvent?._id,
      controlledEventTitle: controlledEvent?.title,
      controlledEventStatus: controlledEvent?.status,
      coordinatorStatusMessageIds: freshCoordinatorStatusMessages.map((message) =>
        message._id
      ),
      contacts: contactReports,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
    };
  },
});

export const seedRobCareNetworkScenario = internalMutation({
  args: {
    robPhone: v.string(),
    robChatId: v.optional(v.string()),
    useTestContactPhones: v.optional(v.boolean()),
    contactOverrides: v.optional(v.array(robContactOverrideValidator)),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const robPhone = normalizePhone(args.robPhone);
    if (!robPhone) throw new Error("Valid Rob phone is required");

    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", robPhone))
      .first();
    let careCase: Doc<"careCases"> | null = user
      ? await ctx.db.get(user.careCaseId)
      : null;

    if (!user || !careCase) {
      const careCaseId = await ctx.db.insert("careCases", {
        title: "Rob Wudlick care coordination",
        status: "active",
        timezone: "America/Chicago",
        careRecipientName: "Rob Wudlick",
        relationshipToRecipient: "self",
        createdAt: now,
        updatedAt: now,
      });
      const userId = await ctx.db.insert("users", {
        phone: robPhone,
        name: "Rob Wudlick",
        careCaseId,
        status: "active",
        relationshipToRecipient: "self",
        chatId: args.robChatId,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
      careCase = await ctx.db.get(careCaseId);
    } else {
      await ctx.db.patch(user._id, {
        name: "Rob Wudlick",
        relationshipToRecipient: "self",
        status: "active",
        chatId: args.robChatId ?? user.chatId,
        updatedAt: now,
      });
      await ctx.db.patch(careCase._id, {
        title: "Rob Wudlick care coordination",
        status: "active",
        timezone: "America/Chicago",
        careRecipientName: "Rob Wudlick",
        relationshipToRecipient: "self",
        updatedAt: now,
      });
      user = await ctx.db.get(user._id);
      careCase = await ctx.db.get(careCase._id);
    }

    if (!user || !careCase) {
      throw new Error("Unable to create Rob care network scenario");
    }

    const useTestContactPhones = args.useTestContactPhones ?? true;
    const existingContacts = await ctx.db
      .query("careContacts")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .collect();
    const contactIdsByKey = new Map<string, Id<"careContacts">>();

    for (const [index, fixture] of ROB_SCENARIO_CONTACTS.entries()) {
      const override = overrideByKey(args.contactOverrides, fixture.key);
      const phone = normalizeOptionalFixturePhone(
        override?.phone ?? (useTestContactPhones ? testPhoneForIndex(index) : undefined),
      );
      const canReceiveTexts =
        override?.canReceiveTexts ?? (fixture.defaultCanReceiveTexts && Boolean(phone));
      const existing = contactByName(existingContacts, fixture.name);
      const patch = {
        phone,
        relationship: fixture.relationship,
        contactType: fixture.contactType,
        role: fixture.role,
        availabilityNotes: fixture.availabilityNotes,
        contactPriority: fixture.contactPriority,
        canReceiveTexts,
        consentToContact: canReceiveTexts,
        linqChatId: override?.linqChatId,
        active: true,
        notes: "notes" in fixture ? fixture.notes : undefined,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        contactIdsByKey.set(fixture.key, existing._id);
      } else {
        const contactId = await ctx.db.insert("careContacts", {
          careCaseId: careCase._id,
          name: fixture.name,
          ...patch,
          createdAt: now,
        });
        contactIdsByKey.set(fixture.key, contactId);
      }
    }

    const existingScheduleItems = await ctx.db
      .query("scheduleItems")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .collect();
    let scheduleItemCount = 0;
    for (const item of ROB_SCENARIO_SCHEDULE_ITEMS) {
      const existing = existingScheduleItems.find(
        (candidate) => candidate.title === item.title,
      );
      const patch = {
        type: "task" as const,
        time: item.time,
        endTime: item.endTime,
        recurrence: item.recurrence,
        notes: item.notes,
        status: "scheduled" as const,
        provider: item.provider,
      };
      if (existing) {
        await ctx.db.patch(existing._id, patch);
      } else {
        await ctx.db.insert("scheduleItems", {
          careCaseId: careCase._id,
          title: item.title,
          ...patch,
        });
      }
      scheduleItemCount += 1;
    }

    const controlledPendingContactIds = [
      contactIdsByKey.get("jim"),
      contactIdsByKey.get("jennifer"),
    ].filter((id): id is Id<"careContacts"> => Boolean(id));
    const eventTitle = "Rob schedule confirmation controlled test";
    const existingEvents = await ctx.db
      .query("coordinationEvents")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .collect();
    const existingEvent = existingEvents.find((event) => event.title === eventTitle);
    const eventPatch = {
      type: "coverage_gap" as const,
      status: "waiting" as const,
      urgency: "normal" as const,
      description:
        "Controlled multiplayer test: ask known test contacts to confirm schedule availability before using real caregiver numbers.",
      pendingContactIds: controlledPendingContactIds,
      createdByUserId: user._id,
      updatedAt: now,
    };
    const coordinationEventId = existingEvent
      ? existingEvent._id
      : await ctx.db.insert("coordinationEvents", {
          careCaseId: careCase._id,
          title: eventTitle,
          ...eventPatch,
          createdAt: now,
        });
    if (existingEvent) {
      await ctx.db.patch(existingEvent._id, eventPatch);
    }

    const memoryContent =
      "Rob's care network scenario stress-tests schedule coordination through CareSupport texting caregivers one-on-one, storing replies in the care graph, and updating the coordinator conversationally.";
    const existingMemory = await ctx.db
      .query("memoryEntries")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .filter((q) => q.eq(q.field("content"), memoryContent))
      .first();
    if (!existingMemory) {
      await ctx.db.insert("memoryEntries", {
        careCaseId: careCase._id,
        userId: user._id,
        scope: "care_case",
        category: "care_note",
        content: memoryContent,
        source: "rob_multiplayer_fixture",
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      careCaseId: careCase._id,
      userId: user._id,
      contactCount: ROB_SCENARIO_CONTACTS.length,
      scheduleItemCount,
      coordinationEventId,
      controlledPendingContactIds,
      controlledPendingContactNames: ROB_SCENARIO_CONTACTS
        .filter((contact) => contact.key === "jim" || contact.key === "jennifer")
        .map((contact) => contact.name),
    };
  },
});

export const getRobScenarioReadiness = internalQuery({
  args: {
    robPhone: v.string(),
    controlledContactKeys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<RobScenarioReadiness> => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const robPhone = normalizePhone(args.robPhone);
    if (!robPhone) {
      return {
        readyForControlledOutreach: false,
        fixturePresent: false,
        blockers: ["invalid_rob_phone"],
        warnings,
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", robPhone))
      .first();
    if (!user) {
      return {
        readyForControlledOutreach: false,
        fixturePresent: false,
        blockers: ["rob_user_missing"],
        warnings,
      };
    }

    const careCase = await ctx.db.get(user.careCaseId);
    if (!careCase) {
      return {
        readyForControlledOutreach: false,
        fixturePresent: false,
        userId: user._id,
        blockers: ["rob_care_case_missing"],
        warnings,
      };
    }

    if (user.status !== "active") blockers.push("rob_user_not_active");
    if (!user.chatId) blockers.push("rob_chat_id_missing");
    if (careCase.status !== "active") blockers.push("rob_care_case_not_active");
    if (careCase.careRecipientName !== "Rob Wudlick") {
      warnings.push("care_recipient_name_not_rob_wudlick");
    }

    const [
      contacts,
      scheduleItems,
      events,
      outreachAttempts,
    ] = await Promise.all([
      ctx.db
        .query("careContacts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("scheduleItems")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("outreachAttempts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
    ]);

    const missingContactKeys: string[] = [];
    for (const fixture of ROB_SCENARIO_CONTACTS) {
      if (!contactByName(contacts, fixture.name)) {
        missingContactKeys.push(fixture.key);
      }
    }
    if (missingContactKeys.length > 0) {
      blockers.push(`missing_contacts:${missingContactKeys.join(",")}`);
    }

    const missingScheduleTitles = ROB_SCENARIO_SCHEDULE_ITEMS
      .map((item) => item.title)
      .filter((title) => !scheduleItems.some((item) => item.title === title));
    if (missingScheduleTitles.length > 0) {
      blockers.push(`missing_schedule_items:${missingScheduleTitles.join("|")}`);
    }

    const controlledEventTitle = "Rob schedule confirmation controlled test";
    const controlledEvent = events.find((event) => event.title === controlledEventTitle);
    if (!controlledEvent) {
      blockers.push("controlled_event_missing");
    } else if (
      controlledEvent.status !== "open" &&
      controlledEvent.status !== "waiting"
    ) {
      blockers.push(`controlled_event_not_open:${controlledEvent.status}`);
    }

    const controlledContactKeys = args.controlledContactKeys ?? ["jim", "jennifer"];
    const controlledContacts = controlledContactKeys.map((key) => {
      const fixture = fixtureForKey(key);
      const contact = fixture ? contactByName(contacts, fixture.name) : undefined;
      const inPendingEvent = Boolean(
        contact &&
          controlledEvent?.pendingContactIds?.some((id) => id === contact._id),
      );
      const generatedFixturePhone = isGeneratedFixturePhone(key, contact?.phone);
      if (!fixture) blockers.push(`unknown_controlled_contact_key:${key}`);
      if (!contact) blockers.push(`controlled_contact_missing:${key}`);
      if (contact && !contact.active) blockers.push(`controlled_contact_inactive:${key}`);
      if (contact && !contact.phone) blockers.push(`controlled_contact_phone_missing:${key}`);
      if (contact && !contact.canReceiveTexts) {
        blockers.push(`controlled_contact_texting_disabled:${key}`);
      }
      if (contact && contact.consentToContact === false) {
        blockers.push(`controlled_contact_consent_denied:${key}`);
      }
      if (contact && generatedFixturePhone) {
        blockers.push(`controlled_contact_uses_generated_fixture_phone:${key}`);
      }
      if (contact && controlledEvent && !inPendingEvent) {
        blockers.push(`controlled_contact_not_pending:${key}`);
      }

      return {
        key,
        name: fixture?.name ?? key,
        contactId: contact?._id,
        phonePresent: Boolean(contact?.phone),
        canReceiveTexts: contact?.canReceiveTexts ?? false,
        consentToContact: contact?.consentToContact,
        active: contact?.active ?? false,
        linqChatIdPresent: Boolean(contact?.linqChatId),
        generatedFixturePhone,
        inPendingEvent,
      };
    });

    const sentControlledAttempts = outreachAttempts.filter((attempt) =>
      controlledContacts.some((contact) => contact.contactId === attempt.careContactId) &&
      attempt.status === "sent"
    );
    if (sentControlledAttempts.length > 0) {
      warnings.push("controlled_outreach_already_sent");
    }

    return {
      readyForControlledOutreach: blockers.length === 0,
      fixturePresent: blockers.every((blocker) =>
        !blocker.startsWith("missing_") &&
        !blocker.endsWith("_missing"),
      ),
      userId: user._id,
      careCaseId: careCase._id,
      robChatIdPresent: Boolean(user.chatId),
      contactCount: contacts.length,
      expectedContactCount: ROB_SCENARIO_CONTACTS.length,
      scheduleItemCount: scheduleItems.length,
      expectedScheduleItemCount: ROB_SCENARIO_SCHEDULE_ITEMS.length,
      controlledEventId: controlledEvent?._id,
      controlledEventStatus: controlledEvent?.status,
      controlledContacts,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
    };
  },
});

export const runRobScenarioDryRun = internalAction({
  args: {
    robPhone: v.string(),
    contactKeys: v.optional(v.array(controlledContactKeyValidator)),
    replyBody: v.optional(v.string()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RobScenarioDryRunResult> => {
    const readiness = await ctx.runQuery(
      internal.admin.getRobScenarioReadiness,
      {
        robPhone: args.robPhone,
        controlledContactKeys: args.contactKeys,
      },
    ) as RobScenarioReadiness;

    if (!readiness.readyForControlledOutreach || !readiness.careCaseId) {
      return {
        ran: false,
        reason: "not_ready",
        readiness,
        simulated: [],
      };
    }

    const detail = await ctx.runQuery(internal.admin.getCareCaseDetail, {
      careCaseId: readiness.careCaseId,
    }) as AdminCareCaseDetail | null;
    if (!detail?.user) {
      return {
        ran: false,
        reason: "care_case_detail_missing",
        readiness,
        simulated: [],
      };
    }

    const now = args.now ?? Date.now();
    const contactKeys = args.contactKeys ?? ["jim", "jennifer"];
    const eventTitle = "Rob schedule confirmation controlled test";
    const simulated: RobScenarioDryRunItem[] = [];

    for (const key of contactKeys) {
      const fixture = fixtureForKey(key);
      const contact = fixture
        ? detail.careContacts.find((candidate) => candidate.name === fixture.name)
        : undefined;
      if (!fixture || !contact) {
        simulated.push({ key, contactName: key, replyStatus: "contact_missing" });
        continue;
      }

      const created = await ctx.runMutation(
        internal.outreachAttempts.createPendingFromModel,
        {
          careCaseId: readiness.careCaseId,
          requestedByUserId: detail.user._id,
          request: {
            contactName: contact.name,
            purpose: `Dry-run confirmation for ${eventTitle}`,
            message: [
              `Hi ${contact.name}, this is a CareSupport controlled dry run for Rob.`,
              "Can you confirm your schedule availability?",
            ].join(" "),
            coordinationEventTitle: eventTitle,
          },
          approvalPrompt: `Dry run: approve outreach to ${contact.name}?`,
        },
      );
      if (created.action !== "created" && created.action !== "updated") {
        simulated.push({
          key,
          contactName: contact.name,
          replyStatus: `outreach_${created.action}`,
        });
        continue;
      }

      const approved = await ctx.runMutation(
        internal.outreachAttempts.resolveApprovalFromMessage,
        {
          careCaseId: readiness.careCaseId,
          approvedByUserId: detail.user._id,
          messageBody: `Yes, ask ${contact.name}`,
        },
      );
      if (approved.action !== "approved" || !approved.id) {
        simulated.push({
          key,
          contactName: contact.name,
          replyStatus: `approval_${approved.action}`,
        });
        continue;
      }

      const linqChatId = contact.linqChatId || `dry-run-${key}-${now}`;
      await ctx.runMutation(internal.outreachAttempts.markSent, {
        outreachAttemptId: approved.id,
        linqChatId,
        linqMessageId: `dry-run-outreach-${key}-${now}`,
      });

      const resolved = await ctx.runMutation(internal.contactReplies.resolveInbound, {
        senderPhone: contact.phone ?? "",
        chatId: linqChatId,
      });
      if (!resolved?.coordinationEventId) {
        simulated.push({
          key,
          contactName: contact.name,
          outreachAttemptId: approved.id,
          replyStatus: "reply_resolution_failed",
        });
        continue;
      }

      const replyBody =
        args.replyBody ?? `Yes, this controlled dry-run schedule is correct for ${contact.name}.`;
      const sourceMessageId = await ctx.runMutation(internal.mutations.logMessage, {
        careCaseId: readiness.careCaseId,
        userId: detail.user._id,
        senderPhone: contact.phone,
        actorType: "user",
        direction: "inbound",
        displayName: contact.name,
        body: replyBody,
        timestamp: now,
        careContactId: resolved.careContactId,
        coordinationEventId: resolved.coordinationEventId,
        outreachAttemptId: resolved.outreachAttemptId,
      });

      const replyState = await ctx.runMutation(
        internal.contactReplies.applyInboundReplyToEvent,
        {
          careCaseId: readiness.careCaseId,
          careContactId: resolved.careContactId,
          coordinationEventId: resolved.coordinationEventId,
          outreachAttemptId: resolved.outreachAttemptId,
          messageBody: replyBody,
          sourceMessageId,
        },
      );

      const statusResult = await ctx.runMutation(
        internal.outreachAttempts.markCoordinationStatusSent,
        {
          coordinationEventId: resolved.coordinationEventId,
          userId: detail.user._id,
          messageBody:
            `CareSupport dry-run update: ${contact.name} replied ${replyState.status} for ${eventTitle}.`,
          linqMessageId: `dry-run-status-${key}-${now}`,
          now,
        },
      );

      simulated.push({
        key,
        contactName: contact.name,
        outreachAttemptId: approved.id,
        replyStatus: replyState.status,
        statusMessageId: statusResult.messageId,
      });
    }

    return {
      ran: true,
      readiness,
      simulated,
    };
  },
});

export const getRobScenarioReport = internalQuery({
  args: {
    robPhone: v.string(),
    controlledContactKeys: v.optional(v.array(controlledContactKeyValidator)),
  },
  handler: async (ctx, args): Promise<RobScenarioLoopReport> => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const robPhone = normalizePhone(args.robPhone);
    if (!robPhone) {
      return {
        passed: false,
        fixturePresent: false,
        blockers: ["invalid_rob_phone"],
        warnings,
        robStatusMessageIds: [],
        contacts: [],
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", robPhone))
      .first();
    if (!user) {
      return {
        passed: false,
        fixturePresent: false,
        blockers: ["rob_user_missing"],
        warnings,
        robStatusMessageIds: [],
        contacts: [],
      };
    }

    const careCase = await ctx.db.get(user.careCaseId);
    if (!careCase) {
      return {
        passed: false,
        fixturePresent: false,
        userId: user._id,
        blockers: ["rob_care_case_missing"],
        warnings,
        robStatusMessageIds: [],
        contacts: [],
      };
    }

    if (user.status !== "active") blockers.push("rob_user_not_active");
    if (careCase.status !== "active") blockers.push("rob_care_case_not_active");

    const [contacts, events, outreachAttempts, messages, auditLogs] =
      await Promise.all([
        ctx.db
          .query("careContacts")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("coordinationEvents")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("outreachAttempts")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("messages")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
        ctx.db
          .query("auditLogs")
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
          .collect(),
      ]);

    const controlledEventTitle = "Rob schedule confirmation controlled test";
    const controlledEvent = events.find((event) => event.title === controlledEventTitle);
    if (!controlledEvent) {
      blockers.push("controlled_event_missing");
    }

    const robStatusMessages = controlledEvent
      ? messages.filter((message) =>
          message.coordinationEventId === controlledEvent._id &&
          message.direction === "outbound" &&
          message.actorType === "assistant" &&
          !message.careContactId
        )
      : [];

    const controlledContactKeys = args.controlledContactKeys ?? ["jim", "jennifer"];
    const contactReports: RobScenarioLoopContactReport[] = [];
    let latestInboundReplyAt: number | undefined;

    for (const key of controlledContactKeys) {
      const contactBlockers: string[] = [];
      const contactWarnings: string[] = [];
      const fixture = fixtureForKey(key);
      const contact = fixture ? contactByName(contacts, fixture.name) : undefined;
      if (!fixture) contactBlockers.push(`unknown_controlled_contact_key:${key}`);
      if (!contact) contactBlockers.push(`controlled_contact_missing:${key}`);

      let extraCareCaseUserId: Id<"users"> | undefined;
      let extraCareCaseId: Id<"careCases"> | undefined;
      if (contact?.phone) {
        const usersWithContactPhone = await ctx.db
          .query("users")
          .withIndex("by_phone", (q) => q.eq("phone", contact.phone ?? ""))
          .collect();
        const extraUser = usersWithContactPhone.find(
          (candidate) => candidate.careCaseId !== careCase._id,
        );
        if (extraUser) {
          extraCareCaseUserId = extraUser._id;
          extraCareCaseId = extraUser.careCaseId;
          contactBlockers.push(`extra_care_case_for_controlled_contact_phone:${key}`);
        }
      }

      const sentAttempts = contact && controlledEvent
        ? outreachAttempts
            .filter((attempt) =>
              attempt.coordinationEventId === controlledEvent._id &&
              attempt.careContactId === contact._id &&
              attempt.status === "sent"
            )
            .sort((a, b) => (b.sentAt ?? b.updatedAt) - (a.sentAt ?? a.updatedAt))
        : [];
      const latestSentAttempt = sentAttempts[0];
      if (contact && controlledEvent && sentAttempts.length === 0) {
        contactBlockers.push(`sent_outreach_missing:${key}`);
      }

      const sentAttemptIds = sentAttempts.map((attempt) => attempt._id);
      const outboundMessage = contact && controlledEvent && sentAttemptIds.length > 0
        ? messages
            .filter((message) =>
              message.coordinationEventId === controlledEvent._id &&
              message.careContactId === contact._id &&
              message.direction === "outbound" &&
              message.actorType === "assistant" &&
              message.outreachAttemptId &&
              sentAttemptIds.includes(message.outreachAttemptId)
            )
            .sort((a, b) => b.timestamp - a.timestamp)[0]
        : undefined;
      if (contact && controlledEvent && !outboundMessage) {
        contactBlockers.push(`outbound_message_missing:${key}`);
      }

      const inboundReply = contact && controlledEvent && sentAttemptIds.length > 0
        ? messages
            .filter((message) =>
              message.coordinationEventId === controlledEvent._id &&
              message.careContactId === contact._id &&
              message.direction === "inbound" &&
              message.outreachAttemptId &&
              sentAttemptIds.includes(message.outreachAttemptId)
            )
            .sort((a, b) => b.timestamp - a.timestamp)[0]
        : undefined;
      if (contact && controlledEvent && !inboundReply) {
        contactBlockers.push(`inbound_reply_missing:${key}`);
      }
      if (inboundReply) {
        latestInboundReplyAt = Math.max(latestInboundReplyAt ?? 0, inboundReply.timestamp);
      }

      const confirmedOnEvent = Boolean(
        contact &&
          controlledEvent?.confirmedContactIds?.some((id) => id === contact._id),
      );
      const pendingOnEvent = Boolean(
        contact &&
          controlledEvent?.pendingContactIds?.some((id) => id === contact._id),
      );
      const declinedOnEvent = Boolean(
        contact &&
          controlledEvent?.declinedContactIds?.some((id) => id === contact._id),
      );
      const eventReflectsReply = Boolean(
        inboundReply &&
          (confirmedOnEvent ||
            declinedOnEvent ||
            controlledEvent?.lastReplyMessageId === inboundReply._id),
      );
      if (inboundReply && !eventReflectsReply) {
        contactBlockers.push(`event_reply_state_missing:${key}`);
      }
      if (inboundReply && pendingOnEvent && !confirmedOnEvent && !declinedOnEvent) {
        contactWarnings.push(`reply_left_contact_pending:${key}`);
      }

      const followUpClockClearedOrDeferred = Boolean(
        latestSentAttempt &&
          (!latestSentAttempt.nextActionAt ||
            (inboundReply && latestSentAttempt.nextActionAt > inboundReply.timestamp)),
      );
      if (inboundReply && latestSentAttempt && !followUpClockClearedOrDeferred) {
        contactBlockers.push(`follow_up_clock_still_due:${key}`);
      }

      const auditFor = (event: Doc<"auditLogs">["event"]): boolean =>
        Boolean(
          contact &&
            controlledEvent &&
            auditLogs.some((audit) =>
              audit.event === event &&
              audit.details.coordinationEventId === controlledEvent._id &&
              audit.details.careContactId === contact._id &&
              (sentAttemptIds.length === 0 ||
                !audit.details.outreachAttemptId ||
                sentAttemptIds.includes(audit.details.outreachAttemptId as Id<"outreachAttempts">))
            ),
        );
      const audit = {
        outreachRequested: auditFor("outreach_requested"),
        outreachApproved: auditFor("outreach_approved"),
        outreachSent: auditFor("outreach_sent"),
        liveReplyReceived: auditFor("care_contact_reply_received"),
        statusSentToRob: false,
      };
      if (latestSentAttempt && !audit.outreachRequested) {
        contactBlockers.push(`outreach_requested_audit_missing:${key}`);
      }
      if (latestSentAttempt && !audit.outreachApproved) {
        contactBlockers.push(`outreach_approved_audit_missing:${key}`);
      }
      if (latestSentAttempt && !audit.outreachSent) {
        contactBlockers.push(`outreach_sent_audit_missing:${key}`);
      }
      if (inboundReply && !audit.liveReplyReceived) {
        contactWarnings.push(`live_reply_audit_missing:${key}`);
      }

      const report = {
        key,
        name: fixture?.name ?? key,
        contactId: contact?._id,
        phone: contact?.phone,
        linqChatId: contact?.linqChatId,
        sentOutreachAttemptIds: sentAttemptIds,
        latestSentOutreachAttemptId: latestSentAttempt?._id,
        outboundMessageId: outboundMessage?._id,
        inboundReplyMessageId: inboundReply?._id,
        replyStatus: contact?.lastReplyStatus,
        confirmedOnEvent,
        pendingOnEvent,
        declinedOnEvent,
        followUpClockClearedOrDeferred,
        extraCareCaseUserId,
        extraCareCaseId,
        audit,
        blockers: [...new Set(contactBlockers)],
        warnings: [...new Set(contactWarnings)],
        passed: contactBlockers.length === 0,
      };
      contactReports.push(report);
    }

    const freshRobStatusMessages = robStatusMessages.filter((message) =>
      latestInboundReplyAt === undefined || message.timestamp >= latestInboundReplyAt
    );
    const freshStatusAuditPresent = controlledEvent
      ? auditLogs.some((audit) =>
          audit.event === "response_sent" &&
          audit.details.triggerMessage === "coordination_status_follow_up" &&
          audit.details.coordinationEventId === controlledEvent._id &&
          (latestInboundReplyAt === undefined || audit.timestamp >= latestInboundReplyAt)
        )
      : false;
    if (controlledEvent && freshRobStatusMessages.length === 0) {
      blockers.push(
        robStatusMessages.length === 0
          ? "rob_status_message_missing"
          : "rob_status_message_stale",
      );
    }
    if (controlledEvent && !freshStatusAuditPresent) {
      blockers.push(
        auditLogs.some((audit) =>
          audit.event === "response_sent" &&
          audit.details.triggerMessage === "coordination_status_follow_up" &&
          audit.details.coordinationEventId === controlledEvent._id
        )
          ? "rob_status_audit_stale"
          : "rob_status_audit_missing",
      );
    }
    for (const contactReport of contactReports) {
      contactReport.audit.statusSentToRob = freshStatusAuditPresent;
    }

    for (const contactReport of contactReports) {
      blockers.push(...contactReport.blockers);
      warnings.push(...contactReport.warnings);
    }

    return {
      passed: blockers.length === 0,
      fixturePresent: Boolean(user && careCase && controlledEvent),
      userId: user._id,
      careCaseId: careCase._id,
      controlledEventId: controlledEvent?._id,
      controlledEventStatus: controlledEvent?.status,
      robStatusMessageIds: freshRobStatusMessages.map((message) => message._id),
      contacts: contactReports,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
    };
  },
});

export const resetRobScenarioDryRunState = internalMutation({
  args: {
    robPhone: v.string(),
    controlledContactKeys: v.optional(v.array(controlledContactKeyValidator)),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RobScenarioLoopResetResult> => {
    const robPhone = normalizePhone(args.robPhone);
    if (!robPhone) {
      return {
        reset: false,
        reason: "invalid_rob_phone",
        restoredPendingContactIds: [],
        cancelledDryRunAttemptIds: [],
        clearedContactReplyIds: [],
      };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", robPhone))
      .first();
    if (!user) {
      return {
        reset: false,
        reason: "rob_user_missing",
        restoredPendingContactIds: [],
        cancelledDryRunAttemptIds: [],
        clearedContactReplyIds: [],
      };
    }

    const careCase = await ctx.db.get(user.careCaseId);
    if (!careCase) {
      return {
        reset: false,
        reason: "rob_care_case_missing",
        restoredPendingContactIds: [],
        cancelledDryRunAttemptIds: [],
        clearedContactReplyIds: [],
      };
    }

    const [contacts, events, outreachAttempts, messages] = await Promise.all([
      ctx.db
        .query("careContacts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("outreachAttempts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .collect(),
    ]);

    const controlledEventTitle = "Rob schedule confirmation controlled test";
    const controlledEvent = events.find((event) => event.title === controlledEventTitle);
    if (!controlledEvent) {
      return {
        reset: false,
        reason: "controlled_event_missing",
        careCaseId: careCase._id,
        restoredPendingContactIds: [],
        cancelledDryRunAttemptIds: [],
        clearedContactReplyIds: [],
      };
    }

    const controlledContactKeys = args.controlledContactKeys ?? ["jim", "jennifer"];
    const controlledContacts = controlledContactKeys
      .map((key) => {
        const fixture = fixtureForKey(key);
        return fixture ? contactByName(contacts, fixture.name) : undefined;
      })
      .filter((contact): contact is Doc<"careContacts"> => Boolean(contact));
    if (controlledContacts.length !== controlledContactKeys.length) {
      return {
        reset: false,
        reason: "controlled_contacts_missing",
        careCaseId: careCase._id,
        controlledEventId: controlledEvent._id,
        restoredPendingContactIds: controlledContacts.map((contact) => contact._id),
        cancelledDryRunAttemptIds: [],
        clearedContactReplyIds: [],
      };
    }

    const now = args.now ?? Date.now();
    const controlledContactIds = controlledContacts.map((contact) => contact._id);
    const controlledContactIdSet = new Set(controlledContactIds);
    const dryRunAttempts = outreachAttempts.filter((attempt) =>
      attempt.coordinationEventId === controlledEvent._id &&
      controlledContactIdSet.has(attempt.careContactId) &&
      (
        attempt.purpose.startsWith("Dry-run confirmation") ||
        attempt.linqMessageId?.startsWith("dry-run-outreach-") ||
        attempt.messageBody.includes("CareSupport controlled dry run")
      )
    );
    const cancelledDryRunAttemptIds: Array<Id<"outreachAttempts">> = [];
    for (const attempt of dryRunAttempts) {
      await ctx.db.patch(attempt._id, {
        status: "cancelled",
        nextActionAt: undefined,
        failureReason: "dry_run_reset_before_live_test",
        updatedAt: now,
      });
      cancelledDryRunAttemptIds.push(attempt._id);
    }

    const dryRunAttemptIdSet = new Set(dryRunAttempts.map((attempt) => attempt._id));
    const dryRunMessageIds = new Set(
      messages
        .filter((message) =>
          (message.outreachAttemptId && dryRunAttemptIdSet.has(message.outreachAttemptId)) ||
          message.linqMessageId?.startsWith("dry-run-status-") ||
          message.body.startsWith("CareSupport dry-run update:") ||
          message.body.includes("controlled dry-run")
        )
        .map((message) => message._id),
    );

    const pendingWithoutControlled = (controlledEvent.pendingContactIds ?? []).filter(
      (id) => !controlledContactIdSet.has(id),
    );
    const confirmedWithoutControlled = (controlledEvent.confirmedContactIds ?? []).filter(
      (id) => !controlledContactIdSet.has(id),
    );
    const declinedWithoutControlled = (controlledEvent.declinedContactIds ?? []).filter(
      (id) => !controlledContactIdSet.has(id),
    );
    await ctx.db.patch(controlledEvent._id, {
      status: "waiting",
      pendingContactIds: [...pendingWithoutControlled, ...controlledContactIds],
      confirmedContactIds: confirmedWithoutControlled,
      declinedContactIds: declinedWithoutControlled,
      nextActionAt: undefined,
      lastReplyContactId: controlledEvent.lastReplyContactId &&
        controlledContactIdSet.has(controlledEvent.lastReplyContactId)
        ? undefined
        : controlledEvent.lastReplyContactId,
      lastReplyMessageId: controlledEvent.lastReplyMessageId &&
        dryRunMessageIds.has(controlledEvent.lastReplyMessageId)
        ? undefined
        : controlledEvent.lastReplyMessageId,
      lastReplyStatus: controlledEvent.lastReplyContactId &&
        controlledContactIdSet.has(controlledEvent.lastReplyContactId)
        ? undefined
        : controlledEvent.lastReplyStatus,
      lastReplyAt: controlledEvent.lastReplyContactId &&
        controlledContactIdSet.has(controlledEvent.lastReplyContactId)
        ? undefined
        : controlledEvent.lastReplyAt,
      updatedAt: now,
    });

    const clearedContactReplyIds: Array<Id<"careContacts">> = [];
    for (const contact of controlledContacts) {
      if (contact.lastReplyMessageId && dryRunMessageIds.has(contact.lastReplyMessageId)) {
        await ctx.db.patch(contact._id, {
          lastReplyStatus: undefined,
          lastReplyMessageId: undefined,
          lastReplyAt: undefined,
          updatedAt: now,
        });
        clearedContactReplyIds.push(contact._id);
      }
    }

    return {
      reset: true,
      careCaseId: careCase._id,
      controlledEventId: controlledEvent._id,
      restoredPendingContactIds: controlledContactIds,
      cancelledDryRunAttemptIds,
      clearedContactReplyIds,
    };
  },
});

const USER_CASCADE_BATCH = 1000;

const USER_CASCADE_TABLES = [
  "messages",
  "medications",
  "scheduleItems",
  "memoryEntries",
  "careClaims",
  "careContacts",
  "coordinationEvents",
  "outreachAttempts",
  "auditLogs",
] as const;

export const deleteUserCascadeBatch = internalMutation({
  args: { phone: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ done: boolean; deleted: Record<string, number> }> => {
    const deleted: Record<string, number> = {};
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
    if (!user) return { done: true, deleted };

    let budget = USER_CASCADE_BATCH;
    const careCaseId = user.careCaseId;
    if (careCaseId) {
      for (const table of USER_CASCADE_TABLES) {
        if (budget <= 0) return { done: false, deleted };
        const rows = await ctx.db
          .query(table)
          .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
          .take(budget);
        for (const row of rows) {
          await ctx.db.delete(row._id);
        }
        if (rows.length > 0) deleted[table] = rows.length;
        budget -= rows.length;
      }
      if (budget <= 0) return { done: false, deleted };
    }

    const accounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_provider", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of accounts) {
      await ctx.db.delete(row._id);
    }
    if (accounts.length > 0) deleted.connectedAccounts = accounts.length;

    const strangers = await ctx.db
      .query("strangers")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();
    for (const row of strangers) {
      await ctx.db.delete(row._id);
    }
    if (strangers.length > 0) deleted.strangers = strangers.length;

    const signups = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();
    for (const row of signups) {
      await ctx.db.delete(row._id);
    }
    if (signups.length > 0) deleted.waitlistSignups = signups.length;

    if (careCaseId) {
      const careCase = await ctx.db.get(careCaseId);
      if (careCase) {
        await ctx.db.delete(careCaseId);
        deleted.careCases = 1;
      }
    }
    await ctx.db.delete(user._id);
    deleted.users = 1;
    return { done: true, deleted };
  },
});

/**
 * Full account reset by phone: user, care case, every case-scoped record,
 * connected accounts, stranger/doorman state, and waitlist signups. Batched
 * so months of messages don't blow the per-transaction write limit. Built
 * for founder full-cycle testing; back up first — this is irreversible.
 */
export const resetUserByPhone = internalAction({
  args: { phone: v.string(), confirm: v.literal("DELETE") },
  handler: async (
    ctx,
    args,
  ): Promise<{ passes: number; deleted: Record<string, number> }> => {
    const totals: Record<string, number> = {};
    let passes = 0;
    for (;;) {
      passes += 1;
      const result: { done: boolean; deleted: Record<string, number> } =
        await ctx.runMutation(internal.admin.deleteUserCascadeBatch, {
          phone: args.phone,
        });
      for (const [table, count] of Object.entries(result.deleted)) {
        totals[table] = (totals[table] ?? 0) + count;
      }
      if (result.done) return { passes, deleted: totals };
      if (passes > 100) {
        throw new Error("deleteUserCascadeBatch did not converge");
      }
    }
  },
});

export const clearAppData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "messages",
      "medications",
      "scheduleItems",
      "memoryEntries",
      "coordinationEvents",
      "careContacts",
      "auditLogs",
      "users",
      "careCases",
    ] as const;

    const deleted: Record<string, number> = {};

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      deleted[table] = rows.length;
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    return deleted;
  },
});

export const tableCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "careCases",
      "users",
      "messages",
      "medications",
      "scheduleItems",
      "memoryEntries",
      "careContacts",
      "coordinationEvents",
      "auditLogs",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      counts[table] = rows.length;
    }
    return counts;
  },
});

export const backfillScheduleDates = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const rows = await ctx.db.query("scheduleItems").collect();

    const report = {
      total: rows.length,
      updated: 0,
      skipped: 0,
      warnings: [] as Array<{ id: string; oldValue: string; reason: string }>,
    };

    for (const row of rows) {
      const result = migrateScheduleRow({
        date: row.date,
        recurrence: row.recurrence,
        notes: row.notes,
        title: row.title,
        _creationTime: row._creationTime,
      });

      if (result.action === "skip") {
        report.skipped += 1;
        continue;
      }

      if (result.action === "warn") {
        report.warnings.push({
          id: row._id,
          oldValue: row.date ?? "",
          reason: result.reason,
        });
        continue;
      }

      report.updated += 1;
      if (!dryRun) {
        await ctx.db.patch(row._id, result.patch);
      }
    }

    return report;
  },
});

export const listActiveCareCasesForDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const careCases = await ctx.db.query("careCases").collect();

    const results: Array<{
      careCaseId: Id<"careCases">;
      timezone: string;
      userId: Id<"users">;
      userName: string;
      chatId: string | null;
    }> = [];

    for (const careCase of careCases) {
      if (careCase.status === "archived") continue;

      const user = await ctx.db
        .query("users")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .first();
      if (!user) continue;
      if (!user.chatId) continue;

      const lastInbound = await ctx.db
        .query("messages")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", careCase._id),
        )
        .order("desc")
        .filter((q) => q.eq(q.field("direction"), "inbound"))
        .first();

      if (!lastInbound || lastInbound.timestamp < fourteenDaysAgo) continue;

      results.push({
        careCaseId: careCase._id,
        timezone: careCase.timezone || "UTC",
        userId: user._id,
        userName: user.name,
        chatId: user.chatId,
      });
    }

    return results;
  },
});

export const getCareCaseDigestData = internalQuery({
  args: {
    careCaseId: v.id("careCases"),
    todayLocalIso: v.string(),
    sinceMs: v.number(),
  },
  handler: async (ctx, args) => {
    const [scheduleItems, recentDigestAudits] = await Promise.all([
      ctx.db
        .query("scheduleItems")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .filter((q) => q.eq(q.field("status"), "scheduled"))
        .collect(),
      ctx.db
        .query("auditLogs")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", args.careCaseId),
        )
        .filter((q) =>
          q.and(
            q.gte(q.field("timestamp"), args.sinceMs),
            q.eq(q.field("event"), "response_sent"),
          ),
        )
        .collect(),
    ]);

    return {
      scheduleItems,
      recentDigestAudits: recentDigestAudits.filter(
        (audit) => audit.details.triggerMessage === "scheduled_digest",
      ),
    };
  },
});

export const getSystemHealth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const recentMessages = await ctx.db
      .query("messages")
      .filter((q) => q.gte(q.field("timestamp"), dayAgo))
      .collect();

    const failures = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), dayAgo),
          q.or(
            q.eq(q.field("event"), "message_failed"),
            q.eq(q.field("event"), "response_blocked"),
          ),
        ),
      )
      .collect();

    return {
      messages24h: recentMessages.length,
      inbound24h: recentMessages.filter((m) => m.direction === "inbound").length,
      outbound24h: recentMessages.filter((m) => m.direction === "outbound").length,
      failures24h: failures.length,
    };
  },
});
