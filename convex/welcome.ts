import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createChat } from "./lib/linqClient";
import { DOORMAN_TRANSCRIPT_CAP } from "./lib/doorman";

/**
 * Welcome outreach: CareSupport texts a web signup who never sent the
 * "Start with a text" message. Founder-triggered per signup — never
 * automatic. The opener is seeded into the stranger transcript so the
 * doorman continues the same conversation when they reply.
 */
export const prepareWelcome = internalMutation({
  args: { email: v.string(), opener: v.string() },
  handler: async (ctx, args): Promise<{ phone: string }> => {
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
