import { internalMutation, internalQuery, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const outreachAttemptStatusValidator = v.union(
  v.literal("pending_approval"),
  v.literal("approved"),
  v.literal("blocked"),
  v.literal("cancelled"),
  v.literal("sent"),
  v.literal("failed"),
);

const outreachRequestValidator = v.object({
  contactName: v.string(),
  purpose: v.string(),
  message: v.string(),
  coordinationEventTitle: v.optional(v.string()),
});

type OutreachAttemptStatus =
  | "pending_approval"
  | "approved"
  | "blocked"
  | "cancelled"
  | "sent"
  | "failed";

interface PendingAttemptWithContact {
  attempt: Doc<"outreachAttempts">;
  contact: Doc<"careContacts">;
}

const DEFAULT_OUTREACH_FOLLOW_UP_DELAY_MS = 6 * 60 * 60 * 1000;

export interface DueOutreachFollowUp {
  kind: "caregiver_reminder";
  outreachAttemptId: Id<"outreachAttempts">;
  careCaseId: Id<"careCases">;
  userId: Id<"users">;
  careContactId: Id<"careContacts">;
  coordinationEventId: Id<"coordinationEvents">;
  contactName: string;
  contactPhone?: string;
  chatId?: string;
  messageBody: string;
  dueAt: number;
}

export interface DueCoordinationStatusUpdate {
  kind: "coordinator_status";
  careCaseId: Id<"careCases">;
  userId: Id<"users">;
  coordinationEventId: Id<"coordinationEvents">;
  userChatId?: string;
  messageBody: string;
  dueAt: number;
}

export function isOutreachApprovalMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("👍")) return true;

  return /^(yes|yep|yeah|sure|ok|okay|please do|go ahead|do it|send it|ask\b|text\b|message\b)/i
    .test(normalized);
}

function normalizeLookup(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function messageMentionsContact(message: string, contactName: string): boolean {
  const normalizedMessage = ` ${message.toLowerCase()} `;
  const normalizedName = normalizeLookup(contactName);
  if (!normalizedName) return false;

  const nameParts = normalizedName.split(/\s+/).filter(Boolean);
  if (normalizedMessage.includes(` ${normalizedName} `)) return true;
  return nameParts.some((part) => part.length > 2 && normalizedMessage.includes(` ${part} `));
}

function blockReasonForContact(contact: Doc<"careContacts">): string | null {
  if (!contact.active) return "contact_inactive";
  if (!contact.phone) return "no_phone";
  if (!contact.canReceiveTexts) return "texting_disabled";
  if (contact.consentToContact === false) return "contact_consent_denied";
  return null;
}

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit ?? 0)) return 25;
  return Math.min(Math.max(Math.trunc(limit ?? 25), 1), 100);
}

function careRecipientLabel(
  careCase: Doc<"careCases"> | null,
  user: Doc<"users"> | null,
): string {
  return careCase?.careRecipientName?.trim() || user?.name?.trim() || "them";
}

function caregiverReminderBody(args: {
  careRecipientName: string;
  eventTitle: string;
}): string {
  return [
    `Quick follow-up from CareSupport for ${args.careRecipientName}:`,
    `just checking whether you saw my earlier message about ${args.eventTitle}.`,
    "When you can, reply yes, no, or what timing works for you.",
  ].join(" ");
}

function contactNames(
  contactsById: Map<Id<"careContacts">, Doc<"careContacts">>,
  ids: Array<Id<"careContacts">> | undefined,
): string[] {
  return (ids ?? [])
    .map((id) => contactsById.get(id)?.name)
    .filter((name): name is string => Boolean(name));
}

