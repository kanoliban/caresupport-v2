import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getFamily = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.familyId);
  },
});

export const getFamilyMemberCount = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
    return members.length;
  },
});

export const getCoordinatorWithChat = internalQuery({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
    const coordinator = members.find((m) => m.isCoordinator && m.chatId);
    if (!coordinator) return null;
    return { chatId: coordinator.chatId, phone: coordinator.phone, name: coordinator.name };
  },
});

export const getFamilyBySubscription = internalQuery({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const families = await ctx.db.query("families").collect();
    return (
      families.find(
        (f) => f.stripeSubscriptionId === args.stripeSubscriptionId,
      ) ?? null
    );
  },
});
