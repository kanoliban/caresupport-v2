import { action, internalAction, internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { v } from "convex/values";
import { sendMessage } from "./lib/linqClient";

const stripeClient = new StripeSubscriptions(components.stripe, {});

export const createFamilyCheckout = internalAction({
  args: { familyId: v.id("families"), priceId: v.string() },
  returns: v.object({
    sessionId: v.string(),
    url: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args): Promise<{ sessionId: string; url: string | null }> => {
    const family = await ctx.runQuery(internal.queries.getFamily, {
      familyId: args.familyId,
    });
    if (!family) throw new Error("Family not found");

    let customerId: string | undefined = family.stripeCustomerId;
    if (!customerId) {
      const result = await stripeClient.getOrCreateCustomer(ctx, {
        userId: args.familyId,
        name: family.name,
      });
      customerId = result.customerId;
      await ctx.runMutation(internal.stripe.updateFamilyStripeCustomer, {
        familyId: args.familyId,
        stripeCustomerId: customerId,
      });
    }

    return await stripeClient.createCheckoutSession(ctx, {
      priceId: args.priceId,
      customerId,
      mode: "subscription",
      metadata: { familyId: args.familyId },
      successUrl: `${process.env.SITE_URL ?? "https://keen-raccoon-606.convex.site"}/checkout/success`,
      cancelUrl: `${process.env.SITE_URL ?? "https://keen-raccoon-606.convex.site"}/checkout/cancel`,
    });
  },
});

export const cancelSubscription = action({
  args: { subscriptionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await stripeClient.cancelSubscription(ctx, {
      stripeSubscriptionId: args.subscriptionId,
    });
    return null;
  },
});

export const updateFamilyStripeCustomer = internalMutation({
  args: {
    familyId: v.id("families"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.familyId, {
      stripeCustomerId: args.stripeCustomerId,
    });
  },
});

export const sendUpgradeConfirmation = internalAction({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const coordinator = await ctx.runQuery(
      internal.queries.getCoordinatorWithChat,
      { familyId: args.familyId },
    );
    if (!coordinator?.chatId) return;

    const linqApiToken = process.env.LINQ_API_TOKEN ?? "";
    if (!linqApiToken) return;

    const msg =
      "You're on CareSupport Family now! " +
      "Go ahead and add anyone to your care network — just tell me their name and phone number.";
    await sendMessage(coordinator.chatId, msg, linqApiToken);

    await ctx.runMutation(internal.mutations.logMessage, {
      familyId: args.familyId,
      senderPhone: coordinator.phone ?? "",
      direction: "outbound" as const,
      memberName: coordinator.name,
      body: msg,
      timestamp: Date.now(),
    });
  },
});

export const updateFamilyPlan = internalMutation({
  args: {
    familyId: v.id("families"),
    planTier: v.union(v.literal("free"), v.literal("family")),
    stripeSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = { planTier: args.planTier };
    if (args.stripeSubscriptionId !== undefined) {
      patch.stripeSubscriptionId = args.stripeSubscriptionId;
    }
    await ctx.db.patch(args.familyId, patch);
  },
});