function coordinationStatusBody(args: {
  eventTitle: string;
  confirmedNames: string[];
  pendingNames: string[];
  declinedNames: string[];
}): string {
  const parts = [`CareSupport update: I am still tracking ${args.eventTitle}.`];
  if (args.confirmedNames.length) {
    parts.push(`Confirmed: ${args.confirmedNames.join(", ")}.`);
  }
  if (args.pendingNames.length) {
    parts.push(`Still waiting on: ${args.pendingNames.join(", ")}.`);
  }
  if (args.declinedNames.length) {
    parts.push(`Declined/unavailable: ${args.declinedNames.join(", ")}.`);
  }
  parts.push(
    "I have not contacted anyone else. If you want me to ask another backup, tell me who to text.",
  );
  return parts.join(" ");
}

function hasReplyAfterSent(
  attempt: Doc<"outreachAttempts">,
  contact: Doc<"careContacts">,
  event: Doc<"coordinationEvents">,
): boolean {
  const sentAt = attempt.sentAt ?? attempt.updatedAt;
  if (contact.lastReplyAt !== undefined && contact.lastReplyAt >= sentAt) {
    return true;
  }
  return Boolean(
    event.lastReplyContactId === contact._id &&
      event.lastReplyAt !== undefined &&
      event.lastReplyAt >= sentAt,
  );
}

async function findCareContactByName(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  contactName: string,
): Promise<Doc<"careContacts"> | null> {
  const target = normalizeLookup(contactName);
  if (!target) return null;

  const contacts = await ctx.db
    .query("careContacts")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
    .collect();

  return contacts.find((contact) => normalizeLookup(contact.name) === target) ?? null;
}

async function findCoordinationEventByTitle(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  title: string | undefined,
): Promise<Doc<"coordinationEvents"> | null> {
  const target = normalizeLookup(title);
  if (!target) return null;

  const events = await ctx.db
    .query("coordinationEvents")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
    .collect();

  return events.find((event) => normalizeLookup(event.title) === target) ?? null;
}

async function findExistingAttempt(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  coordinationEventId: Id<"coordinationEvents">,
  careContactId: Id<"careContacts">,
  status: OutreachAttemptStatus,
): Promise<Doc<"outreachAttempts"> | null> {
  const attempts = await ctx.db
    .query("outreachAttempts")
    .withIndex("by_care_case_event_status", (q) =>
      q.eq("careCaseId", careCaseId)
        .eq("coordinationEventId", coordinationEventId)
        .eq("status", status),
    )
    .collect();

  return attempts.find((attempt) => attempt.careContactId === careContactId) ?? null;
}

async function getPendingAttemptsWithContacts(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
): Promise<PendingAttemptWithContact[]> {
  const attempts = await ctx.db
    .query("outreachAttempts")
    .withIndex("by_care_case_status", (q) =>
      q.eq("careCaseId", careCaseId).eq("status", "pending_approval"),
    )
    .collect();

  const enriched: PendingAttemptWithContact[] = [];
  for (const attempt of attempts) {
    const contact = await ctx.db.get(attempt.careContactId);
    if (!contact || contact.careCaseId !== careCaseId) continue;
    enriched.push({ attempt, contact });
  }

  return enriched;
}

async function insertOutreachAudit(
  ctx: Pick<MutationCtx, "db">,
  args: {
    careCaseId: Id<"careCases">;
    userId: Id<"users">;
    event: "outreach_requested" | "outreach_approved" | "outreach_blocked";
    outreachAttemptId: Id<"outreachAttempts">;
    coordinationEventId: Id<"coordinationEvents">;
    careContactId: Id<"careContacts">;
    messageBody: string;
    status: OutreachAttemptStatus;
    reason?: string;
  },
) {
  await ctx.db.insert("auditLogs", {
    careCaseId: args.careCaseId,
    userId: args.userId,
    event: args.event,
    details: {
      outreachAttemptId: args.outreachAttemptId,
      coordinationEventId: args.coordinationEventId,
      careContactId: args.careContactId,
      messageBody: args.messageBody,
      status: args.status,
      reason: args.reason,
    },
    timestamp: Date.now(),
  });
}

