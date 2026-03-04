import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../schema";
import { api } from "../../_generated/api";
import {
  requiresApproval,
  classifyUpdates,
  detectApprovalResponse,
  formatConfirmationSms,
} from "./approvalPipeline";
import type { ApprovalUpdate } from "./types";
import { PHONES, FAMILY_ID } from "./fixtures";

const modules = import.meta.glob("../../**/*.ts");

describe("requiresApproval", () => {
  it("medications append/prepend/replace require approval", () => {
    expect(requiresApproval("medications", "append")).toBe(true);
    expect(requiresApproval("medications", "prepend")).toBe(true);
    expect(requiresApproval("medications", "replace")).toBe(true);
  });

  it("care_recipient replace requires approval", () => {
    expect(requiresApproval("care_recipient", "replace")).toBe(true);
  });

  it("members append/replace require approval", () => {
    expect(requiresApproval("members", "append")).toBe(true);
    expect(requiresApproval("members", "replace")).toBe(true);
  });

  it("schedule append/replace do NOT require approval", () => {
    expect(requiresApproval("schedule", "append")).toBe(false);
    expect(requiresApproval("schedule", "replace")).toBe(false);
  });

  it("observational sections do NOT require approval", () => {
    expect(requiresApproval("recent_events", "prepend")).toBe(false);
    expect(requiresApproval("active_issues", "resolve_issue")).toBe(false);
    expect(requiresApproval("patterns", "append")).toBe(false);
  });
});

describe("classifyUpdates", () => {
  it("splits mixed batch correctly", () => {
    const updates: ApprovalUpdate[] = [
      { section: "recent_events", operation: "prepend", content: "new event", oldContent: "" },
      { section: "medications", operation: "replace", content: "new dosage", oldContent: "old dosage" },
      { section: "active_issues", operation: "resolve_issue", content: "shift covered", oldContent: "" },
      { section: "members", operation: "replace", content: "new phone", oldContent: "" },
    ];

    const result = classifyUpdates(updates);
    expect(result.autoApply).toHaveLength(2);
    expect(result.needsApproval).toHaveLength(2);

    const autoSections = result.autoApply.map((u) => u.section);
    expect(autoSections).toContain("recent_events");
    expect(autoSections).toContain("active_issues");

    const approvalSections = result.needsApproval.map((n) => n.update.section);
    expect(approvalSections).toContain("medications");
    expect(approvalSections).toContain("members");
  });

  it("all-safe batch has empty needsApproval", () => {
    const updates: ApprovalUpdate[] = [
      { section: "schedule", operation: "append", content: "new shift", oldContent: "" },
      { section: "recent_events", operation: "prepend", content: "event", oldContent: "" },
    ];
    const result = classifyUpdates(updates);
    expect(result.autoApply).toHaveLength(2);
    expect(result.needsApproval).toHaveLength(0);
  });

  it("all-gated batch has empty autoApply", () => {
    const updates: ApprovalUpdate[] = [
      { section: "medications", operation: "append", content: "new med", oldContent: "" },
      { section: "members", operation: "append", content: "new member", oldContent: "" },
    ];
    const result = classifyUpdates(updates);
    expect(result.autoApply).toHaveLength(0);
    expect(result.needsApproval).toHaveLength(2);
  });
});

describe("detectApprovalResponse", () => {
  it("yes/YES/y/approve/confirm → approved", () => {
    expect(detectApprovalResponse("yes").decision).toBe("approved");
    expect(detectApprovalResponse("YES").decision).toBe("approved");
    expect(detectApprovalResponse("y").decision).toBe("approved");
    expect(detectApprovalResponse("approve").decision).toBe("approved");
    expect(detectApprovalResponse("confirm").decision).toBe("approved");
  });

  it("no/NO/reject/cancel → rejected", () => {
    expect(detectApprovalResponse("no").decision).toBe("rejected");
    expect(detectApprovalResponse("NO").decision).toBe("rejected");
    expect(detectApprovalResponse("reject").decision).toBe("rejected");
    expect(detectApprovalResponse("cancel").decision).toBe("rejected");
  });

  it("YES abc123 captures approval ID", () => {
    const result = detectApprovalResponse("YES abc123");
    expect(result.decision).toBe("approved");
    expect(result.approvalId).toBe("abc123");
  });

  it("NO def456 captures rejection ID", () => {
    const result = detectApprovalResponse("no def456");
    expect(result.decision).toBe("rejected");
    expect(result.approvalId).toBe("def456");
  });

  it("normal message returns null", () => {
    expect(detectApprovalResponse("Can someone take dad to the doctor?").decision).toBe(null);
    expect(detectApprovalResponse("what time is the appointment").decision).toBe(null);
  });
});

describe("formatConfirmationSms", () => {
  it("contains description, requester, YES/NO instructions, and ID", () => {
    const sms = formatConfirmationSms({
      id: "abc12345",
      description: "Change Lisinopril from 10mg to 20mg",
      requesterName: "Sarah",
    });

    expect(sms).toContain("Approval needed");
    expect(sms).toContain("Lisinopril");
    expect(sms).toContain("Sarah");
    expect(sms).toContain("YES or NO");
    expect(sms).toContain("abc12345");
  });

  it("truncates long descriptions to 180 chars", () => {
    const sms = formatConfirmationSms({
      id: "x",
      description: "a".repeat(250),
      requesterName: "Test",
    });
    expect(sms).toContain("...");
    expect(sms).not.toContain("a".repeat(250));
  });
});

