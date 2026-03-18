import { action, internalAction, internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import Stripe from "stripe";
import { v } from "convex/values";
import { sendMessage } from "./lib/linqClient";

const stripeClient = new StripeSubscriptions(components.stripe, {});

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  return new Stripe(key);
}

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

    const stripe = getStripe();

    let customerId: string | undefined = family.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: family.name,
        metadata: { familyId: args.familyId },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.stripe.updateFamilyStripeCustomer, {
        familyId: args.familyId,
        stripeCustomerId: customerId,
      });
    }

    // Expire any existing open checkout sessions for this customer
    const existing = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 10,
    });
    for (const session of existing.data) {
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch {
        // best-effort — session may have already expired
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: args.priceId, quantity: 1 }],
      metadata: { familyId: args.familyId },
      success_url: `${process.env.SITE_URL ?? "https://keen-raccoon-606.convex.site"}/checkout/success`,
      cancel_url: `${process.env.SITE_URL ?? "https://keen-raccoon-606.convex.site"}/checkout/cancel`,
      // Prevent Stripe from retrying failed payments automatically
      subscription_data: {
        metadata: { familyId: args.familyId },
      },
      payment_method_options: {
        card: {
          request_three_d_secure: "automatic",
        },
      },
    });

    return { sessionId: session.id, url: session.url };
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
