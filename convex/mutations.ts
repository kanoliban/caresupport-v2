import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
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
  v.literal("outreach_requested"),
  v.literal("outreach_approved"),
  v.literal("outreach_blocked"),
  v.literal("outreach_sent"),
  v.literal("outreach_failed"),
  v.literal("care_contact_reply_received"),
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
  outreachAttemptId: v.optional(v.string()),
  coordinationEventId: v.optional(v.string()),
  careContactId: v.optional(v.string()),
  messageBody: v.optional(v.string()),
  status: v.optional(v.string()),
  reason: v.optional(v.string()),
  matchedCount: v.optional(v.number()),
  linqChatId: v.optional(v.string()),
  linqMessageId: v.optional(v.string()),
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

const careContactUpdateValidator = v.object({
  action: modelUpdateActionValidator,
  name: v.optional(v.string()),
  phone: v.optional(v.string()),
  relationship: v.optional(v.string()),
  contactType: v.optional(careContactTypeValidator),
  agencyName: v.optional(v.string()),
  role: v.optional(v.string()),
  availabilityNotes: v.optional(v.string()),
  contactPriority: v.optional(v.number()),
  canReceiveTexts: v.optional(v.boolean()),
  consentToContact: v.optional(v.boolean()),
  active: v.optional(v.boolean()),
  notes: v.optional(v.string()),
});

const coordinationEventUpdateValidator = v.object({
  action: modelUpdateActionValidator,
  title: v.optional(v.string()),
  type: v.optional(coordinationEventTypeValidator),
  status: v.optional(coordinationEventStatusValidator),
  urgency: v.optional(coordinationUrgencyValidator),
  description: v.optional(v.string()),
  startsAt: v.optional(v.number()),
  endsAt: v.optional(v.number()),
  originalAssigneeName: v.optional(v.string()),
  confirmedContactNames: v.optional(v.array(v.string())),
  pendingContactNames: v.optional(v.array(v.string())),
  declinedContactNames: v.optional(v.array(v.string())),
  fallbackContactNames: v.optional(v.array(v.string())),
  nextActionAt: v.optional(v.number()),
  escalationAt: v.optional(v.number()),
  resolution: v.optional(v.string()),
});

type CareContactType =
  | "family"
  | "professional_caregiver"
  | "agency"
  | "clinician"
  | "other";

type CoordinationEventType =
  | "coverage_gap"
  | "schedule_change"
  | "handoff"
  | "task_followup"
  | "appointment"
  | "medication"
  | "outreach"
  | "other";

type CoordinationEventStatus = "open" | "waiting" | "resolved" | "cancelled";
type CoordinationUrgency = "low" | "normal" | "high" | "urgent";

interface CareContactModelPatch {
  name?: string;
  phone?: string;
  relationship?: string;
  contactType?: CareContactType;
  agencyName?: string;
  role?: string;
  availabilityNotes?: string;
  contactPriority?: number;
  canReceiveTexts?: boolean;
  consentToContact?: boolean;
  linqChatId?: string;
  active?: boolean;
  notes?: string;
  updatedAt: number;
}

interface CoordinationEventModelPatch {
  type?: CoordinationEventType;
  title?: string;
  status?: CoordinationEventStatus;
  urgency?: CoordinationUrgency;
  description?: string;
  startsAt?: number;
  endsAt?: number;
  originalAssigneeContactId?: Id<"careContacts">;
  confirmedContactIds?: Array<Id<"careContacts">>;
  pendingContactIds?: Array<Id<"careContacts">>;
  declinedContactIds?: Array<Id<"careContacts">>;
  fallbackOrderContactIds?: Array<Id<"careContacts">>;
  nextActionAt?: number;
  escalationAt?: number;
  resolution?: string;
  closedAt?: number;
  updatedAt: number;
}

export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[^\d+]/g, "");
  const digits = stripped.replace(/\+/g, "");
  if (digits.length < 7) return null;
  if (stripped.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function normalizeOptionalPhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return normalizePhone(raw) ?? undefined;
}

