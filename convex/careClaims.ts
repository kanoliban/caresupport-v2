import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const subjectTypeValidator = v.union(
  v.literal("care_recipient"),
  v.literal("care_contact"),
  v.literal("schedule"),
  v.literal("availability"),
  v.literal("relationship"),
  v.literal("role"),
  v.literal("constraint"),
  v.literal("preference"),
  v.literal("coordination_rule"),
  v.literal("other"),
);

const statusValidator = v.union(
  v.literal("heard"),
  v.literal("inferred"),
  v.literal("needs_clarification"),
  v.literal("confirmed"),
  v.literal("rejected"),
  v.literal("contradicted"),
  v.literal("superseded"),
  v.literal("archived"),
);

const confidenceValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const sensitivityValidator = v.union(
  v.literal("normal"),
  v.literal("sensitive"),
);

const claimInputValidator = v.object({
  subjectType: subjectTypeValidator,
  subjectLabel: v.string(),
  subjectContactId: v.optional(v.id("careContacts")),
  predicate: v.string(),
  valueText: v.string(),
  normalizedValue: v.optional(v.string()),
  status: v.optional(statusValidator),
  confidence: v.optional(confidenceValidator),
  sensitivity: v.optional(sensitivityValidator),
  clarificationQuestion: v.optional(v.string()),
});

type ClaimStatus =
  | "heard"
  | "inferred"
  | "needs_clarification"
  | "confirmed"
  | "rejected"
  | "contradicted"
  | "superseded"
  | "archived";

type PromotionTarget = "care_contact" | "coordination_event" | "memory_entry";
type ContactType =
  | "family"
  | "professional_caregiver"
  | "agency"
  | "clinician"
  | "other";
type CoordinationEventType =
  | "coverage_gap"
  | "schedule_change"
  | "handoff"
  | "task_followup"
  | "appointment"
  | "medication"
  | "outreach"
  | "other";
type MemoryCategory = "care_preference" | "care_note";

interface ClaimTransitionPatch {
  status: ClaimStatus;
  active: boolean;
  updatedAt: number;
  clarifiedByMessageId?: Id<"messages">;
  confirmedAt?: number;
  supersededByClaimId?: Id<"careClaims">;
}

interface ClaimPromotionPatch {
  subjectContactId?: Id<"careContacts">;
  promotedToType: PromotionTarget;
  promotedToCareContactId?: Id<"careContacts">;
  promotedToCoordinationEventId?: Id<"coordinationEvents">;
  promotedToMemoryEntryId?: Id<"memoryEntries">;
  promotedAt: number;
  updatedAt: number;
}

interface CareContactPromotionPatch {
  relationship?: string;
  role?: string;
  availabilityNotes?: string;
  availabilitySourceMessageId?: Id<"messages">;
  availabilityUpdatedAt?: number;
  notes?: string;
  active?: boolean;
  updatedAt: number;
}

interface CoordinationEventPromotionPatch {
  type?: CoordinationEventType;
  description?: string;
  updatedAt: number;
}

function requiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`Care claim ${fieldName} is required`);
  return trimmed;
}

function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function promotionText(claim: Doc<"careClaims">): string {
  return claim.normalizedValue?.trim() || claim.valueText.trim();
}

function appendUniqueLine(existing: string | undefined, next: string): string {
  const cleanNext = next.trim();
  if (!cleanNext) return existing ?? "";
  if (!existing?.trim()) return cleanNext;
  const existingLines = existing
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (existingLines.includes(cleanNext)) return existing;
  return `${existing.trim()}\n${cleanNext}`;
}

function contactTypeForClaim(claim: Doc<"careClaims">): ContactType {
  const text = `${claim.predicate} ${claim.valueText} ${claim.normalizedValue ?? ""}`
    .toLowerCase();
  if (/\b(agency)\b/.test(text)) return "agency";
  if (/\b(clinician|doctor|physician|therapist|pt|ot)\b/.test(text)) {
    return "clinician";
  }
  if (/\b(nurse|pca|caregiver|aide)\b/.test(text)) {
    return "professional_caregiver";
  }
  if (/\b(family|mom|mother|sister|brother|uncle|aunt|daughter|son|wife|husband)\b/.test(text)) {
    return "family";
  }
  return "other";
}

