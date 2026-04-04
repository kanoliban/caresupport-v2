import { toSectionKey } from "../sections";

type AccessLevel = "full" | "schedule+meds" | "schedule" | "provider" | "limited";

interface AccessConfig {
  sections: readonly string[];
  canApproveChanges: boolean;
}

export interface Section {
  header: string;
  key: string;
  content: string;
}

export interface LeakageResult {
  isClean: boolean;
  leakedCategories: string[];
  leakedTerms: string[];
}

const ACCESS_MATRIX: Record<AccessLevel, AccessConfig> = {
  full: {
    sections: ["*"],
    canApproveChanges: true,
  },
  "schedule+meds": {
    sections: [
      "members",
      "care_recipient",
      "schedule",
      "medications",
      "appointments",
      "availability",
      "active_issues",
    ],
    canApproveChanges: false,
  },
  schedule: {
    sections: ["members", "schedule", "availability", "active_issues"],
    canApproveChanges: false,
  },
  provider: {
    sections: ["care_recipient", "medications", "appointments", "members"],
    canApproveChanges: false,
  },
  limited: {
    sections: ["members"],
    canApproveChanges: false,
  },
};

const MED_PATTERNS: RegExp[] = [
  /\b\w+pril\b/gi,
  /\b\w+sartan\b/gi,
  /\b\w+statin\b/gi,
  /\b\w+formin\b/gi,
  /\b\w+olol\b/gi,
  /\b\w+pine\b/gi,
  /\b\w+azole\b/gi,
  /\b\w+cycline\b/gi,
  /\b\w+mycin\b/gi,
  /\b\d+\s*mg\b/gi,
  /\b\d+\s*mcg\b/gi,
  /\b\d+\s*ml\b/gi,
];

const CONDITION_PATTERNS: RegExp[] = [
  /\bdiabet\w*\b/gi,
  /\bhypertens\w*\b/gi,
  /\balzheimer\w*\b/gi,
  /\bdementia\b/gi,
  /\bdiagnos\w*\b/gi,
  /\bprescri\w*\b/gi,
  /\bA1[Cc]\b/g,
  /\bblood\s+(?:pressure|sugar|glucose)\b/gi,
  /\bcholesterol\b/gi,
  /\binsulin\b/gi,
];

export function parseFamilySections(
  familyMd: string,
): { header: string; sections: Section[] } {
  const lines = familyMd.split("\n");
  const headerLines: string[] = [];
  const sections: Section[] = [];
  let currentHeader: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeader !== null) {
        sections.push({
          header: currentHeader,
          key: toSectionKey(currentHeader),
          content: currentLines.join("\n"),
        });
      }
      currentHeader = line;
      currentLines = [line];
    } else if (currentHeader === null) {
      headerLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  if (currentHeader !== null) {
    sections.push({
      header: currentHeader,
      key: toSectionKey(currentHeader),
      content: currentLines.join("\n"),
    });
  }

  return { header: headerLines.join("\n"), sections };
}

export function filterFamilyContext(
  familyMd: string,
  accessLevel: string,
): string {
  const config = ACCESS_MATRIX[accessLevel as AccessLevel];
  if (!config) {
    const { header } = parseFamilySections(familyMd);
    return (
      header + "\n\n[Access level not recognized. No care data loaded.]\n"
    );
  }

  const allowed = config.sections;
  if (allowed.includes("*")) return familyMd;

  const { header, sections } = parseFamilySections(familyMd);
  const filteredParts = [header.trimEnd()];
  for (const section of sections) {
    if (allowed.includes(section.key)) {
      filteredParts.push(section.content.trimEnd());
    }
  }

  return filteredParts.join("\n\n") + "\n";
}

export function getFilteredSections(accessLevel: string): string[] {
  const config = ACCESS_MATRIX[accessLevel as AccessLevel];
  if (!config) return [];
  const allowed = config.sections;
  if (allowed.includes("*")) return ["*"];
  return [...allowed];
}

export function canApprove(accessLevel: string): boolean {
  const config = ACCESS_MATRIX[accessLevel as AccessLevel];
  if (!config) return false;
  return config.canApproveChanges;
}

export function scanForMedicationLeakage(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of MED_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      found.add(m[0].toLowerCase());
    }
  }
  return [...found];
}

export function scanForConditionLeakage(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of CONDITION_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      found.add(m[0].toLowerCase());
    }
  }
  return [...found];
}

export function checkOutboundMessage(
  message: string,
  accessLevel: string,
): LeakageResult {
  const config = ACCESS_MATRIX[accessLevel as AccessLevel];
  const allowed = config?.sections ?? [];

  if (allowed.includes("*")) {
    return { isClean: true, leakedCategories: [], leakedTerms: [] };
  }

  const leakedCategories: string[] = [];
  const leakedTerms: string[] = [];

  if (!allowed.includes("medications")) {
    const medTerms = scanForMedicationLeakage(message);
    if (medTerms.length > 0) {
      leakedCategories.push("medications");
      leakedTerms.push(...medTerms);
    }
  }

  if (!allowed.includes("care_recipient")) {
    const conditionTerms = scanForConditionLeakage(message);
    if (conditionTerms.length > 0) {
      leakedCategories.push("conditions");
      leakedTerms.push(...conditionTerms);
    }
  }

  return {
    isClean: leakedCategories.length === 0,
    leakedCategories,
    leakedTerms,
  };
}
