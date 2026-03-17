"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { sendMessage } from "./lib/linqClient";

export const expireStaleThreads = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const expired = await ctx.runMutation(
      internal.mutations.getExpiredOutreachThreads,
      {},
    ) as Doc<"outreachThreads">[];

    for (const thread of expired) {
      await ctx.runMutation(internal.mutations.updateOutreachThread, {
        threadId: thread._id,
        status: "expired",
      });

      const linqApiToken = process.env.LINQ_API_TOKEN ?? "";
      if (thread.initiatorChatId && linqApiToken) {
        try {
          await sendMessage(
            thread.initiatorChatId,
            `Heads up — ${thread.targetName} hasn't responded to your request ("${thread.purpose.slice(0, 80)}"). Want me to follow up?`,
            linqApiToken,
          );
        } catch {
          // notification is best-effort
        }
      }
    }

    if (expired.length > 0) {
      console.log(`[CS] Expired ${expired.length} outreach thread(s)`);
    }
  },
});