async function insertOutreachExecutionAudit(
  ctx: Pick<MutationCtx, "db">,
  args: {
    careCaseId: Id<"careCases">;
    userId: Id<"users">;
    event: "outreach_sent" | "outreach_failed";
    outreachAttemptId: Id<"outreachAttempts">;
    coordinationEventId: Id<"coordinationEvents">;
    careContactId: Id<"careContacts">;
    messageBody: string;
    status: OutreachAttemptStatus;
    reason?: string;
    linqChatId?: string;
    linqMessageId?: string;
  },
) {
  await ctx.db.insert("auditLogs", {
    careCaseId: args.careCaseId,
    userId: args.userId,
    event: args.event,
    details: {
      outreachAttemptId: args.outreachAttemptId,
      coordinationEventId: args.coordinationEventId,
      careContactId: args.careContactId,
      messageBody: args.messageBody,
      status: args.status,
      reason: args.reason,
      linqChatId: args.linqChatId,
      linqMessageId: args.linqMessageId,
    },
    timestamp: Date.now(),
  });
}

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outreachAttempts")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const listPendingByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outreachAttempts")
      .withIndex("by_care_case_status", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("status", "pending_approval"),
      )
      .collect();
  },
});

export const get = query({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("outreachAttempts"),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.id);
    if (!attempt || attempt.careCaseId !== args.careCaseId) return null;
    return attempt;
  },
});

export const getApprovedForExecution = internalQuery({
  args: { outreachAttemptId: v.id("outreachAttempts") },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.outreachAttemptId);
    if (!attempt || attempt.status !== "approved") {
      return null;
    }

    const [contact, coordinationEvent, requestedByUser] = await Promise.all([
      ctx.db.get(attempt.careContactId),
      ctx.db.get(attempt.coordinationEventId),
      ctx.db.get(attempt.requestedByUserId),
    ]);

    if (
      !contact ||
      !coordinationEvent ||
      !requestedByUser ||
      contact.careCaseId !== attempt.careCaseId ||
      coordinationEvent.careCaseId !== attempt.careCaseId ||
      requestedByUser.careCaseId !== attempt.careCaseId
    ) {
      return null;
    }

    return { attempt, contact, coordinationEvent, requestedByUser };
  },
});

