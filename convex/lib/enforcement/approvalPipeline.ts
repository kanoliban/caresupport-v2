import type { ApprovalUpdate, ClassifiedUpdates } from "./types";
import { toSectionKey } from "../sections";

const APPROVAL_REQUIRED = new Set([
  "medications:append",
  "medications:prepend",
  "medications:replace",
  "care_recipient:replace",
  "members:append",
  "members:replace",
]);

export const EXPIRY_HOURS = 24;

const YES_PATTERN =
  /^\s*(yes|y|approve|confirm|ok|go ahead|do it|approved|yes\s+\w+)\s*$/i;
const NO_PATTERN =
  /^\s*(no|n|reject|deny|cancel|don'?t|nope|no\s+\w+)\s*$/i;

export function requiresApproval(
  section: string,
  operation: string,
): boolean {
  return APPROVAL_REQUIRED.has(`${toSectionKey(section)}:${operation}`);
}

export function classifyUpdates(
  updates: ApprovalUpdate[],
): ClassifiedUpdates {
  const result: ClassifiedUpdates = { autoApply: [], needsApproval: [] };

  for (const update of updates) {
    if (requiresApproval(update.section, update.operation)) {
      const reason = `${update.operation} on ${update.section}`;
      result.needsApproval.push({ update, reason });
    } else {
      result.autoApply.push(update);
    }
  }

  return result;
}

export interface ApprovalResponse {
  decision: "approved" | "rejected" | null;
  approvalId: string | null;
}

export function detectApprovalResponse(message: string): ApprovalResponse {
  const text = message.trim();
  const parts = text.split(/\s+/);

  if (parts.length > 2) {
    return { decision: null, approvalId: null };
  }

  const approvalId = parts.length === 2 ? parts[1] : null;

  YES_PATTERN.lastIndex = 0;
  NO_PATTERN.lastIndex = 0;

  if (YES_PATTERN.test(text)) {
    return { decision: "approved", approvalId };
  }
  if (NO_PATTERN.test(text)) {
    return { decision: "rejected", approvalId };
  }

  return { decision: null, approvalId: null };
}

interface ApprovalInfo {
  id: string;
  description: string;
  requesterName: string;
}

export function formatConfirmationSms(approval: ApprovalInfo): string {
  let desc = approval.description;
  if (desc.length > 180) {
    desc = desc.slice(0, 177) + "...";
  }

  return (
    `⚠️ Approval needed: ${desc}\n` +
    `Requested by ${approval.requesterName}.\n` +
    `Reply YES or NO (ref: ${approval.id})`
  );
}
