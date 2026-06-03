import { internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { normalizePhone } from "./mutations";

type ContactReplyResolution = {
  careCaseId: Id<"careCases">;
  userId: Id<"users">;
  careContactId: Id<"careContacts">;
  careContactName: string;
  contactPhone?: string;
  contactRelationship?: string;
  contactRole?: string;
  contactAvailabilityNotes?: string;
  coordinationEventId?: Id<"coordinationEvents">;
  coordinationEventTitle?: string;
  coordinationEventDescription?: string;
  outreachAttemptId?: Id<"outreachAttempts">;
  outreachPurpose?: string;
  outreachMessageBody?: string;
};

type ResolvedContactCandidate = {
  contact: Doc<"careContacts">;
  attempt?: Doc<"outreachAttempts">;
};

type CareContactReplyStatus =
  | "confirmed"
  | "declined"
  | "partial"
  | "deferred"
  | "wrong_number"
  | "stop_requested"
  | "needs_clarification";

const WRONG_NUMBER_RE =
  /\b(wrong number|wrong person|you have the wrong|not (me|this person)|who is this)\b/i;
const STOP_REQUEST_RE =
  /\b(stop texting|stop messaging|do not text|don't text|dont text|unsubscribe|remove me)\b/i;
const DEFERRED_REPLY_RE =
  /\b(ask me later|check later|let me check|i'?ll check|i will check|get back to you|not sure yet|later today|tomorrow|next week|unavailable until|not available until)\b/i;
const POSITIVE_REPLY_RE =
  /^(yes|yep|yeah|sure|ok|okay|confirmed|works|that works|available\b|i can\b)/i;
const NEGATIVE_REPLY_RE =
  /^(no|nope|can't\b|cant\b|cannot\b|unable\b|not available\b|won't\b|wont\b)/i;
const PARTIAL_REPLY_RE =
  /\b(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?|morning|afternoon|evening|overnight|only|except|before|after|from|until|\d{1,2}(:\d{2})?\s?(am|pm))\b/i;

export function classifyCareContactReply(message: string): CareContactReplyStatus {
  const normalized = message.trim();
  if (!normalized) return "needs_clarification";
  if (WRONG_NUMBER_RE.test(normalized)) return "wrong_number";
  if (STOP_REQUEST_RE.test(normalized)) return "stop_requested";
  if (NEGATIVE_REPLY_RE.test(normalized)) return "declined";
  if (!POSITIVE_REPLY_RE.test(normalized) && DEFERRED_REPLY_RE.test(normalized)) {
    return "deferred";
  }
  if (/^i can\b/i.test(normalized) && PARTIAL_REPLY_RE.test(normalized)) {
    return "partial";
  }
  if (POSITIVE_REPLY_RE.test(normalized)) {
    if (/\b(but|only|except|unavailable until|not available until)\b/i.test(normalized)) {
      return "partial";
    }
    return "confirmed";
  }
  if (PARTIAL_REPLY_RE.test(normalized)) return "partial";
  if (DEFERRED_REPLY_RE.test(normalized)) return "deferred";
  return "needs_clarification";
}

function uniqueIds(ids: Array<Id<"careContacts">>): Array<Id<"careContacts">> {
  return [...new Set(ids)];
}

function addId(
  ids: Array<Id<"careContacts">> | undefined,
  id: Id<"careContacts">,
): Array<Id<"careContacts">> {
  return uniqueIds([...(ids ?? []), id]);
}

function removeId(
  ids: Array<Id<"careContacts">> | undefined,
  id: Id<"careContacts">,
): Array<Id<"careContacts">> {
  return (ids ?? []).filter((candidate) => candidate !== id);
}

function appendNote(existing: string | undefined, note: string): string {
  if (!existing?.trim()) return note;
  if (existing.includes(note)) return existing;
  return `${existing}\n${note}`;
}

function inferDeferredNextActionAt(message: string, now: number): number | undefined {
  if (/\btomorrow\b/i.test(message)) return now + 24 * 60 * 60 * 1000;
  if (/\bnext week\b/i.test(message)) return now + 7 * 24 * 60 * 60 * 1000;
  if (/\b(later today|ask me later|check later|let me check|get back to you|not sure yet)\b/i.test(message)) {
    return now + 6 * 60 * 60 * 1000;
  }
  return undefined;
}

function latestSentAttempt(
  attempts: Doc<"outreachAttempts">[],
): Doc<"outreachAttempts"> | undefined {
  return [...attempts]
    .filter((attempt) => attempt.status === "sent")
    .sort((a, b) => (b.sentAt ?? b.updatedAt) - (a.sentAt ?? a.updatedAt))[0];
}

async function getPrimaryUserForAttemptOrCareCase(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  attempt: Doc<"outreachAttempts"> | undefined,
): Promise<Doc<"users"> | null> {
  if (attempt) {
    const requestedByUser = await ctx.db.get(attempt.requestedByUserId);
    if (requestedByUser?.careCaseId === careCaseId) return requestedByUser;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", careCaseId))
    .first();
}

async function findLatestOpenEventForContact(
  ctx: Pick<MutationCtx, "db">,
  contact: Doc<"careContacts">,
): Promise<Doc<"coordinationEvents"> | null> {
  const events = await ctx.db
    .query("coordinationEvents")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", contact.careCaseId))
    .collect();

  const linked = events.filter((event) => {
    if (event.status !== "open" && event.status !== "waiting") return false;
    const linkedContactIds = [
      event.originalAssigneeContactId,
      ...(event.confirmedContactIds ?? []),
      ...(event.pendingContactIds ?? []),
      ...(event.declinedContactIds ?? []),
      ...(event.fallbackOrderContactIds ?? []),
    ].filter(Boolean);
    return linkedContactIds.includes(contact._id);
  });

  return linked.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

async function buildResolution(
  ctx: Pick<MutationCtx, "db">,
  candidate: ResolvedContactCandidate,
  chatId: string | undefined,
): Promise<ContactReplyResolution | null> {
  const { contact, attempt } = candidate;
  const user = await getPrimaryUserForAttemptOrCareCase(
    ctx,
    contact.careCaseId,
    attempt,
  );
  if (!user) return null;

  if (chatId && !contact.linqChatId) {
    await ctx.db.patch(contact._id, {
      linqChatId: chatId,
      updatedAt: Date.now(),
    });
  }
  if (chatId && attempt && !attempt.linqChatId) {
    await ctx.db.patch(attempt._id, {
      linqChatId: chatId,
      updatedAt: Date.now(),
    });
  }

  const coordinationEvent = attempt
    ? await ctx.db.get(attempt.coordinationEventId)
    : await findLatestOpenEventForContact(ctx, contact);

  return {
    careCaseId: contact.careCaseId,
    userId: user._id,
    careContactId: contact._id,
    careContactName: contact.name,
    contactPhone: contact.phone,
    contactRelationship: contact.relationship,
    contactRole: contact.role,
    contactAvailabilityNotes: contact.availabilityNotes,
    coordinationEventId:
      coordinationEvent?.careCaseId === contact.careCaseId
        ? coordinationEvent._id
        : undefined,
    coordinationEventTitle:
      coordinationEvent?.careCaseId === contact.careCaseId
        ? coordinationEvent.title
        : undefined,
    coordinationEventDescription:
      coordinationEvent?.careCaseId === contact.careCaseId
        ? coordinationEvent.description
        : undefined,
    outreachAttemptId: attempt?._id,
    outreachPurpose: attempt?.purpose,
    outreachMessageBody: attempt?.messageBody,
  };
}

async function resolveByChatId(
  ctx: Pick<MutationCtx, "db">,
  chatId: string | undefined,
): Promise<ResolvedContactCandidate | null> {
  if (!chatId) return null;

  const attempts = await ctx.db
    .query("outreachAttempts")
    .withIndex("by_linq_chat_id", (q) => q.eq("linqChatId", chatId))
    .collect();
  const attempt = latestSentAttempt(attempts);
  if (attempt) {
    const contact = await ctx.db.get(attempt.careContactId);
    if (contact?.careCaseId === attempt.careCaseId && contact.active) {
      return { contact, attempt };
    }
  }

  const contact = await ctx.db
    .query("careContacts")
    .withIndex("by_linq_chat_id", (q) => q.eq("linqChatId", chatId))
    .first();
  if (!contact || !contact.active) return null;

  const contactAttempts = await ctx.db
    .query("outreachAttempts")
    .withIndex("by_care_case_contact_status", (q) =>
      q
        .eq("careCaseId", contact.careCaseId)
        .eq("careContactId", contact._id)
        .eq("status", "sent"),
    )
    .collect();

  return { contact, attempt: latestSentAttempt(contactAttempts) };
}

async function resolveByPhone(
  ctx: Pick<MutationCtx, "db">,
  senderPhone: string,
): Promise<ResolvedContactCandidate | null> {
  const normalizedPhone = normalizePhone(senderPhone);
  if (!normalizedPhone) return null;

  const contacts = await ctx.db
    .query("careContacts")
    .withIndex("by_phone", (q) => q.eq("phone", normalizedPhone))
    .collect();

  const candidates: ResolvedContactCandidate[] = [];
  for (const contact of contacts) {
    if (!contact.active) continue;
    const attempts = await ctx.db
      .query("outreachAttempts")
      .withIndex("by_care_case_contact_status", (q) =>
        q
          .eq("careCaseId", contact.careCaseId)
          .eq("careContactId", contact._id)
          .eq("status", "sent"),
      )
      .collect();
    const attempt = latestSentAttempt(attempts);
    if (attempt) {
      candidates.push({ contact, attempt });
    }
  }

  return candidates.length === 1 ? candidates[0] : null;
}

export const resolveInbound = internalMutation({
  args: {
    senderPhone: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args): Promise<ContactReplyResolution | null> => {
    const byChat = await resolveByChatId(ctx, args.chatId || undefined);
    if (byChat) {
      return await buildResolution(ctx, byChat, args.chatId || undefined);
    }

    const byPhone = await resolveByPhone(ctx, args.senderPhone);
    if (!byPhone) return null;

    return await buildResolution(ctx, byPhone, args.chatId || undefined);
  },
});

export const applyInboundReplyToEvent = internalMutation({
  args: {
    careCaseId: v.id("careCases"),
    careContactId: v.id("careContacts"),
    coordinationEventId: v.optional(v.id("coordinationEvents")),
    messageBody: v.string(),
    sourceMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args): Promise<{ status: CareContactReplyStatus }> => {
    const status = classifyCareContactReply(args.messageBody);
    const now = Date.now();
    const replySourcePatch = {
      lastReplyStatus: status,
      lastReplyMessageId: args.sourceMessageId,
      lastReplyAt: now,
      updatedAt: now,
    };

    const [contact, event] = await Promise.all([
      ctx.db.get(args.careContactId),
      args.coordinationEventId ? ctx.db.get(args.coordinationEventId) : null,
    ]);
    if (
      !contact ||
      contact.careCaseId !== args.careCaseId ||
      (event && event.careCaseId !== args.careCaseId)
    ) {
      return { status };
    }

    if (status === "partial" || status === "deferred") {
      const availabilityNote = status === "partial"
        ? `Partial availability reply: ${args.messageBody}`
        : `Deferred availability reply: ${args.messageBody}`;
      await ctx.db.patch(contact._id, {
        ...replySourcePatch,
        availabilityNotes: appendNote(contact.availabilityNotes, availabilityNote),
        availabilitySourceMessageId: args.sourceMessageId,
        availabilityUpdatedAt: now,
      });
    } else if (status === "wrong_number" || status === "stop_requested") {
      const note = status === "wrong_number"
        ? `Wrong number reported: ${args.messageBody}`
        : `Stop-texting request received: ${args.messageBody}`;
      await ctx.db.patch(contact._id, {
        ...replySourcePatch,
        active: false,
        canReceiveTexts: false,
        consentToContact: false,
        notes: appendNote(contact.notes, note),
      });
    } else {
      await ctx.db.patch(contact._id, replySourcePatch);
    }

    if (!event) return { status };

    const eventReplyPatch = {
      lastReplyContactId: contact._id,
      lastReplyMessageId: args.sourceMessageId,
      lastReplyStatus: status,
      lastReplyAt: now,
      updatedAt: now,
    };

    if (status === "confirmed") {
      await ctx.db.patch(event._id, {
        ...eventReplyPatch,
        confirmedContactIds: addId(event.confirmedContactIds, contact._id),
        pendingContactIds: removeId(event.pendingContactIds, contact._id),
        declinedContactIds: removeId(event.declinedContactIds, contact._id),
      });
    } else if (status === "declined") {
      await ctx.db.patch(event._id, {
        ...eventReplyPatch,
        confirmedContactIds: removeId(event.confirmedContactIds, contact._id),
        pendingContactIds: removeId(event.pendingContactIds, contact._id),
        declinedContactIds: addId(event.declinedContactIds, contact._id),
        status: event.status === "resolved" ? "open" : event.status,
      });
    } else if (status === "partial") {
      await ctx.db.patch(event._id, eventReplyPatch);
    } else if (status === "deferred") {
      await ctx.db.patch(event._id, {
        ...eventReplyPatch,
        nextActionAt: inferDeferredNextActionAt(args.messageBody, now) ?? event.nextActionAt,
      });
    } else if (status === "wrong_number" || status === "stop_requested") {
      await ctx.db.patch(event._id, {
        ...eventReplyPatch,
        confirmedContactIds: removeId(event.confirmedContactIds, contact._id),
        pendingContactIds: removeId(event.pendingContactIds, contact._id),
        declinedContactIds: addId(event.declinedContactIds, contact._id),
        status: event.status === "resolved" ? "open" : event.status,
      });
    } else {
      await ctx.db.patch(event._id, eventReplyPatch);
    }

    return { status };
  },
});
