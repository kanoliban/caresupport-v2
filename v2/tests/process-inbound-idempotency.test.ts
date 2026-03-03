import { describe, expect, it } from "vitest";
import { CareSupportProcessor } from "../src/pipeline/processInbound.js";
import type { ProcessResult } from "../src/contracts/processResult.js";

const ACTOR = {
  familyId: "kano",
  memberId: "+16517037981",
  memberName: "Liban",
  role: "primary_caregiver",
  accessLevel: "full" as const,
  phone: "+16517037981",
  chatId: "chat-1",
};

const PROCESS_RESULT: ProcessResult = {
  sms_response: "Confirmed.",
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
};

const PAYLOAD = {
  chat_id: "chat-1",
  from: "+16517037981",
  service: "SMS",
  message_id: "msg-1",
  parts: [{ type: "text", value: "Hello" }],
  received_at: "2026-03-02T12:00:00.000Z",
};

function makeProcessor(stubs: {
  query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  mutation?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  action?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  generate?: () => Promise<ProcessResult>;
  send?: () => Promise<unknown>;
  markAsRead?: () => Promise<unknown>;
  startTyping?: () => Promise<unknown>;
  stopTyping?: () => Promise<unknown>;
}) {
  const orchestrator = {
    generate: stubs.generate ?? (async () => PROCESS_RESULT),
  };
  const convex = {
    query: stubs.query,
    mutation: stubs.mutation ?? (async () => undefined),
    action: stubs.action ?? (async () => undefined),
  };
  const linq = {
    sendMessageSequence: stubs.send ?? (async () => [{ success: true, status: 200, body: {} }]),
    markAsRead: stubs.markAsRead ?? (async () => ({ success: true, status: 204, body: null })),
    startTyping: stubs.startTyping ?? (async () => ({ success: true, status: 204, body: null })),
    stopTyping: stubs.stopTyping ?? (async () => ({ success: true, status: 204, body: null })),
  };

  return new CareSupportProcessor(
    orchestrator as never,
    convex as never,
    linq as never,
  );
}

describe("CareSupportProcessor idempotency", () => {
  it("short-circuits duplicate deliveries when outbound already exists", async () => {
    let generated = false;
    const mutationCalls: string[] = [];
    const processor = makeProcessor({
      query: async (name) => {
        if (name === "members_v2.js:resolveActor") return ACTOR;
        if (name === "families_v2.js:getFamilyContext") {
          return {
            familyId: "kano",
            familyName: "Kano",
            careRecipient: "Degitu",
            markdown: "# Current",
            recentConversation: "",
          };
        }
        if (name === "conversations_v2.js:getRecentConversation") return "";
        if (name === "conversations_v2.js:getDeliveryStatus") {
          return { inboundExists: true, outboundExists: true, outboundText: "Already sent." };
        }
        return null;
      },
      mutation: async (name) => {
        mutationCalls.push(name);
      },
      generate: async () => {
        generated = true;
        return PROCESS_RESULT;
      },
    });

    const response = await processor.process(PAYLOAD);

    expect(response.duplicate).toBe(true);
    expect(response.result.sms_response).toBe("Already sent.");
    expect(generated).toBe(false);
    expect(mutationCalls.length).toBe(0);
  });

  it("skips inbound insert when inbound exists but outbound does not", async () => {
    const mutationCalls: string[] = [];
    const processor = makeProcessor({
      query: async (name) => {
        if (name === "members_v2.js:resolveActor") return ACTOR;
        if (name === "families_v2.js:getFamilyContext") {
          return {
            familyId: "kano",
            familyName: "Kano",
            careRecipient: "Degitu",
            markdown: "# Current",
            recentConversation: "",
          };
        }
        if (name === "conversations_v2.js:getRecentConversation") return "";
        if (name === "conversations_v2.js:getDeliveryStatus") {
          return { inboundExists: true, outboundExists: false, outboundText: null };
        }
        return null;
      },
      mutation: async (name) => {
        mutationCalls.push(name);
      },
    });

    const response = await processor.process(PAYLOAD);

    expect(response.duplicate).toBeUndefined();
    expect(mutationCalls).not.toContain("conversations_v2.js:appendInbound");
    expect(mutationCalls).toContain("conversations_v2.js:appendOutbound");
    expect(mutationCalls).toContain("audit_v2.js:record");
  });

  it("triggers Linq read/typing signals during processing", async () => {
    let markReadCalls = 0;
    let startTypingCalls = 0;
    let stopTypingCalls = 0;
    const processor = makeProcessor({
      query: async (name) => {
        if (name === "members_v2.js:resolveActor") return ACTOR;
        if (name === "families_v2.js:getFamilyContext") {
          return {
            familyId: "kano",
            familyName: "Kano",
            careRecipient: "Degitu",
            markdown: "# Current",
            recentConversation: "",
          };
        }
        if (name === "conversations_v2.js:getRecentConversation") return "";
        if (name === "conversations_v2.js:getDeliveryStatus") {
          return { inboundExists: false, outboundExists: false, outboundText: null };
        }
        return null;
      },
      markAsRead: async () => {
        markReadCalls += 1;
        return { success: true, status: 204, body: null };
      },
      startTyping: async () => {
        startTypingCalls += 1;
        return { success: true, status: 204, body: null };
      },
      stopTyping: async () => {
        stopTypingCalls += 1;
        return { success: true, status: 204, body: null };
      },
    });

    await processor.process(PAYLOAD);

    expect(markReadCalls).toBe(1);
    expect(startTypingCalls).toBeGreaterThanOrEqual(1);
    expect(stopTypingCalls).toBe(1);
  });
});
