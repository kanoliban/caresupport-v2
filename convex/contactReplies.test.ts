import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { classifyCareContactReply } from "./contactReplies";

const modules = import.meta.glob("./**/*.ts");

async function createCareCaseWithUser(
  t: ReturnType<typeof convexTest>,
  phone: string,
  chatId: string,
) {
  return await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
    phone,
    chatId,
  });
}

async function createSentOutreach(
  t: ReturnType<typeof convexTest>,
  args: {
    careCaseId: Id<"careCases">;
    userId: Id<"users">;
    contactName: string;
    contactPhone: string;
    eventTitle: string;
    outreachMessage: string;
    linqChatId: string;
    linqMessageId?: string;
  },
) {
  const contactId = await t.mutation(api.careContacts.create, {
    careCaseId: args.careCaseId,
    name: args.contactName,
    phone: args.contactPhone,
    relationship: "caregiver",
    contactType: "professional_caregiver",
    role: "weekday coverage",
    availabilityNotes: "Usually available weekdays",
  });

  const eventId = await t.mutation(api.coordinationEvents.create, {
    careCaseId: args.careCaseId,
    type: "coverage_gap",
    title: args.eventTitle,
    status: "waiting",
    pendingContactIds: [contactId],
    createdByUserId: args.userId,
  });

  await t.mutation(internal.outreachAttempts.createPendingFromModel, {
    careCaseId: args.careCaseId,
    requestedByUserId: args.userId,
    request: {
      contactName: args.contactName,
      purpose: `Ask about ${args.eventTitle}`,
      message: args.outreachMessage,
      coordinationEventTitle: args.eventTitle,
    },
  });

  const approved = await t.mutation(
    internal.outreachAttempts.resolveApprovalFromMessage,
    {
      careCaseId: args.careCaseId,
      approvedByUserId: args.userId,
      messageBody: `Yes, ask ${args.contactName}`,
    },
  );
  if (approved.action !== "approved") {
    throw new Error("Expected approved outreach");
  }
  if (!approved.id) {
    throw new Error("Expected approved outreach id");
  }

  await t.mutation(internal.outreachAttempts.markSent, {
    outreachAttemptId: approved.id,
    linqChatId: args.linqChatId,
    linqMessageId: args.linqMessageId,
  });

  return {
    contactId,
    eventId,
    outreachAttemptId: approved.id,
  };
}

