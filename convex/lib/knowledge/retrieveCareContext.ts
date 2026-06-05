import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

type RetrievalCtx = Pick<QueryCtx | MutationCtx, "db">;

export type RetrievalPurpose =
  | "prompt_context"
  | "clarification"
  | "coordination"
  | "summary"
  | "reference";

export type ReferenceSourceType =
  | "message"
  | "audit"
  | "claim"
  | "coordination_event"
  | "memory";

export interface RetrieveCareContextArgs {
  careCaseId: Id<"careCases">;
  userId: Id<"users">;
  query?: string;
  purpose?: RetrievalPurpose;
  includeUnresolvedClaims?: boolean;
  includeResolvedHistory?: boolean;
  limit?: number;
}

export interface CareContextReference {
  sourceType: ReferenceSourceType;
  sourceId: string;
  text: string;
  score?: number;
  status?: string;
}

export interface CareContextSourceLink {
  sourceType:
    | ReferenceSourceType
    | "care_case"
    | "care_contact"
    | "schedule_item"
    | "medication";
  sourceId: string;
  reason: string;
}

export interface RetrievedCareContext {
  currentTruth: {
    user: Doc<"users">;
    careCase: Doc<"careCases">;
    contacts: Array<Doc<"careContacts">>;
    openCoordinationEvents: Array<Doc<"coordinationEvents">>;
    activeScheduleItems: Array<Doc<"scheduleItems">>;
    activeMemoryEntries: Array<Doc<"memoryEntries">>;
    activeMedications: Array<Doc<"medications">>;
  };
  unresolvedClaims: Array<Doc<"careClaims">>;
  references: CareContextReference[];
  sourceLinks: CareContextSourceLink[];
}

const UNRESOLVED_CLAIM_STATUSES = new Set([
  "heard",
  "inferred",
  "needs_clarification",
]);

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit ?? 0)) return 12;
  return Math.min(Math.max(Math.trunc(limit ?? 12), 1), 50);
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function queryTokens(query: string | undefined): string[] {
  const normalized = normalizeText(query ?? "");
  if (!normalized) return [];
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function scoreText(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const normalized = normalizeText(text);
  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) score += 1;
  }
  return score;
}

function addReference(
  references: CareContextReference[],
  args: {
    sourceType: ReferenceSourceType;
    sourceId: string;
    text: string;
    status?: string;
    tokens: string[];
  },
) {
  const score = scoreText(args.text, args.tokens);
  if (args.tokens.length > 0 && score === 0) return;
  references.push({
    sourceType: args.sourceType,
    sourceId: args.sourceId,
    text: args.text,
    score,
    status: args.status,
  });
}

function claimText(claim: Doc<"careClaims">): string {
  const parts = [
    claim.subjectLabel,
    claim.subjectType,
    claim.predicate,
    claim.valueText,
    claim.normalizedValue,
    claim.status,
    claim.clarificationQuestion,
  ].filter(Boolean);
  return parts.join(" - ");
}

function memoryText(entry: Doc<"memoryEntries">): string {
  return `${entry.category}: ${entry.content}`;
}

function eventText(event: Doc<"coordinationEvents">): string {
  const parts = [
    event.title,
    event.type,
    event.status,
    event.urgency,
    event.description,
    event.resolution,
  ].filter(Boolean);
  return parts.join(" - ");
}

function messageText(message: Doc<"messages">): string {
  const parts = [
    message.displayName,
    message.actorType,
    message.direction,
    message.body,
  ].filter(Boolean);
  return parts.join(" - ");
}

function auditText(audit: Doc<"auditLogs">): string {
  const details = JSON.stringify(audit.details);
  return `${audit.event} - ${audit.phone ?? ""} - ${details}`;
}

function buildSourceLinks(args: {
  careCase: Doc<"careCases">;
  contacts: Array<Doc<"careContacts">>;
  openCoordinationEvents: Array<Doc<"coordinationEvents">>;
  activeScheduleItems: Array<Doc<"scheduleItems">>;
  activeMemoryEntries: Array<Doc<"memoryEntries">>;
  activeMedications: Array<Doc<"medications">>;
  unresolvedClaims: Array<Doc<"careClaims">>;
  references: CareContextReference[];
}): CareContextSourceLink[] {
  const links: CareContextSourceLink[] = [
    {
      sourceType: "care_case",
      sourceId: String(args.careCase._id),
      reason: "current care case truth",
    },
  ];

  for (const contact of args.contacts) {
    links.push({
      sourceType: "care_contact",
      sourceId: String(contact._id),
      reason: "current care contact truth",
    });
    if (contact.availabilitySourceMessageId) {
      links.push({
        sourceType: "message",
        sourceId: String(contact.availabilitySourceMessageId),
        reason: `availability source for ${contact.name}`,
      });
    }
  }

  for (const event of args.openCoordinationEvents) {
    links.push({
      sourceType: "coordination_event",
      sourceId: String(event._id),
      reason: "open coordination state",
    });
    if (event.lastReplyMessageId) {
      links.push({
        sourceType: "message",
        sourceId: String(event.lastReplyMessageId),
        reason: `last reply source for ${event.title}`,
      });
    }
  }

  for (const item of args.activeScheduleItems) {
    links.push({
      sourceType: "schedule_item",
      sourceId: String(item._id),
      reason: "active schedule truth",
    });
  }

  for (const entry of args.activeMemoryEntries) {
    links.push({
      sourceType: "memory",
      sourceId: String(entry._id),
      reason: "active durable memory",
    });
  }

  for (const medication of args.activeMedications) {
    links.push({
      sourceType: "medication",
      sourceId: String(medication._id),
      reason: "active medication truth",
    });
  }

  for (const claim of args.unresolvedClaims) {
    links.push({
      sourceType: "claim",
      sourceId: String(claim._id),
      reason: `unresolved ${claim.status} claim`,
    });
    links.push({
      sourceType: "message",
      sourceId: String(claim.sourceMessageId),
      reason: `source message for ${claim.subjectLabel}/${claim.predicate}`,
    });
  }

  for (const reference of args.references) {
    links.push({
      sourceType: reference.sourceType,
      sourceId: reference.sourceId,
      reason: "retrieved reference",
    });
  }

  return links;
}

