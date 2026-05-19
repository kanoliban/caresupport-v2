import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const typeValidator = v.union(
  v.literal("coverage_gap"),
  v.literal("schedule_change"),
  v.literal("handoff"),
  v.literal("task_followup"),
  v.literal("appointment"),
  v.literal("medication"),
  v.literal("outreach"),
  v.literal("other"),
);

const statusValidator = v.union(
  v.literal("open"),
  v.literal("waiting"),
  v.literal("resolved"),
  v.literal("cancelled"),
);

const urgencyValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);

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

interface CoordinationEventPatch {
  type?: CoordinationEventType;
  title?: string;
  status?: CoordinationEventStatus;
  urgency?: CoordinationUrgency;
  description?: string;
  startsAt?: number;
  endsAt?: number;
  scheduleItemId?: Id<"scheduleItems">;
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

const contactIdArrayValidator = v.array(v.id("careContacts"));

async function assertContactBelongsToCareCase(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  contactId: Id<"careContacts"> | undefined,
) {
  if (!contactId) return;
  const contact = await ctx.db.get(contactId);
  if (!contact || contact.careCaseId !== careCaseId) {
    throw new Error("Coordination event contact does not belong to care case");
  }
}

async function assertContactsBelongToCareCase(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  contactIds: Array<Id<"careContacts">> | undefined,
) {
  if (!contactIds) return;
  for (const contactId of contactIds) {
    await assertContactBelongsToCareCase(ctx, careCaseId, contactId);
  }
}

async function assertScheduleItemBelongsToCareCase(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  scheduleItemId: Id<"scheduleItems"> | undefined,
) {
  if (!scheduleItemId) return;
  const scheduleItem = await ctx.db.get(scheduleItemId);
  if (!scheduleItem || scheduleItem.careCaseId !== careCaseId) {
    throw new Error("Coordination event schedule item does not belong to care case");
  }
}

async function validateScopedRefs(
  ctx: Pick<MutationCtx, "db">,
  args: {
    careCaseId: Id<"careCases">;
    scheduleItemId?: Id<"scheduleItems">;
    originalAssigneeContactId?: Id<"careContacts">;
    confirmedContactIds?: Array<Id<"careContacts">>;
    pendingContactIds?: Array<Id<"careContacts">>;
    declinedContactIds?: Array<Id<"careContacts">>;
    fallbackOrderContactIds?: Array<Id<"careContacts">>;
  },
) {
  await assertScheduleItemBelongsToCareCase(ctx, args.careCaseId, args.scheduleItemId);
  await assertContactBelongsToCareCase(
    ctx,
    args.careCaseId,
    args.originalAssigneeContactId,
  );
  await assertContactsBelongToCareCase(ctx, args.careCaseId, args.confirmedContactIds);
  await assertContactsBelongToCareCase(ctx, args.careCaseId, args.pendingContactIds);
  await assertContactsBelongToCareCase(ctx, args.careCaseId, args.declinedContactIds);
  await assertContactsBelongToCareCase(ctx, args.careCaseId, args.fallbackOrderContactIds);
}

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("coordinationEvents")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const listOpenByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    const [open, waiting] = await Promise.all([
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

    return [...open, ...waiting];
  },
});

export const get = query({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("coordinationEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event || event.careCaseId !== args.careCaseId) return null;
    return event;
  },
});

