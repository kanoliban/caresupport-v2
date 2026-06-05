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

  it("refuses dry-run execution until readiness clears placeholder test numbers", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559003",
      robChatId: "chat-rob-dry-run-blocked",
      useTestContactPhones: true,
    });

    const result = await t.action(internal.admin.runRobControlledLoopDryRun, {
      robPhone: "+16515559003",
      contactKeys: ["jim"],
      now: 1_776_000_000_000,
    });
    const detail = await t.query(
      internal.admin.getRobMultiplayerReadiness,
      { robPhone: "+16515559003" },
    );

    expect(result).toMatchObject({
      ran: false,
      reason: "not_ready",
    });
    expect(result.readiness.blockers).toContain(
      "controlled_contact_uses_generated_fixture_phone:jim",
    );
    expect(detail.readyForControlledOutreach).toBe(false);
  });

  it("runs a no-Linq controlled dry run through outreach, reply, and Rob status rows", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559004",
      robChatId: "chat-rob-dry-run",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559911", linqChatId: "chat-jim-dry-run" },
        {
          key: "jennifer",
          phone: "+16515559912",
          linqChatId: "chat-jennifer-dry-run",
        },
      ],
    });

    const result = await t.action(internal.admin.runRobControlledLoopDryRun, {
      robPhone: "+16515559004",
      now: 1_776_000_000_000,
    });
    const detail = await t.query(internal.admin.getCareCaseDetail, {
      careCaseId: fixture.careCaseId,
    });
    const messages = await t.query(api.messages.listByCareCase, {
      careCaseId: fixture.careCaseId,
    });

    expect(result.ran).toBe(true);
    expect(result.simulated).toHaveLength(2);
    expect(result.simulated.map((item) => item.replyStatus)).toEqual([
      "confirmed",
      "confirmed",
    ]);
    expect(detail?.outreachAttempts.filter((attempt) => attempt.status === "sent"))
      .toHaveLength(2);
    const controlledEvent = detail?.coordinationEvents.find((event) =>
      event.title === "Rob schedule confirmation controlled test"
    );
    expect(controlledEvent?.confirmedContactIds).toHaveLength(2);
    expect(
      messages.filter((message) =>
        message.body.startsWith("CareSupport dry-run update:")
      ),
    ).toHaveLength(2);
    expect(
      messages.filter((message) =>
        message.direction === "inbound" &&
        message.body.includes("controlled dry-run schedule is correct")
      ),
    ).toHaveLength(2);
  });

  it("reports activation blockers before the controlled loop has evidence", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559005",
      robChatId: "chat-rob-report-before-run",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559921", linqChatId: "chat-jim-report" },
        {
          key: "jennifer",
          phone: "+16515559922",
          linqChatId: "chat-jennifer-report",
        },
      ],
    });

    const report = await t.query(internal.admin.getRobControlledLoopReport, {
      robPhone: "+16515559005",
    });

    expect(report.fixturePresent).toBe(true);
    expect(report.passed).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "rob_status_message_missing",
        "rob_status_audit_missing",
        "sent_outreach_missing:jim",
        "outbound_message_missing:jim",
        "inbound_reply_missing:jim",
        "sent_outreach_missing:jennifer",
        "outbound_message_missing:jennifer",
        "inbound_reply_missing:jennifer",
      ]),
    );
    expect(report.contacts.map((contact) => ({
      key: contact.key,
      passed: contact.passed,
      sentOutreachAttemptIds: contact.sentOutreachAttemptIds,
      inboundReplyMessageId: contact.inboundReplyMessageId,
    }))).toEqual([
      {
        key: "jim",
        passed: false,
        sentOutreachAttemptIds: [],
        inboundReplyMessageId: undefined,
      },
      {
        key: "jennifer",
        passed: false,
        sentOutreachAttemptIds: [],
        inboundReplyMessageId: undefined,
      },
    ]);
  });

  it("reports the no-Linq controlled dry run as passing with source-linked evidence", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559006",
      robChatId: "chat-rob-report-pass",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559931", linqChatId: "chat-jim-report-pass" },
        {
          key: "jennifer",
          phone: "+16515559932",
          linqChatId: "chat-jennifer-report-pass",
        },
      ],
    });

    await t.action(internal.admin.runRobControlledLoopDryRun, {
      robPhone: "+16515559006",
      now: 1_776_000_000_000,
    });

    const report = await t.query(internal.admin.getRobControlledLoopReport, {
      robPhone: "+16515559006",
    });

    expect(report.passed).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.warnings).toEqual(
      expect.arrayContaining([
        "live_reply_audit_missing:jim",
        "live_reply_audit_missing:jennifer",
      ]),
    );
    expect(report.robStatusMessageIds).toHaveLength(2);
    expect(report.contacts.map((contact) => ({
      key: contact.key,
      passed: contact.passed,
      confirmedOnEvent: contact.confirmedOnEvent,
      pendingOnEvent: contact.pendingOnEvent,
      followUpClockClearedOrDeferred: contact.followUpClockClearedOrDeferred,
      audit: contact.audit,
      hasOutboundMessage: Boolean(contact.outboundMessageId),
      hasInboundReply: Boolean(contact.inboundReplyMessageId),
    }))).toEqual([
      {
        key: "jim",
        passed: true,
        confirmedOnEvent: true,
        pendingOnEvent: false,
        followUpClockClearedOrDeferred: true,
        audit: {
          outreachRequested: true,
          outreachApproved: true,
          outreachSent: true,
          liveReplyReceived: false,
          statusSentToRob: true,
        },
        hasOutboundMessage: true,
        hasInboundReply: true,
      },
      {
        key: "jennifer",
        passed: true,
        confirmedOnEvent: true,
        pendingOnEvent: false,
        followUpClockClearedOrDeferred: true,
        audit: {
          outreachRequested: true,
          outreachApproved: true,
          outreachSent: true,
          liveReplyReceived: false,
          statusSentToRob: true,
        },
        hasOutboundMessage: true,
        hasInboundReply: true,
      },
    ]);
  });

  it("resets dry-run state so the controlled event is ready for live test-number outreach", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559008",
      robChatId: "chat-rob-reset-after-dry-run",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559951", linqChatId: "chat-jim-reset" },
        {
          key: "jennifer",
          phone: "+16515559952",
          linqChatId: "chat-jennifer-reset",
        },
      ],
    });
    await t.action(internal.admin.runRobControlledLoopDryRun, {
      robPhone: "+16515559008",
      now: 1_776_000_000_000,
    });

    const reportBeforeReset = await t.query(
      internal.admin.getRobControlledLoopReport,
      { robPhone: "+16515559008" },
    );
    const readinessBeforeReset = await t.query(
      internal.admin.getRobMultiplayerReadiness,
      { robPhone: "+16515559008" },
    );

    expect(reportBeforeReset.passed).toBe(true);
    expect(readinessBeforeReset.readyForControlledOutreach).toBe(false);
    expect(readinessBeforeReset.blockers).toEqual(
      expect.arrayContaining([
        "controlled_contact_not_pending:jim",
        "controlled_contact_not_pending:jennifer",
      ]),
    );

    const reset = await t.mutation(
      internal.admin.resetRobControlledLoopAfterDryRun,
      {
        robPhone: "+16515559008",
        now: 1_776_000_100_000,
      },
    );
    const readinessAfterReset = await t.query(
      internal.admin.getRobMultiplayerReadiness,
      { robPhone: "+16515559008" },
    );
    const reportAfterReset = await t.query(
      internal.admin.getRobControlledLoopReport,
      { robPhone: "+16515559008" },
    );
    const detail = await t.query(internal.admin.getCareCaseDetail, {
      careCaseId: fixture.careCaseId,
    });
    const controlledEvent = detail?.coordinationEvents.find(
      (event) => event._id === fixture.coordinationEventId,
    );
    const controlledAttempts = detail?.outreachAttempts.filter((attempt) =>
      reset.cancelledDryRunAttemptIds.includes(attempt._id)
    );

    expect(reset.reset).toBe(true);
    expect(reset.cancelledDryRunAttemptIds).toHaveLength(2);
    expect(reset.restoredPendingContactIds).toEqual(
      fixture.controlledPendingContactIds,
    );
    expect(reset.clearedContactReplyIds).toHaveLength(2);
    expect(readinessAfterReset.readyForControlledOutreach).toBe(true);
    expect(readinessAfterReset.blockers).toEqual([]);
    expect(reportAfterReset.passed).toBe(false);
    expect(reportAfterReset.blockers).toEqual(
      expect.arrayContaining([
        "sent_outreach_missing:jim",
        "sent_outreach_missing:jennifer",
      ]),
    );
    expect(controlledEvent?.pendingContactIds).toEqual(
      fixture.controlledPendingContactIds,
    );
    expect(controlledEvent?.confirmedContactIds ?? []).toEqual([]);
    expect(controlledAttempts?.map((attempt) => attempt.status)).toEqual([
      "cancelled",
      "cancelled",
    ]);
  });

  it("requires Rob status evidence after the latest controlled reply", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559009",
      robChatId: "chat-rob-fresh-status",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559961", linqChatId: "chat-jim-fresh" },
      ],
    });
    await t.action(internal.admin.runRobControlledLoopDryRun, {
      robPhone: "+16515559009",
      contactKeys: ["jim"],
      now: 1_776_000_000_000,
    });
    await t.mutation(internal.admin.resetRobControlledLoopAfterDryRun, {
      robPhone: "+16515559009",
      controlledContactKeys: ["jim"],
      now: 1_776_000_100_000,
    });

    await t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId: fixture.careCaseId,
      requestedByUserId: fixture.userId,
      request: {
        contactName: "Jim Nelson",
        purpose: "Confirm Rob's weekday coverage after reset",
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
      throw new Error("Expected approved outreach after reset");
    }
    await t.mutation(internal.outreachAttempts.markSent, {
      outreachAttemptId: approved.id,
      linqChatId: "chat-jim-live-after-reset",
      linqMessageId: "msg-jim-live-after-reset",
    });
    const resolved = await t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "+16515559961",
      chatId: "chat-jim-live-after-reset",
    });
    if (!resolved?.coordinationEventId) {
      throw new Error("Expected Jim reply to resolve after reset");
    }
    const replyAt = 1_776_000_300_000;
    const sourceMessageId = await t.mutation(internal.mutations.logMessage, {
      careCaseId: fixture.careCaseId,
      userId: fixture.userId,
      senderPhone: "+16515559961",
      actorType: "user",
      direction: "inbound",
      displayName: "Jim Nelson",
      body: "Yes, Monday through Friday 9 to 5 is still right.",
      timestamp: replyAt,
      careContactId: resolved.careContactId,
      coordinationEventId: resolved.coordinationEventId,
      outreachAttemptId: resolved.outreachAttemptId,
    });
    await t.mutation(internal.contactReplies.applyInboundReplyToEvent, {
      careCaseId: fixture.careCaseId,
      careContactId: resolved.careContactId,
      coordinationEventId: resolved.coordinationEventId,
      outreachAttemptId: resolved.outreachAttemptId,
      messageBody: "Yes, Monday through Friday 9 to 5 is still right.",
      sourceMessageId,
    });

    const staleReport = await t.query(internal.admin.getRobControlledLoopReport, {
      robPhone: "+16515559009",
      controlledContactKeys: ["jim"],
    });

    expect(staleReport.passed).toBe(false);
    expect(staleReport.blockers).toEqual(
      expect.arrayContaining([
        "rob_status_message_stale",
        "rob_status_audit_stale",
      ]),
    );
    expect(staleReport.robStatusMessageIds).toEqual([]);

    await t.mutation(internal.outreachAttempts.markCoordinationStatusSent, {
      coordinationEventId: resolved.coordinationEventId,
      userId: fixture.userId,
      messageBody: "CareSupport update: Jim confirmed Monday through Friday 9 to 5.",
      linqMessageId: "msg-rob-fresh-status-after-live-reply",
      now: replyAt + 1_000,
    });

    const freshReport = await t.query(internal.admin.getRobControlledLoopReport, {
      robPhone: "+16515559009",
      controlledContactKeys: ["jim"],
    });

    expect(freshReport.passed).toBe(true);
    expect(freshReport.blockers).toEqual([]);
    expect(freshReport.robStatusMessageIds).toHaveLength(1);
    expect(freshReport.contacts[0].audit.statusSentToRob).toBe(true);
  });

  it("blocks activation when a controlled caregiver phone created another care case", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.admin.seedRobMultiplayerFixture, {
      robPhone: "+16515559007",
      robChatId: "chat-rob-report-extra-case",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559941", linqChatId: "chat-jim-extra-case" },
        {
          key: "jennifer",
          phone: "+16515559942",
          linqChatId: "chat-jennifer-extra-case",
        },
      ],
    });
    await t.action(internal.admin.runRobControlledLoopDryRun, {
      robPhone: "+16515559007",
      now: 1_776_000_000_000,
    });

    await t.run(async (ctx) => {
      const careCaseId = await ctx.db.insert("careCases", {
        title: "Accidental Jim primary case",
        status: "active",
        timezone: "America/Chicago",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("users", {
        phone: "+16515559941",
        name: "Jim Nelson",
        careCaseId,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const report = await t.query(internal.admin.getRobControlledLoopReport, {
      robPhone: "+16515559007",
    });
    const jim = report.contacts.find((contact) => contact.key === "jim");

    expect(report.passed).toBe(false);
    expect(report.blockers).toContain(
      "extra_care_case_for_controlled_contact_phone:jim",
    );
    expect(jim?.passed).toBe(false);
    expect(jim?.extraCareCaseId).toBeDefined();
    expect(jim?.extraCareCaseUserId).toBeDefined();
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
