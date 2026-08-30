import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { normalizePhone } from "./mutations";

const modules = import.meta.glob("./**/*.ts");

describe("normalizePhone", () => {
  it("normalizes US numbers to E.164", () => {
    expect(normalizePhone("(518) 698-4328")).toBe("+15186984328");
    expect(normalizePhone("15186984328")).toBe("+15186984328");
  });

  it("returns null for invalid input", () => {
    expect(normalizePhone("698-4328")).toBeNull();
  });
});

describe("createOnboardingUserAndCareCase", () => {
  it("creates a solo onboarding user attached to a care case", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
      phone: "+16517037981",
      chatId: "chat-123",
    });

    const careCase = await t.query(api.careCases.get, { id: result.careCaseId });
    const user = await t.query(api.users.getByPhone, { phone: "+16517037981" });

    expect(careCase?.title).toBe("New Care Plan");
    expect(careCase?.status).toBe("onboarding");
    expect(user?.careCaseId).toBe(result.careCaseId);
    expect(user?.chatId).toBe("chat-123");
  });
});

describe("upsertMemoryEntries", () => {
  it("deduplicates exact memory updates", async () => {
    const t = convexTest(schema, modules);
    const { userId, careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      {
        phone: "+16517030001",
        chatId: "chat-1",
      },
    );

    const first = await t.mutation(internal.mutations.upsertMemoryEntries, {
      userId,
      careCaseId,
      scope: "user",
      updates: [
        {
          category: "communication_preference",
          content: "Prefers evening updates.",
        },
      ],
    });

    const second = await t.mutation(internal.mutations.upsertMemoryEntries, {
      userId,
      careCaseId,
      scope: "user",
      updates: [
        {
          category: "communication_preference",
          content: "Prefers evening updates.",
        },
      ],
    });

    const entries = await t.query(api.memoryEntries.listByUserScope, {
      userId,
      scope: "user",
    });

    expect(first.inserted).toBe(1);
    expect(second.inserted).toBe(0);
    expect(entries).toHaveLength(1);
  });

  it("does not persist inferred emotional support summaries as durable memory", async () => {
    const t = convexTest(schema, modules);
    const { userId, careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      {
        phone: "+16517030003",
        chatId: "chat-3",
      },
    );

    const result = await t.mutation(internal.mutations.upsertMemoryEntries, {
      userId,
      careCaseId,
      scope: "care_case",
      updates: [
        {
          category: "care_note",
          content:
            "Alex expressed feeling overwhelmed and isolated as a caregiver. Handle with extra warmth and patience.",
        },
      ],
    });

    const compiled = await t.mutation(internal.mutations.getCompiledPromptContext, {
      userId,
      careCaseId,
    });

    expect(result.inserted).toBe(0);
    expect(compiled?.careCaseContext).not.toContain("overwhelmed and isolated");
  });

  it("still persists concrete care facts that are useful later", async () => {
    const t = convexTest(schema, modules);
    const { userId, careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      {
        phone: "+16517030004",
        chatId: "chat-4",
      },
    );

    const result = await t.mutation(internal.mutations.upsertMemoryEntries, {
      userId,
      careCaseId,
      scope: "care_case",
      updates: [
        {
          category: "care_note",
          content: "Solan is usually the pickup driver for Tuesday cardiology visits.",
        },
      ],
    });

    const compiled = await t.mutation(internal.mutations.getCompiledPromptContext, {
      userId,
      careCaseId,
    });

    expect(result.inserted).toBe(1);
    expect(compiled?.careCaseContext).toContain("Solan is usually the pickup driver");
  });
});

