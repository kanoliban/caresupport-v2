"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import { getValidGoogleToken } from "./handler";
import { getCalendarEvent } from "./lib/providers/googleCalendar";
import { sendMessageSequence, splitIntoBubbles } from "./lib/linqClient";

const MOVED_TOLERANCE_MS = 2 * 60 * 1000;

interface ReminderResult {
  sent: boolean;
  reason?: string;
}

/**
 * Fires a "heads up" text ahead of a calendar event. Scheduled by the handler
 * via ctx.scheduler.runAt when a Google Calendar event is created.
 *
 * Before sending it re-checks Google so we don't nag about an event that was
 * since deleted or moved — this avoids having to cancel/reschedule the job when
 * the underlying event changes.
 */
export const sendCalendarReminder = internalAction({
  args: {
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    chatId: v.string(),
    eventId: v.string(),
    expectedStartMs: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args): Promise<ReminderResult> => {
    let title = args.title;

    const token = await getValidGoogleToken(ctx, args.userId, "");
    if (token) {
      let event;
      try {
        event = await getCalendarEvent(token, args.eventId);
      } catch {
        // Transient Google error — fall through and still send the reminder.
        event = undefined;
      }
      if (event === null) {
        return { sent: false, reason: "event_deleted" };
      }
      if (event) {
        if (event.summary) title = event.summary;
        const startIso = event.start?.dateTime;
        if (startIso) {
          const actualStart = Date.parse(startIso);
          if (
            !Number.isNaN(actualStart) &&
            Math.abs(actualStart - args.expectedStartMs) > MOVED_TOLERANCE_MS
          ) {
            // The event was rescheduled; this reminder is now at the wrong time.
            return { sent: false, reason: "event_moved" };
          }
        }
      }
    }

    const linqToken = process.env.LINQ_API_TOKEN ?? "";
    if (!linqToken || !args.chatId) {
      return { sent: false, reason: "no_channel" };
    }

    const minutes = Math.max(
      1,
      Math.round((args.expectedStartMs - Date.now()) / 60000),
    );
    const when =
      minutes >= 55
        ? "in about an hour"
        : `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
    const body = `Reminder: "${title}" starts ${when}. Hope you're ready!`;

    const bubbles = splitIntoBubbles(body);
    const results = await sendMessageSequence(args.chatId, bubbles, linqToken);
    const firstSuccess = results.find((r) => r.success && r.messageId);

    const messageId = await ctx.runMutation(internal.mutations.logMessage, {
      careCaseId: args.careCaseId,
      userId: args.userId,
      actorType: "assistant",
      direction: "outbound",
      body,
      timestamp: Date.now(),
    });
    if (firstSuccess?.messageId) {
      await ctx.runMutation(internal.mutations.updateMessageLinqId, {
        messageId,
        linqMessageId: firstSuccess.messageId,
      });
    }

    await ctx.runMutation(internal.mutations.logAudit, {
      careCaseId: args.careCaseId,
      userId: args.userId,
      event: "response_sent",
      details: {
        triggerMessage: "calendar_reminder",
        responseLength: body.length,
        leakageCheckPassed: true,
      },
      timestamp: Date.now(),
    });

    return firstSuccess
      ? { sent: true }
      : { sent: false, reason: "linq_send_failed" };
  },
});
