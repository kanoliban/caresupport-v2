import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../schema";
import { api, internal } from "../../_generated/api";

const modules = import.meta.glob("../../**/*.ts");

async function createRobRuntime() {
  const t = convexTest(schema, modules);
  const { userId, careCaseId } = await t.mutation(
    internal.mutations.createOnboardingUserAndCareCase,
    { phone: "+16515559101", chatId: "chat-rob-retrieval" },
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

describe("retrieveCareContext", () => {
  it("returns current truth, unresolved claims, references, and source links separately", async () => {
    const { t, userId, careCaseId } = await createRobRuntime();
    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body:
        "Luann fills empty slots but she has dementia. Grace is off for summer.",
      timestamp: Date.now(),
      senderPhone: "+16515559101",
      displayName: "Rob",
    });

    await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Jim Nelson",
      phone: "+16515550101",
      relationship: "primary caregiver",
      contactType: "professional_caregiver",
      role: "Nurse",
      availabilityNotes: "Monday-Friday 9am-5pm",
      canReceiveTexts: true,
      consentToContact: true,
    });
    await t.mutation(api.scheduleItems.create, {
      careCaseId,
      type: "reminder",
      title: "Jim Nelson coverage",
      date: "2026-06-08",
      time: "09:00",
      endTime: "17:00",
      recurrence: "weekly:mon,tue,wed,thu,fri",
      status: "active",
      provider: "Jim Nelson",
    });
    await t.mutation(api.coordinationEvents.create, {
      careCaseId,
      type: "coverage_gap",
      title: "Confirm overnight coverage",
      status: "open",
      urgency: "normal",
      description: "Need to clarify who covers Wednesday overnight.",
      createdByUserId: userId,
    });
    await t.mutation(api.memoryEntries.create, {
      careCaseId,
      userId,
      scope: "care_case",
      category: "care_note",
      content:
        "Rob prefers accuracy-seeking clarification before CareSupport coordinates from uncertain schedule fragments.",
      source: "manual-test",
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await t.mutation(api.careClaims.createManyFromSource, {
      careCaseId,
      sourceMessageId,
      claims: [
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

    const result = await t.mutation(
      internal.mutations.retrieveStructuredCareContext,
      {
        userId,
        careCaseId,
        query: "Luann dementia Grace summer",
        purpose: "clarification",
        includeUnresolvedClaims: true,
        includeResolvedHistory: false,
        limit: 10,
      },
    );

    expect(result).not.toBeNull();
    if (!result) throw new Error("Expected structured care context");

    expect(result.currentTruth.user.name).toBe("Rob Wudlick");
    expect(result.currentTruth.contacts.map((contact) => contact.name)).toEqual([
      "Jim Nelson",
    ]);
    expect(result.currentTruth.activeScheduleItems[0]?.title).toBe(
      "Jim Nelson coverage",
    );
    expect(result.currentTruth.openCoordinationEvents[0]?.title).toBe(
      "Confirm overnight coverage",
    );
    expect(result.currentTruth.activeMemoryEntries[0]?.content).toContain(
      "accuracy-seeking clarification",
    );

    expect(
      result.unresolvedClaims.map((claim) => claim.subjectLabel).sort(),
    ).toEqual(["Grace", "Luann"]);
    expect(result.references.map((reference) => reference.sourceType)).toEqual([
      "claim",
      "claim",
    ]);
    expect(result.references.map((reference) => reference.sourceId)).toEqual(
      result.unresolvedClaims.map((claim) => String(claim._id)),
    );
    expect(result.sourceLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "care_case",
          reason: "current care case truth",
        }),
        expect.objectContaining({
          sourceType: "care_contact",
          reason: "current care contact truth",
        }),
        expect.objectContaining({
          sourceType: "schedule_item",
          reason: "active schedule truth",
        }),
        expect.objectContaining({
          sourceType: "memory",
          reason: "active durable memory",
        }),
        expect.objectContaining({
          sourceType: "message",
          sourceId: String(sourceMessageId),
          reason: "source message for Luann/has_dementia",
        }),
      ]),
    );
  });

  it("keeps current structured truth separate from older reference history", async () => {
    const { t, userId, careCaseId } = await createRobRuntime();
    await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Jim Nelson",
      phone: "+16515550101",
      relationship: "primary caregiver",
      contactType: "professional_caregiver",
      role: "Nurse",
      availabilityNotes: "Monday-Friday 9am-5pm",
      canReceiveTexts: true,
      consentToContact: true,
    });
    const oldMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "Jim used to do evenings before the current weekday schedule.",
      timestamp: Date.now() - 10_000,
      senderPhone: "+16515559101",
      displayName: "Rob",
    });

    const result = await t.mutation(
      internal.mutations.retrieveStructuredCareContext,
      {
        userId,
        careCaseId,
        query: "Jim evenings",
        purpose: "reference",
        includeResolvedHistory: true,
        limit: 5,
      },
    );

    expect(result).not.toBeNull();
    if (!result) throw new Error("Expected structured care context");

    expect(result.currentTruth.contacts[0]?.availabilityNotes).toBe(
      "Monday-Friday 9am-5pm",
    );
    expect(result.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: "message",
          sourceId: String(oldMessageId),
          text: expect.stringContaining("Jim used to do evenings"),
        }),
      ]),
    );
    expect(
      result.references.some((reference) => reference.sourceType === "memory"),
    ).toBe(false);
  });

  it("can omit unresolved claims from retrieval context", async () => {
    const { t, userId, careCaseId } = await createRobRuntime();
    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "Luann has dementia.",
      timestamp: Date.now(),
      senderPhone: "+16515559101",
      displayName: "Rob",
    });
    await t.mutation(api.careClaims.createManyFromSource, {
      careCaseId,
      sourceMessageId,
      claims: [
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
      ],
    });

    const result = await t.mutation(
      internal.mutations.retrieveStructuredCareContext,
      {
        userId,
        careCaseId,
        query: "Luann dementia",
        includeUnresolvedClaims: false,
        includeResolvedHistory: false,
      },
    );

    expect(result).not.toBeNull();
    if (!result) throw new Error("Expected structured care context");

    expect(result.unresolvedClaims).toEqual([]);
    expect(result.references).toEqual([]);
    expect(
      result.sourceLinks.some((link) => link.sourceType === "claim"),
    ).toBe(false);
    expect(
      result.sourceLinks.some((link) => link.sourceId === String(sourceMessageId)),
    ).toBe(false);
  });
});
