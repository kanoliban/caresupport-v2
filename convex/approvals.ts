import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("expired"),
);

const updateValidator = v.object({
  section: v.string(),
  operation: v.string(),
  content: v.string(),
  oldContent: v.string(),
});

export const listPendingByFamily = query({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvals")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId).eq("status", "pending"),
      )
      .collect();
  },
});

export const listByFamily = query({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvals")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId),
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    familyId: v.string(),
    status: statusValidator,
    requesterPhone: v.string(),
    requesterName: v.string(),
    approverPhones: v.array(v.string()),
    description: v.string(),
    update: updateValidator,
    createdAt: v.number(),
    expiresAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("approvals", args);
  },
});

export const resolve = mutation({
  args: {
    id: v.id("approvals"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    resolvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const approval = await ctx.db.get(args.id);
    if (!approval) return { action: "not_found" as const };
    if (approval.status !== "pending") {
      return { action: "already_resolved" as const };
    }
    if (Date.now() > approval.expiresAt) {
      await ctx.db.patch(args.id, { status: "expired" });
      return { action: "expired" as const };
    }
    if (!approval.approverPhones.includes(args.resolvedBy)) {
      return { action: "unauthorized" as const };
    }
    await ctx.db.patch(args.id, {
      status: args.status,
      resolvedAt: Date.now(),
      resolvedBy: args.resolvedBy,
    });
    return { action: args.status };
  },
});

export const expireStale = mutation({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("approvals")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId).eq("status", "pending"),
      )
      .collect();
    const now = Date.now();
    let expired = 0;
    for (const approval of pending) {
      if (now > approval.expiresAt) {
        await ctx.db.patch(approval._id, { status: "expired" });
        expired++;
      }
    }
    return { expired };
  },
});
