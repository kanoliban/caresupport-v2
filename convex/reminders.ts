"use node";

import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import {
  composeDigestMessage,
  localDateIso,
  recurrenceMatchesToday,
} from "./lib/digestComposer";
import type { DigestItem } from "./lib/digestComposer";
import { sendMessage, sendMessageSequence, splitIntoBubbles } from "./lib/linqClient";
import { zonedDateTimeToUtcMs } from "./lib/reminderTiming";
import {
  UNCHANGED_STREAK_ALERT_THRESHOLD,
  dailyDigestDedupeKey,
  fingerprintContent,
  scheduleReminderDedupeKey,
} from "./lib/notificationDedupe";
import { isTestChat } from "./handler";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const MOVED_TOLERANCE_MS = 2 * 60 * 1000;

type DigestSkipReason =
  | "no_chat_id"
  | "already_sent_today"
  | "suppressed"
  | "unchanged_content"
  | "dormant"
  | "nothing_to_send";

export interface DigestResult {
  sent: boolean;
  reason?: DigestSkipReason | string;
}

export const sendDailyDigest = internalAction({
  args: {
    careCaseId: v.id("careCases"),
    /**
     * Skip the send when today's brief is byte-identical to the last one.
     *
     * Off by default, and deliberately so: the brief carries medication and
     * appointment reminders whose content is *supposed* to repeat, and a
     * silently dropped insulin reminder reads to the caregiver exactly like a
     * handled one. The unchanged streak is always recorded and audited so the
     * repetition is visible either way — see the open question in the PR.
     */
    suppressUnchanged: v.optional(v.boolean()),
  },
  handler: async (ctx, { careCaseId, suppressUnchanged }): Promise<DigestResult> => {
    const cases = await ctx.runQuery(
      internal.admin.listActiveCareCasesForDigest,
      {},
    );
    const active = cases.find(
      (c: { careCaseId: Id<"careCases"> }) => c.careCaseId === careCaseId,
    );
    if (!active) {
      return { sent: false, reason: "dormant" };
    }

    // Durable opt-out check. This is the gate that was missing: "Stop" used to
    // produce a reply and nothing else, so the next cron sent the same brief.
    const suppression = await ctx.runQuery(
      internal.notifications.getSuppressionState,
      { careCaseId, channel: "daily_digest" },
    );
    if (suppression.suppressed) {
      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId,
        userId: active.userId,
        event: "notification_skipped",
        details: {
          channel: "daily_digest",
          reason: "suppressed",
          triggerMessage: "scheduled_digest",
        },
        timestamp: Date.now(),
      });
      return { sent: false, reason: "suppressed" };
    }

    const now = Date.now();
    const todayLocalIso = localDateIso(now, active.timezone);

    const digestData = await ctx.runQuery(internal.admin.getCareCaseDigestData, {
      careCaseId,
      todayLocalIso,
      sinceMs: now - TWO_DAYS_MS,
    });

    // Cheap pre-filter. The authoritative same-day guard is the delivery claim
    // below; this only avoids composing a brief we already know we sent.
    const alreadySent = digestData.recentDigestAudits.some(
      (audit: Doc<"auditLogs">) =>
        localDateIso(audit.timestamp, active.timezone) === todayLocalIso,
    );
    if (alreadySent) {
      return { sent: false, reason: "already_sent_today" };
    }

    const items: DigestItem[] = digestData.scheduleItems
      .filter((item: Doc<"scheduleItems">) => {
        if (item.date === todayLocalIso) return true;
        if (item.recurrence && recurrenceMatchesToday(item.recurrence, todayLocalIso)) {
          return true;
        }
        return false;
      })
      .map((item: Doc<"scheduleItems">) => ({
        title: item.title,
        time: item.time,
        location: item.location,
        provider: item.provider,
      }));

    if (items.length === 0) {
      return { sent: false, reason: "nothing_to_send" };
    }

    const message = composeDigestMessage({
      userName: active.userName,
      items,
    });

    const linqApiToken = process.env.LINQ_API_TOKEN;
    if (!linqApiToken) {
      throw new Error("LINQ_API_TOKEN is not set");
    }
    if (!active.chatId) {
      return { sent: false, reason: "no_chat_id" };
    }

    // Claim before sending: one brief per care case per local day, and a record
    // of whether the content actually moved since last time.
    const claim = await ctx.runMutation(internal.notifications.claimDelivery, {
      careCaseId,
      userId: active.userId,
      channel: "daily_digest",
      dedupeKey: dailyDigestDedupeKey(careCaseId, todayLocalIso),
      contentFingerprint: fingerprintContent(message),
      body: message,
    });
    if (!claim.claimed || !claim.deliveryId) {
      return { sent: false, reason: "already_sent_today" };
    }

    if (claim.contentUnchanged) {
      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId,
        userId: active.userId,
        event: "notification_unchanged",
        details: {
          channel: "daily_digest",
          contentFingerprint: fingerprintContent(message),
          unchangedStreak: claim.unchangedStreak,
          severity:
            claim.unchangedStreak >= UNCHANGED_STREAK_ALERT_THRESHOLD
              ? "warning"
              : "info",
        },
        timestamp: Date.now(),
      });
    }

    if (suppressUnchanged && claim.contentUnchanged) {
      await ctx.runMutation(internal.notifications.markDeliveryFailed, {
        deliveryId: claim.deliveryId,
        failureReason: "skipped_unchanged_content",
      });
      return { sent: false, reason: "unchanged_content" };
    }

    const bubbles = splitIntoBubbles(message);
    const sendResults = await sendMessageSequence(
      active.chatId,
      bubbles,
      linqApiToken,
    );
    const firstSuccess = sendResults.find(
      (result) => result.success && result.messageId,
    );
    if (!firstSuccess || !firstSuccess.messageId) {
      await ctx.runMutation(internal.notifications.markDeliveryFailed, {
        deliveryId: claim.deliveryId,
        failureReason: "linq_send_failed",
      });
      return { sent: false, reason: "linq_send_failed" };
    }

    await ctx.runMutation(internal.notifications.markDeliverySent, {
      deliveryId: claim.deliveryId,
      linqMessageId: firstSuccess.messageId,
    });

    await logDigestOutbound(ctx, {
      careCaseId,
      userId: active.userId,
      userName: active.userName,
      senderPhone: "",
      body: message,
      now,
      linqMessageId: firstSuccess.messageId,
    });

    return { sent: true };
  },
});