function eventTypeForClaim(claim: Doc<"careClaims">): CoordinationEventType {
  const text = `${claim.predicate} ${claim.valueText} ${claim.normalizedValue ?? ""}`
    .toLowerCase();
  if (/\bcoverage|gap|cover\b/.test(text)) return "coverage_gap";
  if (/\bschedule|shift|availability\b/.test(text)) return "schedule_change";
  if (/\bhandoff\b/.test(text)) return "handoff";
  if (/\bappointment|visit\b/.test(text)) return "appointment";
  if (/\bmedication|meds|medicine\b/.test(text)) return "medication";
  if (/\btask|follow.?up\b/.test(text)) return "task_followup";
  if (/\boutreach|contact|text|call\b/.test(text)) return "outreach";
  return "other";
}

function eventTitleForClaim(claim: Doc<"careClaims">): string {
  const predicate = claim.predicate.replace(/_/g, " ").trim();
  return `${claim.subjectLabel}: ${predicate}`;
}

function memoryCategoryForClaim(claim: Doc<"careClaims">): MemoryCategory {
  return claim.subjectType === "preference" ? "care_preference" : "care_note";
}

function memoryContentForClaim(claim: Doc<"careClaims">): string {
  return `${claim.subjectLabel}: ${promotionText(claim)}`;
}

async function assertMessageBelongsToCareCase(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  messageId: Id<"messages"> | undefined,
) {
  if (!messageId) return undefined;
  const message = await ctx.db.get(messageId);
  if (!message || message.careCaseId !== careCaseId) {
    throw new Error("Care claim message does not belong to care case");
  }
  return message;
}

async function assertContactBelongsToCareCase(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  contactId: Id<"careContacts"> | undefined,
) {
  if (!contactId) return;
  const contact = await ctx.db.get(contactId);
  if (!contact || contact.careCaseId !== careCaseId) {
    throw new Error("Care claim contact does not belong to care case");
  }
}

async function assertClaimBelongsToCareCase(
  ctx: Pick<MutationCtx, "db">,
  careCaseId: Id<"careCases">,
  claimId: Id<"careClaims">,
) {
  const claim = await ctx.db.get(claimId);
  if (!claim || claim.careCaseId !== careCaseId) {
    throw new Error("Care claim not found for care case");
  }
  return claim;
}

async function findCareContactForClaim(
  ctx: Pick<MutationCtx, "db">,
  claim: Doc<"careClaims">,
): Promise<Doc<"careContacts"> | null> {
  if (claim.subjectContactId) {
    const contact = await ctx.db.get(claim.subjectContactId);
    if (!contact || contact.careCaseId !== claim.careCaseId) {
      throw new Error("Care claim contact does not belong to care case");
    }
    return contact;
  }

  return await ctx.db
    .query("careContacts")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", claim.careCaseId))
    .filter((q) => q.eq(q.field("name"), claim.subjectLabel))
    .first();
}

