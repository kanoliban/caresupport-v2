import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { normalizePhone } from "./mutations";
import { TEST_FAMILY_ARGS } from "./lib/enforcement/fixtures";

const modules = import.meta.glob("./**/*.ts");

describe("normalizePhone", () => {
  it("strips dashes and parens from 10-digit US number", () => {
    expect(normalizePhone("518-698-4328")).toBe("+15186984328");
    expect(normalizePhone("(518) 698-4328")).toBe("+15186984328");
  });

  it("handles raw 10 digits", () => {
    expect(normalizePhone("5186984328")).toBe("+15186984328");
  });

  it("handles 11 digits starting with 1", () => {
    expect(normalizePhone("15186984328")).toBe("+15186984328");
  });

  it("preserves already-formatted E.164", () => {
    expect(normalizePhone("+15186984328")).toBe("+15186984328");
  });

  it("strips formatting from E.164 with spaces", () => {
    expect(normalizePhone("+1 (518) 698-4328")).toBe("+15186984328");
  });

  it("returns null for too-short numbers", () => {
    expect(normalizePhone("698-4328")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });
});

describe("applyMemberContextUpdates", () => {
  it("initializes missing member context from the member row before applying updates", async () => {
    const t = convexTest(schema, modules);
    const familyId = await t.mutation(api.families.create, TEST_FAMILY_ARGS);
    const memberId = await t.mutation(api.members.create, {
      familyId,
      phone: "+16517037981",
      name: "Liban Kano",
      role: "family_caregiver",
      accessLevel: "full",
      isCoordinator: true,
      isEmergencyContact: false,
      active: true,
      relationship: "grandson",
    });

    await t.mutation(internal.mutations.applyMemberContextUpdates, {
      memberId,
      updates: [
        {
          section: "Personal Context",
          operation: "append",
          content: "- Prefers evening updates.",
        },
      ],
    });

    const member = await t.query(api.members.getByFamilyAndPhone, {
      familyId,
      phone: "+16517037981",
    });

    expect(member?.context).toContain("# Liban Kano — Member Profile");
    expect(member?.context).toContain("- Name: Liban Kano");
    expect(member?.context).toContain("- Phone: +16517037981");
    expect(member?.context).toContain("- Relationship to care recipient: grandson");
    expect(member?.context).toContain("- Prefers evening updates.");
  });

  it("only updates the targeted member record", async () => {
    const t = convexTest(schema, modules);
    const familyA = await t.mutation(api.families.create, {
      ...TEST_FAMILY_ARGS,
      name: "Family A",
    });
    const familyB = await t.mutation(api.families.create, {
      ...TEST_FAMILY_ARGS,
      name: "Family B",
    });

    const memberA = await t.mutation(api.members.create, {
      familyId: familyA,
      phone: "+16517030001",
      name: "Asha",
      role: "family_caregiver",
      accessLevel: "schedule+meds",
      isCoordinator: false,
      isEmergencyContact: false,
      active: true,
      relationship: "daughter",
    });
    await t.mutation(api.members.create, {
      familyId: familyB,
      phone: "+16517030002",
      name: "Bini",
      role: "family_caregiver",
      accessLevel: "schedule+meds",
      isCoordinator: false,
      isEmergencyContact: false,
      active: true,
      relationship: "son",
    });

    await t.mutation(internal.mutations.applyMemberContextUpdates, {
      memberId: memberA,
      updates: [
        {
          section: "Communication Preferences",
          operation: "append",
          content: "- Prefers SMS.",
        },
      ],
    });

    const updatedMember = await t.query(api.members.getByFamilyAndPhone, {
      familyId: familyA,
      phone: "+16517030001",
    });
    const untouchedMember = await t.query(api.members.getByFamilyAndPhone, {
      familyId: familyB,
      phone: "+16517030002",
    });

    expect(updatedMember?.context).toContain("- Prefers SMS.");
    expect(untouchedMember?.context).toBeUndefined();
  });
});

describe("createOnboardingFamily", () => {
  it("creates a solo-beta account with solo onboarding context", async () => {
    const t = convexTest(schema, modules);

    const result = await t.mutation(internal.mutations.createOnboardingFamily, {
      phone: "+16517037981",
      chatId: "chat-123",
    });

    const family = await t.query(api.families.get, { id: result.familyId });
    const member = await t.query(api.members.getByPhone, { phone: "+16517037981" });

    expect(family?.name).toBe("New Care Profile");
    expect(family?.productMode).toBe("solo_beta");
    expect(family?.context).toContain("Solo Beta Onboarding");
    expect(family?.context).toContain("who they're caring for");
    expect(member?.isCoordinator).toBe(true);
    expect(member?.accessLevel).toBe("full");
  });
});