function normalizeLookup(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

async function findCareContactByName(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  name: string | undefined,
): Promise<Doc<"careContacts"> | null> {
  const target = normalizeLookup(name);
  if (!target) return null;

  const contacts = await ctx.db
    .query("careContacts")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
    .collect();

  return contacts.find((contact) => normalizeLookup(contact.name) === target) ?? null;
}

async function findCareContactForModel(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  name: string | undefined,
  phone: string | undefined,
): Promise<Doc<"careContacts"> | null> {
  if (phone) {
    const byPhone = await ctx.db
      .query("careContacts")
      .withIndex("by_care_case_phone", (q) =>
        q.eq("careCaseId", careCaseId).eq("phone", phone),
      )
      .first();
    if (byPhone) return byPhone;
  }

  return await findCareContactByName(ctx, careCaseId, name);
}

async function findCoordinationEventByTitle(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  title: string | undefined,
): Promise<Doc<"coordinationEvents"> | null> {
  const target = normalizeLookup(title);
  if (!target) return null;

  const events = await ctx.db
    .query("coordinationEvents")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
    .collect();

  return events.find((event) => normalizeLookup(event.title) === target) ?? null;
}

async function resolveContactIdByName(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  name: string | undefined,
): Promise<Id<"careContacts"> | undefined> {
  const contact = await findCareContactByName(ctx, careCaseId, name);
  return contact?._id;
}

async function resolveContactIdsByNames(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  names: string[] | undefined,
): Promise<Array<Id<"careContacts">> | undefined> {
  if (names === undefined) return undefined;

  const ids: Array<Id<"careContacts">> = [];
  for (const name of names) {
    const id = await resolveContactIdByName(ctx, careCaseId, name);
    if (id && !ids.includes(id)) ids.push(id);
  }

  return ids;
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
    careContactId: v.optional(v.id("careContacts")),
    coordinationEventId: v.optional(v.id("coordinationEvents")),
    outreachAttemptId: v.optional(v.id("outreachAttempts")),
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
      return;
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
    } else if (args.action === "add") {
      await ctx.db.insert("scheduleItems", {
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
    }
  },
});

export const upsertCareContactFromModel = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    update: careContactUpdateValidator,
  },
  handler: async (ctx, args) => {
    const update = args.update;
    const name = update.name?.trim();
    const phone = normalizeOptionalPhone(update.phone);
    const existing = await findCareContactForModel(
      ctx,
      args.careCaseId,
      name,
      phone,
    );

    if (update.action === "remove") {
      if (!existing) return { action: "skipped", reason: "not_found" };
      await ctx.db.patch(existing._id, {
        active: false,
        updatedAt: Date.now(),
      });
      return { action: "removed", id: existing._id };
    }

    if (existing) {
      const patch: CareContactModelPatch = { updatedAt: Date.now() };
      if (name !== undefined) patch.name = name;
      if (update.phone !== undefined) patch.phone = phone;
      if (update.relationship !== undefined) patch.relationship = update.relationship;
      if (update.contactType !== undefined) patch.contactType = update.contactType;
      if (update.agencyName !== undefined) patch.agencyName = update.agencyName;
      if (update.role !== undefined) patch.role = update.role;
      if (update.availabilityNotes !== undefined) {
        patch.availabilityNotes = update.availabilityNotes;
      }
      if (update.contactPriority !== undefined) {
        patch.contactPriority = update.contactPriority;
      }
      if (update.canReceiveTexts !== undefined) {
        patch.canReceiveTexts = update.canReceiveTexts;
      } else if (update.phone !== undefined) {
        patch.canReceiveTexts = Boolean(phone);
      }
      if (update.consentToContact !== undefined) {
        patch.consentToContact = update.consentToContact;
      }
      if (update.active !== undefined) {
        patch.active = update.active;
      } else if (update.action === "add" && !existing.active) {
        patch.active = true;
      }
      if (update.notes !== undefined) patch.notes = update.notes;

      await ctx.db.patch(existing._id, patch);
      return { action: "updated", id: existing._id };
    }

    if (update.action !== "add" || !name) {
      return { action: "skipped", reason: "missing_contact_identity" };
    }

    const now = Date.now();
    const id = await ctx.db.insert("careContacts", {
      careCaseId: args.careCaseId,
      name,
      phone,
      relationship: update.relationship,
      contactType: update.contactType ?? "other",
      agencyName: update.agencyName,
      role: update.role,
      availabilityNotes: update.availabilityNotes,
      contactPriority: update.contactPriority,
      canReceiveTexts: update.canReceiveTexts ?? Boolean(phone),
      consentToContact: update.consentToContact,
      active: update.active ?? true,
      notes: update.notes,
      createdAt: now,
      updatedAt: now,
    });

    return { action: "created", id };
  },
});

