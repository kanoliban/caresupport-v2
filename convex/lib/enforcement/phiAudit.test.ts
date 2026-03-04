import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../schema";
import { api } from "../../_generated/api";
import {
  buildContextLoadEvent,
  buildResponseSentEvent,
  buildResponseBlockedEvent,
  buildOutreachSentEvent,
  buildUnknownNumberEvent,
} from "./phiAudit";
import { PHONES, FAMILY_ID } from "./fixtures";

const modules = import.meta.glob("../../**/*.ts");

describe("buildContextLoadEvent", () => {
  it("includes all HIPAA-required fields", () => {
    const event = buildContextLoadEvent({
      familyId: FAMILY_ID,
      accessorPhone: PHONES.ROB,
      accessorRole: "primary_caregiver",
      accessLevel: "full",
      sectionsLoaded: ["members", "medications", "schedule"],
      triggerMessage: "What meds am I on?",
    });

    expect(event.familyId).toBe(FAMILY_ID);
    expect(event.event).toBe("context_load");
    expect(event.phone).toBe(PHONES.ROB);
    expect(event.role).toBe("primary_caregiver");
    expect(event.accessLevel).toBe("full");
    expect(event.details.sectionsLoaded).toEqual([
      "members",
      "medications",
      "schedule",
    ]);
    expect(event.details.triggerMessage).toBe("What meds am I on?");
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it("truncates trigger message to 200 chars", () => {
    const longMessage = "a".repeat(300);
    const event = buildContextLoadEvent({
      familyId: FAMILY_ID,
      accessorPhone: PHONES.ROB,
      accessorRole: "primary_caregiver",
      accessLevel: "full",
      sectionsLoaded: [],
      triggerMessage: longMessage,
    });
    expect(event.details.triggerMessage!.length).toBe(200);
  });
});

describe("buildResponseSentEvent", () => {
  it("records leakage check result", () => {
    const event = buildResponseSentEvent({
      familyId: FAMILY_ID,
      recipientPhone: PHONES.SARAH,
      recipientRole: "community_supporter",
      accessLevel: "schedule+meds",
      responseLength: 142,
      leakageCheckPassed: true,
    });

    expect(event.event).toBe("response_sent");
    expect(event.phone).toBe(PHONES.SARAH);
    expect(event.details.responseLength).toBe(142);
    expect(event.details.leakageCheckPassed).toBe(true);
  });
});

describe("buildResponseBlockedEvent", () => {
  it("sets severity to HIGH with leaked terms", () => {
    const event = buildResponseBlockedEvent({
      familyId: FAMILY_ID,
      recipientPhone: PHONES.LINDA,
      accessLevel: "schedule",
      leakedCategories: ["medications"],
      leakedTerms: ["lisinopril", "10mg"],
    });

    expect(event.event).toBe("response_blocked");
    expect(event.details.severity).toBe("HIGH");
    expect(event.details.leakedCategories).toContain("medications");
    expect(event.details.leakedTerms).toContain("lisinopril");
    expect(event.details.recipientPhone).toBe(PHONES.LINDA);
  });
});

describe("buildUnknownNumberEvent", () => {
  it("sets phiDisclosed to false and familyId to unknown", () => {
    const event = buildUnknownNumberEvent({ phone: "+1-555-9999" });
    expect(event.event).toBe("unknown_number");
    expect(event.familyId).toBe("unknown");
    expect(event.phone).toBe("+1-555-9999");
    expect(event.details.phiDisclosed).toBe(false);
  });
});

describe("buildOutreachSentEvent", () => {
  it("captures initiator and recipient", () => {
    const event = buildOutreachSentEvent({
      familyId: FAMILY_ID,
      initiatedBy: PHONES.ROB,
      sentToPhone: PHONES.SARAH,
      sentToName: "Sarah",
      purpose: "coverage_gap",
    });

    expect(event.event).toBe("outreach_sent");
    expect(event.details.initiatedBy).toBe(PHONES.ROB);
    expect(event.details.sentTo).toEqual({
      phone: PHONES.SARAH,
      name: "Sarah",
    });
    expect(event.details.purpose).toBe("coverage_gap");
  });
});

describe("audit log DB writes", () => {
  it("context_load + response_sent produces two records", async () => {
    const t = convexTest(schema, modules);

    const loadEvent = buildContextLoadEvent({
      familyId: FAMILY_ID,
      accessorPhone: PHONES.ROB,
      accessorRole: "primary_caregiver",
      accessLevel: "full",
      sectionsLoaded: ["members", "medications"],
      triggerMessage: "What meds am I on?",
    });
    const sentEvent = buildResponseSentEvent({
      familyId: FAMILY_ID,
      recipientPhone: PHONES.ROB,
      recipientRole: "primary_caregiver",
      accessLevel: "full",
      responseLength: 85,
      leakageCheckPassed: true,
    });

    await t.mutation(api.auditLogs.create, loadEvent);
    await t.mutation(api.auditLogs.create, sentEvent);

    const logs = await t.query(api.auditLogs.listByFamily, {
      familyId: FAMILY_ID,
    });
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => l.event)).toContain("context_load");
    expect(logs.map((l) => l.event)).toContain("response_sent");
  });

  it("all events have valid timestamps and familyId", async () => {
    const t = convexTest(schema, modules);

    const event = buildContextLoadEvent({
      familyId: FAMILY_ID,
      accessorPhone: PHONES.ROB,
      accessorRole: "primary_caregiver",
      accessLevel: "full",
      sectionsLoaded: ["members"],
      triggerMessage: "hi",
    });
    await t.mutation(api.auditLogs.create, event);

    const logs = await t.query(api.auditLogs.listByFamily, {
      familyId: FAMILY_ID,
    });
    expect(logs[0].timestamp).toBeGreaterThan(0);
    expect(logs[0].familyId).toBe(FAMILY_ID);
  });

  it("blocked event retrievable with full details", async () => {
    const t = convexTest(schema, modules);

    const blocked = buildResponseBlockedEvent({
      familyId: FAMILY_ID,
      recipientPhone: PHONES.LINDA,
      accessLevel: "schedule",
      leakedCategories: ["medications", "conditions"],
      leakedTerms: ["lisinopril", "diabetes"],
    });
    await t.mutation(api.auditLogs.create, blocked);

    const logs = await t.query(api.auditLogs.listByFamily, {
      familyId: FAMILY_ID,
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].event).toBe("response_blocked");
    expect(logs[0].details.severity).toBe("HIGH");
    expect(logs[0].details.leakedTerms).toContain("lisinopril");
    expect(logs[0].details.leakedTerms).toContain("diabetes");
  });
});
