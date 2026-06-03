import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

interface CreateCareContactArgs {
  careCaseId: Id<"careCases">;
  name: string;
  contactType: "family";
  phone?: string;
  canReceiveTexts?: boolean;
  linqChatId?: string;
}

interface CreateCoordinationEventArgs {
  careCaseId: Id<"careCases">;
  type: "outreach";
  title: string;
  status: "waiting";
  pendingContactIds: Array<Id<"careContacts">>;
  createdByUserId?: Id<"users">;
}

async function createContactAndEvent(
  t: ReturnType<typeof convexTest>,
  args: {
    careCaseId: Id<"careCases">;
    userId?: Id<"users">;
    name: string;
    phone?: string;
    canReceiveTexts?: boolean;
    linqChatId?: string;
    eventTitle: string;
  },
) {
  const contactArgs: CreateCareContactArgs = {
    careCaseId: args.careCaseId,
    name: args.name,
    contactType: "family",
  };
  if (args.phone !== undefined) contactArgs.phone = args.phone;
  if (args.canReceiveTexts !== undefined) {
    contactArgs.canReceiveTexts = args.canReceiveTexts;
  }
  if (args.linqChatId !== undefined) {
    contactArgs.linqChatId = args.linqChatId;
  }

  const contactId = await t.mutation(api.careContacts.create, contactArgs);

  const eventArgs: CreateCoordinationEventArgs = {
    careCaseId: args.careCaseId,
    type: "outreach",
    title: args.eventTitle,
    status: "waiting",
    pendingContactIds: [contactId],
  };
  if (args.userId !== undefined) eventArgs.createdByUserId = args.userId;

  const eventId = await t.mutation(api.coordinationEvents.create, eventArgs);

  return { contactId, eventId };
}