/**
 * Fires a "heads up" text ahead of a (non-calendar) schedule item. Scheduled by
 * the handler via ctx.scheduler.runAt when a timed schedule item is created.
 *
 * Re-validates against the live item at fire time so we don't nag about an event
 * that was since cancelled or rescheduled — this avoids cancel/reschedule of the
 * job when the item changes (same approach as the Google Calendar reminder).
 *
 * Always logs the reminder to the messages table (so the web UI shows it) and
 * additionally pushes over Linq for real iMessage users — never for test chats.
 */
export const sendScheduleItemReminder = internalAction({
  args: {
    scheduleItemId: v.id("scheduleItems"),
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    chatId: v.string(),
    expectedStartMs: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args): Promise<DigestResult> => {
    const snapshot = await ctx.runQuery(
      internal.mutations.getScheduleItemForReminder,
      { scheduleItemId: args.scheduleItemId },
    );
    if (!snapshot) {
      return { sent: false, reason: "item_deleted" };
    }
    const { item, timezone } = snapshot;
    if (item.status === "cancelled") {
      return { sent: false, reason: "item_cancelled" };
    }
    // If the item's start moved, a fresh reminder was scheduled for the new
    // time — let this stale one drop.
    const currentStart = zonedDateTimeToUtcMs(item.date, item.time, timezone);
    if (
      currentStart !== null &&
      Math.abs(currentStart - args.expectedStartMs) > MOVED_TOLERANCE_MS
    ) {
      return { sent: false, reason: "item_moved" };
    }

    const suppression = await ctx.runQuery(
      internal.notifications.getSuppressionState,
      { careCaseId: args.careCaseId, channel: "schedule_reminder" },
    );
    if (suppression.suppressed) {
      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId: args.careCaseId,
        userId: args.userId,
        event: "notification_skipped",
        details: {
          channel: "schedule_reminder",
          reason: "suppressed",
          triggerMessage: "schedule_item_reminder",
        },
        timestamp: Date.now(),
      });
      return { sent: false, reason: "suppressed" };
    }

    const minutes = Math.max(
      1,
      Math.round((args.expectedStartMs - Date.now()) / 60000),
    );
    const when =
      minutes >= 55
        ? "in about an hour"
        : `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
    const body = `Reminder: "${item.title}" starts ${when}. Hope you're ready!`;

    // One reminder per item per scheduled start, however many times the job is
    // queued or replayed.
    const claim = await ctx.runMutation(internal.notifications.claimDelivery, {
      careCaseId: args.careCaseId,
      userId: args.userId,
      channel: "schedule_reminder",
      dedupeKey: scheduleReminderDedupeKey(
        args.scheduleItemId,
        args.expectedStartMs,
      ),
      contentFingerprint: fingerprintContent(body),
      body,
    });
    if (!claim.claimed || !claim.deliveryId) {
      return { sent: false, reason: "already_sent" };
    }

    const messageId = await ctx.runMutation(internal.mutations.logMessage, {
      careCaseId: args.careCaseId,
      userId: args.userId,
      actorType: "assistant",
      direction: "outbound",
      body,
      timestamp: Date.now(),
    });

    const linqToken = process.env.LINQ_API_TOKEN ?? "";
    let sentLinqMessageId: string | undefined;
    if (linqToken && args.chatId && !isTestChat(args.chatId)) {
      const bubbles = splitIntoBubbles(body);
      const results = await sendMessageSequence(args.chatId, bubbles, linqToken);
      const firstSuccess = results.find((r) => r.success && r.messageId);
      if (firstSuccess?.messageId) {
        sentLinqMessageId = firstSuccess.messageId;
        await ctx.runMutation(internal.mutations.updateMessageLinqId, {
          messageId,
          linqMessageId: firstSuccess.messageId,
        });
      }
    }
    const linqSent = Boolean(sentLinqMessageId);

    await ctx.runMutation(internal.notifications.markDeliverySent, {
      deliveryId: claim.deliveryId,
      linqMessageId: sentLinqMessageId,
    });

    await ctx.runMutation(internal.mutations.logAudit, {
      careCaseId: args.careCaseId,
      userId: args.userId,
      event: "response_sent",
      details: {
        triggerMessage: "schedule_item_reminder",
        responseLength: body.length,
        leakageCheckPassed: true,
      },
      timestamp: Date.now(),
    });

    return { sent: true, reason: linqSent ? undefined : "logged_only" };
  },
});

