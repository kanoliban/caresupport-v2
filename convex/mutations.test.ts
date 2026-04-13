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
      time: "10:00 AM",
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
