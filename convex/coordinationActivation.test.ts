import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

async function createGenericCoordinatorCase() {
  const t = convexTest(schema, modules);
  const now = 1_776_000_000_000;
  const ids = await t.run(async (ctx) => {
    const careCaseId = await ctx.db.insert("careCases", {
      title: "Private beta coordination test",
      status: "active",
      timezone: "America/Chicago",
      careRecipientName: "Diane",
      relationshipToRecipient: "mom",
      createdAt: now,
      updatedAt: now,
    });
    const userId = await ctx.db.insert("users", {
      phone: "+16515559000",
      name: "Sarah Coordinator",
      careCaseId,
      status: "active",
      relationshipToRecipient: "daughter",
      chatId: "chat-sarah-coordinator",
      createdAt: now,
      updatedAt: now,
    });
    const angelaId = await ctx.db.insert("careContacts", {
      careCaseId,
      name: "Angela",
      phone: "+16515559901",
      relationship: "caregiver",
      contactType: "professional_caregiver",
      role: "PCA",
      availabilityNotes: "Can cover Wednesday evenings.",
      contactPriority: 1,
      canReceiveTexts: true,
      consentToContact: true,
      linqChatId: "chat-angela",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    const mayaId = await ctx.db.insert("careContacts", {
      careCaseId,
      name: "Maya",
      phone: "+16515559902",
      relationship: "neighbor",
      contactType: "family",
      role: "backup helper",
      availabilityNotes: "Backup coverage.",
      contactPriority: 2,
      canReceiveTexts: true,
      consentToContact: true,
      linqChatId: "chat-maya",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    const eventId = await ctx.db.insert("coordinationEvents", {
      careCaseId,
      type: "coverage_gap",
      title: "Wednesday coverage check",
      status: "waiting",
      urgency: "normal",
      description: "Confirm who can cover Diane on Wednesday evening.",
      pendingContactIds: [angelaId, mayaId],
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });
    return { careCaseId, userId, angelaId, mayaId, eventId };
  });
  return { t, ...ids };
}

describe("generic coordination activation", () => {
  it("reports readiness from an existing onboarding-created coordinator graph", async () => {
    const { t, careCaseId, eventId } = await createGenericCoordinatorCase();

    const readiness = await t.query(internal.admin.getCoordinationReadiness, {
      coordinatorPhone: "+16515559000",
      coordinatorChatId: "chat-sarah-coordinator",
      controlledContactNames: ["Angela", "Maya"],
      coordinationEventTitle: "Wednesday coverage check",
    });

    expect(readiness).toMatchObject({
      readyForControlledOutreach: true,
      existingCoordinatorPresent: true,
      careCaseId,
      controlledEventId: eventId,
      controlledEventTitle: "Wednesday coverage check",
      coordinatorChatIdPresent: true,
      blockers: [],
    });
    expect(readiness.controlledContacts?.map((contact) => ({
      name: contact.name,
      phonePresent: contact.phonePresent,
      canReceiveTexts: contact.canReceiveTexts,
      inPendingEvent: contact.inPendingEvent,
    }))).toEqual([
      {
        name: "Angela",
        phonePresent: true,
        canReceiveTexts: true,
        inPendingEvent: true,
      },
      {
        name: "Maya",
        phonePresent: true,
        canReceiveTexts: true,
        inPendingEvent: true,
      },
    ]);
  });

  it("does not treat a missing coordinator as something to seed", async () => {
    const t = convexTest(schema, modules);

    const readiness = await t.query(internal.admin.getCoordinationReadiness, {
      coordinatorPhone: "+16515559099",
    });

    expect(readiness).toMatchObject({
      readyForControlledOutreach: false,
      existingCoordinatorPresent: false,
      blockers: ["coordinator_user_missing"],
    });
  });

  it("verifies live source-linked outreach and coordinator status without Rob data", async () => {
    const { t, careCaseId, userId, eventId } = await createGenericCoordinatorCase();

    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId,
      requestedByUserId: userId,
      request: {
        contactName: "Angela",
        purpose: "Confirm Wednesday evening coverage",
        message:
          "Hi Angela, this is CareSupport helping coordinate Diane's care. Can you cover Wednesday evening?",
        coordinationEventTitle: "Wednesday coverage check",
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
    if (approved.action !== "approved" || !approved.id) {
      throw new Error("Expected approved outreach");
    }
    await t.mutation(internal.outreachAttempts.markSent, {
      outreachAttemptId: approved.id,
      linqChatId: "chat-angela-live",
      linqMessageId: "msg-angela-live",
    });

    const resolved = await t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "+16515559901",
      chatId: "chat-angela-live",
    });
    if (!resolved?.coordinationEventId) {
      throw new Error("Expected Angela reply to resolve");
    }
    const replyAt = 1_776_000_300_000;
    const sourceMessageId = await t.mutation(internal.mutations.logMessage, {
      careCaseId,
      userId,
      senderPhone: "+16515559901",
      actorType: "user",
      direction: "inbound",
      displayName: "Angela",
      body: "Yes, I can cover Wednesday evening.",
      timestamp: replyAt,
      careContactId: resolved.careContactId,
      coordinationEventId: resolved.coordinationEventId,
      outreachAttemptId: resolved.outreachAttemptId,
    });
    const replyState = await t.mutation(internal.contactReplies.applyInboundReplyToEvent, {
      careCaseId,
      careContactId: resolved.careContactId,
      coordinationEventId: resolved.coordinationEventId,
      outreachAttemptId: resolved.outreachAttemptId,
      messageBody: "Yes, I can cover Wednesday evening.",
      sourceMessageId,
    });
    await t.mutation(internal.mutations.logAudit, {
      careCaseId,
      userId,
      event: "care_contact_reply_received",
      phone: "+16515559901",
      details: {
        careContactId: resolved.careContactId,
        coordinationEventId: resolved.coordinationEventId,
        outreachAttemptId: resolved.outreachAttemptId,
        sourceMessageId,
        messageBody: "Yes, I can cover Wednesday evening.",
        status: replyState.status,
        linqChatId: "chat-angela-live",
        linqMessageId: "msg-angela-live-reply",
      },
      timestamp: replyAt,
    });
    await t.mutation(internal.outreachAttempts.markCoordinationStatusSent, {
      coordinationEventId: eventId,
      userId,
      messageBody: "CareSupport update: Angela confirmed Wednesday evening.",
      linqMessageId: "msg-coordinator-status",
      now: replyAt + 1_000,
    });

    const report = await t.query(internal.admin.getCoordinationLoopReport, {
      coordinatorPhone: "+16515559000",
      controlledContactNames: ["Angela"],
      coordinationEventTitle: "Wednesday coverage check",
    });

    expect(report.passed).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.coordinatorStatusMessageIds).toHaveLength(1);
    expect(report.contacts).toHaveLength(1);
    expect(report.contacts[0]).toMatchObject({
      name: "Angela",
      passed: true,
      confirmedOnEvent: true,
      pendingOnEvent: false,
      followUpClockClearedOrDeferred: true,
      audit: {
        outreachRequested: true,
        outreachApproved: true,
        outreachSent: true,
        liveReplyReceived: true,
        statusSentToCoordinator: true,
      },
    });
  });
});
