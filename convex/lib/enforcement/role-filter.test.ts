import { describe, it, expect } from "vitest";
import {
  parseFamilySections,
  filterFamilyContext,
  checkOutboundMessage,
  getFilteredSections,
  canApprove,
  scanForMedicationLeakage,
  scanForConditionLeakage,
} from "./role-filter";
import { FAMILY_MD } from "./fixtures";

describe("parseFamilySections", () => {
  it("extracts header with family name", () => {
    const { header } = parseFamilySections(FAMILY_MD);
    expect(header).toContain("Moreno Care Network");
  });

  it("parses all 9 sections", () => {
    const { sections } = parseFamilySections(FAMILY_MD);
    expect(sections).toHaveLength(9);
  });

  it("maps headers to correct keys", () => {
    const { sections } = parseFamilySections(FAMILY_MD);
    const keys = sections.map((s) => s.key);
    expect(keys).toContain("members");
    expect(keys).toContain("care_recipient");
    expect(keys).toContain("schedule");
    expect(keys).toContain("medications");
    expect(keys).toContain("appointments");
    expect(keys).toContain("availability");
    expect(keys).toContain("active_issues");
    expect(keys).toContain("recent_events");
    expect(keys).toContain("patterns");
  });
});

describe("filterFamilyContext", () => {
  it("full access returns unmodified content", () => {
    const filtered = filterFamilyContext(FAMILY_MD, "full");
    expect(filtered).toBe(FAMILY_MD);
    expect(filtered).toContain("Lisinopril");
    expect(filtered).toContain("Metformin");
    expect(filtered).toContain("diabetes");
    expect(filtered).toContain("## Schedule");
    expect(filtered).toContain("## Medications");
    expect(filtered).toContain("## Patterns");
  });

  it("schedule+meds sees meds, schedule, appointments; NOT recent_events/patterns", () => {
    const filtered = filterFamilyContext(FAMILY_MD, "schedule+meds");
    expect(filtered).toContain("## Schedule");
    expect(filtered).toContain("## Medications");
    expect(filtered).toContain("Lisinopril");
    expect(filtered).toContain("## Members");
    expect(filtered).toContain("## Appointments");
    expect(filtered).toContain("## Active Issues");
    expect(filtered).not.toContain("## Recent Events");
    expect(filtered).not.toContain("## Patterns");
  });

  it("schedule-only does NOT see medications, conditions, dosages", () => {
    const filtered = filterFamilyContext(FAMILY_MD, "schedule");
    expect(filtered).not.toContain("Lisinopril");
    expect(filtered).not.toContain("Metformin");
    expect(filtered).not.toContain("10mg");
    expect(filtered).not.toContain("500mg");
    expect(filtered).not.toContain("## Medications");
    expect(filtered).not.toContain("Type 2 diabetes");
    expect(filtered).not.toContain("hypertension");
    expect(filtered).not.toContain("## Care Recipient");
    expect(filtered).not.toContain("## Recent Events");
    expect(filtered).not.toContain("## Patterns");
    expect(filtered).not.toContain("## Appointments");
    expect(filtered).toContain("## Schedule");
    expect(filtered).toContain("## Members");
    expect(filtered).toContain("## Availability");
    expect(filtered).toContain("## Active Issues");
  });

  it("provider sees medications, care_recipient; NOT schedule/availability", () => {
    const filtered = filterFamilyContext(FAMILY_MD, "provider");
    expect(filtered).toContain("## Medications");
    expect(filtered).toContain("## Care Recipient");
    expect(filtered).toContain("## Appointments");
    expect(filtered).toContain("## Members");
    expect(filtered).not.toContain("## Schedule");
    expect(filtered).not.toContain("## Availability");
    expect(filtered).not.toContain("## Patterns");
  });

  it("unknown access level returns header + error message", () => {
    const filtered = filterFamilyContext(FAMILY_MD, "bogus");
    expect(filtered).toContain("Moreno Care Network");
    expect(filtered).toContain("Access level not recognized");
    expect(filtered).not.toContain("Lisinopril");
    expect(filtered).not.toContain("diabetes");
  });
});

describe("checkOutboundMessage", () => {
  it("clean message passes for schedule-only", () => {
    const result = checkOutboundMessage(
      "Your next shift is Tuesday at 2pm.",
      "schedule",
    );
    expect(result.isClean).toBe(true);
    expect(result.leakedCategories).toHaveLength(0);
  });

  it("med info passes for schedule+meds", () => {
    const result = checkOutboundMessage(
      "Lisinopril 10mg is due at 8am.",
      "schedule+meds",
    );
    expect(result.isClean).toBe(true);
  });

  it("catches medication name leakage to schedule-only", () => {
    const result = checkOutboundMessage(
      "Rob's Lisinopril 500mg is due at 8am.",
      "schedule",
    );
    expect(result.isClean).toBe(false);
    expect(result.leakedCategories).toContain("medications");
    expect(result.leakedTerms.some((t) => t.includes("lisinopril"))).toBe(
      true,
    );
  });

  it("catches condition leakage to schedule-only", () => {
    const result = checkOutboundMessage(
      "Rob has diabetes and needs monitoring.",
      "schedule",
    );
    expect(result.isClean).toBe(false);
    expect(result.leakedCategories).toContain("conditions");
  });

  it("full access never flags", () => {
    const result = checkOutboundMessage(
      "Rob's Lisinopril 10mg for diabetes is due.",
      "full",
    );
    expect(result.isClean).toBe(true);
  });
});

describe("scanForMedicationLeakage", () => {
  it("detects -pril, -statin, -formin suffixes", () => {
    const terms = scanForMedicationLeakage(
      "lisinopril and atorvastatin and metformin",
    );
    expect(terms).toContain("lisinopril");
    expect(terms).toContain("atorvastatin");
    expect(terms).toContain("metformin");
  });

  it("detects dosage patterns", () => {
    const terms = scanForMedicationLeakage("Take 10mg in the morning");
    expect(terms.some((t) => t.includes("10mg") || t.includes("10 mg"))).toBe(
      true,
    );
  });

  it("no false positives on normal text", () => {
    const terms = scanForMedicationLeakage(
      "The weather is nice today. See you at 2pm.",
    );
    expect(terms).toHaveLength(0);
  });
});

describe("scanForConditionLeakage", () => {
  it("detects condition terms", () => {
    const terms = scanForConditionLeakage("diabetes and hypertension");
    expect(terms).toContain("diabetes");
    expect(terms).toContain("hypertension");
  });

  it("detects clinical terms", () => {
    const terms = scanForConditionLeakage(
      "Check blood pressure and cholesterol",
    );
    expect(terms).toContain("blood pressure");
    expect(terms).toContain("cholesterol");
  });

  it("no false positives on normal text", () => {
    const terms = scanForConditionLeakage(
      "The schedule looks good for next week.",
    );
    expect(terms).toHaveLength(0);
  });
});

describe("accessMatrix properties", () => {
  it("full can approve changes", () => {
    expect(canApprove("full")).toBe(true);
  });

  it("non-full levels cannot approve", () => {
    expect(canApprove("schedule+meds")).toBe(false);
    expect(canApprove("schedule")).toBe(false);
    expect(canApprove("provider")).toBe(false);
    expect(canApprove("limited")).toBe(false);
  });

  it("full access returns wildcard", () => {
    expect(getFilteredSections("full")).toEqual(["*"]);
  });

  it("schedule excludes medications", () => {
    const sections = getFilteredSections("schedule");
    expect(sections).not.toContain("medications");
    expect(sections).toContain("schedule");
  });
});
