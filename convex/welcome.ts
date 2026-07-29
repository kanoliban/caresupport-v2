import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createChat } from "./lib/linqClient";
import { DOORMAN_TRANSCRIPT_CAP } from "./lib/doorman";

export const AUTO_WELCOME_DELAY_MS = 30 * 60 * 1000;

export function buildWelcomeOpener(fullName?: string): string {
  const first = fullName?.trim().split(/\s+/)[0];
  return `Hi${first ? ` ${first}` : ""} — it's CareSupport. You left your number on caresupport.com, and since that first text never made it my way, I thought I'd reach out myself. Families text me to keep care coordinated — meds, schedules, the handoffs in between. No app, just this thread. What's the care situation you're carrying these days?`;
}

/**
 * Welcome outreach: CareSupport texts a web signup who never sent the
 * "Start with a text" message. Fires automatically ~30 min after signup
 * (autoWelcome, scheduled by waitlist.submitSignup) or founder-triggered
 * with custom copy (sendWelcome). The opener is seeded into the stranger
 * transcript so the doorman continues the same conversation when they reply.
 */
export const prepareWelcome = internalMutation({
  args: { email: v.string(), opener: v.string() },
  handler: async (ctx, args): Promise<{ phone: string }> => {
    // Every guard below throws: callers treat a throw as "do not text this
    // person" — autoWelcome logs and skips, the founder CLI surfaces it.
    const email = args.email.trim().toLowerCase();
    const signup = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!signup) throw new Error(`No signup for ${email}`);
    if (!signup.phone) throw new Error(`Signup ${email} has no phone`);
    if (signup.convertedUserId) throw new Error(`${email} already converted`);
    if (signup.welcomedAt) throw new Error(`${email} already welcomed`);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", signup.phone!))
      .first();
    if (existingUser) throw new Error(`${signup.phone} is already a user`);

    const knownAgent = await ctx.db
      .query("knownAgents")
      .withIndex("by_phone", (q) => q.eq("phone", signup.phone!))
      .unique();
    if (knownAgent) throw new Error(`${signup.phone} is a known agent`);

    const now = Date.now();
    const existingStranger = await ctx.db
      .query("strangers")
      .withIndex("by_phone", (q) => q.eq("phone", signup.phone!))
      .unique();
    if (existingStranger) {
      const alreadyTexting =
        existingStranger.inboundTimestamps.length > 0 ||
        existingStranger.transcript.some((t) => t.role === "user");
      if (alreadyTexting) {
        throw new Error(`${signup.phone} is already texting with the doorman`);
      }
      await ctx.db.patch(existingStranger._id, {
        transcript: [
          ...existingStranger.transcript,
          { role: "assistant" as const, content: args.opener, at: now },
        ].slice(-DOORMAN_TRANSCRIPT_CAP),
        lastContactAt: now,
      });
    } else {
      await ctx.db.insert("strangers", {
        phone: signup.phone,
        status: "screening",
        transcript: [
          { role: "assistant" as const, content: args.opener, at: now },
        ],
        inboundTimestamps: [],
        repliesToday: 0,
        replyCountResetAt: now,
        firstContactAt: now,
        lastContactAt: now,
      });
    }

    await ctx.db.patch(signup._id, { welcomedAt: now });
    return { phone: signup.phone };
  },
});

export const sendWelcome = internalAction({
  args: { email: v.string(), opener: v.string() },
  handler: async (
    ctx,
    args,
  ): Promise<{ sent: boolean; phone: string; chatId?: string; error?: unknown }> => {
    const token = process.env.LINQ_API_TOKEN;
    const fromPhone = process.env.LINQ_PHONE_NUMBER;
    if (!token || !fromPhone) {
      throw new Error("LINQ_API_TOKEN and LINQ_PHONE_NUMBER are required");
    }

    const { phone } = await ctx.runMutation(internal.welcome.prepareWelcome, {
      email: args.email,
      opener: args.opener,
    });

    const result = await createChat(phone, args.opener, fromPhone, token);
    if (!result.success) {
      console.error("[welcome] createChat failed", {
        phone,
        error: result.error,
      });
      return { sent: false, phone, error: result.error };
    }
    console.log("[welcome] sent welcome outreach", {
      phone,
      chatId: result.chatId,
    });
    return { sent: true, phone, chatId: result.chatId };
  },
});

export const getSignupForWelcome = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ fullName: string | null } | null> => {
    const signup = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) =>
        q.eq("email", args.email.trim().toLowerCase()),
      )
      .unique();
    return signup ? { fullName: signup.fullName ?? null } : null;
  },
});

export const autoWelcome = internalAction({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean; reason?: string }> => {
    if (process.env.DOORMAN_ENABLED !== "true") {
      return { sent: false, reason: "doorman_disabled" };
    }
    const token = process.env.LINQ_API_TOKEN;
    const fromPhone = process.env.LINQ_PHONE_NUMBER;
    if (!token || !fromPhone) {
      return { sent: false, reason: "env_missing" };
    }

    const signup = await ctx.runQuery(internal.welcome.getSignupForWelcome, {
      email: args.email,
    });
    if (!signup) return { sent: false, reason: "no_signup" };
    const opener = buildWelcomeOpener(signup.fullName ?? undefined);

    let phone: string;
    try {
      const prepared = await ctx.runMutation(internal.welcome.prepareWelcome, {
        email: args.email,
        opener,
      });
      phone = prepared.phone;
    } catch (error) {
      console.log("[welcome] auto-welcome skipped", {
        email: args.email,
        reason: String(error).slice(0, 120),
      });
      return { sent: false, reason: "guard" };
    }

    const result = await createChat(phone, opener, fromPhone, token);
    if (!result.success) {
      console.error("[welcome] auto-welcome createChat failed", {
        phone,
        error: result.error,
      });
      return { sent: false, reason: "delivery_failed" };
    }
    console.log("[welcome] auto-welcome sent", {
      phone,
      chatId: result.chatId,
    });
    return { sent: true };
  },
});
