import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const roleValidator = v.union(
  v.literal("care_recipient"),
  v.literal("family_caregiver"),
  v.literal("professional_caregiver"),
  v.literal("community_supporter"),
);

const accessLevelValidator = v.union(
  v.literal("full"),
  v.literal("standard"),
  v.literal("view_only"),
);

export const listByFamily = query({
  args: { familyId: v.id("families") },
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

export const getByFamilyAndPhone = query({
  args: { familyId: v.id("families"), phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_family_phone", (q) =>
        q.eq("familyId", args.familyId).eq("phone", args.phone),
      )
      .first();
  },
});

export const create = mutation({
  args: {
    familyId: v.id("families"),
    phone: v.string(),
    name: v.string(),
    role: roleValidator,
    accessLevel: accessLevelValidator,
    isCoordinator: v.boolean(),
    isEmergencyContact: v.boolean(),
    active: v.boolean(),
    context: v.optional(v.string()),
    relationship: v.optional(v.string()),
    chatId: v.optional(v.string()),
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
    isCoordinator: v.optional(v.boolean()),
    isEmergencyContact: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
    context: v.optional(v.string()),
    relationship: v.optional(v.string()),
    chatId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});
