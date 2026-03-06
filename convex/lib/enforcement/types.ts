export type AccessLevel =
  | "full"
  | "schedule+meds"
  | "schedule"
  | "provider"
  | "limited";

export type AuditEventType =
  | "context_load"
  | "response_sent"
  | "response_blocked"
  | "outreach_sent"
  | "unknown_number"
  | "message_failed"
  | "message_status_update";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

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

export interface ApprovalUpdate {
  section: string;
  operation: string;
  content: string;
  oldContent: string;
}

export interface ClassifiedUpdates {
  autoApply: ApprovalUpdate[];
  needsApproval: Array<{ update: ApprovalUpdate; reason: string }>;
}