export const listDueOutreachFollowUps = internalQuery({
  args: {
    now: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DueOutreachFollowUp[]> => {
    const limit = normalizeLimit(args.limit);
    const attempts = await ctx.db.query("outreachAttempts").collect();
    const dueAttempts = attempts
      .filter((attempt) =>
        attempt.status === "sent" &&
        attempt.nextActionAt !== undefined &&
        attempt.nextActionAt <= args.now,
      )
      .sort((a, b) => (a.nextActionAt ?? 0) - (b.nextActionAt ?? 0))
      .slice(0, limit);

    const results: DueOutreachFollowUp[] = [];
    for (const attempt of dueAttempts) {
      const [contact, event, user, careCase] = await Promise.all([
        ctx.db.get(attempt.careContactId),
        ctx.db.get(attempt.coordinationEventId),
        ctx.db.get(attempt.requestedByUserId),
        ctx.db.get(attempt.careCaseId),
      ]);
      if (
        !contact ||
        !event ||
        !user ||
        !careCase ||
        contact.careCaseId !== attempt.careCaseId ||
        event.careCaseId !== attempt.careCaseId ||
        user.careCaseId !== attempt.careCaseId ||
        (event.status !== "open" && event.status !== "waiting") ||
        hasReplyAfterSent(attempt, contact, event)
      ) {
        continue;
      }

      const careRecipientName = careRecipientLabel(careCase, user);
      results.push({
        kind: "caregiver_reminder",
        outreachAttemptId: attempt._id,
        careCaseId: attempt.careCaseId,
        userId: user._id,
        careContactId: contact._id,
        coordinationEventId: event._id,
        contactName: contact.name,
        contactPhone: contact.phone,
        chatId: attempt.linqChatId ?? contact.linqChatId,
        messageBody: caregiverReminderBody({
          careRecipientName,
          eventTitle: event.title,
        }),
        dueAt: attempt.nextActionAt ?? attempt.updatedAt,
      });
    }

    return results;
  },
});

export const listDueCoordinationStatusUpdates = internalQuery({
  args: {
    now: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DueCoordinationStatusUpdate[]> => {
    const limit = normalizeLimit(args.limit);
    const events = await ctx.db.query("coordinationEvents").collect();
    const dueEvents = events
      .filter((event) =>
        (event.status === "open" || event.status === "waiting") &&
        event.nextActionAt !== undefined &&
        event.nextActionAt <= args.now,
      )
      .sort((a, b) => (a.nextActionAt ?? 0) - (b.nextActionAt ?? 0))
      .slice(0, limit);

    const results: DueCoordinationStatusUpdate[] = [];
    for (const event of dueEvents) {
      const user = event.createdByUserId
        ? await ctx.db.get(event.createdByUserId)
        : await ctx.db
            .query("users")
            .withIndex("by_care_case", (q) => q.eq("careCaseId", event.careCaseId))
            .first();
      if (!user || user.careCaseId !== event.careCaseId) continue;

      const contactIds = [
        ...(event.confirmedContactIds ?? []),
        ...(event.pendingContactIds ?? []),
        ...(event.declinedContactIds ?? []),
      ];
      const contactsById = new Map<Id<"careContacts">, Doc<"careContacts">>();
      for (const contactId of contactIds) {
        const contact = await ctx.db.get(contactId);
        if (contact?.careCaseId === event.careCaseId) {
          contactsById.set(contact._id, contact);
        }
      }

      results.push({
        kind: "coordinator_status",
        careCaseId: event.careCaseId,
        userId: user._id,
        coordinationEventId: event._id,
        userChatId: user.chatId,
        messageBody: coordinationStatusBody({
          eventTitle: event.title,
          confirmedNames: contactNames(contactsById, event.confirmedContactIds),
          pendingNames: contactNames(contactsById, event.pendingContactIds),
          declinedNames: contactNames(contactsById, event.declinedContactIds),
        }),
        dueAt: event.nextActionAt ?? event.updatedAt,
      });
    }

    return results;
  },
});

export const createPendingFromModel = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    requestedByUserId: v.id("users"),
    request: outreachRequestValidator,
    approvalPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contact = await findCareContactByName(
      ctx,
      args.careCaseId,
      args.request.contactName,
    );
    let coordinationEvent = await findCoordinationEventByTitle(
      ctx,
      args.careCaseId,
      args.request.coordinationEventTitle,
    );

    if (!contact) {
      return { action: "skipped", reason: "contact_not_found" };
    }
    if (!coordinationEvent) {
      const now = Date.now();
      const coordinationEventId = await ctx.db.insert("coordinationEvents", {
        careCaseId: args.careCaseId,
        type: "outreach",
        title: args.request.coordinationEventTitle?.trim() || `Ask ${contact.name}`,
        status: "open",
        urgency: "normal",
        description: args.request.purpose,
        originalAssigneeContactId: contact._id,
        createdByUserId: args.requestedByUserId,
        createdAt: now,
        updatedAt: now,
      });
      coordinationEvent = await ctx.db.get(coordinationEventId);
      if (!coordinationEvent) {
        return { action: "skipped", reason: "coordination_event_not_found" };
      }
    }

    const blockReason = blockReasonForContact(contact);
    const status: OutreachAttemptStatus = blockReason ? "blocked" : "pending_approval";
    const existing =
      (await findExistingAttempt(
        ctx,
        args.careCaseId,
        coordinationEvent._id,
        contact._id,
        status,
      )) ??
      (await findExistingAttempt(
        ctx,
        args.careCaseId,
        coordinationEvent._id,
        contact._id,
        "pending_approval",
      ));

    if (existing && existing.status !== "approved") {
      await ctx.db.patch(existing._id, {
        purpose: args.request.purpose,
        messageBody: args.request.message,
        approvalPrompt: args.approvalPrompt,
        status,
        failureReason: blockReason ?? undefined,
        updatedAt: Date.now(),
      });
      return {
        action: "updated",
        id: existing._id,
        status,
        reason: blockReason ?? undefined,
      };
    }

    const now = Date.now();
    const attemptId = await ctx.db.insert("outreachAttempts", {
      careCaseId: args.careCaseId,
      coordinationEventId: coordinationEvent._id,
      careContactId: contact._id,
      requestedByUserId: args.requestedByUserId,
      status,
      purpose: args.request.purpose,
      messageBody: args.request.message,
      approvalPrompt: args.approvalPrompt,
      failureReason: blockReason ?? undefined,
      createdAt: now,
      updatedAt: now,
    });

    await insertOutreachAudit(ctx, {
      careCaseId: args.careCaseId,
      userId: args.requestedByUserId,
      event: blockReason ? "outreach_blocked" : "outreach_requested",
      outreachAttemptId: attemptId,
      coordinationEventId: coordinationEvent._id,
      careContactId: contact._id,
      messageBody: args.request.message,
      status,
      reason: blockReason ?? undefined,
    });

    return {
      action: "created",
      id: attemptId,
      status,
      reason: blockReason ?? undefined,
    };
  },
});

