import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export const upsertMedication = mutation({
  args: {
    familyId: v.string(),
    medicationId: v.optional(v.string()),
    name: v.string(),
    dosage: v.string(),
    instructions: v.string(),
    scheduleRule: v.string(),
    lastTakenAt: v.optional(v.string()),
    nextDueAt: v.optional(v.string()),
    active: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const medicationId = args.medicationId ?? uniqueId("medication");
    const existing = await ctx.db
      .query("medications")
      .withIndex("by_family_medication", (q) =>
        q.eq("familyId", args.familyId).eq("medicationId", medicationId),
      )
      .first();

    const doc = {
      familyId: args.familyId,
      medicationId,
      name: args.name,
      dosage: args.dosage,
      instructions: args.instructions,
      scheduleRule: args.scheduleRule,
      lastTakenAt: args.lastTakenAt,
      nextDueAt: args.nextDueAt,
      active: args.active,
      notes: args.notes,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("medications", {
        ...doc,
        createdAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, (internal as any).projections_v2.renderFamilyMarkdownProjectionInternal, {
      familyId: args.familyId,
      renderSource: "upsertMedication",
    });

    return { medicationId };
  },
});

export const setMedicationActiveStatus = mutation({
  args: {
    familyId: v.string(),
    medicationId: v.string(),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("medications")
      .withIndex("by_family_medication", (q) =>
        q.eq("familyId", args.familyId).eq("medicationId", args.medicationId),
      )
      .first();
    if (!existing) return { updated: false };
    await ctx.db.patch(existing._id, {
      active: args.active,
      updatedAt: new Date().toISOString(),
    });
    await ctx.scheduler.runAfter(0, (internal as any).projections_v2.renderFamilyMarkdownProjectionInternal, {
      familyId: args.familyId,
      renderSource: "setMedicationActiveStatus",
    });
    return { updated: true };
  },
});