describe("approval lifecycle via Convex", () => {
  it("create + retrieve pending approval", async () => {
    const t = convexTest(schema, modules);

    const now = Date.now();
    const id = await t.mutation(api.approvals.create, {
      familyId: FAMILY_ID,
      status: "pending",
      requesterPhone: PHONES.SARAH,
      requesterName: "Sarah",
      approverPhones: [PHONES.ROB, PHONES.MARTA],
      description: "Change Lisinopril from 10mg to 20mg",
      update: { section: "medications", operation: "replace", content: "20mg", oldContent: "10mg" },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    const pending = await t.query(api.approvals.listPendingByFamily, {
      familyId: FAMILY_ID,
    });
    expect(pending).toHaveLength(1);
    expect(pending[0]._id).toBe(id);
    expect(pending[0].status).toBe("pending");
    expect(pending[0].description).toBe("Change Lisinopril from 10mg to 20mg");
  });

  it("resolve approved changes status", async () => {
    const t = convexTest(schema, modules);

    const now = Date.now();
    const id = await t.mutation(api.approvals.create, {
      familyId: FAMILY_ID,
      status: "pending",
      requesterPhone: PHONES.SARAH,
      requesterName: "Sarah",
      approverPhones: [PHONES.ROB],
      description: "Dosage change",
      update: { section: "medications", operation: "replace", content: "20mg", oldContent: "10mg" },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    const result = await t.mutation(api.approvals.resolve, {
      id,
      status: "approved",
      resolvedBy: PHONES.ROB,
    });
    expect(result.action).toBe("approved");

    const pending = await t.query(api.approvals.listPendingByFamily, {
      familyId: FAMILY_ID,
    });
    expect(pending).toHaveLength(0);

    const all = await t.query(api.approvals.listByFamily, {
      familyId: FAMILY_ID,
    });
    expect(all[0].status).toBe("approved");
    expect(all[0].resolvedBy).toBe(PHONES.ROB);
  });

  it("resolve rejected preserves data", async () => {
    const t = convexTest(schema, modules);

    const now = Date.now();
    const id = await t.mutation(api.approvals.create, {
      familyId: FAMILY_ID,
      status: "pending",
      requesterPhone: PHONES.SARAH,
      requesterName: "Sarah",
      approverPhones: [PHONES.MARTA],
      description: "Add new member",
      update: { section: "members", operation: "append", content: "new", oldContent: "" },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    const result = await t.mutation(api.approvals.resolve, {
      id,
      status: "rejected",
      resolvedBy: PHONES.MARTA,
    });
    expect(result.action).toBe("rejected");

    const all = await t.query(api.approvals.listByFamily, {
      familyId: FAMILY_ID,
    });
    expect(all[0].status).toBe("rejected");
    expect(all[0].description).toBe("Add new member");
  });

  it("unauthorized phone blocked", async () => {
    const t = convexTest(schema, modules);

    const now = Date.now();
    const id = await t.mutation(api.approvals.create, {
      familyId: FAMILY_ID,
      status: "pending",
      requesterPhone: PHONES.SARAH,
      requesterName: "Sarah",
      approverPhones: [PHONES.ROB],
      description: "Dosage change",
      update: { section: "medications", operation: "replace", content: "20mg", oldContent: "10mg" },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    const result = await t.mutation(api.approvals.resolve, {
      id,
      status: "approved",
      resolvedBy: PHONES.LINDA,
    });
    expect(result.action).toBe("unauthorized");

    const pending = await t.query(api.approvals.listPendingByFamily, {
      familyId: FAMILY_ID,
    });
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("pending");
  });

  it("expired approval cannot resolve", async () => {
    const t = convexTest(schema, modules);

    const now = Date.now();
    const id = await t.mutation(api.approvals.create, {
      familyId: FAMILY_ID,
      status: "pending",
      requesterPhone: PHONES.SARAH,
      requesterName: "Sarah",
      approverPhones: [PHONES.ROB],
      description: "Dosage change",
      update: { section: "medications", operation: "replace", content: "20mg", oldContent: "10mg" },
      createdAt: now - 48 * 60 * 60 * 1000,
      expiresAt: now - 24 * 60 * 60 * 1000,
    });

    const result = await t.mutation(api.approvals.resolve, {
      id,
      status: "approved",
      resolvedBy: PHONES.ROB,
    });
    expect(result.action).toBe("expired");
  });

  it("already-resolved cannot re-resolve", async () => {
    const t = convexTest(schema, modules);

    const now = Date.now();
    const id = await t.mutation(api.approvals.create, {
      familyId: FAMILY_ID,
      status: "pending",
      requesterPhone: PHONES.SARAH,
      requesterName: "Sarah",
      approverPhones: [PHONES.ROB],
      description: "Dosage change",
      update: { section: "medications", operation: "replace", content: "20mg", oldContent: "10mg" },
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    await t.mutation(api.approvals.resolve, {
      id,
      status: "approved",
      resolvedBy: PHONES.ROB,
    });

    const result = await t.mutation(api.approvals.resolve, {
      id,
      status: "rejected",
      resolvedBy: PHONES.ROB,
    });
    expect(result.action).toBe("already_resolved");
  });
});
