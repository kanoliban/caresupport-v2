import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

type TestRuntime = ReturnType<typeof convexTest>;

interface TranscriptRuntime {
  t: TestRuntime;
  userId: Id<"users">;
  careCaseId: Id<"careCases">;
}

async function createActiveCoordinatorRuntime(): Promise<TranscriptRuntime> {
  const t = convexTest(schema, modules);
  const { userId, careCaseId } = await t.mutation(
    internal.mutations.createOnboardingUserAndCareCase,
    { phone: "+16515558001", chatId: "chat-rob-transcript" },
  );

  await t.mutation(internal.mutations.updateUserProfile, {
    userId,
    name: "Rob",
    relationshipToRecipient: "self",
    status: "active",
  });
  await t.mutation(internal.mutations.updateCareCaseProfile, {
    careCaseId,
    careRecipientName: "Rob",
    relationshipToRecipient: "self",
    status: "active",
  });

  return { t, userId, careCaseId };
}

async function logTranscriptMessage(
  runtime: TranscriptRuntime,
  args: {
    actorType: "user" | "assistant";
    direction: "inbound" | "outbound";
    body: string;
    senderPhone?: string;
    displayName?: string;
    linqMessageId?: string;
    careContactId?: Id<"careContacts">;
    coordinationEventId?: Id<"coordinationEvents">;
    outreachAttemptId?: Id<"outreachAttempts">;
  },
) {
  return await runtime.t.mutation(internal.mutations.logMessage, {
    careCaseId: runtime.careCaseId,
    userId: runtime.userId,
    actorType: args.actorType,
    direction: args.direction,
    body: args.body,
    timestamp: Date.now(),
    senderPhone: args.senderPhone,
    displayName: args.displayName,
    linqMessageId: args.linqMessageId,
    careContactId: args.careContactId,
    coordinationEventId: args.coordinationEventId,
    outreachAttemptId: args.outreachAttemptId,
  });
}

async function applyModelStructuredSetup(runtime: TranscriptRuntime) {
  const { t, careCaseId } = runtime;

  await t.mutation(internal.mutations.upsertCareContactFromModel, {
    careCaseId,
    update: {
      action: "add",
      name: "Angela",
      phone: "+16515558101",
      relationship: "caregiver",
      contactType: "professional_caregiver",
      role: "weekday coverage",
      availabilityNotes: "Usually helps on weekdays.",
      canReceiveTexts: true,
    },
  });
  await t.mutation(internal.mutations.upsertCareContactFromModel, {
    careCaseId,
    update: {
      action: "add",
      name: "Marcus",
      phone: "+16515558102",
      relationship: "family",
      contactType: "family",
      role: "backup coverage",
      canReceiveTexts: true,
    },
  });
  await t.mutation(internal.mutations.upsertCoordinationEventFromModel, {
    careCaseId,
    update: {
      action: "add",
      title: "Monday 9-5 coverage",
      type: "coverage_gap",
      status: "waiting",
      urgency: "high",
      description: "Rob needs Monday 9am-5pm caregiver coverage.",
      pendingContactNames: ["Angela", "Marcus"],
      fallbackContactNames: ["Marcus"],
    },
  });

  const contacts = await t.query(api.careContacts.listActiveByCareCase, {
    careCaseId,
  });
  const events = await t.query(api.coordinationEvents.listByCareCase, {
    careCaseId,
  });

  const angela = contacts.find((contact) => contact.name === "Angela");
  const marcus = contacts.find((contact) => contact.name === "Marcus");
  const event = events.find((candidate) => candidate.title === "Monday 9-5 coverage");

  if (!angela || !marcus || !event) {
    throw new Error("Transcript setup failed");
  }

  return { angela, marcus, event };
}

function contactNamesByIds(
  ids: Array<Id<"careContacts">> | undefined,
  contacts: Array<{ _id: Id<"careContacts">; name: string }>,
): string[] {
  return (ids ?? []).map((id) => {
    const contact = contacts.find((candidate) => candidate._id === id);
    return contact?.name ?? String(id);
  });
}

