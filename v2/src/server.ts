import express from "express";
import { LinqInboundPayloadSchema } from "./contracts/inbound.js";
import { config } from "./config.js";
import { verifyLinqSignature } from "./utils/signature.js";
import { logger } from "./utils/logger.js";
import { CareSupportProcessor } from "./pipeline/processInbound.js";
import { ClaudeOrchestrator } from "./agent/orchestrator.js";
import { ConvexGateway } from "./convex/client.js";
import { LinqClient } from "./linq/client.js";

function normalizeInboundPayload(raw: unknown): unknown {
  const root = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const message = (data.message && typeof data.message === "object" ? (data.message as Record<string, unknown>) : {}) as Record<string, unknown>;
  const senderHandle =
    data.sender_handle && typeof data.sender_handle === "object"
      ? (data.sender_handle as Record<string, unknown>)
      : message.sender_handle && typeof message.sender_handle === "object"
        ? (message.sender_handle as Record<string, unknown>)
        : {};
  const fromHandle =
    data.from_handle && typeof data.from_handle === "object"
      ? (data.from_handle as Record<string, unknown>)
      : message.from_handle && typeof message.from_handle === "object"
        ? (message.from_handle as Record<string, unknown>)
        : {};

  return {
    chat_id:
      (typeof data.chat_id === "string" && data.chat_id) ||
      (data.chat && typeof data.chat === "object" && typeof (data.chat as Record<string, unknown>).id === "string"
        ? ((data.chat as Record<string, unknown>).id as string)
        : "") ||
      (typeof message.chat_id === "string" ? message.chat_id : ""),
    from:
      (typeof data.from === "string" && data.from) ||
      (typeof senderHandle.handle === "string" ? senderHandle.handle : "") ||
      (typeof fromHandle.handle === "string" ? fromHandle.handle : ""),
    service:
      (typeof data.service === "string" && data.service) ||
      (typeof message.service === "string" ? message.service : "unknown"),
    message_id:
      (typeof data.message_id === "string" && data.message_id) ||
      (typeof data.id === "string" && data.id) ||
      (typeof message.id === "string" ? message.id : ""),
    parts:
      (Array.isArray(data.parts) ? data.parts : Array.isArray(message.parts) ? message.parts : []) as unknown[],
    received_at:
      (typeof data.received_at === "string" && data.received_at) ||
      (typeof message.received_at === "string" && message.received_at) ||
      (typeof data.sent_at === "string" && data.sent_at) ||
      (typeof root.created_at === "string" && root.created_at) ||
      (typeof data.created_at === "string" && data.created_at) ||
      new Date().toISOString(),
    event_id:
      (typeof root.event_id === "string" && root.event_id) ||
      (typeof data.event_id === "string" ? data.event_id : undefined),
  };
}

export function buildServer(): express.Express {
  const app = express();

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf8");
      },
    }),
  );

  const convexUrl = config.convexUrl ?? "https://placeholder.invalid";
  const processor = new CareSupportProcessor(
    new ClaudeOrchestrator(),
    new ConvexGateway(convexUrl),
    new LinqClient(),
  );

  app.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true, service: "caresupport-v2" });
  });

  app.get("/webhooks/linq/inbound", (_req, res) => {
    res.status(200).json({ ok: true, service: "caresupport-v2", route: "linq_inbound" });
  });

  app.post("/webhooks/linq/inbound", async (req, res) => {
    try {
      const rawBody = (req as express.Request & { rawBody?: string }).rawBody ?? "";
      const signature =
        req.header("x-webhook-signature") ??
        req.header("x-linq-signature") ??
        req.header("x-signature") ??
        undefined;
      const timestamp =
        req.header("x-webhook-timestamp") ??
        req.header("x-linq-timestamp") ??
        undefined;
      const bodyEventType =
        typeof req.body === "object" &&
        req.body !== null &&
        typeof (req.body as Record<string, unknown>).event_type === "string"
          ? ((req.body as Record<string, unknown>).event_type as string)
          : "";
      const eventType = req.header("x-webhook-event") ?? req.header("x-linq-event") ?? bodyEventType;
      const signatureValid = verifyLinqSignature(rawBody, signature, config.linq.webhookSecret, timestamp);
      const allowInvalidSignature = process.env.LINQ_WEBHOOK_ALLOW_INVALID_SIGNATURE === "1";
      if (!signatureValid) {
        if (!allowInvalidSignature) {
          res.status(401).json({ ok: false, error: "invalid_signature" });
          return;
        }
        logger.warn(
          {
            eventType,
            subscriptionId: req.header("x-webhook-subscription-id"),
            signaturePresent: Boolean(signature),
            timestampPresent: Boolean(timestamp),
          },
          "Bypassing invalid Linq webhook signature because LINQ_WEBHOOK_ALLOW_INVALID_SIGNATURE=1",
        );
      }

      if (eventType && eventType !== "message.received") {
        res.status(200).json({ ok: true, ignored: true, event: eventType });
        return;
      }

      const payload = LinqInboundPayloadSchema.parse(normalizeInboundPayload(req.body));
      const response = await processor.process(payload);

      res.status(200).json({ ok: true, result: response.result, actor: response.actor });
    } catch (error) {
      logger.error({ error }, "Inbound webhook failed");
      res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "unknown" });
    }
  });

  return app;
}
