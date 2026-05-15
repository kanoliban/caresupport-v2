"use node";

import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import {
  route,
  buildSystemBlocks,
  buildMessages,
  extractJson,
} from "./lib/pipeline";
import type {
  AgentResponse,
  HandlerResult,
  Intent,
  MemoryUpdate,
} from "./lib/pipeline";
import { normalizePhone } from "./mutations";
import { callAnthropic } from "./lib/anthropicClient";
import {
  sendMessage,
  sendMessageSequence,
  splitIntoBubbles,
  markAsRead,
  startTyping,
  sendReaction,
} from "./lib/linqClient";
import type { MessageEffect } from "./lib/linqClient";
import {
  SOUL_CONTENT,
  ROUTING_CONTENT,
  CAPABILITIES_CONTENT,
  SKILLS_CONTENT,
} from "./lib/promptContent";
import { normalizeMemoryCategory } from "./lib/memory";

const MIN_RESPONSE_MS = 3_000;
const EXTRA_RESPONSE_MS_PER_BUBBLE = 1_000;
const MAX_RESPONSE_MS = 6_000;
const MAX_REPLY_QUOTE_LENGTH = 200;

const UNKNOWN_USER_RESPONSE =
  "Hey! I'm CareSupport — I help you manage a loved one's care over text. No app needed.\nWhat's your name?";

const SOLO_BETA_MULTIPLAYER_RESPONSE =
  "Right now CareSupport is focused on helping you directly in this thread — I can't add family or message other people. If you want, I can draft a message you can copy and send them yourself. Want me to put one together?";

const SOLO_BOUNDARY_OUTBOUND_MARKER = "CareSupport is focused on helping you directly";
const SOLO_BOUNDARY_RECENT_HISTORY_WINDOW = 5;

const PROFILE_SAVE_PATTERNS = [
  /^\s*please save this to my profile(?: for future messages)?[:\s,-]*(.+)$/i,
  /^\s*(?:please )?(?:save|add|put) (?:this )?(?:to|in) my profile(?: for future messages)?[:\s,-]*(.+)$/i,
  /^\s*(?:please )?remember (?:this )?about me(?: for future messages)?[:\s,-]*(.+)$/i,
  /^\s*for future reference[:,]?\s*(.+)$/i,
];

const SOLO_BOUNDARY_PATTERN =
  /\b(add|invite|include|loop in|bring in|text|message|call|reach out to|contact)\b.*\b(sister|brother|mom|mother|dad|father|family|caregiver|doctor|provider|nurse|someone|team|friend|aunt|uncle)\b/i;

const VALID_LESSON_CATEGORIES = new Set(["behavioral", "factual", "operational"]);

