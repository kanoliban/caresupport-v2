import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  DOORMAN_MAX_REPLIES_PER_DAY,
  DOORMAN_TRANSCRIPT_CAP,
  isVelocitySuspicious,
} from "./lib/doorman";

const DAY_MS = 24 * 60 * 60 * 1000;

export const getKnownAgent = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knownAgents")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
  },
});

export const addKnownAgent = internalMutation({
  args: {
    phone: v.string(),
    name: v.optional(v.string()),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("knownAgents")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
    if (existing) return { added: false };
    await ctx.db.insert("knownAgents", {
      phone: args.phone,
      name: args.name,
      source: args.source,
      addedAt: Date.now(),
    });
    return { added: true };
  },
});

/**
 * Record an inbound message from a stranger and return the screening state
 * the doorman needs: the transcript so far, whether the sender's velocity
 * looks automated, and whether the daily reply budget is spent.
 */
export const touchStranger = internalMutation({
  args: {
    phone: v.string(),
    chatId: v.optional(v.string()),
    messageBody: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let stranger = await ctx.db
      .query("strangers")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();

    if (!stranger) {
      const id = await ctx.db.insert("strangers", {
        phone: args.phone,
        chatId: args.chatId,
        status: "screening",
        transcript: [
          { role: "user", content: args.messageBody.slice(0, 1000), at: now },
        ],
        inboundTimestamps: [now],
        repliesToday: 0,
        replyCountResetAt: now,
        firstContactAt: now,
        lastContactAt: now,
      });
      stranger = await ctx.db.get(id);
    } else {
      const inboundTimestamps = [...stranger.inboundTimestamps, now].slice(-10);
      const transcript = [
        ...stranger.transcript,
        { role: "user" as const, content: args.messageBody.slice(0, 1000), at: now },
      ].slice(-DOORMAN_TRANSCRIPT_CAP);
      const resetBudget = now - stranger.replyCountResetAt > DAY_MS;
      await ctx.db.patch(stranger._id, {
        chatId: args.chatId ?? stranger.chatId,
        transcript,
        inboundTimestamps,
        lastContactAt: now,
        ...(resetBudget ? { repliesToday: 0, replyCountResetAt: now } : {}),
      });
      stranger = await ctx.db.get(stranger._id);
    }

    if (!stranger) throw new Error("stranger record vanished");

    const signup = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    return {
      strangerId: stranger._id,
      status: stranger.status,
      transcript: stranger.transcript,
      velocitySuspicious: isVelocitySuspicious(stranger.inboundTimestamps, now),
      budgetExhausted: stranger.repliesToday >= DOORMAN_MAX_REPLIES_PER_DAY,
      signup: signup
        ? {
            fullName: signup.fullName,
            submittedAt: signup.submittedAt,
            source: signup.source,
          }
        : null,
    };
  },
});

export const recordDoormanReply = internalMutation({
  args: {
    strangerId: v.id("strangers"),
    reply: v.string(),
  },
  handler: async (ctx, args) => {
    const stranger = await ctx.db.get(args.strangerId);
    if (!stranger) return;
    await ctx.db.patch(args.strangerId, {
      transcript: [
        ...stranger.transcript,
        { role: "assistant" as const, content: args.reply.slice(0, 1000), at: Date.now() },
      ].slice(-DOORMAN_TRANSCRIPT_CAP),
      repliesToday: stranger.repliesToday + 1,
    });
  },
});

export const recordNudge = internalMutation({
  args: {
    strangerId: v.id("strangers"),
    nudge: v.string(),
  },
  handler: async (ctx, args) => {
    const stranger = await ctx.db.get(args.strangerId);
    if (!stranger) return;
    const now = Date.now();
    await ctx.db.patch(args.strangerId, {
      transcript: [
        ...stranger.transcript,
        { role: "assistant" as const, content: args.nudge.slice(0, 1000), at: now },
      ].slice(-DOORMAN_TRANSCRIPT_CAP),
      repliesToday: stranger.repliesToday + 1,
      nudgedAt: now,
      lastContactAt: now,
    });
  },
});

export const setStrangerStatus = internalMutation({
  args: {
    strangerId: v.id("strangers"),
    // "dismissed" is deliberately absent: the runtime can no longer close the
    // door on a human. Only "agent" ends a conversation.
    status: v.union(
      v.literal("screening"),
      v.literal("graduated"),
      v.literal("flagged"),
      v.literal("agent"),
    ),
    graduatedUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.strangerId, {
      status: args.status,
      ...(args.graduatedUserId ? { graduatedUserId: args.graduatedUserId } : {}),
    });
  },
});