async function buildSimulatorResult(
  runtime: TranscriptRuntime,
  eventId: Id<"coordinationEvents">,
) {
  const [contacts, messages, audits, event, compiled] = await Promise.all([
    runtime.t.query(api.careContacts.listActiveByCareCase, {
      careCaseId: runtime.careCaseId,
    }),
    runtime.t.query(api.messages.listByCareCase, {
      careCaseId: runtime.careCaseId,
    }),
    runtime.t.query(api.auditLogs.listByCareCase, {
      careCaseId: runtime.careCaseId,
    }),
    runtime.t.query(api.coordinationEvents.get, {
      careCaseId: runtime.careCaseId,
      id: eventId,
    }),
    runtime.t.mutation(internal.mutations.getCompiledPromptContext, {
      userId: runtime.userId,
      careCaseId: runtime.careCaseId,
    }),
  ]);

  if (!event) throw new Error("Expected coordination event");

  const sourceMessage = messages.find(
    (message) => message._id === event.lastReplyMessageId,
  );

  return {
    eventTitle: event.title,
    eventStatus: event.status,
    confirmed: contactNamesByIds(event.confirmedContactIds, contacts),
    pending: contactNamesByIds(event.pendingContactIds, contacts),
    declined: contactNamesByIds(event.declinedContactIds, contacts),
    lastReplyStatus: event.lastReplyStatus,
    lastReplySourceBody: sourceMessage?.body,
    messageCount: messages.length,
    auditEvents: audits.map((audit) => audit.event).sort(),
    promptContextContainsLastReply:
      compiled?.careCaseContext.includes("last reply partial") ?? false,
  };
}

