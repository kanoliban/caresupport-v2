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
  extractReplyTo,
  extractFailureReason,
  extractReactionData,
  extractParticipantData,
  sendMessage,
} from "./lib/linqClient";
import {
  buildOAuthUrl,
  exchangeCodeForTokens,
} from "./lib/providers/googleCalendar";

const http = httpRouter();

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
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
        return jsonResponse({ error: "missing_sender_or_message" }, 400);
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
        const message = await ctx.runMutation(
          internal.mutations.getMessageByLinqId,
          { linqMessageId: sourceMessageId },
        );

        if (message) {
          await ctx.runMutation(internal.mutations.updateMessageStatus, {
            messageId: message._id,
            deliveryStatus: "failed",
            failureReason,
          });

          await ctx.runMutation(internal.mutations.logAudit, {
            careCaseId: message.careCaseId,
            userId: message.userId,
            event: "message_failed",
            phone: message.senderPhone ?? undefined,
            details: { sourceMessageId, failureReason },
            timestamp: now,
          });
          return jsonResponse({ handled: true, event: eventType });
        }
      }

      await ctx.runMutation(internal.mutations.logAudit, {
        event: "message_failed",
        details: {
          sourceMessageId: sourceMessageId || undefined,
          failureReason,
        },
        timestamp: now,
      });
      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "message.delivered" || eventType === "message.read") {
      const sourceMessageId = extractMessageId(eventData);
      if (sourceMessageId) {
        const message = await ctx.runMutation(
          internal.mutations.getMessageByLinqId,
          { linqMessageId: sourceMessageId },
        );

        if (message) {
          await ctx.runMutation(internal.mutations.updateMessageStatus, {
            messageId: message._id,
            deliveryStatus: eventType === "message.read" ? "read" : "delivered",
            deliveredAt: eventType === "message.delivered" ? Date.now() : undefined,
            readAt: eventType === "message.read" ? Date.now() : undefined,
          });
        }
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "reaction.added" || eventType === "reaction.removed") {
      const reaction = extractReactionData(eventData);
      if (reaction) {
        const message = reaction.messageId
          ? await ctx.runMutation(internal.mutations.getMessageByLinqId, {
              linqMessageId: reaction.messageId,
            })
          : null;

        await ctx.runMutation(internal.mutations.logAudit, {
          careCaseId: message?.careCaseId,
          userId: message?.userId,
          event: "reaction_received",
          phone: reaction.reactorPhone || undefined,
          details: {
            sourceMessageId: reaction.messageId,
            reactionType:
              eventType === "reaction.removed"
                ? `removed:${reaction.reactionType}`
                : reaction.reactionType,
          },
          timestamp: Date.now(),
        });
      }

      return jsonResponse({ handled: true, event: eventType });
    }

    if (eventType === "participant.added" || eventType === "participant.removed") {
      const participant = extractParticipantData(eventData);
      if (participant) {
        await ctx.runMutation(internal.mutations.logAudit, {
          event: "participant_changed",
          phone: participant.participantPhone || undefined,
          details: {
            participantAction: eventType === "participant.added" ? "added" : "removed",
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

http.route({
  path: "/oauth/google/start",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get("u");
    if (!userId) {
      return new Response("Missing user parameter", { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return new Response("Google OAuth not configured", { status: 503 });
    }

    const redirectUri = `${process.env.CONVEX_SITE_URL}/oauth/google/callback`;
    const oauthUrl = buildOAuthUrl(clientId, redirectUri, userId);
    return Response.redirect(oauthUrl, 302);
  }),
});

http.route({
  path: "/oauth/google/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // userId
    const error = url.searchParams.get("error");

    const htmlPage = (title: string, body: string) =>
      new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif;text-align:center;padding:60px 20px;max-width:480px;margin:0 auto}h2{margin-bottom:8px}p{color:#555}</style></head><body><h2>${title}</h2><p>${body}</p><p style="margin-top:32px;font-size:13px;color:#aaa">You can close this tab.</p></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );

    if (error || !code || !state) {
      return htmlPage("Connection cancelled", "Google Calendar was not connected.");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
    const redirectUri = `${process.env.CONVEX_SITE_URL}/oauth/google/callback`;

    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);
    } catch {
      return htmlPage("Something went wrong", "Could not complete Google authorization. Please try again.");
    }

    const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    // Resolve userId → user doc so we have phone + chatId for the confirmation SMS
    const user = await ctx.runMutation(internal.mutations.getUserByRawId, {
      id: state,
    });

    if (!user) {
      return htmlPage("Link expired", "This authorization link is no longer valid.");
    }

    await ctx.runMutation(internal.mutations.saveConnectedAccount, {
      userId: user._id,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt,
      scope: tokens.scope,
    });

    await ctx.runMutation(internal.mutations.logAudit, {
      userId: user._id,
      event: "calendar_connected",
      phone: user.phone,
      details: {},
      timestamp: Date.now(),
    });

    // Send confirmation SMS if we have credentials
    const linqToken = process.env.LINQ_API_TOKEN ?? "";
    const chatId = user.chatId ?? "";
    if (linqToken && chatId) {
      await sendMessage(
        chatId,
        "✓ Google Calendar connected! I'll include your schedule in every conversation from now on.",
        linqToken,
      );
    }

    return htmlPage(
      "Google Calendar connected ✓",
      "CareSupport can now see and update your calendar. You can close this tab.",
    );
  }),
});

export default http;
