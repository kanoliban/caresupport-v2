import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("coordinationEvents", () => {
  it("tracks an open coverage gap with scoped contact references", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId, userId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515553001", chatId: "chat-coordination-events" },
    );
    const angelaId = await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Angela",
      phone: "+16515553101",
      contactType: "professional_caregiver",
      contactPriority: 1,
      consentToContact: false,
    });
    const marcusId = await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Marcus",
      phone: "+16515553102",
      contactType: "family",
      contactPriority: 2,
    });

    const eventId = await t.mutation(api.coordinationEvents.create, {
      careCaseId,
      type: "coverage_gap",
      title: "Tonight 6-10 coverage gap",
      urgency: "high",
      description: "Tasha cancelled the evening shift.",
      pendingContactIds: [angelaId],
      fallbackOrderContactIds: [angelaId, marcusId],
      createdByUserId: userId,
    });

    const openEvents = await t.query(api.coordinationEvents.listOpenByCareCase, {
      careCaseId,
    });
    const event = await t.query(api.coordinationEvents.get, {
      careCaseId,
      id: eventId,
    });

    expect(openEvents).toHaveLength(1);
    expect(event?.status).toBe("open");
    expect(event?.urgency).toBe("high");
    expect(event?.pendingContactIds).toEqual([angelaId]);
  });

  it("rejects contact references from another care case", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
      phone: "+16515553002",
      chatId: "chat-coordination-events-1",
    });
    const second = await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
      phone: "+16515553003",
      chatId: "chat-coordination-events-2",
    });
    const otherContactId = await t.mutation(api.careContacts.create, {
      careCaseId: second.careCaseId,
      name: "Other case contact",
      contactType: "family",
    });

    await expect(
      t.mutation(api.coordinationEvents.create, {
        careCaseId: first.careCaseId,
        type: "coverage_gap",
        title: "Wrong contact",
        pendingContactIds: [otherContactId],
      }),
    ).rejects.toThrow("Coordination event contact does not belong to care case");
  });

  it("closes resolved events and removes them from open lists", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515553004", chatId: "chat-coordination-events-3" },
    );
    const eventId = await t.mutation(api.coordinationEvents.create, {
      careCaseId,
      type: "handoff",
      title: "Confirm shower routine handoff",
    });

    await t.mutation(api.coordinationEvents.update, {
      careCaseId,
      id: eventId,
      status: "resolved",
      resolution: "Angela confirmed she has the handoff.",
    });

    const openEvents = await t.query(api.coordinationEvents.listOpenByCareCase, {
      careCaseId,
    });
    const event = await t.query(api.coordinationEvents.get, {
      careCaseId,
      id: eventId,
    });

    expect(openEvents).toHaveLength(0);
    expect(event?.status).toBe("resolved");
    expect(event?.closedAt).toBeTypeOf("number");
  });
});
