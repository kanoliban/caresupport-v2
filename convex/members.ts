import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const roleValidator = v.union(
  v.literal("primary_caregiver"),
  v.literal("family_caregiver"),
  v.literal("community_supporter"),
  v.literal("provider"),
);

const accessLevelValidator = v.union(
  v.literal("full"),
  v.literal("schedule+meds"),
  v.literal("schedule"),
  v.literal("provider"),
  v.literal("limited"),
);

export const listByFamily = query({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const getByChatId = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .first();
  },
});

export const getByFamilyAndPhone = query({
  args: { familyId: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_family_member", (q) =>
        q.eq("familyId", args.familyId).eq("phone", args.phone),
      )
      .first();
  },
});

export const create = mutation({
  args: {
    familyId: v.string(),
    phone: v.string(),
    name: v.string(),
    role: roleValidator,
    accessLevel: accessLevelValidator,
    active: v.boolean(),
    chatId: v.optional(v.string()),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("members", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("members"),
    name: v.optional(v.string()),
    role: v.optional(roleValidator),
    accessLevel: v.optional(accessLevelValidator),
    active: v.optional(v.boolean()),
    chatId: v.optional(v.string()),
    relationship: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
