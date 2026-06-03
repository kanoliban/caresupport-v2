import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

type TestRuntime = ReturnType<typeof convexTest>;

async function createCareCase(t: TestRuntime, phone: string, chatId: string) {
  return await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
    phone,
    chatId,
  });
}

async function createRuntime(phone: string, chatId: string) {
  const t = convexTest(schema, modules);
  const { userId, careCaseId } = await createCareCase(t, phone, chatId);
  return { t, userId, careCaseId };
}

describe("careClaims", () => {
  it("stores messy fragments as source-linked claims without changing current truth", async () => {
    const { t, userId, careCaseId } = await createRuntime(
      "+16515559001",
      "chat-care-claims",
    );
    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body:
        "Jim usually does weekdays. Luann fills empty slots but she has dementia.",
      timestamp: Date.now(),
      senderPhone: "+16515559001",
      displayName: "Rob",
    });

    const claimIds = await t.mutation(api.careClaims.createManyFromSource, {
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
          sensitivity: "normal",
          clarificationQuestion:
            "When you say Jim usually does weekdays, should I treat that as Monday-Friday 9am-5pm right now?",
        },
        {
          subjectType: "availability",
          subjectLabel: "Luann",
          predicate: "fills_empty_slots",
          valueText: "Luann fills empty slots.",
          status: "needs_clarification",
          confidence: "medium",
          sensitivity: "normal",
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
      ],
    });

    const allClaims = await t.query(api.careClaims.listByCareCase, {
      careCaseId,
    });
    const unresolvedClaims = await t.query(api.careClaims.listByStatus, {
      careCaseId,
      status: "needs_clarification",
    });
    const luannConstraints = await t.query(api.careClaims.listBySubject, {
      careCaseId,
      subjectType: "constraint",
      subjectLabel: "Luann",
    });
    const sourceClaims = await t.query(api.careClaims.listBySourceMessage, {
      careCaseId,
      sourceMessageId,
    });
    const contacts = await t.query(api.careContacts.listByCareCase, {
      careCaseId,
    });
    const events = await t.query(api.coordinationEvents.listByCareCase, {
      careCaseId,
    });

    expect(claimIds).toHaveLength(3);
    expect(allClaims).toHaveLength(3);
    expect(unresolvedClaims).toHaveLength(3);
    expect(sourceClaims.map((claim) => claim._id).sort()).toEqual(
      [...claimIds].sort(),
    );
    expect(luannConstraints).toHaveLength(1);
    expect(luannConstraints[0]).toMatchObject({
      careCaseId,
      sourceMessageId,
      sourceActorType: "user",
      subjectType: "constraint",
      subjectLabel: "Luann",
      predicate: "has_dementia",
      valueText: "Luann has dementia.",
      status: "needs_clarification",
      confidence: "medium",
      sensitivity: "sensitive",
      active: true,
    });
    expect(luannConstraints[0].clarificationQuestion).toContain("dementia");

    // Claims are learning evidence, not current truth.
    expect(contacts).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("transitions claims with clarification source links", async () => {
    const { t, userId, careCaseId } = await createRuntime(
      "+16515559002",
      "chat-care-claims-transitions",
    );
    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "Grace is off for summer.",
      timestamp: Date.now(),
      senderPhone: "+16515559002",
      displayName: "Rob",
    });
    const [claimId] = await t.mutation(api.careClaims.createManyFromSource, {
      careCaseId,
      sourceMessageId,
      claims: [
        {
          subjectType: "availability",
          subjectLabel: "Grace",
          predicate: "off_for_summer",
          valueText: "Grace is off for summer.",
          status: "needs_clarification",
          confidence: "medium",
        },
      ],
    });
    const clarificationMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "Yes, exclude Grace from active scheduling until summer break ends.",
      timestamp: Date.now(),
      senderPhone: "+16515559002",
      displayName: "Rob",
    });

    await t.mutation(api.careClaims.confirm, {
      careCaseId,
      id: claimId,
      clarifiedByMessageId: clarificationMessageId,
    });

    const confirmed = await t.query(api.careClaims.get, {
      careCaseId,
      id: claimId,
    });

    expect(confirmed).toMatchObject({
      status: "confirmed",
      active: true,
      clarifiedByMessageId: clarificationMessageId,
    });
    expect(confirmed?.confirmedAt).toEqual(expect.any(Number));

    await t.mutation(api.careClaims.reject, {
      careCaseId,
      id: claimId,
      clarifiedByMessageId: clarificationMessageId,
    });

    const rejected = await t.query(api.careClaims.get, {
      careCaseId,
      id: claimId,
    });
    expect(rejected).toMatchObject({
      status: "rejected",
      active: false,
      clarifiedByMessageId: clarificationMessageId,
    });
  });

  it("loads unresolved claims into prompt context without treating them as current truth", async () => {
    const { t, userId, careCaseId } = await createRuntime(
      "+16515559006",
      "chat-care-claims-context",
    );
    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "Jim usually does weekdays.",
      timestamp: Date.now(),
      senderPhone: "+16515559006",
      displayName: "Rob",
    });
    const [claimId] = await t.mutation(api.careClaims.createManyFromSource, {
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
      ],
    });

    const compiled = await t.mutation(
      internal.mutations.getCompiledPromptContext,
      {
        userId,
        careCaseId,
      },
    );

    expect(compiled?.contextSections).toContain("unconfirmed_understanding");
    expect(compiled?.careCaseContext).toContain("## Unconfirmed Understanding");
    expect(compiled?.careCaseContext).toContain(
      "These are source-linked claims CareSupport has heard or inferred",
    );
    expect(compiled?.careCaseContext).toContain(
      "Jim / usually_does_weekdays: Jim usually does weekdays.",
    );
    expect(compiled?.careCaseContext).toContain(
      "Clarify: When you say Jim usually does weekdays",
    );

    const clarificationMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "Yes, Jim is Monday-Friday 9am-5pm.",
      timestamp: Date.now(),
      senderPhone: "+16515559006",
      displayName: "Rob",
    });
    await t.mutation(api.careClaims.confirm, {
      careCaseId,
      id: claimId,
      clarifiedByMessageId: clarificationMessageId,
    });

    const afterConfirmation = await t.mutation(
      internal.mutations.getCompiledPromptContext,
      {
        userId,
        careCaseId,
      },
    );
    expect(afterConfirmation?.contextSections).not.toContain(
      "unconfirmed_understanding",
    );
    expect(afterConfirmation?.careCaseContext).not.toContain(
      "Jim / usually_does_weekdays",
    );
  });

  it("supersedes one claim with another claim in the same care case", async () => {
    const { t, userId, careCaseId } = await createRuntime(
      "+16515559003",
      "chat-care-claims-supersede",
    );
    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId,
      userId,
      actorType: "user",
      direction: "inbound",
      body: "Marta is backup.",
      timestamp: Date.now(),
      senderPhone: "+16515559003",
      displayName: "Rob",
    });
    const [oldClaimId, newClaimId] = await t.mutation(
      api.careClaims.createManyFromSource,
      {
        careCaseId,
        sourceMessageId,
        claims: [
          {
            subjectType: "role",
            subjectLabel: "Marta",
            predicate: "is_backup",
            valueText: "Marta is backup.",
            status: "heard",
          },
          {
            subjectType: "role",
            subjectLabel: "Marta",
            predicate: "is_backup_and_scheduler",
            valueText: "Marta is backup and also helps coordinate.",
            status: "confirmed",
            confidence: "high",
          },
        ],
      },
    );

    await t.mutation(api.careClaims.supersede, {
      careCaseId,
      id: oldClaimId,
      supersededByClaimId: newClaimId,
    });

    const oldClaim = await t.query(api.careClaims.get, {
      careCaseId,
      id: oldClaimId,
    });
    const newClaim = await t.query(api.careClaims.get, {
      careCaseId,
      id: newClaimId,
    });

    expect(oldClaim).toMatchObject({
      status: "superseded",
      active: false,
      supersededByClaimId: newClaimId,
    });
    expect(newClaim).toMatchObject({
      status: "confirmed",
      active: true,
      confidence: "high",
    });
  });

  it("enforces care-case boundaries for source messages and claim transitions", async () => {
    const t = convexTest(schema, modules);
    const first = await createCareCase(t, "+16515559004", "chat-care-claims-first");
    const second = await createCareCase(
      t,
      "+16515559005",
      "chat-care-claims-second",
    );
    const sourceMessageId = await t.mutation(api.messages.create, {
      careCaseId: first.careCaseId,
      userId: first.userId,
      actorType: "user",
      direction: "inbound",
      body: "Jim usually does weekdays.",
      timestamp: Date.now(),
      senderPhone: "+16515559004",
      displayName: "Rob",
    });
    const [claimId] = await t.mutation(api.careClaims.createManyFromSource, {
      careCaseId: first.careCaseId,
      sourceMessageId,
      claims: [
        {
          subjectType: "availability",
          subjectLabel: "Jim",
          predicate: "usually_does_weekdays",
          valueText: "Jim usually does weekdays.",
        },
      ],
    });

    await expect(
      t.mutation(api.careClaims.createManyFromSource, {
        careCaseId: second.careCaseId,
        sourceMessageId,
        claims: [
          {
            subjectType: "availability",
            subjectLabel: "Jim",
            predicate: "usually_does_weekdays",
            valueText: "Jim usually does weekdays.",
          },
        ],
      }),
    ).rejects.toThrow("Care claim message does not belong to care case");

    await expect(
      t.mutation(api.careClaims.confirm, {
        careCaseId: second.careCaseId,
        id: claimId,
      }),
    ).rejects.toThrow("Care claim not found for care case");
  });
});
