import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Test-only web chat ingestion.
 *
 * This is the local/dev counterpart to the Linq iMessage webhook
 * (`/webhook/linq` in http.ts). It runs the exact same brain
 * (`handler.handleMessage`) but is driven from a browser instead of
 * iMessage, so you can chat against a dev deployment without touching the
 * shared production phone number.
 *
 * Outbound is a no-op here: dev deployments have no `LINQ_API_TOKEN`, so
 * `handler.sendResponse` short-circuits and nothing is pushed to iMessage.
 * The reply comes back as the action's return value, and the persisted
 * `messages` row is what the web UI subscribes to reactively.
 */

/**
 * Disabled in production so a deployed copy of this endpoint can never
 * create synthetic users or run the brain against the real care record.
 * Requires `APP_ENV=production` to be set on the prod deployment.
 */
export function isTestChatEnabled(appEnv: string | undefined): boolean {
  return appEnv !== "production";
}

export const send = action({
  args: {
    /** Stable per-browser session id, used as the synthetic sender phone. */
    sessionId: v.string(),
    messageBody: v.string(),
    /** IANA timezone from the browser, e.g. "America/New_York". */
    timezone: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ reply: string; careCaseId: string }> => {
    if (!isTestChatEnabled(process.env.APP_ENV)) {
      throw new Error("test chat is disabled in production");
    }

    const senderPhone = args.sessionId;
    const chatId = `test:${args.sessionId}`;

    const result = await ctx.runAction(internal.handler.handleMessage, {
      senderPhone,
      messageBody: args.messageBody,
      chatId,
      service: "test",
      timezone: args.timezone,
    });

    // Resolve the care case so the browser knows which thread to subscribe to.
    const user = (await ctx.runMutation(internal.mutations.getUserByPhone, {
      phone: senderPhone,
    })) as Doc<"users"> | null;

    if (!user) {
      throw new Error("test chat: user not found after handleMessage");
    }

    return { reply: result.response, careCaseId: user.careCaseId };
  },
});
