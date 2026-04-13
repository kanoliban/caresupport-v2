import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const listFamilies = internalQuery({
  args: {},
  handler: async (ctx) => {
    const families = await ctx.db.query("families").collect();

    return Promise.all(
      families.map(async (f) => {
        const members = await ctx.db
          .query("members")
          .withIndex("by_family", (q) => q.eq("familyId", f._id))
          .filter((q) => q.eq(q.field("active"), true))
          .collect();

        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_family_timestamp", (q) => q.eq("familyId", f._id))
          .order("desc")
          .first();

        return {
          id: f._id,
          name: f.name,
          status: f.status,
          memberCount: members.length,
          lastMessageAt: lastMessage?.timestamp ?? null,
          createdAt: f.createdAt,
        };
      }),
    );
  },
});

export const getFamilyDetail = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) return null;

    const [members, messages, pendingOutreach] = await Promise.all([
      ctx.db
        .query("members")
        .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_family_timestamp", (q) => q.eq("familyId", args.familyId))
        .order("desc")
        .take(50),
      ctx.db
        .query("outreachThreads")
        .withIndex("by_family_status", (q) =>
          q.eq("familyId", args.familyId).eq("status", "pending"),
        )
        .collect(),
    ]);

    return {
      family,
      members,
      recentMessages: messages.reverse(),
      pendingOutreach,
    };
  },
});

export const getOutreachThreads = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outreachThreads")
      .withIndex("by_family_status", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

// ── Write operations ──

export const patchMember = internalMutation({
  args: {
    memberId: v.id("members"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    accessLevel: v.optional(v.string()),
    relationship: v.optional(v.string()),
    active: v.optional(v.boolean()),
    isCoordinator: v.optional(v.boolean()),
    chatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { memberId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val;
    }
    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(memberId, patch);
  },
});

export const patchFamily = internalMutation({
  args: {
    familyId: v.id("families"),
    name: v.optional(v.string()),
    status: v.optional(v.string()),
    context: v.optional(v.string()),
    productMode: v.optional(v.string()),
    careRecipient: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { familyId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined) patch[k] = val;
    }
    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(familyId, patch);
  },
});

export const closeOutreachThread = internalMutation({
  args: {
    threadId: v.id("outreachThreads"),
    status: v.optional(v.union(v.literal("closed"), v.literal("expired"))),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.threadId, { status: args.status ?? "closed" });
  },
});

export const closeAllPendingThreads = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("outreachThreads")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId).eq("status", "pending"),
      )
      .collect();
    for (const thread of pending) {
      await ctx.db.patch(thread._id, { status: "closed" });
    }
    return pending.length;
  },
});

export const deleteRow = internalMutation({
  args: { table: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id as any);
  },
});

export const stripLegacyFields = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) return;
    const { _id, _creationTime, familyId: _legacySlug, ...clean } = family as any;
    await ctx.db.replace(args.familyId, clean);
  },
});

export const clearAppData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "messages",
      "medications",
      "scheduleItems",
      "approvals",
      "auditLogs",
      "lessons",
      "careTeam",
      "outreachThreads",
      "members",
      "families",
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
      "families", "members", "messages", "medications",
      "scheduleItems", "approvals", "auditLogs", "lessons",
      "careTeam", "outreachThreads",
    ] as const;
    const counts: Record<string, number> = {};
    for (const t of tables) {
      const rows = await ctx.db.query(t).collect();
      counts[t] = rows.length;
    }
    return counts;
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

    const pendingOutreach = await ctx.db
      .query("outreachThreads")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return {
      messages24h: recentMessages.length,
      inbound24h: recentMessages.filter((m) => m.direction === "inbound").length,
      outbound24h: recentMessages.filter((m) => m.direction === "outbound").length,
      failures24h: failures.length,
      pendingOutreach: pendingOutreach.length,
    };
  },
});
