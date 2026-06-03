import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
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

interface ClaimTransitionPatch {
  status: ClaimStatus;
  active: boolean;
  updatedAt: number;
  clarifiedByMessageId?: Id<"messages">;
  confirmedAt?: number;
  supersededByClaimId?: Id<"careClaims">;
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