describe("getCompiledPromptContext", () => {
  it("renders user memory, care-case memory, schedule, and medications into prompt context", async () => {
    const t = convexTest(schema, modules);
    const { userId, careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      {
        phone: "+16517030002",
        chatId: "chat-2",
      },
    );

    await t.mutation(internal.mutations.updateUserProfile, {
      userId,
      name: "Alex",
      relationshipToRecipient: "son",
    });
    await t.mutation(internal.mutations.updateCareCaseProfile, {
      careCaseId,
      careRecipientName: "Sam",
      relationshipToRecipient: "father",
      status: "active",
    });
    await t.mutation(internal.mutations.upsertMemoryEntries, {
      userId,
      careCaseId,
      scope: "user",
      updates: [{ category: "communication_preference", content: "Prefers short texts." }],
    });
    await t.mutation(internal.mutations.upsertMemoryEntries, {
      userId,
      careCaseId,
      scope: "care_case",
      updates: [{ category: "care_note", content: "Sam uses a cane." }],
    });
    await t.mutation(internal.mutations.upsertMedication, {
      careCaseId,
      action: "add",
      name: "Lisinopril",
      dose: "10mg",
      schedule: "daily",
    });
    await t.mutation(internal.mutations.upsertScheduleItem, {
      careCaseId,
      action: "add",
      type: "appointment",
      title: "Cardiology visit",
      date: "2026-05-01",
      time: "10:00",
    });

    const compiled = await t.mutation(internal.mutations.getCompiledPromptContext, {
      userId,
      careCaseId,
    });

    expect(compiled?.userContext).toContain("Prefers short texts.");
    expect(compiled?.careCaseContext).toContain("Sam uses a cane.");
    expect(compiled?.careCaseContext).toContain("Lisinopril 10mg");
    expect(compiled?.careCaseContext).toContain("Cardiology visit");
  });

  it("renders care contacts and open coordination events into prompt context", async () => {
    const t = convexTest(schema, modules);
    const { userId, careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      {
        phone: "+16517030005",
        chatId: "chat-5",
      },
    );

    const angelaId = await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Angela",
      phone: "+16515554001",
      relationship: "evening caregiver",
      contactType: "professional_caregiver",
      role: "evening coverage",
      contactPriority: 1,
      availabilityNotes: "Prefers 6-10 shifts",
      consentToContact: false,
    });
    const marcusId = await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Marcus",
      contactType: "family",
      contactPriority: 2,
    });

    await t.mutation(api.coordinationEvents.create, {
      careCaseId,
      type: "coverage_gap",
      title: "Tonight 6-10 coverage gap",
      status: "waiting",
      urgency: "high",
      description: "Tasha cancelled and Rob needs replacement coverage.",
      pendingContactIds: [angelaId],
      fallbackOrderContactIds: [angelaId, marcusId],
    });

    const compiled = await t.mutation(internal.mutations.getCompiledPromptContext, {
      userId,
      careCaseId,
    });

    expect(compiled?.contextSections).toContain("care_contacts");
    expect(compiled?.contextSections).toContain("coordination_events");
    expect(compiled?.careCaseContext).toContain("Angela [professional_caregiver]");
    expect(compiled?.careCaseContext).toContain("outreach consent no");
    expect(compiled?.careCaseContext).toContain("[waiting/high/coverage_gap] Tonight 6-10 coverage gap");
    expect(compiled?.careCaseContext).toContain("pending: Angela");
    expect(compiled?.careCaseContext).toContain("fallback: Angela, Marcus");
  });
});

describe("model-driven care outreach updates", () => {
  it("turns a new contact text request into a pending approval path", async () => {
    const t = convexTest(schema, modules);
    const { userId, careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      {
        phone: "+16517030006",
        chatId: "chat-mom",
      },
    );

    await t.mutation(internal.mutations.upsertCareContactFromModel, {
      careCaseId,
      update: {
        action: "add",
        name: "Mom",
        phone: "+15551234567",
        relationship: "mother",
        contactType: "family",
        canReceiveTexts: true,
      },
    });
    await t.mutation(internal.mutations.upsertCoordinationEventFromModel, {
      careCaseId,
      userId,
      timezone: "America/Chicago",
      update: {
        action: "add",
        title: "Text Mom",
        type: "outreach",
        status: "open",
        contactName: "Mom",
        description: "Ask Mom to check in.",
      },
    });

    const requestResult = await t.mutation(
      internal.outreachAttempts.createPendingFromModel,
      {
        careCaseId,
        requestedByUserId: userId,
        request: {
          contactName: "Mom",
          purpose: "Ask Mom to check in",
          message: "Hi Mom, can you check in today?",
          coordinationEventTitle: "Text Mom",
        },
        approvalPrompt: "Want me to send this to Mom?",
      },
    );

    const contacts = await t.query(api.careContacts.listByCareCase, { careCaseId });
    const events = await t.query(api.coordinationEvents.listByCareCase, { careCaseId });
    const attempts = await t.query(api.outreachAttempts.listByCareCase, { careCaseId });

    expect(requestResult).toMatchObject({
      action: "created",
      status: "pending_approval",
    });
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({
      name: "Mom",
      phone: "+15551234567",
      contactType: "family",
      canReceiveTexts: true,
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      title: "Text Mom",
      type: "outreach",
      originalAssigneeContactId: contacts[0]._id,
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      careContactId: contacts[0]._id,
      coordinationEventId: events[0]._id,
      status: "pending_approval",
      messageBody: "Hi Mom, can you check in today?",
    });
  });
});

