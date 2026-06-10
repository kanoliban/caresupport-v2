import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  validateIsoDate,
  validateRecurrence,
  validateTime24h,
} from "./lib/dateValidation";
import {
  buildCareCaseContext,
  buildUserContext,
  normalizeMemoryCategory,
  shouldPersistMemoryUpdate,
  uniqueMemoryUpdates,
} from "./lib/memory";
import { retrieveCareContext } from "./lib/knowledge/retrieveCareContext";

const directionValidator = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

const actorTypeValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

const entityStatusValidator = v.union(
  v.literal("onboarding"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
);

const memoryScopeValidator = v.union(
  v.literal("user"),
  v.literal("care_case"),
);

const memoryCategoryValidator = v.union(
  v.literal("profile"),
  v.literal("communication_preference"),
  v.literal("care_preference"),
  v.literal("care_note"),
  v.literal("lesson"),
);

const eventValidator = v.union(
  v.literal("context_load"),
  v.literal("response_sent"),
  v.literal("response_blocked"),
  v.literal("unknown_user"),
  v.literal("message_failed"),
  v.literal("message_status_update"),
  v.literal("reaction_received"),
  v.literal("participant_changed"),
  v.literal("user_created"),
  v.literal("care_case_created"),
  v.literal("user_profile_updated"),
  v.literal("care_case_updated"),
  v.literal("memory_saved"),
  v.literal("calendar_connected"),
  v.literal("calendar_event_created"),
  v.literal("calendar_event_updated"),
  v.literal("calendar_event_deleted"),
);

const detailsValidator = v.object({
  sectionsLoaded: v.optional(v.array(v.string())),
  triggerMessage: v.optional(v.string()),
  responseLength: v.optional(v.number()),
  leakageCheckPassed: v.optional(v.boolean()),
  leakedCategories: v.optional(v.array(v.string())),
  leakedTerms: v.optional(v.array(v.string())),
  severity: v.optional(v.string()),
  recipientPhone: v.optional(v.string()),
  sourceMessageId: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  deliveryStatus: v.optional(v.string()),
  reactionType: v.optional(v.string()),
  participantAction: v.optional(v.string()),
  participantPhone: v.optional(v.string()),
  savedCategories: v.optional(v.array(v.string())),
  calendarEventId: v.optional(v.string()),
});

const scheduleTypeValidator = v.union(
  v.literal("appointment"),
  v.literal("task"),
  v.literal("reminder"),
);

const scheduleStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("active"),
);

const medicationStatusValidator = v.union(
  v.literal("active"),
  v.literal("held"),
  v.literal("tapering"),
  v.literal("discontinued"),
);

const retrievalPurposeValidator = v.union(
  v.literal("prompt_context"),
  v.literal("clarification"),
  v.literal("coordination"),
  v.literal("summary"),
  v.literal("reference"),
);

const modelUpdateActionValidator = v.union(
  v.literal("add"),
  v.literal("update"),
  v.literal("remove"),
);

const careContactTypeValidator = v.union(
  v.literal("family"),
  v.literal("professional_caregiver"),
  v.literal("agency"),
  v.literal("clinician"),
  v.literal("other"),
);

const coordinationEventTypeValidator = v.union(
  v.literal("coverage_gap"),
  v.literal("schedule_change"),
  v.literal("handoff"),
  v.literal("task_followup"),
  v.literal("appointment"),
  v.literal("medication"),
  v.literal("outreach"),
  v.literal("other"),
);

const coordinationEventStatusValidator = v.union(
  v.literal("open"),
  v.literal("waiting"),
  v.literal("resolved"),
  v.literal("cancelled"),
);

const coordinationUrgencyValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);

const memoryUpdateValidator = v.object({
  category: memoryCategoryValidator,
  content: v.string(),
  source: v.optional(v.string()),
});

// Backwards-compatible alias. Phone *and* email handles are accepted; the name
// is retained until the schema-wide `phone` → `handle` rename lands.
export function normalizePhone(raw: string): string | null {
  return normalizeHandle(raw);
}

export const createOnboardingUserAndCareCase = internalMutation({
  args: {
    phone: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    if (!phone) {
      throw new Error(`Cannot normalize phone: ${args.phone}`);
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existing) {
      throw new Error(`Phone ${phone} already belongs to a user`);
    }

    const now = Date.now();
    const careCaseId = await ctx.db.insert("careCases", {
      title: "New Care Plan",
      status: "onboarding",
      timezone: "America/Chicago",
      createdAt: now,
      updatedAt: now,
    });

    const userId = await ctx.db.insert("users", {
      phone,
      name: "New User",
      careCaseId,
      status: "onboarding",
      chatId: args.chatId,
      createdAt: now,
      updatedAt: now,
    });

    return { userId, careCaseId };
  },
});

export const getUserByPhone = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const normalized = normalizePhone(args.phone) ?? args.phone;
    return await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .first();
  },
});

