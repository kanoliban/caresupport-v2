import { httpAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal, components } from "./_generated/api";
import { httpRouter } from "convex/server";
import { registerRoutes } from "@convex-dev/stripe";
import {
  verifyWebhookSignature,
  extractSenderPhone,
  extractMessageText,
  extractChatId,
  extractService,
  extractMessageId,
  extractReplyTo,
  extractFailureReason,
  extractReactionData,
  extractParticipantData,
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
      const replyTo = extractReplyTo(eventData);

      if (!senderPhone || !messageBody) {
        return jsonResponse({ error: "missing_sender_or_message" });
      }

      await ctx.scheduler.runAfter(0, internal.handler.handleMessage, {
        senderPhone,
        messageBody,
        chatId,
        service,
        sourceMessageId,
        replyToMessageId: replyTo?.messageId,
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

    if (eventType === "reaction.added") {
      const reaction = extractReactionData(eventData);
      if (reaction && reaction.reactorPhone) {
        const reactedMessage = await ctx.runMutation(
          internal.mutations.getMessageByLinqId,
          { linqMessageId: reaction.messageId },
        );

        await ctx.runMutation(internal.mutations.logAudit, {
          event: "reaction_received",
          phone: reaction.reactorPhone,
          familyId: reactedMessage?.familyId,
          details: {
            sourceMessageId: reaction.messageId,
            reactionType: reaction.reactionType,
          },
          timestamp: Date.now(),
        });

        const quotedBody = reactedMessage?.body ?? "";
        const syntheticBody = quotedBody
          ? `[Reacted ${reaction.reactionType} to: "${quotedBody.slice(0, 450)}"]`
          : `[Reacted ${reaction.reactionType} to a previous message]`;
        const chatId = reaction.chatId;

        await ctx.scheduler.runAfter(0, internal.handler.handleMessage, {
          senderPhone: reaction.reactorPhone,
          messageBody: syntheticBody,
          chatId,
          service: "iMessage",
          sourceMessageId: undefined,
        });
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "reaction.removed") {
      const reaction = extractReactionData(eventData);
      if (reaction) {
        await ctx.runMutation(internal.mutations.logAudit, {
          event: "reaction_received",
          phone: reaction.reactorPhone || "",
          details: {
            sourceMessageId: reaction.messageId,
            reactionType: `removed:${reaction.reactionType}`,
          },
          timestamp: Date.now(),
        });
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "participant.added") {
      const participant = extractParticipantData(eventData);
      if (participant) {
        await ctx.runMutation(internal.mutations.logAudit, {
          event: "participant_changed",
          phone: participant.participantPhone || "",
          details: {
            participantAction: "added",
            participantPhone: participant.participantPhone,
          },
          timestamp: Date.now(),
        });
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "participant.removed") {
      const participant = extractParticipantData(eventData);
      if (participant) {
        await ctx.runMutation(internal.mutations.logAudit, {
          event: "participant_changed",
          phone: participant.participantPhone || "",
          details: {
            participantAction: "removed",
            participantPhone: participant.participantPhone,
          },
          timestamp: Date.now(),
        });
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    return jsonResponse({ handled: false, event: eventType });
  }),
});

const CHECKOUT_SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CareSupport</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100dvh;margin:0;background:#f9fafb;color:#111}
.card{text-align:center;max-width:400px;padding:2rem}</style></head>
<body><div class="card"><h1>You're all set!</h1><p>Head back to iMessage — CareSupport will confirm your upgrade there.</p><p style="color:#6b7280;font-size:.875rem">You can close this tab.</p></div></body></html>`;

const CHECKOUT_CANCEL_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CareSupport</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100dvh;margin:0;background:#f9fafb;color:#111}
.card{text-align:center;max-width:400px;padding:2rem}</style></head>
<body><div class="card"><h1>No worries</h1><p>You can upgrade anytime — just text "upgrade" in iMessage.</p><p style="color:#6b7280;font-size:.875rem">You can close this tab.</p></div></body></html>`;

http.route({
  path: "/checkout/success",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(CHECKOUT_SUCCESS_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }),
});

http.route({
  path: "/checkout/cancel",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(CHECKOUT_CANCEL_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }),
});

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    "checkout.session.completed": async (ctx, event) => {
      const session = event.data.object;
      if (session.mode !== "subscription") return;
      const familyId = session.metadata?.familyId;
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      if (familyId && subscriptionId) {
        await ctx.runMutation(internal.stripe.updateFamilyPlan, {
          familyId: familyId as Id<"families">,
          planTier: "family",
          stripeSubscriptionId: subscriptionId,
        });
        await ctx.scheduler.runAfter(0, internal.stripe.sendUpgradeConfirmation, {
          familyId: familyId as Id<"families">,
        });
      }
    },
    "customer.subscription.deleted": async (ctx, event) => {
      const subscription = event.data.object;
      const subscriptionId = subscription.id;
      const family = await ctx.runQuery(
        internal.queries.getFamilyBySubscription,
        { stripeSubscriptionId: subscriptionId },
      );
      if (family) {
        await ctx.runMutation(internal.stripe.updateFamilyPlan, {
          familyId: family._id,
          planTier: "free",
          stripeSubscriptionId: undefined,
        });
      }
    },
  },
});

export default http;
