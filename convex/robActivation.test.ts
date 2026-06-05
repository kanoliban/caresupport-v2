import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("Rob multiplayer activation fixture", () => {
  it("seeds Rob's coordinator case, care network, schedule, and controlled event idempotently", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559000",
      robChatId: "chat-rob-activation",
      useTestContactPhones: true,
    });
    const second = await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559000",
      robChatId: "chat-rob-activation",
      useTestContactPhones: true,
    });

    const detail = await t.query(internal.admin.getCareCaseDetail, {
      careCaseId: first.careCaseId,
    });
    const scheduleItems = await t.query(api.scheduleItems.listByCareCase, {
      careCaseId: first.careCaseId,
    });

    expect(second.careCaseId).toBe(first.careCaseId);
    expect(second.userId).toBe(first.userId);
    expect(first.contactCount).toBe(15);
    expect(first.scheduleItemCount).toBe(5);
    expect(first.controlledPendingContactNames).toEqual([
      "Jim Nelson",
      "Jennifer",
    ]);
    expect(detail?.careCase).toMatchObject({
      status: "active",
      timezone: "America/Chicago",
      careRecipientName: "Rob Wudlick",
      relationshipToRecipient: "self",
    });
    expect(detail?.user).toMatchObject({
      name: "Rob Wudlick",
      status: "active",
      chatId: "chat-rob-activation",
    });
    expect(detail?.careContacts).toHaveLength(15);
    expect(scheduleItems).toHaveLength(5);
    expect(
      detail?.careContacts.find((contact) => contact.name === "Luann Wudlick"),
    ).toMatchObject({
      canReceiveTexts: false,
      availabilityNotes: expect.stringContaining("has dementia"),
    });
    expect(
      scheduleItems.find((item) => item.title === "Jim Nelson coverage"),
    ).toMatchObject({
      recurrence: "weekly:mon,tue,wed,thu,fri",
      provider: "Jim Nelson",
    });
    expect(
      detail?.coordinationEvents.find((event) =>
        event._id === first.coordinationEventId
      ),
    ).toMatchObject({
      title: "Rob schedule confirmation controlled test",
      status: "waiting",
      pendingContactIds: first.controlledPendingContactIds,
    });
  });

  it("reports readiness blockers until explicit controlled test numbers are installed", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559002",
      robChatId: "chat-rob-readiness",
      useTestContactPhones: true,
    });

    const placeholderReadiness = await t.query(
      internal.admin.getRobMultiplayerReadiness,
      { robPhone: "+16515559002" },
    );

    expect(placeholderReadiness.fixturePresent).toBe(true);
    expect(placeholderReadiness.readyForControlledOutreach).toBe(false);
    expect(placeholderReadiness.blockers).toEqual(
      expect.arrayContaining([
        "controlled_contact_uses_generated_fixture_phone:jim",
        "controlled_contact_uses_generated_fixture_phone:jennifer",
      ]),
    );

    await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559002",
      robChatId: "chat-rob-readiness",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559901", linqChatId: "chat-jim-test" },
        {
          key: "jennifer",
          phone: "+16515559902",
          linqChatId: "chat-jennifer-test",
        },
      ],
    });

    const ready = await t.query(internal.admin.getRobMultiplayerReadiness, {
      robPhone: "+16515559002",
    });

    expect(ready.fixturePresent).toBe(true);
    expect(ready.readyForControlledOutreach).toBe(true);
    expect(ready.blockers).toEqual([]);
    expect(ready.robChatIdPresent).toBe(true);
    expect(ready.contactCount).toBe(15);
    expect(ready.scheduleItemCount).toBe(5);
    expect(
      (ready.controlledContacts ?? []).map((contact) => ({
        key: contact.key,
        phonePresent: contact.phonePresent,
        canReceiveTexts: contact.canReceiveTexts,
        inPendingEvent: contact.inPendingEvent,
        generatedFixturePhone: contact.generatedFixturePhone,
      })),
    ).toEqual([
      {
        key: "jim",
        phonePresent: true,
        canReceiveTexts: true,
        inPendingEvent: true,
        generatedFixturePhone: false,
      },
      {
        key: "jennifer",
        phonePresent: true,
        canReceiveTexts: true,
        inPendingEvent: true,
        generatedFixturePhone: false,
      },
    ]);
  });

  it("runs the seeded controlled event through approval, outreach, and caregiver reply state", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559001",
      robChatId: "chat-rob-controlled-loop",
      useTestContactPhones: true,
    });

    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId: fixture.careCaseId,
      requestedByUserId: fixture.userId,
      request: {
        contactName: "Jim Nelson",
        purpose: "Confirm Rob's weekday coverage",
        message:
          "Hi Jim, this is CareSupport helping Rob coordinate care. Can you confirm whether Monday-Friday 9am-5pm is still your usual schedule?",
        coordinationEventTitle: "Rob schedule confirmation controlled test",
      },
    });
    const approved = await t.mutation(
      internal.outreachAttempts.resolveApprovalFromMessage,
      {
        careCaseId: fixture.careCaseId,
        approvedByUserId: fixture.userId,
        messageBody: "Yes, ask Jim",
      },
    );
    if (approved.action !== "approved" || !approved.id) {
      throw new Error("Expected approved outreach");
    }

    await t.mutation(internal.outreachAttempts.markSent, {
      outreachAttemptId: approved.id,
      linqChatId: "chat-jim-controlled-loop",
      linqMessageId: "msg-jim-controlled-loop",
    });
    const resolved = await t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "+16515558003",
      chatId: "chat-jim-controlled-loop",
    });
    if (!resolved?.coordinationEventId) {
      throw new Error("Expected Jim reply to resolve to the controlled event");
    }
    const sourceMessageId = await t.mutation(internal.mutations.logMessage, {
      careCaseId: fixture.careCaseId,
      userId: fixture.userId,
      senderPhone: "+16515558003",
      actorType: "user",
      direction: "inbound",
      displayName: "Jim Nelson",
      body: "Yes, Monday through Friday 9 to 5 is still right.",
      timestamp: Date.now(),
      careContactId: resolved.careContactId,
      coordinationEventId: resolved.coordinationEventId,
      outreachAttemptId: resolved.outreachAttemptId,
    });
    const replyState = await t.mutation(
      internal.contactReplies.applyInboundReplyToEvent,
      {
        careCaseId: fixture.careCaseId,
        careContactId: resolved.careContactId,
        coordinationEventId: resolved.coordinationEventId,
        outreachAttemptId: resolved.outreachAttemptId,
        messageBody: "Yes, Monday through Friday 9 to 5 is still right.",
        sourceMessageId,
      },
    );

    const event = await t.query(api.coordinationEvents.get, {
      careCaseId: fixture.careCaseId,
      id: resolved.coordinationEventId,
    });
    const attempts = await t.query(api.outreachAttempts.listByCareCase, {
      careCaseId: fixture.careCaseId,
    });
    const attempt = attempts.find((candidate) => candidate._id === approved.id);

    expect(replyState.status).toBe("confirmed");
    expect(event?.confirmedContactIds).toContain(resolved.careContactId);
    expect(event?.pendingContactIds ?? []).not.toContain(resolved.careContactId);
    expect(event?.lastReplyStatus).toBe("confirmed");
    expect(attempt?.status).toBe("sent");
    expect(attempt?.nextActionAt).toBeUndefined();
  });
});