describe("contact reply resolution", () => {
  it("resolves an inbound caregiver reply by Linq chat id", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCaseWithUser(
      t,
      "+16515556001",
      "chat-rob",
    );
    const { contactId, eventId, outreachAttemptId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Angela",
      contactPhone: "+16515556101",
      eventTitle: "Monday morning coverage",
      outreachMessage: "Hi Angela, can you cover Monday morning for Rob?",
      linqChatId: "chat-angela",
      linqMessageId: "msg-angela-out",
    });

    const resolved = await t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "+16515556101",
      chatId: "chat-angela",
    });

    expect(resolved).toMatchObject({
      careCaseId,
      userId,
      careContactId: contactId,
      careContactName: "Angela",
      coordinationEventId: eventId,
      coordinationEventTitle: "Monday morning coverage",
      outreachAttemptId,
      outreachMessageBody: "Hi Angela, can you cover Monday morning for Rob?",
    });
  });

  it("falls back to normalized phone when the inbound payload has no chat id", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCaseWithUser(
      t,
      "+16515556002",
      "chat-rob-2",
    );
    const { contactId, outreachAttemptId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Marcus",
      contactPhone: "+16515556201",
      eventTitle: "Wednesday evening coverage",
      outreachMessage: "Hi Marcus, can you cover Wednesday evening?",
      linqChatId: "chat-marcus",
    });

    const resolved = await t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "(651) 555-6201",
      chatId: "",
    });

    expect(resolved).toMatchObject({
      careCaseId,
      userId,
      careContactId: contactId,
      careContactName: "Marcus",
      outreachAttemptId,
    });
  });

  it("does not resolve by phone when multiple care cases have sent outreach to the same number", async () => {
    const t = convexTest(schema, modules);
    const first = await createCareCaseWithUser(t, "+16515556003", "chat-rob-3");
    const second = await createCareCaseWithUser(t, "+16515556004", "chat-rob-4");

    await createSentOutreach(t, {
      careCaseId: first.careCaseId,
      userId: first.userId,
      contactName: "Shared",
      contactPhone: "+16515556301",
      eventTitle: "First coverage",
      outreachMessage: "Can you cover first?",
      linqChatId: "chat-shared-first",
    });
    await createSentOutreach(t, {
      careCaseId: second.careCaseId,
      userId: second.userId,
      contactName: "Shared",
      contactPhone: "+16515556301",
      eventTitle: "Second coverage",
      outreachMessage: "Can you cover second?",
      linqChatId: "chat-shared-second",
    });

    const resolved = await t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "+16515556301",
      chatId: "",
    });

    expect(resolved).toBeNull();
  });

  it("does not resolve a known contact by phone before sent outreach exists", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId } = await createCareCaseWithUser(
      t,
      "+16515556007",
      "chat-rob-7",
    );
    await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Uncontacted",
      phone: "+16515556701",
      contactType: "family",
    });

    const resolved = await t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "+16515556701",
      chatId: "",
    });

    expect(resolved).toBeNull();
  });

  it("marks clear yes replies as confirmed on the related event", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCaseWithUser(
      t,
      "+16515556005",
      "chat-rob-5",
    );
    const { contactId, eventId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Angela",
      contactPhone: "+16515556501",
      eventTitle: "Friday coverage",
      outreachMessage: "Can you cover Friday?",
      linqChatId: "chat-angela-confirm",
    });

    const result = await t.mutation(internal.contactReplies.applyInboundReplyToEvent, {
      careCaseId,
      careContactId: contactId,
      coordinationEventId: eventId,
      messageBody: "Yes, Friday works for me.",
    });
    const event = await t.query(api.coordinationEvents.get, {
      careCaseId,
      id: eventId,
    });

    expect(result.status).toBe("confirmed");
    expect(event?.confirmedContactIds).toContain(contactId);
    expect(event?.pendingContactIds).not.toContain(contactId);
    expect(event?.declinedContactIds ?? []).not.toContain(contactId);
  });

  it("marks clear no replies as declined without resolving the event", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCaseWithUser(
      t,
      "+16515556006",
      "chat-rob-6",
    );
    const { contactId, eventId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Marcus",
      contactPhone: "+16515556601",
      eventTitle: "Saturday coverage",
      outreachMessage: "Can you cover Saturday?",
      linqChatId: "chat-marcus-decline",
    });

    const result = await t.mutation(internal.contactReplies.applyInboundReplyToEvent, {
      careCaseId,
      careContactId: contactId,
      coordinationEventId: eventId,
      messageBody: "No, I can't do Saturday.",
    });
    const event = await t.query(api.coordinationEvents.get, {
      careCaseId,
      id: eventId,
    });

    expect(result.status).toBe("declined");
    expect(event?.declinedContactIds).toContain(contactId);
    expect(event?.pendingContactIds).not.toContain(contactId);
    expect(event?.status).toBe("waiting");
  });
});

describe("classifyCareContactReply", () => {
  it("classifies confirmations, declines, partial availability, and unclear replies", () => {
    expect(classifyCareContactReply("Yes, that works")).toBe("confirmed");
    expect(classifyCareContactReply("No, I can't")).toBe("declined");
    expect(classifyCareContactReply("I can do Monday afternoon")).toBe("confirmed");
    expect(classifyCareContactReply("Monday afternoon only")).toBe("partial");
    expect(classifyCareContactReply("Let me check")).toBe("needs_clarification");
  });
});
