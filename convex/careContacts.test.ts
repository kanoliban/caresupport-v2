import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

describe("careContacts", () => {
  it("creates active contacts scoped to a care case", async () => {
    const t = convexTest(schema, modules);
    const { careCaseId } = await t.mutation(
      internal.mutations.createOnboardingUserAndCareCase,
      { phone: "+16515552001", chatId: "chat-care-contacts" },
    );

    const contactId = await t.mutation(api.careContacts.create, {
      careCaseId,
      name: "Angela",
      phone: "(651) 555-2222",
      relationship: "evening caregiver",
      contactType: "professional_caregiver",
      role: "evening coverage",
      contactPriority: 1,
      consentToContact: false,
    });

    const contacts = await t.query(api.careContacts.listActiveByCareCase, {
      careCaseId,
    });
    const contact = await t.query(api.careContacts.get, {
      careCaseId,
      id: contactId,
    });

    expect(contacts).toHaveLength(1);
    expect(contact?.name).toBe("Angela");
    expect(contact?.phone).toBe("+16515552222");
    expect(contact?.canReceiveTexts).toBe(true);
    expect(contact?.active).toBe(true);
  });

  it("does not return a contact across care-case boundaries", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
      phone: "+16515552002",
      chatId: "chat-care-contacts-1",
    });
    const second = await t.mutation(internal.mutations.createOnboardingUserAndCareCase, {
      phone: "+16515552003",
      chatId: "chat-care-contacts-2",
    });
    const contactId = await t.mutation(api.careContacts.create, {
      careCaseId: first.careCaseId,
      name: "Marcus",
      contactType: "family",
    });

    const crossCaseLookup = await t.query(api.careContacts.get, {
      careCaseId: second.careCaseId,
      id: contactId,
    });

    await expect(
      t.mutation(api.careContacts.update, {
        careCaseId: second.careCaseId,
        id: contactId,
        active: false,
      }),
    ).rejects.toThrow("Care contact not found for care case");
    expect(crossCaseLookup).toBeNull();
  });
});