export const resolveApprovalFromMessage = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    approvedByUserId: v.id("users"),
    messageBody: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isOutreachApprovalMessage(args.messageBody)) {
      return { action: "none" };
    }

    const pendingAttempts = await getPendingAttemptsWithContacts(ctx, args.careCaseId);
    if (pendingAttempts.length === 0) {
      return { action: "none" };
    }

    const namedMatches = pendingAttempts.filter(({ contact }) =>
      messageMentionsContact(args.messageBody, contact.name),
    );

    const matches = namedMatches.length > 0 ? namedMatches : pendingAttempts;
    if (matches.length !== 1) {
      return {
        action: "ambiguous",
        contactNames: matches.map(({ contact }) => contact.name),
        matchedCount: matches.length,
      };
    }

    const match = matches[0];
    const blockReason = blockReasonForContact(match.contact);
    if (blockReason) {
      await ctx.db.patch(match.attempt._id, {
        status: "blocked",
        failureReason: blockReason,
        updatedAt: Date.now(),
      });
      await insertOutreachAudit(ctx, {
        careCaseId: args.careCaseId,
        userId: args.approvedByUserId,
        event: "outreach_blocked",
        outreachAttemptId: match.attempt._id,
        coordinationEventId: match.attempt.coordinationEventId,
        careContactId: match.contact._id,
        messageBody: match.attempt.messageBody,
        status: "blocked",
        reason: blockReason,
      });
      return {
        action: "blocked",
        id: match.attempt._id,
        contactName: match.contact.name,
        reason: blockReason,
      };
    }

    const now = Date.now();
    await ctx.db.patch(match.attempt._id, {
      status: "approved",
      approvedByUserId: args.approvedByUserId,
      approvedAt: now,
      updatedAt: now,
    });
    await insertOutreachAudit(ctx, {
      careCaseId: args.careCaseId,
      userId: args.approvedByUserId,
      event: "outreach_approved",
      outreachAttemptId: match.attempt._id,
      coordinationEventId: match.attempt.coordinationEventId,
      careContactId: match.contact._id,
      messageBody: match.attempt.messageBody,
      status: "approved",
    });

    return {
      action: "approved",
      id: match.attempt._id,
      contactName: match.contact.name,
      messageBody: match.attempt.messageBody,
    };
  },
});

