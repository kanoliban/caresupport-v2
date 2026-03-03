import type { ProcessResult } from "../contracts/processResult.js";
import type { ProcessingInput } from "../types/domain.js";

const OUTREACH_PROMISE_PATTERNS = [
  "i'll reach out",
  "i'll message",
  "i'll text",
  "i'll contact",
  "i'll send",
  "i will reach out",
  "i will message",
  "i will text",
  "i will contact",
  "i will send",
];

const PHI_SENSITIVE_HINTS = ["ssn", "social security", "diagnosis", "insurance id", "mrn"];

export interface EnforcementIssue {
  code: string;
  severity: "warning" | "error";
  detail: string;
}

export function preModelGuard(input: ProcessingInput): EnforcementIssue[] {
  const issues: EnforcementIssue[] = [];
  if (!input.text.trim()) {
    issues.push({
      code: "EMPTY_MESSAGE",
      severity: "error",
      detail: "Inbound text is empty after parsing parts.",
    });
  }
  if (input.actor.accessLevel !== "full" && input.text.toLowerCase().includes("medication")) {
    issues.push({
      code: "LIMITED_MEMBER_MEDS_REQUEST",
      severity: "warning",
      detail: "Limited-access member requested medication details; response must stay policy-safe.",
    });
  }
  return issues;
}

export function postModelGuard(result: ProcessResult): EnforcementIssue[] {
  const issues: EnforcementIssue[] = [];
  const responseLower = result.sms_response.toLowerCase();

  const promisedOutreach = OUTREACH_PROMISE_PATTERNS.some((p) => responseLower.includes(p));
  if (promisedOutreach && result.needs_outreach.length === 0) {
    issues.push({
      code: "PROMISE_WITHOUT_ACTION",
      severity: "error",
      detail: "Response promises outreach, but needs_outreach is empty.",
    });
  }

  for (const hint of PHI_SENSITIVE_HINTS) {
    if (responseLower.includes(hint)) {
      issues.push({
        code: "POTENTIAL_PHI_LEAK",
        severity: "warning",
        detail: `Response includes PHI-sensitive hint: ${hint}`,
      });
      break;
    }
  }

  return issues;
}

export function enforceOrThrow(issues: EnforcementIssue[]): void {
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.code}: ${e.detail}`).join("; ");
    throw new Error(`Enforcement blocked response: ${detail}`);
  }
}
