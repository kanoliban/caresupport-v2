import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const isGroupChat = internalQuery({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("groupChats")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .unique();
    return existing !== null;
  },
});

export const registerGroupChat = internalMutation({
  args: {
    chatId: v.string(),
    displayName: v.optional(v.string()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("groupChats")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .unique();
    if (existing) return { registered: false };
    await ctx.db.insert("groupChats", {
      chatId: args.chatId,
      displayName: args.displayName,
      detectedAt: Date.now(),
      source: args.source,
    });
    return { registered: true };
  },
});

export const hasRecentFallback = internalQuery({
  args: {
    careCaseId: v.id("careCases"),
    since: v.number(),
    marker: v.string(),
  },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_care_case_timestamp", (q) =>
        q.eq("careCaseId", args.careCaseId).gte("timestamp", args.since),
      )
      .collect();
    return recent.some(
      (m) => m.actorType === "assistant" && m.body.includes(args.marker),
    );
  },
});

export const archiveUsersByChatId = internalMutation({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .collect();
    let archived = 0;
    for (const user of users) {
      await ctx.db.patch(user._id, { status: "archived" });
      const careCase = await ctx.db.get(user.careCaseId);
      if (careCase && careCase.status !== "archived") {
        await ctx.db.patch(user.careCaseId, { status: "archived" });
      }
      archived++;
    }
    return { archived };
  },
});