describe("outreachAttempts", () => {
  const originalToken = process.env.LINQ_API_TOKEN;
  const originalPhone = process.env.LINQ_PHONE_NUMBER;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.LINQ_API_TOKEN = originalToken;
    process.env.LINQ_PHONE_NUMBER = originalPhone;
  });

  it("saves proposed outreach as pending approval and audits it without sending", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554001", chatId: "chat-outreach-1" },
    );
    const { contactId, eventId } = await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Angela",
      phone: "+16515554101",
      eventTitle: "Wednesday evening coverage",
    });

    const created = await t.mutation(
      internal.outreachAttempts.createPendingFromModel,
      {
        careCaseId,
        requestedByUserId: userId,
        request: {
          contactName: "Angela",
          purpose: "Ask about Wednesday evening coverage",
          message: "Hi Angela, are you available Wednesday evening for Rob?",
          coordinationEventTitle: "Wednesday evening coverage",
        },
        approvalPrompt: "I can ask Angela. Do you want me to send this?",
      },
    );

    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const audits = await t.query(api.auditLogs.listByCareCase, { careCaseId });

    expect(created).toMatchObject({ action: "created", status: "pending_approval" });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      careCaseId,
      careContactId: contactId,
      coordinationEventId: eventId,
      requestedByUserId: userId,
      status: "pending_approval",
      messageBody: "Hi Angela, are you available Wednesday evening for Rob?",
    });
    expect(attempts[0].linqMessageId).toBeUndefined();
    expect(attempts[0].sentAt).toBeUndefined();
    expect(audits.some((audit) => audit.event === "outreach_requested")).toBe(true);
  });

  it("approves only the named matching pending outreach", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554002", chatId: "chat-outreach-2" },
    );
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Angela",
      phone: "+16515554201",
      eventTitle: "Wednesday evening coverage",
    });
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Marcus",
      phone: "+16515554202",
      eventTitle: "Friday morning coverage",
    });
    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Angela",
        purpose: "Ask about Wednesday evening coverage",
        message: "Can you cover Wednesday evening?",
        coordinationEventTitle: "Wednesday evening coverage",
      },
    });
    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Marcus",
        purpose: "Ask about Friday morning coverage",
        message: "Can you cover Friday morning?",
        coordinationEventTitle: "Friday morning coverage",
      },
    });

    const resolved = await t.mutation(
      internal.outreachAttempts.resolveApprovalFromMessage,
      {
        careCaseId,
        approvedByUserId: userId,
        messageBody: "Yes, ask Angela",
      },
    );

    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const angelaAttempt = attempts.find((attempt) =>
      attempt.messageBody.includes("Wednesday"),
    );
    const marcusAttempt = attempts.find((attempt) =>
      attempt.messageBody.includes("Friday"),
    );
    const audits = await t.query(api.auditLogs.listByCareCase, { careCaseId });

    expect(resolved).toMatchObject({
      action: "approved",
      contactName: "Angela",
    });
    expect(angelaAttempt?.status).toBe("approved");
    expect(angelaAttempt?.approvedByUserId).toBe(userId);
    expect(angelaAttempt?.approvedAt).toBeTypeOf("number");
    expect(marcusAttempt?.status).toBe("pending_approval");
    expect(audits.some((audit) => audit.event === "outreach_approved")).toBe(true);
  });

  it("returns ambiguity without approving when a generic yes matches multiple pending attempts", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554003", chatId: "chat-outreach-3" },
    );
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Angela",
      phone: "+16515554301",
      eventTitle: "Wednesday coverage",
    });
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Marcus",
      phone: "+16515554302",
      eventTitle: "Thursday coverage",
    });
    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Angela",
        purpose: "Ask about Wednesday coverage",
        message: "Can you cover Wednesday?",
        coordinationEventTitle: "Wednesday coverage",
      },
    });
    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Marcus",
        purpose: "Ask about Thursday coverage",
        message: "Can you cover Thursday?",
        coordinationEventTitle: "Thursday coverage",
      },
    });

    const resolved = await t.mutation(
      internal.outreachAttempts.resolveApprovalFromMessage,
      {
        careCaseId,
        approvedByUserId: userId,
        messageBody: "yes",
      },
    );
    const pending = await t.query(api.outreachAttempts.listPendingByCareCase, {
      careCaseId,
    });

    expect(resolved).toMatchObject({
      action: "ambiguous",
      contactNames: expect.arrayContaining(["Angela", "Marcus"]),
      matchedCount: 2,
    });
    expect(pending).toHaveLength(2);
  });

  it("blocks outreach when a contact has no phone or text permission", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554004", chatId: "chat-outreach-4" },
    );
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "No Phone",
      eventTitle: "No phone coverage",
    });
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "No Text",
      phone: "+16515554402",
      canReceiveTexts: false,
      eventTitle: "No text coverage",
    });

    const noPhone = await t.mutation(
      internal.outreachAttempts.createPendingFromModel,
      {
        careCaseId,
        requestedByUserId: userId,
        request: {
          contactName: "No Phone",
          purpose: "Ask about no phone coverage",
          message: "Can you cover?",
          coordinationEventTitle: "No phone coverage",
        },
      },
    );
    const noText = await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "No Text",
        purpose: "Ask about no text coverage",
        message: "Can you cover?",
        coordinationEventTitle: "No text coverage",
      },
    });

    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const audits = await t.query(api.auditLogs.listByCareCase, { careCaseId });

    expect(noPhone).toMatchObject({ status: "blocked", reason: "no_phone" });
    expect(noText).toMatchObject({ status: "blocked", reason: "texting_disabled" });
    expect(attempts.every((attempt) => attempt.status === "blocked")).toBe(true);
    expect(audits.filter((audit) => audit.event === "outreach_blocked")).toHaveLength(2);
  });

  it("refuses execution for pending outreach that has not been approved", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554005", chatId: "chat-outreach-5" },
    );
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Angela",
      phone: "+16515554501",
      eventTitle: "Pending coverage",
    });
    const created = await t.mutation(
      internal.outreachAttempts.createPendingFromModel,
      {
        careCaseId,
        requestedByUserId: userId,
        request: {
          contactName: "Angela",
          purpose: "Ask about pending coverage",
          message: "Can you cover?",
          coordinationEventTitle: "Pending coverage",
        },
      },
    );
    if (created.action !== "created") {
      throw new Error("Expected pending outreach creation");
    }
    const outreachAttemptId = created.id;
    if (!outreachAttemptId) {
      throw new Error("Expected pending outreach id");
    }
    vi.stubGlobal("fetch", vi.fn());

    const result = await t.action(internal.outreachExecution.executeApproved, {
      outreachAttemptId,
    });
    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });

    expect(result).toMatchObject({
      sent: false,
      reason: "not_approved_or_not_found",
    });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(attempts[0].status).toBe("pending_approval");
  });

  it("sends approved outreach through a new Linq chat and persists message context", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554006", chatId: "chat-outreach-6" },
    );
    const { contactId, eventId } = await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Angela",
      phone: "+16515554601",
      eventTitle: "Approved coverage",
    });
    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Angela",
        purpose: "Ask about approved coverage",
        message: "Can you cover Wednesday?",
        coordinationEventTitle: "Approved coverage",
      },
    });
    const approved = await t.mutation(
      internal.outreachAttempts.resolveApprovalFromMessage,
      {
        careCaseId,
        approvedByUserId: userId,
        messageBody: "Yes, ask Angela",
      },
    );
    if (approved.action !== "approved") {
      throw new Error("Expected approved outreach");
    }
    const outreachAttemptId = approved.id;
    if (!outreachAttemptId) {
      throw new Error("Expected approved outreach id");
    }

    process.env.LINQ_API_TOKEN = "token";
    process.env.LINQ_PHONE_NUMBER = "+16515550000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 201,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              chat: {
                id: "chat-angela",
                message: { id: "msg-angela", service: "iMessage" },
              },
            }),
          ),
      }),
    );

    const result = await t.action(internal.outreachExecution.executeApproved, {
      outreachAttemptId,
    });
    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const contact = await t.query(api.careContacts.get, {
      careCaseId,
      id: contactId,
    });
    const messages = await t.query(api.messages.listByCareCase, { careCaseId });
    const audits = await t.query(api.auditLogs.listByCareCase, { careCaseId });

    expect(result).toMatchObject({
      sent: true,
      contactName: "Angela",
      chatId: "chat-angela",
      messageId: "msg-angela",
    });
    expect(attempts[0]).toMatchObject({
      status: "sent",
      linqChatId: "chat-angela",
      linqMessageId: "msg-angela",
    });
    expect(contact?.linqChatId).toBe("chat-angela");
    expect(
      messages.find((message) => message.outreachAttemptId === outreachAttemptId),
    ).toMatchObject({
      careContactId: contactId,
      coordinationEventId: eventId,
      body: "Can you cover Wednesday?",
      linqMessageId: "msg-angela",
    });
    expect(audits.some((audit) => audit.event === "outreach_sent")).toBe(true);
  });

  it("reuses an existing contact Linq chat for approved outreach", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554007", chatId: "chat-outreach-7" },
    );
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Marcus",
      phone: "+16515554701",
      linqChatId: "chat-marcus-existing",
      eventTitle: "Reuse chat coverage",
    });
    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Marcus",
        purpose: "Ask about reuse chat coverage",
        message: "Can you cover Friday?",
        coordinationEventTitle: "Reuse chat coverage",
      },
    });
    const approved = await t.mutation(
      internal.outreachAttempts.resolveApprovalFromMessage,
      {
        careCaseId,
        approvedByUserId: userId,
        messageBody: "Yes, ask Marcus",
      },
    );
    if (approved.action !== "approved") {
      throw new Error("Expected approved outreach");
    }
    const outreachAttemptId = approved.id;
    if (!outreachAttemptId) {
      throw new Error("Expected approved outreach id");
    }

    process.env.LINQ_API_TOKEN = "token";
    process.env.LINQ_PHONE_NUMBER = "+16515550000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              message: { id: "msg-existing", service: "iMessage" },
            }),
          ),
      }),
    );

    const result = await t.action(internal.outreachExecution.executeApproved, {
      outreachAttemptId,
    });
    const fetchCalls = vi.mocked(fetch).mock.calls;

    expect(result).toMatchObject({
      sent: true,
      chatId: "chat-marcus-existing",
      messageId: "msg-existing",
    });
    expect(fetchCalls[0][0]).toContain("/chats/chat-marcus-existing/messages");
  });

  it("marks approved outreach failed when Linq send fails", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515554008", chatId: "chat-outreach-8" },
    );
    await createContactAndEvent(t, {
      careCaseId,
      userId,
      name: "Angela",
      phone: "+16515554801",
      eventTitle: "Failed coverage",
    });
    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Angela",
        purpose: "Ask about failed coverage",
        message: "Can you cover Saturday?",
        coordinationEventTitle: "Failed coverage",
      },
    });
    const approved = await t.mutation(
      internal.outreachAttempts.resolveApprovalFromMessage,
      {
        careCaseId,
        approvedByUserId: userId,
        messageBody: "Yes, ask Angela",
      },
    );
    if (approved.action !== "approved") {
      throw new Error("Expected approved outreach");
    }
    const outreachAttemptId = approved.id;
    if (!outreachAttemptId) {
      throw new Error("Expected approved outreach id");
    }

    process.env.LINQ_API_TOKEN = "token";
    process.env.LINQ_PHONE_NUMBER = "+16515550000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        text: () => Promise.resolve(JSON.stringify({ error: "server error" })),
      }),
    );

    const result = await t.action(internal.outreachExecution.executeApproved, {
      outreachAttemptId,
    });
    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const audits = await t.query(api.auditLogs.listByCareCase, { careCaseId });

    expect(result).toMatchObject({ sent: false });
    expect(attempts[0]).toMatchObject({
      status: "failed",
      failureReason: "{\"error\":\"server error\"}",
    });
    expect(audits.some((audit) => audit.event === "outreach_failed")).toBe(true);
  });
});
