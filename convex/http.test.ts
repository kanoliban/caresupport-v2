import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

/**
 * Tests for the webhook handler logic.
 * Since httpAction requires the Convex runtime, we test the extraction
 * and validation logic that the webhook depends on.
 */

import {
  verifyWebhookSignature,
  extractSenderPhone,
  extractMessageText,
  extractChatId,
  extractService,
} from "./lib/linq-client";

// ─── Webhook payload construction helpers ────────────────────────────────

function buildWebhookPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: "message.received",
    data: {
      sender_handle: { handle: "+16515551234" },
      chat_id: "chat-abc",
      service: "iMessage",
      parts: [{ type: "text", value: "Hello" }],
      ...overrides,
    },
  };
}

function signPayload(
  payload: string,
  timestamp: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

// ─── Signature verification in webhook context ──────────────────────────

describe("webhook signature verification", () => {
  const secret = "webhook-test-secret";

  it("accepts valid signature with fresh timestamp", async () => {
    // #given
    const payload = JSON.stringify(buildWebhookPayload());
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signPayload(payload, ts, secret);

    // #when
    const result = await verifyWebhookSignature(payload, ts, sig, secret);

    // #then
    expect(result).toBe(true);
  });

  it("rejects invalid signature", async () => {
    // #given
    const payload = JSON.stringify(buildWebhookPayload());
    const ts = String(Math.floor(Date.now() / 1000));

    // #when
    const result = await verifyWebhookSignature(payload, ts, "bad-sig", secret);

    // #then
    expect(result).toBe(false);
  });

  it("rejects stale timestamp (replay attack)", async () => {
    // #given
    const payload = JSON.stringify(buildWebhookPayload());
    const staleTs = String(Math.floor(Date.now() / 1000) - 600);
    const sig = signPayload(payload, staleTs, secret);

    // #when
    const result = await verifyWebhookSignature(payload, staleTs, sig, secret);

    // #then
    expect(result).toBe(false);
  });

  it("accepts any signature when no secret is configured", async () => {
    // #given / #when
    const result = await verifyWebhookSignature("any", "123", "any", "");

    // #then
    expect(result).toBe(true);
  });
});

// ─── Payload extraction from webhook data ───────────────────────────────

describe("webhook payload extraction", () => {
  it("extracts all fields from standard V3 payload", () => {
    // #given
    const data = buildWebhookPayload().data;

    // #when / #then
    expect(extractSenderPhone(data)).toBe("+16515551234");
    expect(extractMessageText(data)).toBe("Hello");
    expect(extractChatId(data)).toBe("chat-abc");
    expect(extractService(data)).toBe("iMessage");
  });

  it("extracts from nested message format", () => {
    // #given
    const data = {
      message: {
        from_handle: { handle: "+16515559999" },
        parts: [{ type: "text", value: "Nested msg" }],
        service: "SMS",
      },
      chat: { id: "chat-xyz" },
    };

    // #when / #then
    expect(extractSenderPhone(data)).toBe("+16515559999");
    expect(extractMessageText(data)).toBe("Nested msg");
    expect(extractChatId(data)).toBe("chat-xyz");
    expect(extractService(data)).toBe("SMS");
  });

  it("returns defaults for missing fields", () => {
    // #given
    const data = {};

    // #when / #then
    expect(extractSenderPhone(data)).toBe("");
    expect(extractMessageText(data)).toBe("");
    expect(extractChatId(data)).toBe("");
    expect(extractService(data)).toBe("unknown");
  });

  it("joins multiple text parts", () => {
    // #given
    const data = {
      parts: [
        { type: "text", value: "Part 1" },
        { type: "media", url: "http://img.png" },
        { type: "text", value: "Part 2" },
      ],
    };

    // #when
    const text = extractMessageText(data);

    // #then
    expect(text).toBe("Part 1 Part 2");
  });
});
