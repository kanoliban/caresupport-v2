import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { callAnthropic } from "./lib/anthropicClient";
import {
  DOORMAN_NUDGE_INSTRUCTION,
  DOORMAN_SYSTEM_PROMPT,
  parseDoormanResponse,
} from "./lib/doorman";
import { createChat, sendMessage } from "./lib/linqClient";

const DAY_MS = 24 * 60 * 60 * 1000;
export const SWEEP_MIN_SILENCE_MS = DAY_MS;
export const SWEEP_MAX_AGE_MS = 14 * DAY_MS;

/**
 * Lobby sweep: strangers who stalled mid-screening get one nudge in the
 * doorman's own voice, then surface in a daily digest to the founder.
 * Rows older than the window are digest-only — those are hand-text territory.
 */
interface SweepCandidate {
  strangerId: Id<"strangers">;
  phone: string;
  chatId: string | undefined;
  transcript: { role: "user" | "assistant"; content: string; at: number }[];
}

interface LobbyCounts {
  awaitingReply: number;
  beyondWindow: number;
  flagged: number;
}

export const listSweepCandidates = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<SweepCandidate[]> => {
    const stale = await ctx.db
      .query("strangers")
      .withIndex("by_status_last_contact", (q) =>
        q
          .eq("status", "screening")
          .gt("lastContactAt", args.now - SWEEP_MAX_AGE_MS)
          .lt("lastContactAt", args.now - SWEEP_MIN_SILENCE_MS),
      )
      .collect();
    return stale
      .filter((s) => s.nudgedAt === undefined)
      .map((s) => ({
        strangerId: s._id,
        phone: s.phone,
        chatId: s.chatId,
        transcript: s.transcript,
      }));
  },
});

export const lobbyCounts = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<LobbyCounts> => {
    const screening = await ctx.db
      .query("strangers")
      .withIndex("by_status_last_contact", (q) => q.eq("status", "screening"))
      .collect();
    const flagged = await ctx.db
      .query("strangers")
      .withIndex("by_status_last_contact", (q) => q.eq("status", "flagged"))
      .collect();
    return {
      awaitingReply: screening.filter(
        (s) => s.nudgedAt !== undefined && s.lastContactAt <= s.nudgedAt,
      ).length,
      beyondWindow: screening.filter(
        (s) => args.now - s.lastContactAt >= SWEEP_MAX_AGE_MS,
      ).length,
      flagged: flagged.length,
    };
  },
});

export const run = internalAction({
  args: { now: v.optional(v.number()) },
  handler: async (
    ctx,
    args,
  ): Promise<{ skipped: string } | ({ nudged: number } & LobbyCounts)> => {
    if (process.env.DOORMAN_ENABLED !== "true") {
      return { skipped: "doorman_disabled" };
    }
    const now = args.now ?? Date.now();
    const candidates = await ctx.runQuery(
      internal.doormanSweep.listSweepCandidates,
      { now },
    );

    const apiKey =
      process.env.OPENROUTER_API_KEY ?? process.env.ANTHROPIC_API_KEY;
    const token = process.env.LINQ_API_TOKEN;
    const fromPhone = process.env.LINQ_PHONE_NUMBER;

    const nudged: string[] = [];
    if (apiKey && token) {
      for (const candidate of candidates) {
        try {
          const result = await callAnthropic({
            systemBlocks: [
              { type: "text", text: DOORMAN_SYSTEM_PROMPT, cacheBreakpoint: true },
              { type: "text", text: DOORMAN_NUDGE_INSTRUCTION, cacheBreakpoint: false },
            ],
            messages: candidate.transcript.map((t) => ({
              role: t.role,
              content: t.content,
            })),
            model: "claude-haiku-4-5",
            apiKey,
            ...(process.env.OPENROUTER_API_KEY
              ? { baseURL: "https://openrouter.ai/api" }
              : {}),
          });
          const nudge = parseDoormanResponse(result.text).smsResponse;
          if (!nudge) continue;

          let sent = false;
          if (candidate.chatId) {
            sent = (await sendMessage(candidate.chatId, nudge, token)).success;
          }
          if (!sent && fromPhone) {
            sent = (await createChat(candidate.phone, nudge, fromPhone, token))
              .success;
          }
          if (!sent) continue;

          await ctx.runMutation(internal.doorman.recordNudge, {
            strangerId: candidate.strangerId,
            nudge,
          });
          nudged.push(candidate.phone);
        } catch (error) {
          console.error("[doormanSweep] nudge failed", {
            phone: candidate.phone,
            error: String(error).slice(0, 200),
          });
        }
      }
    } else if (candidates.length > 0) {
      console.error(
        "[doormanSweep] cannot nudge: missing API key or LINQ_API_TOKEN",
      );
    }

    const counts = await ctx.runQuery(internal.doormanSweep.lobbyCounts, {
      now,
    });
    const hasNews =
      nudged.length > 0 || counts.awaitingReply > 0 || counts.beyondWindow > 0;
    if (hasNews) {
      const parts = [
        nudged.length > 0
          ? `nudged ${nudged.length} (${nudged.join(", ")})`
          : "nudged 0",
        `${counts.awaitingReply} awaiting reply after a nudge`,
        `${counts.beyondWindow} in screening >14d (hand-text candidates)`,
        `${counts.flagged} flagged for you`,
      ];
      await ctx.scheduler.runAfter(0, internal.sentinel.sendAlert, {
        alertType: "doorman_digest",
        message: `Lobby sweep: ${parts.join("; ")}.`,
      });
    }
    return { nudged: nudged.length, ...counts };
  },
});
