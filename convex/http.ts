import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { httpRouter } from "convex/server";
import {
  verifyWebhookSignature,
  extractSenderPhone,
  extractMessageText,
  extractChatId,
  extractService,
  extractMessageId,
  extractFailureReason,
} from "./lib/linqClient";

const http = httpRouter();

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

http.route({
  path: "/webhook/linq",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    const timestamp = request.headers.get("X-Webhook-Timestamp") ?? "";
    const signature = request.headers.get("X-Webhook-Signature") ?? "";
    const signingSecret = process.env.LINQ_WEBHOOK_SECRET ?? "";

    const valid = await verifyWebhookSignature(
      body,
      timestamp,
      signature,
      signingSecret,
    );
    if (!valid) {
      return jsonResponse({ error: "invalid_signature" }, 401);
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }

    const eventType =
      (payload.event_type as string) ?? (payload.event as string) ?? "";
    const eventData = (payload.data ?? payload) as Record<string, unknown>;

    if (eventType === "message.received") {
      const senderPhone = extractSenderPhone(eventData);
      const messageBody = extractMessageText(eventData);
      const chatId = extractChatId(eventData);
      const service = extractService(eventData);
      const sourceMessageId = extractMessageId(eventData) || undefined;

      if (!senderPhone || !messageBody) {
        return jsonResponse({ error: "missing_sender_or_message" });
      }

      await ctx.scheduler.runAfter(0, internal.handler.handleMessage, {
        senderPhone,
        messageBody,
        chatId,
        service,
        sourceMessageId,
      });

      return jsonResponse({ accepted: true });
    }

    if (eventType === "message.failed") {
      const sourceMessageId = extractMessageId(eventData);
      const failureReason = extractFailureReason(eventData);
      const now = Date.now();

      if (sourceMessageId) {
        const conversation = await ctx.runMutation(
          internal.mutations.getMessageByLinqId,
          { linqMessageId: sourceMessageId },
        );

        if (conversation) {
          await ctx.runMutation(internal.mutations.updateMessageStatus, {
            messageId: conversation._id,
            deliveryStatus: "failed",
            failureReason,
          });

          await ctx.runMutation(internal.mutations.logAudit, {
            familyId: conversation.familyId,
            event: "message_failed",
            phone: conversation.senderPhone ?? "",
            details: { sourceMessageId, failureReason },
            timestamp: now,
          });

          return jsonResponse({ handled: true, event: eventType });
        }
      }

      await ctx.runMutation(internal.mutations.logAudit, {
        event: "message_failed",
        phone: "",
        details: {
          sourceMessageId: sourceMessageId || undefined,
          failureReason,
        },
        timestamp: now,
      });

      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "message.delivered") {
      const sourceMessageId = extractMessageId(eventData);
      if (sourceMessageId) {
        const conversation = await ctx.runMutation(
          internal.mutations.getMessageByLinqId,
          { linqMessageId: sourceMessageId },
        );

        if (conversation) {
          await ctx.runMutation(internal.mutations.updateMessageStatus, {
            messageId: conversation._id,
            deliveryStatus: "delivered",
            deliveredAt: Date.now(),
          });
        }
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "message.read") {
      const sourceMessageId = extractMessageId(eventData);
      if (sourceMessageId) {
        const conversation = await ctx.runMutation(
          internal.mutations.getMessageByLinqId,
          { linqMessageId: sourceMessageId },
        );

        if (conversation) {
          await ctx.runMutation(internal.mutations.updateMessageStatus, {
            messageId: conversation._id,
            deliveryStatus: "read",
            readAt: Date.now(),
          });
        }
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    return jsonResponse({ handled: false, event: eventType });
  }),
});

export default http;
