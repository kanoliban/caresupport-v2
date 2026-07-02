import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createChat, sendMessage } from "./lib/linqClient";

const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;

const COOLDOWNS_MS: Record<string, number> = {
  ai_failure: 30 * 60 * 1000,
  user_burst: 60 * 60 * 1000,
  outbound_velocity: 30 * 60 * 1000,
  test: 0,
};

export const claimAlert = internalMutation({
  args: { alertType: v.string(), details: v.string() },
  handler: async (ctx, args) => {
    const cooldown = COOLDOWNS_MS[args.alertType] ?? DEFAULT_COOLDOWN_MS;
    if (cooldown > 0) {
      const since = Date.now() - cooldown;
      const recent = await ctx.db
        .query("sentinelAlerts")
        .withIndex("by_type_time", (q) =>
          q.eq("alertType", args.alertType).gte("firedAt", since),
        )
        .first();
      if (recent) return { claimed: false };
    }
    await ctx.db.insert("sentinelAlerts", {
      alertType: args.alertType,
      firedAt: Date.now(),
      details: args.details.slice(0, 500),
    });
    return { claimed: true };
  },
});

export const sendAlert = internalAction({
  args: { alertType: v.string(), message: v.string() },
  handler: async (ctx, args) => {
    const { claimed } = await ctx.runMutation(internal.sentinel.claimAlert, {
      alertType: args.alertType,
      details: args.message,
    });
    if (!claimed) return { sent: false, reason: "cooldown" };

    const token = process.env.LINQ_API_TOKEN;
    const fromPhone = process.env.LINQ_PHONE_NUMBER;
    const alertPhone = process.env.SENTINEL_ALERT_PHONE;
    if (!token || !alertPhone) {
      console.error("[sentinel] cannot send alert: missing LINQ_API_TOKEN or SENTINEL_ALERT_PHONE");
      return { sent: false, reason: "env_missing" };
    }

    const text = `🚨 CareSupport sentinel — ${args.message}`;

    const founder = await ctx.runMutation(internal.mutations.getUserByPhone, {
      phone: alertPhone,
    });
    if (founder?.chatId) {
      const res = await sendMessage(founder.chatId, text, token);
      if (res.success) return { sent: true, via: "existing_chat" };
      console.error("[sentinel] sendMessage failed, trying createChat", res.error);
    }
    if (fromPhone) {
      const res = await createChat(alertPhone, text, fromPhone, token);
      if (res.success) return { sent: true, via: "new_chat" };
      console.error("[sentinel] createChat failed", res.error);
    }
    return { sent: false, reason: "delivery_failed" };
  },
});

export const checkUserBurst = internalMutation({
  args: {},
  handler: async (ctx) => {
    const WINDOW_MS = 10 * 60 * 1000;
    const THRESHOLD = 3;
    const since = Date.now() - WINDOW_MS;
    const recent = await ctx.db
      .query("users")
      .withIndex("by_created_at", (q) => q.gte("createdAt", since))
      .collect();
    if (recent.length < THRESHOLD) return { fired: false };
    const phones = recent.slice(-4).map((u) => u.phone).join(", ");
    await ctx.scheduler.runAfter(0, internal.sentinel.sendAlert, {
      alertType: "user_burst",
      message: `${recent.length} new users onboarded in 10 min (threshold ${THRESHOLD}). Possible group chat or spam. Recent: ${phones}`,
    });
    return { fired: true };
  },
});
