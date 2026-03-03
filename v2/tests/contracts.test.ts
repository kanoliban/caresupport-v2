import { describe, expect, it } from "vitest";
import { LinqInboundPayloadSchema } from "../src/contracts/inbound.js";
import { ProcessResultSchema } from "../src/contracts/processResult.js";

describe("LinqInboundPayloadSchema", () => {
  it("accepts valid payload", () => {
    const payload = {
      chat_id: "chat-1",
      from: "+16515551234",
      service: "SMS",
      message_id: "msg-1",
      parts: [{ type: "text", value: "hello" }],
      received_at: "2026-03-02T02:00:00.000Z",
    };

    const parsed = LinqInboundPayloadSchema.parse(payload);
    expect(parsed.message_id).toBe("msg-1");
  });

  it("rejects payload missing required fields", () => {
    expect(() =>
      LinqInboundPayloadSchema.parse({
        chat_id: "chat-1",
      }),
    ).toThrow();
  });
});

describe("ProcessResultSchema", () => {
  it("requires strict output shape", () => {
    const parsed = ProcessResultSchema.parse({
      sms_response: "Done",
      needs_outreach: [],
      family_updates: [],
      member_updates: [],
      routing_updates: [],
      audit: {
        model: "test",
        intent: "GENERAL",
        decisions: [],
        warnings: [],
      },
    });
    expect(parsed.sms_response).toBe("Done");
  });
});
