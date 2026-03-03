import { action, mutation } from "./_generated/server";
import { v } from "convex/values";

export const ingestSnapshotRecord = mutation({
  args: {
    record: v.object({
      kind: v.union(v.literal("family"), v.literal("member"), v.literal("conversation")),
      familyId: v.optional(v.string()),
      memberId: v.optional(v.string()),
      phone: v.optional(v.string()),
      month: v.optional(v.string()),
      payload: v.any(),
    }),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation("importer_v2:ingestSnapshotRecord", args);
  },
});

export const finalizeImport = action({
  args: {
    importedAt: v.string(),
    counts: v.object({ family: v.number(), member: v.number(), conversation: v.number() }),
  },
  handler: async (ctx, args) => {
    return ctx.runAction("importer_v2:finalizeImport", args);
  },
});

export const _recordImportRun = mutation({
  args: {
    importedAt: v.string(),
    counts: v.object({ family: v.number(), member: v.number(), conversation: v.number() }),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation("importer_v2:_recordImportRun", args);
  },
});