export const getUserById = internalMutation({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Used by the OAuth callback where the state is a raw string, not a typed Id
export const getUserByRawId = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, args): Promise<{ _id: import("./_generated/dataModel").Id<"users">; phone: string; chatId?: string; name: string } | null> => {
    try {
      const doc = await ctx.db.get(args.id as import("./_generated/dataModel").Id<"users">);
      if (!doc || !("phone" in doc)) return null;
      return doc as never;
    } catch {
      return null;
    }
  },
});

export const getUserByCareCase = internalMutation({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .first();
  },
});

export const updateUserChatId = internalMutation({
  args: {
    userId: v.id("users"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      chatId: args.chatId,
      updatedAt: Date.now(),
    });
  },
});

export const updateUserProfile = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    relationshipToRecipient: v.optional(v.string()),
    status: v.optional(entityStatusValidator),
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== "") patch[key] = value;
    }
    await ctx.db.patch(userId, patch);
  },
});

export const updateCareCaseProfile = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    title: v.optional(v.string()),
    careRecipientName: v.optional(v.string()),
    relationshipToRecipient: v.optional(v.string()),
    timezone: v.optional(v.string()),
    timezoneConfirmed: v.optional(v.boolean()),
    status: v.optional(entityStatusValidator),
  },
  handler: async (ctx, args) => {
    const { careCaseId, ...fields } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== "") patch[key] = value;
    }
    await ctx.db.patch(careCaseId, patch);
  },
});

export const syncCareCaseTitle = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const [careCase, user] = await Promise.all([
      ctx.db.get(args.careCaseId),
      ctx.db.get(args.userId),
    ]);
    if (!careCase || !user) return;

    const recipient = careCase.careRecipientName?.trim();
    const userName = user.name?.trim();
    if (!recipient || !userName || userName === "New User") return;

    await ctx.db.patch(args.careCaseId, {
      title: `${userName} caring for ${recipient}`,
      updatedAt: Date.now(),
    });
  },
});

export const logMessage = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    senderPhone: v.optional(v.string()),
    actorType: actorTypeValidator,
    direction: directionValidator,
    displayName: v.optional(v.string()),
    body: v.string(),
    timestamp: v.number(),
    linqMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});

export const logAudit = internalMutation({
  args: {
    careCaseId: v.optional(v.id("careCases")),
    userId: v.optional(v.id("users")),
    event: eventValidator,
    phone: v.optional(v.string()),
    details: detailsValidator,
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});

export const getCareCaseRecentMessages = internalMutation({
  args: { careCaseId: v.id("careCases"), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_care_case_timestamp", (q) =>
        q.eq("careCaseId", args.careCaseId),
      )
      .order("desc")
      .take(args.limit);
  },
});

export const getMessageByLinqId = internalMutation({
  args: { linqMessageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_linq_message_id", (q) =>
        q.eq("linqMessageId", args.linqMessageId),
      )
      .first();
  },
});

export const updateMessageLinqId = internalMutation({
  args: {
    messageId: v.id("messages"),
    linqMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { linqMessageId: args.linqMessageId });
  },
});

export const updateMessageStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    deliveryStatus: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { messageId, ...patch } = args;
    await ctx.db.patch(messageId, patch);
  },
});

export const upsertMemoryEntries = internalMutation({
  args: {
    userId: v.id("users"),
    careCaseId: v.id("careCases"),
    scope: memoryScopeValidator,
    updates: v.array(memoryUpdateValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates = uniqueMemoryUpdates(args.updates);
    const savedCategories = new Set<string>();
    const activeEntries = await ctx.db
      .query("memoryEntries")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("scope"), args.scope),
          q.eq(q.field("active"), true),
        ),
      )
      .collect();
    const acceptedEntries = activeEntries.map((entry) => ({
      scope: entry.scope,
      category: entry.category,
      content: entry.content,
      active: entry.active,
    }));

    for (const update of updates) {
      if (!shouldPersistMemoryUpdate(update, acceptedEntries)) {
        continue;
      }

      await ctx.db.insert("memoryEntries", {
        careCaseId: args.careCaseId,
        userId: args.userId,
        scope: args.scope,
        category: update.category,
        content: update.content,
        source: update.source,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      acceptedEntries.push({
        scope: args.scope,
        category: update.category,
        content: update.content,
        active: true,
      });
      savedCategories.add(update.category);
    }

    return { inserted: savedCategories.size, savedCategories: [...savedCategories] };
  },
});