export function stripMarkdown(text: string): string {
  const withoutLinePrefixes = text
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s*-\s+/, "")
        .replace(/^\s*\d+\.\s+/, ""),
    )
    .join("\n");

  return withoutLinePrefixes
    .replace(/(^|[\s([{"'])\*\*(?=\S)(.+?\S)\*\*(?=$|[\s)\]}.,!?;:'"])/g, "$1$2")
    .replace(/(^|[\s([{"'])__(?=\S)(.+?\S)__(?=$|[\s)\]}.,!?;:'"])/g, "$1$2")
    .replace(/(^|[\s([{"'])\*(?=\S)(.+?\S)\*(?=$|[\s)\]}.,!?;:'"])/g, "$1$2");
}

function truncateReplyQuote(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_REPLY_QUOTE_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_REPLY_QUOTE_LENGTH - 3)}...`;
}

function prependReplyContext(messageBody: string, quotedBody: string): string {
  return `[Replying to: "${truncateReplyQuote(quotedBody)}"] ${messageBody}`;
}

function getInitialResponseDelayMs(bubbleCount: number): number {
  const normalizedBubbleCount = Math.max(bubbleCount, 1);
  return Math.min(
    MIN_RESPONSE_MS + (normalizedBubbleCount - 1) * EXTRA_RESPONSE_MS_PER_BUBBLE,
    MAX_RESPONSE_MS,
  );
}

export function formatConversationLog(
  records: Array<{
    direction: "inbound" | "outbound";
    body: string;
    timestamp: number;
    displayName?: string;
    senderPhone?: string;
  }>,
): string {
  if (records.length === 0) return "[No conversation history]";
  return records
    .map((record) => {
      const date = new Date(record.timestamp);
      const ts = date.toISOString().replace("T", " ").replace(/\.\d{3}Z/, " UTC");
      const attribution = record.direction === "inbound"
        ? `INBOUND from ${record.displayName ?? record.senderPhone ?? "unknown"}`
        : `OUTBOUND to ${record.displayName ?? record.senderPhone ?? "unknown"}`;
      return `[${ts}] [${attribution}] ${record.body}`;
    })
    .join("\n");
}

export function inferExplicitUserMemoryUpdate(message: string): MemoryUpdate | null {
  for (const pattern of PROFILE_SAVE_PATTERNS) {
    const match = pattern.exec(message);
    const rawNote = match?.[1]?.trim();
    if (!rawNote) continue;

    const content = rawNote.replace(/^["']+|["']+$/g, "").trim();
    if (!content || content.includes("?")) {
      return null;
    }

    const category = /\b(text|texts|call|calls|message|messages|update|updates|sms|imessage|phone)\b/i
      .test(content)
      ? "communication_preference"
      : "profile";

    return { category, content };
  }

  return null;
}

export function ensureExplicitUserMemoryUpdate(
  updates: MemoryUpdate[],
  message: string,
  existingContext: string,
): MemoryUpdate[] {
  const inferred = inferExplicitUserMemoryUpdate(message);
  if (!inferred) {
    return updates;
  }

  if (existingContext.includes(inferred.content)) {
    return updates;
  }

  const present = updates.some(
    (update) =>
      normalizeMemoryCategory(update.category) === inferred.category &&
      update.content.trim() === inferred.content,
  );

  if (present) {
    return updates;
  }

  return [...updates, inferred];
}

export function isSoloExpansionRequest(message: string): boolean {
  return SOLO_BOUNDARY_PATTERN.test(message);
}

export function shouldFireSoloBoundaryOverride(
  messageBody: string,
  recentMessages: Array<{ direction: "inbound" | "outbound"; body: string }>,
): boolean {
  if (!isSoloExpansionRequest(messageBody)) return false;
  const recentOutboundContainsBoundary = recentMessages
    .slice(-SOLO_BOUNDARY_RECENT_HISTORY_WINDOW)
    .some(
      (message) =>
        message.direction === "outbound" &&
        message.body.includes(SOLO_BOUNDARY_OUTBOUND_MARKER),
    );
  return !recentOutboundContainsBoundary;
}

export function parseLesson(text: string): { category: string; cleanText: string } {
  const match = text.match(/^\[(behavioral|factual|operational)]\s*/i);
  if (match) {
    return {
      category: match[1].toLowerCase(),
      cleanText: text.slice(match[0].length).trim(),
    };
  }
  return { category: "behavioral", cleanText: text.trim() };
}

function buildIntent(careCaseStatus: string, messageBody: string): Intent {
  if (careCaseStatus === "onboarding") {
    return "ONBOARDING";
  }
  return route(messageBody).intent;
}

export const handleMessage = internalAction({
  args: {
    senderPhone: v.string(),
    messageBody: v.string(),
    chatId: v.string(),
    service: v.string(),
    sourceMessageId: v.optional(v.string()),
    replyToMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HandlerResult> => {
    const startedAt = Date.now();
    const now = startedAt;
    const { senderPhone, messageBody, chatId, service, replyToMessageId } = args;

    let user = await ctx.runMutation(internal.mutations.getUserByPhone, {
      phone: senderPhone,
    }) as Doc<"users"> | null;

    if (!user) {
      const result = await ctx.runMutation(
        internal.mutations.createOnboardingUserAndCareCase,
        { phone: senderPhone, chatId },
      );

      user = await ctx.runMutation(
        internal.mutations.getUserById,
        { id: result.userId },
      ) as Doc<"users"> | null;

      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId: result.careCaseId,
        userId: result.userId,
        event: "user_created",
        phone: senderPhone,
        details: { triggerMessage: "self-service onboarding" },
        timestamp: now,
      });
    }

    if (!user) {
      throw new Error("Unable to resolve or create user");
    }

    let activeUser: Doc<"users"> = user;
    const careCaseId = activeUser.careCaseId;
    const userId = activeUser._id;

    if (!activeUser.chatId && chatId) {
      await ctx.runMutation(internal.mutations.updateUserChatId, {
        userId,
        chatId,
      });
      const refreshedUser = await ctx.runMutation(internal.mutations.getUserById, {
        id: userId,
      }) as Doc<"users"> | null;
      if (refreshedUser) {
        activeUser = refreshedUser;
      }
    }

    const envVarsEarly = env();
    if (chatId && envVarsEarly.linqApiToken) {
      try {
        await markAsRead(chatId, envVarsEarly.linqApiToken);
        await startTyping(chatId, envVarsEarly.linqApiToken);
      } catch {
        // best effort
      }
    }

    await ctx.runMutation(internal.mutations.logMessage, {
      careCaseId,
      userId,
      senderPhone,
      actorType: "user",
      direction: "inbound",
      displayName: activeUser.name,
      body: messageBody,
      timestamp: now,
      linqMessageId: args.sourceMessageId,
    });

    const compiledContext = await ctx.runMutation(
      internal.mutations.getCompiledPromptContext,
      { userId, careCaseId },
    );
    if (!compiledContext) {
      throw new Error("Unable to compile prompt context");
    }

    const recentMessages = await ctx.runMutation(
      internal.mutations.getCareCaseRecentMessages,
      { careCaseId, limit: 80 },
    );
    const conversationLog = formatConversationLog(
      recentMessages
        .reverse()
        .map((message) => ({
          direction: message.direction,
          body: message.body,
          timestamp: message.timestamp,
          displayName: message.displayName ?? undefined,
          senderPhone: message.senderPhone ?? undefined,
        })),
    );

    await ctx.runMutation(internal.mutations.logAudit, {
      careCaseId,
      userId,
      event: "context_load",
      phone: senderPhone,
      details: {
        sectionsLoaded: compiledContext.contextSections,
        triggerMessage: messageBody.slice(0, 200),
      },
      timestamp: now,
    });

    let messageForModel = messageBody;
    if (replyToMessageId) {
      const repliedToMessage = await ctx.runMutation(
        internal.mutations.getMessageByLinqId,
        { linqMessageId: replyToMessageId },
      );
      const quotedBody = repliedToMessage?.body ?? "";
      if (quotedBody.trim()) {
        messageForModel = prependReplyContext(messageBody, quotedBody);
      }
    }

    const routeResult = route(messageForModel);
    const intent = buildIntent(compiledContext.careCase.status, messageForModel);

    const nowDate = new Date(now);
    const currentDateIso = nowDate.toISOString().slice(0, 10);
    const currentDayOfWeek = nowDate.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
    const currentTimeUtc = nowDate.toISOString().slice(11, 16);
    const timezone = compiledContext.careCase.timezone || "UTC";

    const systemBlocks = buildSystemBlocks({
      soulContent: SOUL_CONTENT,
      routingContent: ROUTING_CONTENT,
      capabilitiesContent: CAPABILITIES_CONTENT,
      skillsContent: SKILLS_CONTENT,
      lessonsContent: compiledContext.lessons.map((lesson) => `- ${lesson}`).join("\n"),
      user: {
        name: compiledContext.user.name,
        phone: compiledContext.user.phone,
        relationshipToRecipient: compiledContext.user.relationshipToRecipient,
        status: compiledContext.user.status,
      },
      userContext: compiledContext.userContext,
      careCase: {
        title: compiledContext.careCase.title,
        careRecipientName: compiledContext.careCase.careRecipientName,
        relationshipToRecipient: compiledContext.careCase.relationshipToRecipient,
        timezone: compiledContext.careCase.timezone,
        status: compiledContext.careCase.status,
      },
      careCaseContext: compiledContext.careCaseContext,
      intent,
      service,
      currentDateIso,
      currentDayOfWeek,
      currentTimeUtc,
      timezone,
    });
    const messages = buildMessages(messageForModel, conversationLog);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    let parsed: AgentResponse;
    try {
      const aiResult = await callAnthropic({
        systemBlocks,
        messages,
        model: routeResult.model,
        apiKey,
      });
      parsed = extractJson(aiResult.text);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      const fallback =
        `Sorry ${compiledContext.user.name}, I wasn't able to process that. Can you send it again?`;
      await logOutbound(ctx, careCaseId, userId, senderPhone, compiledContext.user.name, fallback, now);
      await sendResponse(chatId, fallback, env());
      return { success: false, response: fallback, error: errorMessage };
    }

    let smsResponse = stripMarkdown(parsed.smsResponse);
    if (shouldFireSoloBoundaryOverride(messageBody, recentMessages)) {
      smsResponse = SOLO_BETA_MULTIPLAYER_RESPONSE;
      parsed.userProfileUpdate = null;
      parsed.careCaseProfileUpdate = null;
      parsed.userMemoryUpdates = [];
      parsed.careCaseMemoryUpdates = [];
      parsed.medicationUpdates = [];
      parsed.scheduleUpdates = [];
      parsed.reactions = [];
      parsed.effect = null;
    }

    const userMemoryUpdates = ensureExplicitUserMemoryUpdate(
      parsed.userMemoryUpdates,
      messageBody,
      compiledContext.userContext,
    );

    if (parsed.userProfileUpdate) {
      await ctx.runMutation(internal.mutations.updateUserProfile, {
        userId,
        name: parsed.userProfileUpdate.name || undefined,
        relationshipToRecipient:
          parsed.userProfileUpdate.relationship_to_recipient || undefined,
        status: parsed.userProfileUpdate.status || undefined,
      });
    }

    if (parsed.careCaseProfileUpdate) {
      await ctx.runMutation(internal.mutations.updateCareCaseProfile, {
        careCaseId,
        careRecipientName:
          parsed.careCaseProfileUpdate.care_recipient_name || undefined,
        relationshipToRecipient:
          parsed.careCaseProfileUpdate.relationship_to_recipient || undefined,
        timezone: parsed.careCaseProfileUpdate.timezone || undefined,
        status: parsed.careCaseProfileUpdate.status || undefined,
      });
    }

    await ctx.runMutation(internal.mutations.syncCareCaseTitle, {
      careCaseId,
      userId,
    });

    let memoriesSaved = 0;

    if (userMemoryUpdates.length > 0) {
      const result = await ctx.runMutation(internal.mutations.upsertMemoryEntries, {
        userId,
        careCaseId,
        scope: "user",
        updates: userMemoryUpdates,
      });
      memoriesSaved += result.inserted;
      if (result.inserted > 0) {
        await ctx.runMutation(internal.mutations.logAudit, {
          careCaseId,
          userId,
          event: "memory_saved",
          phone: senderPhone,
          details: { savedCategories: result.savedCategories },
          timestamp: Date.now(),
        });
      }
    }

    if (parsed.careCaseMemoryUpdates.length > 0) {
      const result = await ctx.runMutation(internal.mutations.upsertMemoryEntries, {
        userId,
        careCaseId,
        scope: "care_case",
        updates: parsed.careCaseMemoryUpdates,
      });
      memoriesSaved += result.inserted;
      if (result.inserted > 0) {
        await ctx.runMutation(internal.mutations.logAudit, {
          careCaseId,
          userId,
          event: "memory_saved",
          phone: senderPhone,
          details: { savedCategories: result.savedCategories },
          timestamp: Date.now(),
        });
      }
    }

    if (parsed.selfCorrections.length > 0) {
      const lessonUpdates = parsed.selfCorrections.flatMap((correction) => {
        const { category, cleanText } = parseLesson(correction);
        if (!VALID_LESSON_CATEGORIES.has(category) || !cleanText) {
          return [];
        }
        return [{ category: "lesson" as const, content: `[${category}] ${cleanText}` }];
      });

      if (lessonUpdates.length > 0) {
        const result = await ctx.runMutation(internal.mutations.upsertMemoryEntries, {
          userId,
          careCaseId,
          scope: "care_case",
          updates: lessonUpdates,
        });
        memoriesSaved += result.inserted;
      }
    }

    if (parsed.medicationUpdates?.length) {
      for (const medication of parsed.medicationUpdates) {
        await ctx.runMutation(internal.mutations.upsertMedication, {
          careCaseId,
          action: medication.action,
          name: medication.name,
          dose: medication.dose,
          schedule: medication.schedule,
          prescriber: medication.prescriber,
          notes: medication.notes,
        });
      }
    }

    if (parsed.scheduleUpdates?.length) {
      for (const schedule of parsed.scheduleUpdates) {
        await ctx.runMutation(internal.mutations.upsertScheduleItem, {
          careCaseId,
          action: schedule.action,
          type: schedule.type,
          title: schedule.title,
          date: schedule.date,
          time: schedule.time,
          endTime: schedule.end_time,
          location: schedule.location,
          notes: schedule.notes,
          provider: schedule.provider,
        });
      }
    }

    await ctx.runMutation(internal.mutations.logAudit, {
      careCaseId,
      userId,
      event: "response_sent",
      phone: senderPhone,
      details: {
        responseLength: smsResponse.length,
        leakageCheckPassed: true,
      },
      timestamp: now,
    });

    const effectForSend: MessageEffect | null = parsed.effect
      ? { type: parsed.effect.type, name: parsed.effect.name }
      : null;

    const outboundMessageId = await logOutbound(
      ctx,
      careCaseId,
      userId,
      senderPhone,
      compiledContext.user.name,
      smsResponse,
      now,
    );
    const linqMessageIds = await sendResponse(chatId, smsResponse, env(), startedAt, effectForSend);
    if (linqMessageIds.length > 0) {
      await ctx.runMutation(internal.mutations.updateMessageLinqId, {
        messageId: outboundMessageId,
        linqMessageId: linqMessageIds[0],
      });
    }

    const envVars = env();
    for (const reaction of parsed.reactions) {
      if (reaction.targetMessage === "last_inbound" && args.sourceMessageId) {
        try {
          await sendReaction(
            args.sourceMessageId,
            "add",
            reaction.type,
            envVars.linqApiToken,
          );
        } catch {
          // best effort
        }
      }
    }

    return {
      success: true,
      response: smsResponse,
      routedTier: routeResult.tier,
      routedIntent: intent,
      lessonsLearned: parsed.selfCorrections.length,
      memoriesSaved,
      blocked: shouldFireSoloBoundaryOverride(messageBody, recentMessages),
    };
  },
});

function env(): { linqApiToken: string; linqPhoneNumber: string } {
  return {
    linqApiToken: process.env.LINQ_API_TOKEN ?? "",
    linqPhoneNumber: process.env.LINQ_PHONE_NUMBER ?? "",
  };
}

async function logOutbound(
  ctx: ActionCtx,
  careCaseId: Id<"careCases">,
  userId: Id<"users">,
  phone: string,
  displayName: string,
  body: string,
  timestamp: number,
): Promise<Id<"messages">> {
  return await ctx.runMutation(internal.mutations.logMessage, {
    careCaseId,
    userId,
    senderPhone: phone,
    actorType: "assistant",
    direction: "outbound",
    displayName,
    body,
    timestamp,
  });
}

async function sendResponse(
  chatId: string,
  text: string,
  envVars: { linqApiToken: string },
  pacingStart = Date.now(),
  effect: MessageEffect | null = null,
): Promise<string[]> {
  if (!envVars.linqApiToken || !chatId) {
    return [];
  }

  const bubbles = splitIntoBubbles(text);
  const initialDelayMs = getInitialResponseDelayMs(bubbles.length);
  const elapsed = Date.now() - pacingStart;
  if (elapsed < initialDelayMs) {
    await new Promise((resolve) => setTimeout(resolve, initialDelayMs - elapsed));
  }

  const results: { success: boolean; messageId?: string }[] = [];
  if (effect && bubbles.length > 0) {
    results.push(await sendMessage(chatId, bubbles[0], envVars.linqApiToken, effect));
    if (bubbles.length > 1) {
      results.push(...await sendMessageSequence(chatId, bubbles.slice(1), envVars.linqApiToken));
    }
  } else {
    results.push(...await sendMessageSequence(chatId, bubbles, envVars.linqApiToken));
  }

  return results
    .filter((result) => result.success && result.messageId)
    .map((result) => result.messageId as string);
}