export const markSent = internalMutation({
  args: {
    outreachAttemptId: v.id("outreachAttempts"),
    linqChatId: v.string(),
    linqMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.outreachAttemptId);
    if (!attempt) {
      throw new Error("Outreach attempt not found");
    }
    if (attempt.status !== "approved") {
      throw new Error("Only approved outreach attempts can be marked sent");
    }

    const contact = await ctx.db.get(attempt.careContactId);
    if (!contact || contact.careCaseId !== attempt.careCaseId) {
      throw new Error("Outreach contact not found for care case");
    }

    const now = Date.now();
    await ctx.db.patch(attempt._id, {
      status: "sent",
      linqChatId: args.linqChatId,
      linqMessageId: args.linqMessageId,
      nextActionAt: now + DEFAULT_OUTREACH_FOLLOW_UP_DELAY_MS,
      sentAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(contact._id, {
      linqChatId: args.linqChatId,
      updatedAt: now,
    });

    const messageId = await ctx.db.insert("messages", {
      careCaseId: attempt.careCaseId,
      userId: attempt.requestedByUserId,
      senderPhone: contact.phone,
      actorType: "assistant",
      direction: "outbound",
      displayName: contact.name,
      body: attempt.messageBody,
      timestamp: now,
      linqMessageId: args.linqMessageId,
      deliveryStatus: args.linqMessageId ? "sent" : undefined,
      careContactId: contact._id,
      coordinationEventId: attempt.coordinationEventId,
      outreachAttemptId: attempt._id,
    });

    await insertOutreachExecutionAudit(ctx, {
      careCaseId: attempt.careCaseId,
      userId: attempt.requestedByUserId,
      event: "outreach_sent",
      outreachAttemptId: attempt._id,
      coordinationEventId: attempt.coordinationEventId,
      careContactId: contact._id,
      messageBody: attempt.messageBody,
      status: "sent",
      linqChatId: args.linqChatId,
      linqMessageId: args.linqMessageId,
    });

    return { action: "sent", id: attempt._id, messageId };
  },
});

export const markOutreachFollowUpSent = internalMutation({
  args: {
    outreachAttemptId: v.id("outreachAttempts"),
    messageBody: v.string(),
    linqMessageId: v.optional(v.string()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.outreachAttemptId);
    if (!attempt || attempt.status !== "sent") {
      throw new Error("Sent outreach attempt not found for follow-up");
    }

    const [contact, event] = await Promise.all([
      ctx.db.get(attempt.careContactId),
      ctx.db.get(attempt.coordinationEventId),
    ]);
    if (
      !contact ||
      !event ||
      contact.careCaseId !== attempt.careCaseId ||
      event.careCaseId !== attempt.careCaseId
    ) {
      throw new Error("Follow-up target not found for care case");
    }

    const now = args.now ?? Date.now();
    const messageId = await ctx.db.insert("messages", {
      careCaseId: attempt.careCaseId,
      userId: attempt.requestedByUserId,
      senderPhone: contact.phone,
      actorType: "assistant",
      direction: "outbound",
      displayName: contact.name,
      body: args.messageBody,
      timestamp: now,
      linqMessageId: args.linqMessageId,
      deliveryStatus: args.linqMessageId ? "sent" : undefined,
      careContactId: contact._id,
      coordinationEventId: event._id,
      outreachAttemptId: attempt._id,
    });

    await ctx.db.patch(attempt._id, {
      nextActionAt: undefined,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      careCaseId: attempt.careCaseId,
      userId: attempt.requestedByUserId,
      event: "response_sent",
      phone: contact.phone,
      details: {
        triggerMessage: "outreach_follow_up",
        responseLength: args.messageBody.length,
        leakageCheckPassed: true,
        outreachAttemptId: attempt._id,
        coordinationEventId: event._id,
        careContactId: contact._id,
        linqMessageId: args.linqMessageId,
      },
      timestamp: now,
    });

    return { action: "sent", id: attempt._id, messageId };
  },
});

export const markOutreachFollowUpSkipped = internalMutation({
  args: {
    outreachAttemptId: v.id("outreachAttempts"),
    reason: v.string(),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.outreachAttemptId);
    if (!attempt) {
      throw new Error("Outreach attempt not found for follow-up skip");
    }

    const now = args.now ?? Date.now();
    await ctx.db.patch(attempt._id, {
      nextActionAt: undefined,
      failureReason: `follow_up_skipped:${args.reason}`,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      careCaseId: attempt.careCaseId,
      userId: attempt.requestedByUserId,
      event: "response_blocked",
      details: {
        triggerMessage: "outreach_follow_up",
        outreachAttemptId: attempt._id,
        coordinationEventId: attempt.coordinationEventId,
        careContactId: attempt.careContactId,
        status: attempt.status,
        reason: args.reason,
      },
      timestamp: now,
    });

    return { action: "skipped", id: attempt._id, reason: args.reason };
  },
});

