import type { MutationCtx } from "../../_generated/server";
import type { AuditEventType } from "./types";

export interface AuditEventArgs {
  familyId: string;
  event: AuditEventType;
  phone: string;
  accessLevel?: string;
  role?: string;
  details: {
    sectionsLoaded?: string[];
    triggerMessage?: string;
    responseLength?: number;
    leakageCheckPassed?: boolean;
    leakedCategories?: string[];
    leakedTerms?: string[];
    severity?: string;
    recipientPhone?: string;
    initiatedBy?: string;
    sentTo?: { phone: string; name: string };
    purpose?: string;
    phiDisclosed?: boolean;
  };
  timestamp: number;
}

export function buildContextLoadEvent(params: {
  familyId: string;
  accessorPhone: string;
  accessorRole: string;
  accessLevel: string;
  sectionsLoaded: string[];
  triggerMessage: string;
}): AuditEventArgs {
  return {
    familyId: params.familyId,
    event: "context_load",
    phone: params.accessorPhone,
    accessLevel: params.accessLevel,
    role: params.accessorRole,
    details: {
      sectionsLoaded: params.sectionsLoaded,
      triggerMessage: params.triggerMessage.slice(0, 200),
    },
    timestamp: Date.now(),
  };
}

export function buildResponseSentEvent(params: {
  familyId: string;
  recipientPhone: string;
  recipientRole: string;
  accessLevel: string;
  responseLength: number;
  leakageCheckPassed: boolean;
}): AuditEventArgs {
  return {
    familyId: params.familyId,
    event: "response_sent",
    phone: params.recipientPhone,
    accessLevel: params.accessLevel,
    role: params.recipientRole,
    details: {
      responseLength: params.responseLength,
      leakageCheckPassed: params.leakageCheckPassed,
    },
    timestamp: Date.now(),
  };
}

export function buildResponseBlockedEvent(params: {
  familyId: string;
  recipientPhone: string;
  accessLevel: string;
  leakedCategories: string[];
  leakedTerms: string[];
}): AuditEventArgs {
  return {
    familyId: params.familyId,
    event: "response_blocked",
    phone: params.recipientPhone,
    accessLevel: params.accessLevel,
    details: {
      severity: "HIGH",
      recipientPhone: params.recipientPhone,
      leakedCategories: params.leakedCategories,
      leakedTerms: params.leakedTerms,
    },
    timestamp: Date.now(),
  };
}

export function buildOutreachSentEvent(params: {
  familyId: string;
  initiatedBy: string;
  sentToPhone: string;
  sentToName: string;
  purpose: string;
}): AuditEventArgs {
  return {
    familyId: params.familyId,
    event: "outreach_sent",
    phone: params.initiatedBy,
    details: {
      initiatedBy: params.initiatedBy,
      sentTo: { phone: params.sentToPhone, name: params.sentToName },
      purpose: params.purpose,
    },
    timestamp: Date.now(),
  };
}

export function buildUnknownNumberEvent(params: {
  phone: string;
}): AuditEventArgs {
  return {
    familyId: "unknown",
    event: "unknown_number",
    phone: params.phone,
    details: {
      phiDisclosed: false,
    },
    timestamp: Date.now(),
  };
}

export async function writeAuditEvent(
  ctx: MutationCtx,
  event: AuditEventArgs,
): Promise<void> {
  await ctx.db.insert("auditLogs", event);
}
