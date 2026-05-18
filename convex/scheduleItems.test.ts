import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

async function makeCareCase(
  t: ReturnType<typeof convexTest>,
  phone: string,
  chatId: string,
): Promise<Id<"careCases">> {
  const result = await t.mutation(
    internal.mutations.createOnboardingUserAndCareCase,
    { phone, chatId },
  );
  return result.careCaseId;
}

describe("scheduleItems.create validation (public mutation)", () => {
  it("rejects day-name in the date field", async () => {
    // #given a care case
    const t = convexTest(schema, modules);
    const careCaseId = await makeCareCase(t, "+16515551500", "chat-public-mutation");

    // #when seed-style date-as-day-name is sent through the public path
    // #then the mutation throws — same protection as the internal upsert
    await expect(
      t.mutation(api.scheduleItems.create, {
        careCaseId,
        type: "task",
        title: "AM ride",
        date: "Monday",
        status: "active",
      }),
    ).rejects.toThrow('Invalid date format: "Monday"');
  });

  it("rejects 12-hour time in the time field", async () => {
    // #given a care case
    const t = convexTest(schema, modules);
    const careCaseId = await makeCareCase(t, "+16515551500", "chat-public-mutation");

    // #when seed-style "7:30 AM" is sent through
    // #then the mutation throws
    await expect(
      t.mutation(api.scheduleItems.create, {
        careCaseId,
        type: "task",
        title: "AM ride",
        time: "7:30 AM",
        status: "active",
      }),
    ).rejects.toThrow("Invalid time format");
  });

  it("rejects natural-language recurrence", async () => {
    const t = convexTest(schema, modules);
    const careCaseId = await makeCareCase(t, "+16515551500", "chat-public-mutation");

    await expect(
      t.mutation(api.scheduleItems.create, {
        careCaseId,
        type: "task",
        title: "Recurring task",
        recurrence: "recurring Monday",
        status: "active",
      }),
    ).rejects.toThrow("Invalid recurrence");
  });

  it("accepts well-formed ISO date + 24h time + recurrence", async () => {
    // #given a care case
    const t = convexTest(schema, modules);
    const careCaseId = await makeCareCase(t, "+16515551500", "chat-public-mutation");

    // #when all fields are valid
    // #then the mutation succeeds
    const id = await t.mutation(api.scheduleItems.create, {
      careCaseId,
      type: "reminder",
      title: "Morning meds",
      time: "08:00",
      recurrence: "daily",
      status: "active",
    });

    expect(id).toBeDefined();
  });
});

describe("scheduleItems.update validation (public mutation)", () => {
  it("rejects bad date on update", async () => {
    // #given a care case with one valid scheduled row
    const t = convexTest(schema, modules);
    const careCaseId = await makeCareCase(t, "+16515551500", "chat-public-mutation");
    const id = await t.mutation(api.scheduleItems.create, {
      careCaseId,
      type: "appointment",
      title: "Dr. Parke",
      date: "2026-06-10",
      time: "07:20",
      status: "active",
    });

    // #when a bad date is patched in
    // #then the update throws
    await expect(
      t.mutation(api.scheduleItems.update, { id, date: "tomorrow" }),
    ).rejects.toThrow('Invalid date format: "tomorrow"');
  });

  it("accepts a valid update", async () => {
    const t = convexTest(schema, modules);
    const careCaseId = await makeCareCase(t, "+16515551500", "chat-public-mutation");
    const id = await t.mutation(api.scheduleItems.create, {
      careCaseId,
      type: "appointment",
      title: "Dr. Parke",
      date: "2026-06-10",
      status: "active",
    });

    await t.mutation(api.scheduleItems.update, {
      id,
      date: "2026-06-11",
      time: "09:30",
    });

    const row = await t.run(async (ctx) => await ctx.db.get(id));
    expect(row?.date).toBe("2026-06-11");
    expect(row?.time).toBe("09:30");
  });
});