export const markCoordinationStatusSent = internalMutation({
  args: {
    coordinationEventId: v.id("coordinationEvents"),
    userId: v.id("users"),
    messageBody: v.string(),
    linqMessageId: v.optional(v.string()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const [event, user] = await Promise.all([
      ctx.db.get(args.coordinationEventId),
      ctx.db.get(args.userId),
    ]);
    if (!event || !user || user.careCaseId !== event.careCaseId) {
      throw new Error("Coordination status target not found");
    }

    const now = args.now ?? Date.now();
    const messageId = await ctx.db.insert("messages", {
      careCaseId: event.careCaseId,
      userId: user._id,
      senderPhone: user.phone,
      actorType: "assistant",
      direction: "outbound",
      displayName: user.name,
      body: args.messageBody,
      timestamp: now,
      linqMessageId: args.linqMessageId,
      deliveryStatus: args.linqMessageId ? "sent" : undefined,
      coordinationEventId: event._id,
    });

    await ctx.db.patch(event._id, {
      nextActionAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      careCaseId: event.careCaseId,
      userId: user._id,
      event: "response_sent",
      phone: user.phone,
      details: {
        triggerMessage: "coordination_status_follow_up",
        responseLength: args.messageBody.length,
        leakageCheckPassed: true,
        coordinationEventId: event._id,
        linqMessageId: args.linqMessageId,
      },
      timestamp: now,
    });

    return { action: "sent", id: event._id, messageId };
  },
});

export const markCoordinationStatusSkipped = internalMutation({
  args: {
    coordinationEventId: v.id("coordinationEvents"),
    userId: v.id("users"),
    reason: v.string(),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.coordinationEventId);
    if (!event) {
      throw new Error("Coordination event not found for follow-up skip");
    }

    const now = args.now ?? Date.now();
    await ctx.db.patch(event._id, {
      nextActionAt: undefined,
      updatedAt: now,
    });
    await ctx.db.insert("auditLogs", {
      careCaseId: event.careCaseId,
      userId: args.userId,
      event: "response_blocked",
      details: {
        triggerMessage: "coordination_status_follow_up",
        coordinationEventId: event._id,
        status: event.status,
        reason: args.reason,
      },
      timestamp: now,
    });

    return { action: "skipped", id: event._id, reason: args.reason };
  },
});

export const markFailed = internalMutation({
  args: {
    outreachAttemptId: v.id("outreachAttempts"),
    failureReason: v.string(),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.outreachAttemptId);
    if (!attempt) {
      throw new Error("Outreach attempt not found");
    }

    const now = Date.now();
    await ctx.db.patch(attempt._id, {
      status: "failed",
      failureReason: args.failureReason,
      failedAt: now,
      updatedAt: now,
    });

    await insertOutreachExecutionAudit(ctx, {
      careCaseId: attempt.careCaseId,
      userId: attempt.requestedByUserId,
      event: "outreach_failed",
      outreachAttemptId: attempt._id,
      coordinationEventId: attempt.coordinationEventId,
      careContactId: attempt.careContactId,
      messageBody: attempt.messageBody,
      status: "failed",
      reason: args.failureReason,
    });

    return { action: "failed", id: attempt._id, reason: args.failureReason };
  },
});