describe("upsertScheduleItem validation", () => {
  it("rejects relative date words at the mutation boundary", async () => {
    // #given a care case
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16517037981", chatId: "chat-validate" },
    );

    // #when the agent tries to save a schedule item with date "today"
    // #then the mutation throws and nothing is written
    await expect(
      t.mutation(internal.mutations.upsertScheduleItem, {
        careCaseId,
        action: "add",
        type: "reminder",
        title: "Bad date item",
        date: "today",
      }),
    ).rejects.toThrow('Invalid date format: "today"');
  });

  it("rejects 12-hour time formats", async () => {
    // #given a care case
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16517037982", chatId: "chat-validate-2" },
    );

    // #when time is sent in 12-hour with am/pm
    // #then the mutation throws
    await expect(
      t.mutation(internal.mutations.upsertScheduleItem, {
        careCaseId,
        action: "add",
        type: "appointment",
        title: "Bad time item",
        date: "2026-05-15",
        time: "2:00 PM",
      }),
    ).rejects.toThrow("Invalid time format");
  });

  it("accepts well-formed ISO date + 24h time + recurrence", async () => {
    // #given a care case
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16517037983", chatId: "chat-validate-3" },
    );

    // #when all fields are valid
    // #then the mutation succeeds
    await t.mutation(internal.mutations.upsertScheduleItem, {
      careCaseId,
      action: "add",
      type: "reminder",
      title: "Morning meds",
      time: "08:00",
      recurrence: "daily",
    });

    // sanity: the row exists
    const compiled = await t.mutation(internal.mutations.getCompiledPromptContext, {
      userId: (await t.query(api.users.getByPhone, { phone: "+16517037983" }))!._id,
      careCaseId,
    });
    expect(compiled?.careCaseContext).toContain("Morning meds");
  });

  it("updates a reminder when the model includes the new time in its title", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16517037984", chatId: "chat-time-change" },
    );

    await t.mutation(internal.mutations.upsertScheduleItem, {
      careCaseId,
      action: "add",
      type: "reminder",
      title: "Ebise insulin",
      time: "14:15",
      recurrence: "daily",
    });

    const result = await t.mutation(internal.mutations.upsertScheduleItem, {
      careCaseId,
      action: "update",
      type: "reminder",
      title: "Ebise insulin at 4pm",
      time: "16:00",
      recurrence: "daily",
    });
    const items = await t.query(api.scheduleItems.listByCareCase, { careCaseId });

    expect(result).toMatchObject({ time: "16:00" });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Ebise insulin",
      time: "16:00",
      recurrence: "daily",
      status: "scheduled",
    });
  });

  it("cancels stale duplicate reminder rows during a later correction", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16517037985", chatId: "chat-duplicate-cleanup" },
    );

    await t.run(async (ctx) => {
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "reminder",
        title: "Ebise insulin",
        time: "14:15",
        recurrence: "daily",
        status: "scheduled",
      });
      await ctx.db.insert("scheduleItems", {
        careCaseId,
        type: "reminder",
        title: "Ebise insulin at 4pm",
        time: "16:00",
        recurrence: "daily",
        status: "scheduled",
      });
    });

    await t.mutation(internal.mutations.upsertScheduleItem, {
      careCaseId,
      action: "update",
      type: "reminder",
      title: "Ebise insulin at 4 PM",
      time: "16:00",
      recurrence: "daily",
    });
    const items = await t.query(api.scheduleItems.listByCareCase, { careCaseId });

    expect(items).toHaveLength(2);
    expect(items.filter((item) => item.status === "scheduled")).toHaveLength(1);
    expect(items.find((item) => item.status === "scheduled")).toMatchObject({
      time: "16:00",
    });
    expect(items.find((item) => item.time === "14:15")).toMatchObject({
      status: "cancelled",
    });
  });
});
