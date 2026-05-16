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
});
