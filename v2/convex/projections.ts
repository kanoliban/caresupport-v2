import { action } from "./_generated/server";
import { v } from "convex/values";

export const renderFamilyMarkdownProjection = action({
  args: {
    familyId: v.string(),
    renderSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.runAction("projections_v2:renderFamilyMarkdownProjection", args);
  },
});