export const upsertCoordinationEventFromModel = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    update: coordinationEventUpdateValidator,
  },
  handler: async (ctx, args) => {
    const update = args.update;
    const title = update.title?.trim();
    const existing = await findCoordinationEventByTitle(
      ctx,
      args.careCaseId,
      title,
    );

    if (update.action === "remove") {
      if (!existing) return { action: "skipped", reason: "not_found" };
      await ctx.db.patch(existing._id, {
        status: "cancelled",
        closedAt: existing.closedAt ?? Date.now(),
        updatedAt: Date.now(),
      });
      return { action: "removed", id: existing._id };
    }

    const originalAssigneeContactId = await resolveContactIdByName(
      ctx,
      args.careCaseId,
      update.originalAssigneeName,
    );
    const confirmedContactIds = await resolveContactIdsByNames(
      ctx,
      args.careCaseId,
      update.confirmedContactNames,
    );
    const pendingContactIds = await resolveContactIdsByNames(
      ctx,
      args.careCaseId,
      update.pendingContactNames,
    );
    const declinedContactIds = await resolveContactIdsByNames(
      ctx,
      args.careCaseId,
      update.declinedContactNames,
    );
    const fallbackOrderContactIds = await resolveContactIdsByNames(
      ctx,
      args.careCaseId,
      update.fallbackContactNames,
    );

    if (existing) {
      const patch: CoordinationEventModelPatch = { updatedAt: Date.now() };
      if (update.type !== undefined) patch.type = update.type;
      if (title !== undefined) patch.title = title;
      if (update.status !== undefined) {
        patch.status = update.status;
        if (
          (update.status === "resolved" || update.status === "cancelled") &&
          existing.closedAt === undefined
        ) {
          patch.closedAt = Date.now();
        }
      }
      if (update.urgency !== undefined) patch.urgency = update.urgency;
      if (update.description !== undefined) patch.description = update.description;
      if (update.startsAt !== undefined) patch.startsAt = update.startsAt;
      if (update.endsAt !== undefined) patch.endsAt = update.endsAt;
      if (originalAssigneeContactId !== undefined) {
        patch.originalAssigneeContactId = originalAssigneeContactId;
      }
      if (confirmedContactIds !== undefined) {
        patch.confirmedContactIds = confirmedContactIds;
      }
      if (pendingContactIds !== undefined) {
        patch.pendingContactIds = pendingContactIds;
      }
      if (declinedContactIds !== undefined) {
        patch.declinedContactIds = declinedContactIds;
      }
      if (fallbackOrderContactIds !== undefined) {
        patch.fallbackOrderContactIds = fallbackOrderContactIds;
      }
      if (update.nextActionAt !== undefined) patch.nextActionAt = update.nextActionAt;
      if (update.escalationAt !== undefined) patch.escalationAt = update.escalationAt;
      if (update.resolution !== undefined) patch.resolution = update.resolution;

      await ctx.db.patch(existing._id, patch);
      return { action: "updated", id: existing._id };
    }

    if (update.action !== "add" || !title) {
      return { action: "skipped", reason: "missing_event_title" };
    }

    const now = Date.now();
    const status = update.status ?? "open";
    const id = await ctx.db.insert("coordinationEvents", {
      careCaseId: args.careCaseId,
      type: update.type ?? "other",
      title,
      status,
      urgency: update.urgency ?? "normal",
      description: update.description,
      startsAt: update.startsAt,
      endsAt: update.endsAt,
      originalAssigneeContactId,
      confirmedContactIds,
      pendingContactIds,
      declinedContactIds,
      fallbackOrderContactIds,
      nextActionAt: update.nextActionAt,
      escalationAt: update.escalationAt,
      resolution: update.resolution,
      createdAt: now,
      updatedAt: now,
      closedAt: status === "resolved" || status === "cancelled" ? now : undefined,
    });

    return { action: "created", id };
  },
});