interface DispatchReport {
  attempted: number;
  sent: number;
  skipped: number;
  errors: number;
}

interface CoordinationFollowUpReport {
  outreachAttempted: number;
  outreachSent: number;
  coordinatorAttempted: number;
  coordinatorSent: number;
  skipped: number;
  errors: number;
}

export const dispatchDailyDigests = internalAction({
  args: {},
  handler: async (ctx): Promise<DispatchReport> => {
    const cases = await ctx.runQuery(
      internal.admin.listActiveCareCasesForDigest,
      {},
    );

    const report: DispatchReport = {
      attempted: cases.length,
      sent: 0,
      skipped: 0,
      errors: 0,
    };

    for (const careCase of cases as Array<{ careCaseId: Id<"careCases"> }>) {
      try {
        const result: DigestResult = await ctx.runAction(
          internal.reminders.sendDailyDigest,
          { careCaseId: careCase.careCaseId },
        );
        if (result.sent) {
          report.sent += 1;
        } else {
          report.skipped += 1;
        }
      } catch {
        report.errors += 1;
      }
    }

    return report;
  },
});

export const dispatchCoordinationFollowUps = internalAction({
  args: {
    now: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<CoordinationFollowUpReport> => {
    const now = args.now ?? Date.now();
    const limit = args.limit ?? 25;
    const [outreachFollowUps, coordinatorUpdates] = await Promise.all([
      ctx.runQuery(internal.outreachAttempts.listDueOutreachFollowUps, {
        now,
        limit,
      }),
      ctx.runQuery(internal.outreachAttempts.listDueCoordinationStatusUpdates, {
        now,
        limit,
      }),
    ]);
    const report: CoordinationFollowUpReport = {
      outreachAttempted: outreachFollowUps.length,
      outreachSent: 0,
      coordinatorAttempted: coordinatorUpdates.length,
      coordinatorSent: 0,
      skipped: 0,
      errors: 0,
    };

    const linqApiToken = process.env.LINQ_API_TOKEN;
    if (!linqApiToken) {
      report.errors += outreachFollowUps.length + coordinatorUpdates.length;
      return report;
    }

    for (const item of outreachFollowUps) {
      if (!item.chatId) {
        await ctx.runMutation(internal.outreachAttempts.markOutreachFollowUpSkipped, {
          outreachAttemptId: item.outreachAttemptId,
          reason: "no_chat_id",
          now,
        });
        report.skipped += 1;
        continue;
      }

      const result = await sendMessage(item.chatId, item.messageBody, linqApiToken);
      if (!result.success) {
        await ctx.runMutation(internal.outreachAttempts.markOutreachFollowUpSkipped, {
          outreachAttemptId: item.outreachAttemptId,
          reason: stringifyUnknown(result.error ?? "linq_send_failed"),
          now,
        });
        report.skipped += 1;
        continue;
      }

      await ctx.runMutation(internal.outreachAttempts.markOutreachFollowUpSent, {
        outreachAttemptId: item.outreachAttemptId,
        messageBody: item.messageBody,
        linqMessageId: result.messageId,
        now,
      });
      report.outreachSent += 1;
    }

    for (const item of coordinatorUpdates) {
      // Coordination status updates are agent-initiated sends to the
      // coordinator, so they honor the same opt-out as the daily brief.
      // (Outreach follow-ups above go to care contacts, whose opt-out is
      // recorded on the contact itself — see contactReplies.applyInboundReplyToEvent.)
      const suppression = await ctx.runQuery(
        internal.notifications.getSuppressionState,
        { careCaseId: item.careCaseId, channel: "coordination_status" },
      );
      if (suppression.suppressed) {
        await ctx.runMutation(internal.outreachAttempts.markCoordinationStatusSkipped, {
          coordinationEventId: item.coordinationEventId,
          userId: item.userId,
          reason: "notifications_suppressed",
          now,
        });
        report.skipped += 1;
        continue;
      }

      if (!item.userChatId) {
        await ctx.runMutation(internal.outreachAttempts.markCoordinationStatusSkipped, {
          coordinationEventId: item.coordinationEventId,
          userId: item.userId,
          reason: "no_chat_id",
          now,
        });
        report.skipped += 1;
        continue;
      }

      const result = await sendMessage(item.userChatId, item.messageBody, linqApiToken);
      if (!result.success) {
        await ctx.runMutation(internal.outreachAttempts.markCoordinationStatusSkipped, {
          coordinationEventId: item.coordinationEventId,
          userId: item.userId,
          reason: stringifyUnknown(result.error ?? "linq_send_failed"),
          now,
        });
        report.skipped += 1;
        continue;
      }

      await ctx.runMutation(internal.outreachAttempts.markCoordinationStatusSent, {
        coordinationEventId: item.coordinationEventId,
        userId: item.userId,
        messageBody: item.messageBody,
        linqMessageId: result.messageId,
        now,
      });
      report.coordinatorSent += 1;
    }

    return report;
  },
});

function stringifyUnknown(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "unknown_error";
  }
}

async function logDigestOutbound(
  ctx: ActionCtx,
  args: {
    careCaseId: Id<"careCases">;
    userId: Id<"users">;
    userName: string;
    senderPhone: string;
    body: string;
    now: number;
    linqMessageId: string;
  },
): Promise<void> {
  const messageId = await ctx.runMutation(internal.mutations.logMessage, {
    careCaseId: args.careCaseId,
    userId: args.userId,
    senderPhone: args.senderPhone,
    actorType: "assistant",
    direction: "outbound",
    displayName: args.userName,
    body: args.body,
    timestamp: args.now,
  });

  await ctx.runMutation(internal.mutations.updateMessageLinqId, {
    messageId,
    linqMessageId: args.linqMessageId,
  });

  await ctx.runMutation(internal.mutations.logAudit, {
    careCaseId: args.careCaseId,
    userId: args.userId,
    event: "response_sent",
    phone: args.senderPhone,
    details: {
      responseLength: args.body.length,
      leakageCheckPassed: true,
      triggerMessage: "scheduled_digest",
    },
    timestamp: args.now,
  });
}