export const getCompiledPromptContext = internalMutation({
  args: {
    userId: v.id("users"),
    careCaseId: v.id("careCases"),
  },
  handler: async (ctx, args) => {
    const [
      user,
      careCase,
      medications,
      scheduleItems,
      memoryEntries,
      careContacts,
      openCoordinationEvents,
      waitingCoordinationEvents,
    ] = await Promise.all([
      ctx.db.get(args.userId),
      ctx.db.get(args.careCaseId),
      ctx.db
        .query("medications")
        .withIndex("by_care_case_status", (q) =>
          q.eq("careCaseId", args.careCaseId).eq("status", "active"),
        )
        .collect(),
      ctx.db
        .query("scheduleItems")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect(),
      ctx.db
        .query("memoryEntries")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .filter((q) => q.eq(q.field("active"), true))
        .collect(),
      ctx.db
        .query("careContacts")
        .withIndex("by_care_case_active", (q) =>
          q.eq("careCaseId", args.careCaseId).eq("active", true),
        )
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case_status", (q) =>
          q.eq("careCaseId", args.careCaseId).eq("status", "open"),
        )
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case_status", (q) =>
          q.eq("careCaseId", args.careCaseId).eq("status", "waiting"),
        )
        .collect(),
    ]);

    if (!user || !careCase) {
      return null;
    }

    const userMemory = buildUserContext(user, memoryEntries);
    const careCaseContext = buildCareCaseContext(
      careCase,
      medications,
      scheduleItems,
      memoryEntries,
      careContacts,
      [...openCoordinationEvents, ...waitingCoordinationEvents],
    );

    return {
      user,
      careCase,
      userContext: userMemory,
      careCaseContext: careCaseContext.text,
      contextSections: careCaseContext.sections,
      lessons: careCaseContext.lessons,
    };
  },
});

export const retrieveStructuredCareContext = internalMutation({
  args: {
    userId: v.id("users"),
    careCaseId: v.id("careCases"),
    query: v.optional(v.string()),
    purpose: v.optional(retrievalPurposeValidator),
    includeUnresolvedClaims: v.optional(v.boolean()),
    includeResolvedHistory: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await retrieveCareContext(ctx, args);
  },
});

export const upsertMedication = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    action: v.union(v.literal("add"), v.literal("update"), v.literal("remove")),
    name: v.string(),
    dose: v.optional(v.string()),
    schedule: v.optional(v.string()),
    prescriber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("medications")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (args.action === "remove" && existing) {
      await ctx.db.patch(existing._id, { status: "discontinued" });
      return;
    }

    if (existing) {
      const patch: Record<string, string> = {};
      if (args.dose) patch.dose = args.dose;
      if (args.schedule) patch.schedule = args.schedule;
      if (args.prescriber) patch.prescriber = args.prescriber;
      if (args.notes) patch.notes = args.notes;
      await ctx.db.patch(existing._id, patch);
    } else if (args.action === "add") {
      await ctx.db.insert("medications", {
        careCaseId: args.careCaseId,
        name: args.name,
        dose: args.dose ?? "",
        schedule: args.schedule ?? "",
        prescriber: args.prescriber,
        notes: args.notes,
        status: "active",
      });
    }
  },
});

export const upsertScheduleItem = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    action: v.union(v.literal("add"), v.literal("update"), v.literal("remove")),
    type: scheduleTypeValidator,
    title: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    endTime: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const date = validateIsoDate(args.date);
    const time = validateTime24h(args.time);
    const endTime = validateTime24h(args.endTime);
    const recurrence = validateRecurrence(args.recurrence);

    const existing = await ctx.db
      .query("scheduleItems")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();

    if (args.action === "remove" && existing) {
      await ctx.db.patch(existing._id, { status: "cancelled" });
      return null;
    }

    if (existing) {
      const patch: Record<string, string> = {};
      if (date) patch.date = date;
      if (time) patch.time = time;
      if (endTime) patch.endTime = endTime;
      if (recurrence) patch.recurrence = recurrence;
      if (args.location) patch.location = args.location;
      if (args.notes) patch.notes = args.notes;
      if (args.provider) patch.provider = args.provider;
      await ctx.db.patch(existing._id, patch);
      // Returning the id + resolved start lets the caller (handler) schedule a
      // pre-event reminder. We re-validate at fire time, so no need to cancel
      // the prior job on reschedule.
      return { scheduleItemId: existing._id, date, time };
    } else if (args.action === "add") {
      const scheduleItemId = await ctx.db.insert("scheduleItems", {
        careCaseId: args.careCaseId,
        type: args.type,
        title: args.title,
        date,
        time,
        endTime,
        recurrence,
        location: args.location,
        notes: args.notes,
        provider: args.provider,
        status: "scheduled",
      });
      return { scheduleItemId, date, time };
    }
    return null;
  },
});

/**
 * Snapshot a schedule item plus its care-case timezone, for a pre-event
 * reminder to re-validate against just before it fires.
 */
export const getScheduleItemForReminder = internalQuery({
  args: { scheduleItemId: v.id("scheduleItems") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.scheduleItemId);
    if (!item) return null;
    const careCase = await ctx.db.get(item.careCaseId);
    return { item, timezone: careCase?.timezone ?? "UTC" };
  },
});

export const saveConnectedAccount = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scope: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken ?? existing.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scope: args.scope,
        updatedAt: now,
      });
      return existing._id;
    }
    return ctx.db.insert("connectedAccounts", {
      userId: args.userId,
      provider: args.provider,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      scope: args.scope,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getConnectedAccount = internalMutation({
  args: { userId: v.id("users"), provider: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
  },
});

export const updateConnectedAccountTokens = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    accessToken: v.string(),
    tokenExpiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider),
      )
      .first();
    if (account) {
      await ctx.db.patch(account._id, {
        accessToken: args.accessToken,
        tokenExpiresAt: args.tokenExpiresAt,
        updatedAt: Date.now(),
      });
    }
  },
});