async function promoteToCareContact(
  ctx: Pick<MutationCtx, "db">,
  claim: Doc<"careClaims">,
): Promise<{
  targetType: "care_contact";
  targetId: Id<"careContacts">;
  action: "created" | "updated";
}> {
  const now = Date.now();
  const text = promotionText(claim);
  const existing = await findCareContactForClaim(ctx, claim);
  const patch: CareContactPromotionPatch = { updatedAt: now };

  if (claim.subjectType === "relationship") {
    patch.relationship = text;
  } else if (claim.subjectType === "role") {
    patch.role = text;
  } else if (claim.subjectType === "availability") {
    patch.availabilityNotes = appendUniqueLine(existing?.availabilityNotes, text);
    patch.availabilitySourceMessageId = claim.sourceMessageId;
    patch.availabilityUpdatedAt = now;
  } else if (claim.subjectType === "constraint") {
    patch.notes = appendUniqueLine(existing?.notes, `[constraint] ${text}`);
  } else if (claim.subjectType === "care_contact") {
    patch.notes = appendUniqueLine(existing?.notes, text);
  }

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return {
      targetType: "care_contact",
      targetId: existing._id,
      action: "updated",
    };
  }

  const contactId = await ctx.db.insert("careContacts", {
    careCaseId: claim.careCaseId,
    name: claim.subjectLabel,
    contactType: contactTypeForClaim(claim),
    relationship: patch.relationship,
    role: patch.role,
    availabilityNotes: patch.availabilityNotes,
    availabilitySourceMessageId: patch.availabilitySourceMessageId,
    availabilityUpdatedAt: patch.availabilityUpdatedAt,
    canReceiveTexts: false,
    active: true,
    notes: patch.notes,
    createdAt: now,
    updatedAt: now,
  });

  return {
    targetType: "care_contact",
    targetId: contactId,
    action: "created",
  };
}

