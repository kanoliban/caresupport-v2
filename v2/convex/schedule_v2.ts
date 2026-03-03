import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const upsertScheduleItem = mutation({
  args: {
    familyId: v.string(),
    itemId: v.optional(v.string()),
    title: v.string(),
    startsAt: v.string(),
    endsAt: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    assignedMemberId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("cancelled")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const itemId = args.itemId ?? uniqueId("schedule");
    const existing = await ctx.db
      .query("scheduleItems")
      .withIndex("by_family_item", (q) => q.eq("familyId", args.familyId).eq("itemId", itemId))
      .first();

    const doc = {
      familyId: args.familyId,
      itemId,
      title: args.title,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      recurrence: args.recurrence,
      assignedMemberId: args.assignedMemberId,
      status: args.status,
      notes: args.notes,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("scheduleItems", {
        ...doc,
        createdAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, (internal as any).projections_v2.renderFamilyMarkdownProjectionInternal, {
      familyId: args.familyId,
      renderSource: "upsertScheduleItem",
    });

    return { itemId };
  },
});

export const setScheduleStatus = mutation({
  args: {
    familyId: v.string(),
    itemId: v.string(),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("cancelled")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scheduleItems")
      .withIndex("by_family_item", (q) => q.eq("familyId", args.familyId).eq("itemId", args.itemId))
      .first();
    if (!existing) return { updated: false };
    await ctx.db.patch(existing._id, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });
    await ctx.scheduler.runAfter(0, (internal as any).projections_v2.renderFamilyMarkdownProjectionInternal, {
      familyId: args.familyId,
      renderSource: "setScheduleStatus",
    });
    return { updated: true };
  },
});
