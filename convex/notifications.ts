/**
 * Durable notification state: suppressions ("stop texting me") and delivery
 * claims (at-most-once + content-change detection).
 *
 * Every scheduled sender must read suppression state before sending and claim a
 * dedupe key before sending. Neither the model nor a prompt is in that path.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

const notificationChannel = v.union(
  v.literal("all"),
  v.literal("daily_digest"),
  v.literal("schedule_reminder"),
  v.literal("coordination_status"),
);

export interface SuppressionState {
  suppressed: boolean;
  channel?: string;
  suppressedAt?: number;
  scopeHint?: string;
}

async function activeSuppressions(
  ctx: Pick<QueryCtx, "db">,
  careCaseId: Id<"careCases">,
): Promise<Doc<"notificationSuppressions">[]> {
  return await ctx.db
    .query("notificationSuppressions")
    .withIndex("by_care_case_active", (q) =>
      q.eq("careCaseId", careCaseId).eq("active", true),
    )
    .collect();
}

/**
 * True when `channel` is muted for this care case, either directly or by a
 * blanket "all" suppression.
 *
 * Suppression covers scheduled, agent-initiated sends only. Replies to an
 * inbound message are never suppressed — going silent on someone who just
 * texted us would be a worse failure than the one this fixes.
 */
export const getSuppressionState = internalQuery({
  args: {
    careCaseId: v.id("careCases"),
    channel: notificationChannel,
  },
  handler: async (ctx, args): Promise<SuppressionState> => {
    const rows = await activeSuppressions(ctx, args.careCaseId);
    const match = rows.find(
      (row) => row.channel === "all" || row.channel === args.channel,
    );
    if (!match) return { suppressed: false };
    return {
      suppressed: true,
      channel: match.channel,
      suppressedAt: match.suppressedAt,
      scopeHint: match.scopeHint,
    };
  },
});

/**
 * Records an opt-out. Idempotent: a second "stop" refreshes the existing row
 * rather than stacking duplicates.
 */
export const suppressChannel = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    channel: notificationChannel,
    requestText: v.optional(v.string()),
    scopeHint: v.optional(v.string()),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args): Promise<{ suppressionId: Id<"notificationSuppressions">; alreadyActive: boolean }> => {
    const now = Date.now();
    const existing = await ctx.db
      .query("notificationSuppressions")
      .withIndex("by_care_case_channel_active", (q) =>
        q
          .eq("careCaseId", args.careCaseId)
          .eq("channel", args.channel)
          .eq("active", true),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        requestText: args.requestText ?? existing.requestText,
        scopeHint: args.scopeHint ?? existing.scopeHint,
        sourceMessageId: args.sourceMessageId ?? existing.sourceMessageId,
        updatedAt: now,
      });
      return { suppressionId: existing._id, alreadyActive: true };
    }

    const suppressionId = await ctx.db.insert("notificationSuppressions", {
      careCaseId: args.careCaseId,
      userId: args.userId,
      channel: args.channel,
      active: true,
      requestText: args.requestText,
      scopeHint: args.scopeHint,
      sourceMessageId: args.sourceMessageId,
      suppressedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { suppressionId, alreadyActive: false };
  },
});

/** Lifts every active suppression for a care case (the START path). */
export const releaseSuppressions = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args): Promise<{ released: number }> => {
    const now = Date.now();
    const rows = await activeSuppressions(ctx, args.careCaseId);
    for (const row of rows) {
      await ctx.db.patch(row._id, {
        active: false,
        releasedAt: now,
        releasedBySourceMessageId: args.sourceMessageId,
        updatedAt: now,
      });
    }
    return { released: rows.length };
  },
});

export interface DeliveryClaim {
  claimed: boolean;
  reason?: "duplicate_dedupe_key";
  deliveryId?: Id<"notificationDeliveries">;
  contentUnchanged: boolean;
  unchangedStreak: number;
}

/**
 * Reserves the right to send one notification, before it is sent.
 *
 * Claiming first rather than logging afterwards is deliberate: a crash between
 * send and log must not let the same brief go out again. A claim that later
 * fails to send stays claimed for its window — for an SMS channel, at-most-once
 * is the safer bias than at-least-once.
 */
export const claimDelivery = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    channel: notificationChannel,
    dedupeKey: v.string(),
    contentFingerprint: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args): Promise<DeliveryClaim> => {
    const existing = await ctx.db
      .query("notificationDeliveries")
      .withIndex("by_dedupe_key", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
    if (existing) {
      return {
        claimed: false,
        reason: "duplicate_dedupe_key",
        contentUnchanged: existing.contentFingerprint === args.contentFingerprint,
        unchangedStreak: existing.unchangedStreak,
      };
    }

    const previous = await ctx.db
      .query("notificationDeliveries")
      .withIndex("by_care_case_channel", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("channel", args.channel),
      )
      .order("desc")
      .first();

    const contentUnchanged =
      previous?.contentFingerprint === args.contentFingerprint;
    const unchangedStreak = contentUnchanged
      ? (previous?.unchangedStreak ?? 1) + 1
      : 1;

    const deliveryId = await ctx.db.insert("notificationDeliveries", {
      careCaseId: args.careCaseId,
      userId: args.userId,
      channel: args.channel,
      dedupeKey: args.dedupeKey,
      contentFingerprint: args.contentFingerprint,
      unchangedStreak,
      body: args.body,
      status: "claimed",
      claimedAt: Date.now(),
    });

    return { claimed: true, deliveryId, contentUnchanged, unchangedStreak };
  },
});

export const markDeliverySent = internalMutation({
  args: {
    deliveryId: v.id("notificationDeliveries"),
    linqMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.deliveryId, {
      status: "sent",
      linqMessageId: args.linqMessageId,
      sentAt: Date.now(),
    });
  },
});

export const markDeliveryFailed = internalMutation({
  args: {
    deliveryId: v.id("notificationDeliveries"),
    failureReason: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch(args.deliveryId, {
      status: "failed",
      failureReason: args.failureReason.slice(0, 500),
    });
  },
});