export async function retrieveCareContext(
  ctx: RetrievalCtx,
  args: RetrieveCareContextArgs,
): Promise<RetrievedCareContext | null> {
  const limit = clampLimit(args.limit);
  const tokens = queryTokens(args.query);

  const [
    user,
    careCase,
    contacts,
    openEvents,
    waitingEvents,
    scheduleItems,
    memoryEntries,
    medications,
    activeClaims,
  ] = await Promise.all([
    ctx.db.get(args.userId),
    ctx.db.get(args.careCaseId),
    ctx.db
      .query("careContacts")
      .withIndex("by_care_case_active", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("active", true),
      )
      .collect(),
    ctx.db
      .query("coordinationEvents")
      .withIndex("by_care_case_status", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("status", "open"),
      )
      .collect(),
    ctx.db
      .query("coordinationEvents")
      .withIndex("by_care_case_status", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("status", "waiting"),
      )
      .collect(),
    ctx.db
      .query("scheduleItems")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect(),
    ctx.db
      .query("memoryEntries")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect(),
    ctx.db
      .query("medications")
      .withIndex("by_care_case_status", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("status", "active"),
      )
      .collect(),
    ctx.db
      .query("careClaims")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect(),
  ]);

  if (!user || !careCase || user.careCaseId !== args.careCaseId) {
    return null;
  }

  const openCoordinationEvents = [...openEvents, ...waitingEvents];
  const includeUnresolvedClaims = args.includeUnresolvedClaims !== false;
  const unresolvedClaims = includeUnresolvedClaims
    ? activeClaims.filter((claim) => UNRESOLVED_CLAIM_STATUSES.has(claim.status))
    : [];
  const references: CareContextReference[] = [];

  for (const claim of activeClaims) {
    if (
      !includeUnresolvedClaims &&
      UNRESOLVED_CLAIM_STATUSES.has(claim.status)
    ) {
      continue;
    }
    addReference(references, {
      sourceType: "claim",
      sourceId: String(claim._id),
      text: claimText(claim),
      status: claim.status,
      tokens,
    });
  }

  for (const entry of memoryEntries) {
    addReference(references, {
      sourceType: "memory",
      sourceId: String(entry._id),
      text: memoryText(entry),
      status: entry.active ? "active" : "inactive",
      tokens,
    });
  }

  if (args.includeResolvedHistory) {
    const [messages, resolvedEvents, audits] = await Promise.all([
      ctx.db
        .query("messages")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", args.careCaseId),
        )
        .order("desc")
        .take(limit * 3),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case_status", (q) =>
          q.eq("careCaseId", args.careCaseId).eq("status", "resolved"),
        )
        .collect(),
      ctx.db
        .query("auditLogs")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", args.careCaseId),
        )
        .order("desc")
        .take(limit * 2),
    ]);

    for (const message of messages) {
      addReference(references, {
        sourceType: "message",
        sourceId: String(message._id),
        text: messageText(message),
        status: message.direction,
        tokens,
      });
    }

    for (const event of resolvedEvents) {
      addReference(references, {
        sourceType: "coordination_event",
        sourceId: String(event._id),
        text: eventText(event),
        status: event.status,
        tokens,
      });
    }

    for (const audit of audits) {
      addReference(references, {
        sourceType: "audit",
        sourceId: String(audit._id),
        text: auditText(audit),
        status: audit.event,
        tokens,
      });
    }
  }

  references.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const limitedReferences = references.slice(0, limit);

  return {
    currentTruth: {
      user,
      careCase,
      contacts,
      openCoordinationEvents,
      activeScheduleItems: scheduleItems,
      activeMemoryEntries: memoryEntries,
      activeMedications: medications,
    },
    unresolvedClaims,
    references: limitedReferences,
    sourceLinks: buildSourceLinks({
      careCase,
      contacts,
      openCoordinationEvents,
      activeScheduleItems: scheduleItems,
      activeMemoryEntries: memoryEntries,
      activeMedications: medications,
      unresolvedClaims,
      references: limitedReferences,
    }),
  };
}