describe("coordination loop transcript simulator", () => {
  it("validates coordinator need -> approval -> outreach -> caregiver reply -> source-linked state", async () => {
    const runtime = await createActiveCoordinatorRuntime();

    // Transcript step 1: Rob describes the care coordination need.
    await logTranscriptMessage(runtime, {
      actorType: "user",
      direction: "inbound",
      displayName: "Rob",
      senderPhone: "+16515558001",
      body: "Angela might be able to cover Monday 9 to 5, and Marcus is backup. Can you ask Angela first?",
    });

    // Transcript step 2: model structured output initializes graph + state.
    const { angela, event } = await applyModelStructuredSetup(runtime);
    await runtime.t.mutation(internal.outreachAttempts.createPendingFromModel, {
      careCaseId: runtime.careCaseId,
      requestedByUserId: runtime.userId,
      request: {
        contactName: "Angela",
        purpose: "Ask Angela about Monday 9-5 coverage",
        message:
          "Hi Angela, I'm CareSupport, helping Rob coordinate care. Rob asked me to check whether you can cover Monday 9am-5pm. Is this a good number to text, and are you available then?",
        coordinationEventTitle: event.title,
      },
      approvalPrompt:
        "I can ask Angela about Monday 9-5 coverage. Do you want me to send that?",
    });
    await logTranscriptMessage(runtime, {
      actorType: "assistant",
      direction: "outbound",
      displayName: "Rob",
      senderPhone: "+16515558001",
      body: "I can ask Angela about Monday 9-5 coverage. Do you want me to send that?",
    });

    // Transcript step 3: Rob approves one exact outreach attempt.
    await logTranscriptMessage(runtime, {
      actorType: "user",
      direction: "inbound",
      displayName: "Rob",
      senderPhone: "+16515558001",
      body: "Yes, ask Angela.",
    });
    const approved = await runtime.t.mutation(
      internal.outreachAttempts.resolveApprovalFromMessage,
      {
        careCaseId: runtime.careCaseId,
        approvedByUserId: runtime.userId,
        messageBody: "Yes, ask Angela.",
      },
    );
    expect(approved).toMatchObject({
      action: "approved",
      contactName: "Angela",
    });
    if (approved.action !== "approved") {
      throw new Error("Expected approved outreach");
    }
    const outreachAttemptId = approved.id;
    if (!outreachAttemptId) {
      throw new Error("Expected approved outreach id");
    }

    // Transcript step 4: the runtime sends the approved one-to-one outreach.
    await runtime.t.mutation(internal.outreachAttempts.markSent, {
      outreachAttemptId,
      linqChatId: "chat-angela-transcript",
      linqMessageId: "msg-out-angela-transcript",
    });

    // Transcript step 5: Angela replies from the one-to-one caregiver thread.
    const resolved = await runtime.t.mutation(internal.contactReplies.resolveInbound, {
      senderPhone: "+16515558101",
      chatId: "chat-angela-transcript",
    });
    expect(resolved).toMatchObject({
      careContactId: angela._id,
      coordinationEventId: event._id,
      outreachAttemptId,
    });
    if (!resolved?.coordinationEventId) {
      throw new Error("Expected caregiver reply resolution");
    }

    const caregiverReplyBody = "I can do Monday afternoon only, 1 to 5.";
    const caregiverReplyMessageId = await logTranscriptMessage(runtime, {
      actorType: "user",
      direction: "inbound",
      displayName: "Angela",
      senderPhone: "+16515558101",
      body: caregiverReplyBody,
      linqMessageId: "msg-in-angela-transcript",
      careContactId: resolved.careContactId,
      coordinationEventId: resolved.coordinationEventId,
      outreachAttemptId: resolved.outreachAttemptId,
    });
    const replyState = await runtime.t.mutation(
      internal.contactReplies.applyInboundReplyToEvent,
      {
        careCaseId: runtime.careCaseId,
        careContactId: resolved.careContactId,
        coordinationEventId: resolved.coordinationEventId,
        messageBody: caregiverReplyBody,
        sourceMessageId: caregiverReplyMessageId,
      },
    );
    await runtime.t.mutation(internal.mutations.logAudit, {
      careCaseId: runtime.careCaseId,
      userId: runtime.userId,
      event: "care_contact_reply_received",
      phone: "+16515558101",
      details: {
        careContactId: resolved.careContactId,
        coordinationEventId: resolved.coordinationEventId,
        outreachAttemptId: resolved.outreachAttemptId,
        sourceMessageId: caregiverReplyMessageId,
        messageBody: caregiverReplyBody,
        status: replyState.status,
        linqChatId: "chat-angela-transcript",
        linqMessageId: "msg-in-angela-transcript",
      },
      timestamp: Date.now(),
    });

    // Transcript step 6: CareSupport can tell Rob what changed from state.
    const simulatorResult = await buildSimulatorResult(runtime, event._id);
    await logTranscriptMessage(runtime, {
      actorType: "assistant",
      direction: "outbound",
      displayName: "Rob",
      senderPhone: "+16515558001",
      body:
        "Angela replied that she can do Monday afternoon only, 1 to 5. I have not marked Monday 9 to 5 as covered yet; Marcus is still pending as backup.",
      coordinationEventId: event._id,
      careContactId: angela._id,
      outreachAttemptId,
    });

    expect(replyState.status).toBe("partial");
    expect(simulatorResult).toMatchObject({
      eventTitle: "Monday 9-5 coverage",
      eventStatus: "waiting",
      confirmed: [],
      pending: ["Angela", "Marcus"],
      declined: [],
      lastReplyStatus: "partial",
      lastReplySourceBody: caregiverReplyBody,
      messageCount: 5,
      promptContextContainsLastReply: true,
    });
    expect(simulatorResult.auditEvents).toEqual(
      expect.arrayContaining([
        "outreach_requested",
        "outreach_approved",
        "outreach_sent",
        "care_contact_reply_received",
      ]),
    );

    const finalMessages = await runtime.t.query(api.messages.listByCareCase, {
      careCaseId: runtime.careCaseId,
    });
    expect(finalMessages).toHaveLength(6);
    expect(finalMessages.at(-1)).toMatchObject({
      actorType: "assistant",
      direction: "outbound",
      body:
        "Angela replied that she can do Monday afternoon only, 1 to 5. I have not marked Monday 9 to 5 as covered yet; Marcus is still pending as backup.",
      careContactId: angela._id,
      coordinationEventId: event._id,
      outreachAttemptId,
    });
  });
});
