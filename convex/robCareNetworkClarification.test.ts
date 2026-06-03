import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

async function createRobRuntime() {
  const t = convexTest(schema, modules);
  const { userId, careCaseId } = await t.mutation(
    internal.mutations.createOnboardingUserAndCareCase,
    { phone: "+16515559101", chatId: "chat-rob-care-network" },
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
  return { t, userId, careCaseId };
}

describe("Rob care network clarification simulator", () => {
  it("captures messy care-network fragments as claims and asks for accuracy before acting", async () => {
    const { t, userId, careCaseId } = await createRobRuntime();
    const messyCareNetwork =
      "Jim usually does weekdays. Jennifer has Mon/Tues nights. Sarah does Wed/Thurs overnight. Ella is weekends overnight. Luann fills empty slots but she has dementia. Marta is backup and helps with mom too. Grace is off for summer.";

    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: messyCareNetwork,
      timestamp: Date.now(),
      senderPhone: "+16515559101",
      displayName: "Rob",
    });

    await t.mutation(api.careClaims.createManyFromSource, {
      careCaseId,
      sourceMessageId,
      claims: [
        {
          subjectType: "availability",
          subjectLabel: "Jim",
          predicate: "usually_does_weekdays",
          valueText: "Jim usually does weekdays.",
          status: "needs_clarification",
          confidence: "medium",
          clarificationQuestion:
            "When you say Jim usually does weekdays, should I treat that as Monday-Friday 9am-5pm right now?",
        },
        {
          subjectType: "availability",
          subjectLabel: "Jennifer",
          predicate: "has_mon_tues_nights",
          valueText: "Jennifer has Mon/Tues nights.",
          status: "needs_clarification",
          confidence: "medium",
          clarificationQuestion:
            "For Jennifer's Mon/Tues nights, does that mean overnight shifts from 8pm to 8am?",
        },
        {
          subjectType: "availability",
          subjectLabel: "Sarah",
          predicate: "has_wed_thurs_overnights",
          valueText: "Sarah does Wed/Thurs overnight.",
          status: "needs_clarification",
          confidence: "medium",
          clarificationQuestion:
            "For Sarah's Wed/Thurs overnight shifts, is that also 8pm to 8am?",
        },
        {
          subjectType: "availability",
          subjectLabel: "Ella",
          predicate: "has_weekend_overnights",
          valueText: "Ella is weekends overnight.",
          status: "needs_clarification",
          confidence: "medium",
          clarificationQuestion:
            "For Ella's weekend overnights, should I treat that as Friday, Saturday, and Sunday nights?",
        },
        {
          subjectType: "availability",
          subjectLabel: "Luann",
          predicate: "fills_empty_slots",
          valueText: "Luann fills empty slots.",
          status: "needs_clarification",
          confidence: "medium",
          clarificationQuestion:
            "Should I treat Luann as actively schedulable for open slots, or keep her as family context?",
        },
        {
          subjectType: "constraint",
          subjectLabel: "Luann",
          predicate: "has_dementia",
          valueText: "Luann has dementia.",
          status: "needs_clarification",
          confidence: "medium",
          sensitivity: "sensitive",
          clarificationQuestion:
            "How should I account for Luann's dementia when coordinating Rob's care?",
        },
        {
          subjectType: "role",
          subjectLabel: "Marta",
          predicate: "is_backup_and_helps_with_mom",
          valueText: "Marta is backup and helps with mom too.",
          status: "needs_clarification",
          confidence: "medium",
          clarificationQuestion:
            "Should Marta be treated as on-call backup, scheduler/admin support, or both?",
        },
        {
          subjectType: "availability",
          subjectLabel: "Grace",
          predicate: "off_for_summer",
          valueText: "Grace is off for summer.",
          status: "needs_clarification",
          confidence: "medium",
          clarificationQuestion:
            "Should Grace be excluded from active scheduling while she is on summer break?",
        },
      ],
    });

    const assistantBody = [
      "I want to make sure I understand Rob's care situation accurately before I start coordinating from this.",
      "Here is what I think I heard, and what I still need to confirm:",
      "When you say Jim usually does weekdays, should I treat that as Monday-Friday 9am-5pm right now?",
      "For Jennifer's Mon/Tues nights, does that mean overnight shifts from 8pm to 8am?",
      "For Sarah's Wed/Thurs overnight shifts, is that also 8pm to 8am?",
      "For Ella's weekend overnights, should I treat that as Friday, Saturday, and Sunday nights?",
      "Should I treat Luann as actively schedulable for open slots, or keep her as family context because of her dementia?",
      "Should Marta be treated as on-call backup, scheduler/admin support, or both?",
      "Should Grace be excluded from active scheduling while she is on summer break?",
    ].join("\n");

    await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "assistant",
      direction: "outbound",
      body: assistantBody,
      timestamp: Date.now(),
      senderPhone: "+16515559101",
      displayName: "Rob",
    });

    const [
      claims,
      contacts,
      events,
      outreachAttempts,
      messages,
      compiled,
    ] = await Promise.all([
      t.query(api.careClaims.listByStatus, {
        careCaseId,
        status: "needs_clarification",
      }),
      t.query(api.careContacts.listByCareCase, { careCaseId }),
      t.query(api.coordinationEvents.listByCareCase, { careCaseId }),
      t.query(api.outreachAttempts.listByCareCase, { careCaseId }),
      t.query(api.messages.listByCareCase, { careCaseId }),
      t.mutation(internal.mutations.getCompiledPromptContext, {
        userId,
        careCaseId,
      }),
    ]);

    expect(claims).toHaveLength(8);
    expect(claims.every((claim) => claim.sourceMessageId === sourceMessageId)).toBe(
      true,
    );
    expect(claims.map((claim) => claim.subjectLabel).sort()).toEqual([
      "Ella",
      "Grace",
      "Jennifer",
      "Jim",
      "Luann",
      "Luann",
      "Marta",
      "Sarah",
    ]);

    expect(contacts).toHaveLength(0);
    expect(events).toHaveLength(0);
    expect(outreachAttempts).toHaveLength(0);

    expect(messages.at(-1)?.body).toContain(
      "I want to make sure I understand Rob's care situation accurately",
    );
    expect(messages.at(-1)?.body).toContain(
      "When you say Jim usually does weekdays",
    );
    expect(messages.at(-1)?.body).toContain(
      "because of her dementia",
    );
    expect(messages.at(-1)?.body).not.toContain("Would this be helpful?");

    expect(compiled?.contextSections).toContain("unconfirmed_understanding");
    expect(compiled?.careCaseContext).toContain("## Unconfirmed Understanding");
    expect(compiled?.careCaseContext).toContain(
      "Luann / has_dementia: Luann has dementia.",
    );
    expect(compiled?.careCaseContext).toContain(
      "Clarify: How should I account for Luann's dementia",
    );
  });
});
