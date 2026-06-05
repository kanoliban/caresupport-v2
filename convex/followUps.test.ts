import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

async function createCareCase(t: ReturnType<typeof convexTest>) {
  const { careCaseId, userId } = await t.mutation(
    internal.mutations.createOnboardingUserAndCareCase,
    { phone: "+16515558000", chatId: "chat-rob-follow-up" },
  );
  await t.mutation(internal.mutations.updateUserProfile, {
    userId,
    name: "Rob Wudlick",
    relationshipToRecipient: "self",
    status: "active",
  });
  await t.mutation(internal.mutations.updateCareCaseProfile, {
    careCaseId,
    careRecipientName: "Rob Wudlick",
    relationshipToRecipient: "self",
    status: "active",
  });
  return { careCaseId, userId };
}

async function createSentOutreach(
  t: ReturnType<typeof convexTest>,
  args: {
    careCaseId: Id<"careCases">;
    userId: Id<"users">;
    contactName: string;
    contactPhone: string;
    eventTitle: string;
    linqChatId: string;
  },
) {
  const contactId = await t.mutation(api.careContacts.create, {
    careCaseId: args.careCaseId,
    name: args.contactName,
    phone: args.contactPhone,
    relationship: "caregiver",
    contactType: "professional_caregiver",
    role: "coverage",
    availabilityNotes: "Availability still being confirmed",
    canReceiveTexts: true,
    consentToContact: true,
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
      message: `Hi ${args.contactName}, can you help with ${args.eventTitle}?`,
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
  if (approved.action !== "approved" || !approved.id) {
    throw new Error("Expected approved outreach");
  }
  await t.mutation(internal.outreachAttempts.markSent, {
    outreachAttemptId: approved.id,
    linqChatId: args.linqChatId,
    linqMessageId: `msg-${args.contactName.toLowerCase()}`,
  });

  return { contactId, eventId, outreachAttemptId: approved.id };
}

describe("coordination follow-ups", () => {
  const originalToken = process.env.LINQ_API_TOKEN;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.LINQ_API_TOKEN = originalToken;
  });

  it("finds due sent outreach, sends one reminder, and clears the due marker", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCase(t);
    const { outreachAttemptId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Jim",
      contactPhone: "+16515558101",
      eventTitle: "weekday coverage",
      linqChatId: "chat-jim-follow-up",
    });
    const [attempt] = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const dueAt = (attempt.nextActionAt ?? 0) + 1;

    const due = await t.query(internal.outreachAttempts.listDueOutreachFollowUps, {
      now: dueAt,
    });
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      kind: "caregiver_reminder",
      outreachAttemptId,
      contactName: "Jim",
      chatId: "chat-jim-follow-up",
    });
    expect(due[0].messageBody).toContain("Quick follow-up from CareSupport");
    expect(due[0].messageBody).toContain("Rob Wudlick");

    await t.mutation(internal.outreachAttempts.markOutreachFollowUpSent, {
      outreachAttemptId,
      messageBody: due[0].messageBody,
      linqMessageId: "msg-follow-up-jim",
      now: dueAt,
    });

    const [updatedAttempt] = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const messages = await t.query(api.messages.listByCareCase, { careCaseId });
    const audits = await t.query(api.auditLogs.listByCareCase, { careCaseId });

    expect(updatedAttempt.nextActionAt).toBeUndefined();
    expect(
      messages.some((message) =>
        message.outreachAttemptId === outreachAttemptId &&
        message.body.includes("Quick follow-up"),
      ),
    ).toBe(true);
    expect(
      audits.some((audit) =>
        audit.event === "response_sent" &&
        audit.details.triggerMessage === "outreach_follow_up",
      ),
    ).toBe(true);
  });

  it("clears or defers the outreach follow-up clock when a caregiver replies", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCase(t);
    const { contactId, eventId, outreachAttemptId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Sarah",
      contactPhone: "+16515558102",
      eventTitle: "Thursday overnight",
      linqChatId: "chat-sarah-follow-up",
    });

    await t.mutation(internal.contactReplies.applyInboundReplyToEvent, {
      careCaseId,
      careContactId: contactId,
      coordinationEventId: eventId,
      outreachAttemptId,
      messageBody: "Yes, that works.",
    });
    let [attempt] = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    expect(attempt.nextActionAt).toBeUndefined();

    const {
      contactId: deferredContactId,
      eventId: deferredEventId,
      outreachAttemptId: deferredAttemptId,
    } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Ella",
      contactPhone: "+16515558112",
      eventTitle: "weekend overnight",
      linqChatId: "chat-ella-follow-up",
    });
    const beforeDeferred = Date.now();
    await t.mutation(internal.contactReplies.applyInboundReplyToEvent, {
      careCaseId,
      careContactId: deferredContactId,
      coordinationEventId: deferredEventId,
      outreachAttemptId: deferredAttemptId,
      messageBody: "Let me check and get back to you later.",
    });
    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const deferredAttempt = attempts.find((candidate) =>
      candidate._id === deferredAttemptId
    );
    expect(deferredAttempt?.nextActionAt).toBeGreaterThanOrEqual(
      beforeDeferred + 6 * 60 * 60 * 1000,
    );
  });

  it("creates a due coordinator status update and logs it back to Rob", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCase(t);
    const contactId = await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Ella",
      phone: "+16515558103",
      contactType: "professional_caregiver",
      canReceiveTexts: true,
      consentToContact: true,
    });
    const dueAt = Date.now() - 1_000;
    const eventId = await t.mutation(api.coordinationEvents.create, {
      careCaseId,
      type: "coverage_gap",
      title: "weekend overnight coverage",
      status: "waiting",
      pendingContactIds: [contactId],
      nextActionAt: dueAt,
      createdByUserId: userId,
    });

    const due = await t.query(
      internal.outreachAttempts.listDueCoordinationStatusUpdates,
      { now: Date.now() },
    );
    expect(due).toHaveLength(1);
    expect(due[0].messageBody).toContain("Still waiting on: Ella.");
    expect(due[0].messageBody).toContain("I have not contacted anyone else");

    await t.mutation(internal.outreachAttempts.markCoordinationStatusSent, {
      coordinationEventId: eventId,
      userId,
      messageBody: due[0].messageBody,
      linqMessageId: "msg-rob-status",
    });

    const event = await t.query(api.coordinationEvents.get, {
      careCaseId,
      id: eventId,
    });
    const messages = await t.query(api.messages.listByCareCase, { careCaseId });
    const audits = await t.query(api.auditLogs.listByCareCase, { careCaseId });

    expect(event?.nextActionAt).toBeUndefined();
    expect(
      messages.some((message) =>
        message.userId === userId &&
        message.body.includes("Still waiting on: Ella"),
      ),
    ).toBe(true);
    expect(
      audits.some((audit) =>
        audit.event === "response_sent" &&
        audit.details.triggerMessage === "coordination_status_follow_up",
      ),
    ).toBe(true);
  });

  it("ignores resolved coordination events for caregiver and coordinator follow-ups", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCase(t);
    const { eventId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Olena",
      contactPhone: "+16515558105",
      eventTitle: "Sunday morning coverage",
      linqChatId: "chat-olena-follow-up",
    });
    const [attempt] = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    await t.mutation(api.coordinationEvents.update, {
      careCaseId,
      id: eventId,
      status: "resolved",
      nextActionAt: Date.now() - 1_000,
    });

    const dueOutreach = await t.query(
      internal.outreachAttempts.listDueOutreachFollowUps,
      { now: (attempt.nextActionAt ?? Date.now()) + 1 },
    );
    const dueCoordinator = await t.query(
      internal.outreachAttempts.listDueCoordinationStatusUpdates,
      { now: Date.now() },
    );

    expect(dueOutreach).toEqual([]);
    expect(dueCoordinator).toEqual([]);
  });

  it("dispatches due caregiver reminders through Linq without contacting fallbacks", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await createCareCase(t);
    const { outreachAttemptId } = await createSentOutreach(t, {
      careCaseId,
      userId,
      contactName: "Jennifer",
      contactPhone: "+16515558104",
      eventTitle: "Monday overnight",
      linqChatId: "chat-jennifer-follow-up",
    });
    const [attempt] = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });

    process.env.LINQ_API_TOKEN = "token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 201,
        text: () =>
          Promise.resolve(
            JSON.stringify({ message: { id: "msg-jennifer-follow-up" } }),
          ),
      }),
    );

    const report = await t.action(internal.reminders.dispatchCoordinationFollowUps, {
      now: (attempt.nextActionAt ?? Date.now()) + 1,
    });
    const [updatedAttempt] = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId,
    });
    const messages = await t.query(api.messages.listByCareCase, { careCaseId });

    expect(report).toMatchObject({
      outreachAttempted: 1,
      outreachSent: 1,
      coordinatorAttempted: 0,
      coordinatorSent: 0,
      skipped: 0,
      errors: 0,
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(updatedAttempt.nextActionAt).toBeUndefined();
    expect(
      messages.some((message) =>
        message.outreachAttemptId === outreachAttemptId &&
        message.body.includes("Quick follow-up"),
      ),
    ).toBe(true);
  });
});