async function promoteToCoordinationEvent(
  ctx: Pick<MutationCtx, "db">,
  claim: Doc<"careClaims">,
): Promise<{
  targetType: "coordination_event";
  targetId: Id<"coordinationEvents">;
  action: "created" | "updated";
}> {
  const now = Date.now();
  const title = eventTitleForClaim(claim);
  const existing = await ctx.db
    .query("coordinationEvents")
    .withIndex("by_care_case", (q) => q.eq("careCaseId", claim.careCaseId))
    .filter((q) => q.eq(q.field("title"), title))
    .first();

  if (existing) {
    const patch: CoordinationEventPromotionPatch = {
      type: eventTypeForClaim(claim),
      description: promotionText(claim),
      updatedAt: now,
    };
    await ctx.db.patch(existing._id, patch);
    return {
      targetType: "coordination_event",
      targetId: existing._id,
      action: "updated",
    };
  }

  const sourceMessage = await assertMessageBelongsToCareCase(
    ctx,
    claim.careCaseId,
    claim.sourceMessageId,
  );
  if (!sourceMessage) {
    throw new Error("Care claim source message is required");
  }

  const eventId = await ctx.db.insert("coordinationEvents", {
    careCaseId: claim.careCaseId,
    type: eventTypeForClaim(claim),
    title,
    status: "open",
    urgency: "normal",
    description: promotionText(claim),
    createdByUserId: sourceMessage.userId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    targetType: "coordination_event",
    targetId: eventId,
    action: "created",
  };
}

async function promoteToMemoryEntry(
  ctx: Pick<MutationCtx, "db">,
  claim: Doc<"careClaims">,
): Promise<{
  targetType: "memory_entry";
  targetId: Id<"memoryEntries">;
  action: "created" | "existing";
}> {
  const sourceMessage = await assertMessageBelongsToCareCase(
    ctx,
    claim.careCaseId,
    claim.sourceMessageId,
  );
  if (!sourceMessage) {
    throw new Error("Care claim source message is required");
  }

  const category = memoryCategoryForClaim(claim);
  const content = memoryContentForClaim(claim);
  const existing = await ctx.db
    .query("memoryEntries")
    .withIndex("by_care_case_scope_category", (q) =>
      q
        .eq("careCaseId", claim.careCaseId)
        .eq("scope", "care_case")
        .eq("category", category),
    )
    .filter((q) => q.eq(q.field("content"), content))
    .first();

  if (existing) {
    return {
      targetType: "memory_entry",
      targetId: existing._id,
      action: "existing",
    };
  }

  const now = Date.now();
  const memoryEntryId = await ctx.db.insert("memoryEntries", {
    careCaseId: claim.careCaseId,
    userId: sourceMessage.userId,
    scope: "care_case",
    category,
    content,
    source: `careClaim:${claim._id};sourceMessage:${claim.sourceMessageId}`,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  return {
    targetType: "memory_entry",
    targetId: memoryEntryId,
    action: "created",
  };
}

async function transitionClaim(
  ctx: Pick<MutationCtx, "db">,
  args: {
    careCaseId: Id<"careCases">;
    id: Id<"careClaims">;
    status: ClaimStatus;
    active: boolean;
    clarifiedByMessageId?: Id<"messages">;
    confirmedAt?: number;
    supersededByClaimId?: Id<"careClaims">;
  },
) {
  await assertClaimBelongsToCareCase(ctx, args.careCaseId, args.id);
  await assertMessageBelongsToCareCase(
    ctx,
    args.careCaseId,
    args.clarifiedByMessageId,
  );
  if (args.supersededByClaimId) {
    await assertClaimBelongsToCareCase(
      ctx,
      args.careCaseId,
      args.supersededByClaimId,
    );
  }

  const patch: ClaimTransitionPatch = {
    status: args.status,
    active: args.active,
    updatedAt: Date.now(),
  };
  if (args.clarifiedByMessageId !== undefined) {
    patch.clarifiedByMessageId = args.clarifiedByMessageId;
  }
  if (args.confirmedAt !== undefined) {
    patch.confirmedAt = args.confirmedAt;
  }
  if (args.supersededByClaimId !== undefined) {
    patch.supersededByClaimId = args.supersededByClaimId;
  }

  await ctx.db.patch(args.id, patch);
}

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careClaims")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const listByStatus = query({
  args: {
    careCaseId: v.id("careCases"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careClaims")
      .withIndex("by_care_case_status", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("status", args.status),
      )
      .collect();
  },
});

export const listBySubject = query({
  args: {
    careCaseId: v.id("careCases"),
    subjectType: subjectTypeValidator,
    subjectLabel: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careClaims")
      .withIndex("by_care_case_subject", (q) =>
        q
          .eq("careCaseId", args.careCaseId)
          .eq("subjectType", args.subjectType)
          .eq("subjectLabel", args.subjectLabel),
      )
      .collect();
  },
});

export const listBySourceMessage = query({
  args: {
    careCaseId: v.id("careCases"),
    sourceMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("careClaims")
      .withIndex("by_source_message", (q) =>
        q.eq("sourceMessageId", args.sourceMessageId),
      )
      .collect();
    return claims.filter((claim) => claim.careCaseId === args.careCaseId);
  },
});

export const get = query({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careClaims"),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.id);
    if (!claim || claim.careCaseId !== args.careCaseId) return null;
    return claim;
  },
});

export const createManyFromSource = mutation({
  args: {
    careCaseId: v.id("careCases"),
    sourceMessageId: v.id("messages"),
    sourceCareContactId: v.optional(v.id("careContacts")),
    claims: v.array(claimInputValidator),
  },
  handler: async (ctx, args) => {
    const sourceMessage = await assertMessageBelongsToCareCase(
      ctx,
      args.careCaseId,
      args.sourceMessageId,
    );
    await assertContactBelongsToCareCase(
      ctx,
      args.careCaseId,
      args.sourceCareContactId,
    );
    if (!sourceMessage) {
      throw new Error("Care claim source message is required");
    }

    const sourceCareContactId =
      args.sourceCareContactId ?? sourceMessage.careContactId;
    await assertContactBelongsToCareCase(
      ctx,
      args.careCaseId,
      sourceCareContactId,
    );

    const now = Date.now();
    const ids: Array<Id<"careClaims">> = [];

    for (const claim of args.claims) {
      await assertContactBelongsToCareCase(
        ctx,
        args.careCaseId,
        claim.subjectContactId,
      );

      const id = await ctx.db.insert("careClaims", {
        careCaseId: args.careCaseId,
        sourceMessageId: args.sourceMessageId,
        sourceActorType: sourceMessage.actorType,
        sourceCareContactId,
        subjectType: claim.subjectType,
        subjectLabel: requiredText(claim.subjectLabel, "subjectLabel"),
        subjectContactId: claim.subjectContactId,
        predicate: requiredText(claim.predicate, "predicate"),
        valueText: requiredText(claim.valueText, "valueText"),
        normalizedValue: optionalText(claim.normalizedValue),
        status: claim.status ?? "heard",
        confidence: claim.confidence ?? "medium",
        sensitivity: claim.sensitivity ?? "normal",
        clarificationQuestion: optionalText(claim.clarificationQuestion),
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      ids.push(id);
    }

    return ids;
  },
});

export const confirm = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careClaims"),
    clarifiedByMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await transitionClaim(ctx, {
      careCaseId: args.careCaseId,
      id: args.id,
      status: "confirmed",
      active: true,
      clarifiedByMessageId: args.clarifiedByMessageId,
      confirmedAt: now,
    });
  },
});

