import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { httpRouter } from "convex/server";
import {
  verifyWebhookSignature,
  extractSenderPhone,
  extractMessageText,
  extractChatId,
  extractService,
} from "./lib/linqClient";

const http = httpRouter();

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
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const eventType = (payload.event as string) ?? "";
    if (eventType !== "message.received") {
      return new Response(
        JSON.stringify({ handled: false, event: eventType }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const eventData = (payload.data ?? payload) as Record<string, unknown>;
    const senderPhone = extractSenderPhone(eventData);
    const messageBody = extractMessageText(eventData);
    const chatId = extractChatId(eventData);
    const service = extractService(eventData);
    const sourceMessageId =
      ((eventData.message as Record<string, unknown>)?.id as string) ??
      (eventData.id as string) ??
      undefined;

    if (!senderPhone || !messageBody) {
      return new Response(
        JSON.stringify({ error: "missing_sender_or_message" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    await ctx.scheduler.runAfter(0, internal.handler.handleMessage, {
      senderPhone,
      messageBody,
      chatId,
      service,
      sourceMessageId,
    });

    return new Response(
      JSON.stringify({ accepted: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }),
});

export default http;