export const create = mutation({
  args: {
    careCaseId: v.id("careCases"),
    type: typeValidator,
    title: v.string(),
    status: v.optional(statusValidator),
    urgency: v.optional(urgencyValidator),
    description: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    scheduleItemId: v.optional(v.id("scheduleItems")),
    originalAssigneeContactId: v.optional(v.id("careContacts")),
    confirmedContactIds: v.optional(contactIdArrayValidator),
    pendingContactIds: v.optional(contactIdArrayValidator),
    declinedContactIds: v.optional(contactIdArrayValidator),
    fallbackOrderContactIds: v.optional(contactIdArrayValidator),
    nextActionAt: v.optional(v.number()),
    escalationAt: v.optional(v.number()),
    resolution: v.optional(v.string()),
    createdByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await validateScopedRefs(ctx, args);

    const now = Date.now();
    const status = args.status ?? "open";
    return await ctx.db.insert("coordinationEvents", {
      careCaseId: args.careCaseId,
      type: args.type,
      title: args.title,
      status,
      urgency: args.urgency ?? "normal",
      description: args.description,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      scheduleItemId: args.scheduleItemId,
      originalAssigneeContactId: args.originalAssigneeContactId,
      confirmedContactIds: args.confirmedContactIds,
      pendingContactIds: args.pendingContactIds,
      declinedContactIds: args.declinedContactIds,
      fallbackOrderContactIds: args.fallbackOrderContactIds,
      nextActionAt: args.nextActionAt,
      escalationAt: args.escalationAt,
      resolution: args.resolution,
      createdByUserId: args.createdByUserId,
      createdAt: now,
      updatedAt: now,
      closedAt: status === "resolved" || status === "cancelled" ? now : undefined,
    });
  },
});

export const update = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("coordinationEvents"),
    type: v.optional(typeValidator),
    title: v.optional(v.string()),
    status: v.optional(statusValidator),
    urgency: v.optional(urgencyValidator),
    description: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    scheduleItemId: v.optional(v.id("scheduleItems")),
    originalAssigneeContactId: v.optional(v.id("careContacts")),
    confirmedContactIds: v.optional(contactIdArrayValidator),
    pendingContactIds: v.optional(contactIdArrayValidator),
    declinedContactIds: v.optional(contactIdArrayValidator),
    fallbackOrderContactIds: v.optional(contactIdArrayValidator),
    nextActionAt: v.optional(v.number()),
    escalationAt: v.optional(v.number()),
    resolution: v.optional(v.string()),
    closedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event || event.careCaseId !== args.careCaseId) {
      throw new Error("Coordination event not found for care case");
    }

    await validateScopedRefs(ctx, args);

    const patch: CoordinationEventPatch = { updatedAt: Date.now() };
    if (args.type !== undefined) patch.type = args.type;
    if (args.title !== undefined) patch.title = args.title;
    if (args.status !== undefined) {
      patch.status = args.status;
      if (
        (args.status === "resolved" || args.status === "cancelled") &&
        event.closedAt === undefined &&
        args.closedAt === undefined
      ) {
        patch.closedAt = Date.now();
      }
    }
    if (args.urgency !== undefined) patch.urgency = args.urgency;
    if (args.description !== undefined) patch.description = args.description;
    if (args.startsAt !== undefined) patch.startsAt = args.startsAt;
    if (args.endsAt !== undefined) patch.endsAt = args.endsAt;
    if (args.scheduleItemId !== undefined) patch.scheduleItemId = args.scheduleItemId;
    if (args.originalAssigneeContactId !== undefined) {
      patch.originalAssigneeContactId = args.originalAssigneeContactId;
    }
    if (args.confirmedContactIds !== undefined) {
      patch.confirmedContactIds = args.confirmedContactIds;
    }
    if (args.pendingContactIds !== undefined) patch.pendingContactIds = args.pendingContactIds;
    if (args.declinedContactIds !== undefined) {
      patch.declinedContactIds = args.declinedContactIds;
    }
    if (args.fallbackOrderContactIds !== undefined) {
      patch.fallbackOrderContactIds = args.fallbackOrderContactIds;
    }
    if (args.nextActionAt !== undefined) patch.nextActionAt = args.nextActionAt;
    if (args.escalationAt !== undefined) patch.escalationAt = args.escalationAt;
    if (args.resolution !== undefined) patch.resolution = args.resolution;
    if (args.closedAt !== undefined) patch.closedAt = args.closedAt;

    await ctx.db.patch(args.id, patch);
  },
});