export const reject = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careClaims"),
    clarifiedByMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    await transitionClaim(ctx, {
      careCaseId: args.careCaseId,
      id: args.id,
      status: "rejected",
      active: false,
      clarifiedByMessageId: args.clarifiedByMessageId,
    });
  },
});

export const contradict = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careClaims"),
    clarifiedByMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    await transitionClaim(ctx, {
      careCaseId: args.careCaseId,
      id: args.id,
      status: "contradicted",
      active: false,
      clarifiedByMessageId: args.clarifiedByMessageId,
    });
  },
});

export const supersede = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careClaims"),
    supersededByClaimId: v.id("careClaims"),
    clarifiedByMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    await transitionClaim(ctx, {
      careCaseId: args.careCaseId,
      id: args.id,
      status: "superseded",
      active: false,
      clarifiedByMessageId: args.clarifiedByMessageId,
      supersededByClaimId: args.supersededByClaimId,
    });
  },
});

export const archive = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careClaims"),
  },
  handler: async (ctx, args) => {
    await transitionClaim(ctx, {
      careCaseId: args.careCaseId,
      id: args.id,
      status: "archived",
      active: false,
    });
  },
});

export const promoteConfirmed = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careClaims"),
  },
  handler: async (ctx, args) => {
    const claim = await assertClaimBelongsToCareCase(
      ctx,
      args.careCaseId,
      args.id,
    );

    if (claim.status !== "confirmed" || !claim.active) {
      throw new Error("Only active confirmed care claims can be promoted");
    }

    if (claim.promotedAt && claim.promotedToType) {
      return {
        action: "already_promoted" as const,
        targetType: claim.promotedToType,
        targetId:
          claim.promotedToCareContactId ??
          claim.promotedToCoordinationEventId ??
          claim.promotedToMemoryEntryId,
      };
    }

    const now = Date.now();

    if (
      claim.subjectType === "care_contact" ||
      claim.subjectType === "relationship" ||
      claim.subjectType === "role" ||
      claim.subjectType === "availability" ||
      claim.subjectType === "constraint"
    ) {
      const result = await promoteToCareContact(ctx, claim);
      const patch: ClaimPromotionPatch = {
        subjectContactId: result.targetId,
        promotedToType: result.targetType,
        promotedToCareContactId: result.targetId,
        promotedAt: now,
        updatedAt: now,
      };
      await ctx.db.patch(claim._id, patch);
      return result;
    }

    if (claim.subjectType === "schedule") {
      const result = await promoteToCoordinationEvent(ctx, claim);
      const patch: ClaimPromotionPatch = {
        promotedToType: result.targetType,
        promotedToCoordinationEventId: result.targetId,
        promotedAt: now,
        updatedAt: now,
      };
      await ctx.db.patch(claim._id, patch);
      return result;
    }

    const result = await promoteToMemoryEntry(ctx, claim);
    const patch: ClaimPromotionPatch = {
      promotedToType: result.targetType,
      promotedToMemoryEntryId: result.targetId,
      promotedAt: now,
      updatedAt: now,
    };
    await ctx.db.patch(claim._id, patch);
    return result;
  },
});
