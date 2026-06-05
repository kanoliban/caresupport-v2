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
import {
  sendMessage,
  sendMessageSequence,
  splitIntoBubbles,
} from "./lib/linqClient";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

type DigestSkipReason =
  | "no_chat_id"
  | "already_sent_today"
  | "dormant"
  | "nothing_to_send";

export interface DigestResult {
  sent: boolean;
  reason?: DigestSkipReason | string;
}

export const sendDailyDigest = internalAction({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, { careCaseId }): Promise<DigestResult> => {
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

    const now = Date.now();
    const todayLocalIso = localDateIso(now, active.timezone);

    const digestData = await ctx.runQuery(internal.admin.getCareCaseDigestData, {
      careCaseId,
      todayLocalIso,
      sinceMs: now - TWO_DAYS_MS,
    });

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
      return { sent: false, reason: "linq_send_failed" };
    }

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
