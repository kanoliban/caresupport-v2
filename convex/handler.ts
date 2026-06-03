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
  MODEL_CONSTITUTION_CONTENT,
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

const COORDINATION_BOUNDARY_RESPONSE =
  "I can get that ready, but I need your approval before I message anyone. I can save the contact or coordination details here and keep the outreach pending.";

const COORDINATION_BOUNDARY_OUTBOUND_MARKER =
  "I need your approval before I message anyone";
const COORDINATION_BOUNDARY_RECENT_HISTORY_WINDOW = 5;

const PROFILE_SAVE_PATTERNS = [
  /^\s*please save this to my profile(?: for future messages)?[:\s,-]*(.+)$/i,
  /^\s*(?:please )?(?:save|add|put) (?:this )?(?:to|in) my profile(?: for future messages)?[:\s,-]*(.+)$/i,
  /^\s*(?:please )?remember (?:this )?about me(?: for future messages)?[:\s,-]*(.+)$/i,
  /^\s*for future reference[:,]?\s*(.+)$/i,
];

const COORDINATION_REQUEST_PATTERN =
  /\b(add|invite|include|loop in|bring in|text|message|call|reach out to|contact)\b.*\b(sister|brother|mom|mother|dad|father|family|caregiver|doctor|provider|nurse|someone|team|friend|aunt|uncle)\b/i;

const VALID_LESSON_CATEGORIES = new Set(["behavioral", "factual", "operational"]);

type OutreachApprovalResolution =
  | { action: "none" }
  | { action: "ambiguous"; contactNames: string[]; matchedCount: number }
  | { action: "blocked"; contactName: string; reason: string }
  | {
      action: "approved";
      id: Id<"outreachAttempts">;
      contactName: string;
      messageBody: string;
    };

type OutreachExecutionResult = {
  sent: boolean;
  reason?: string;
  contactName?: string;
  chatId?: string;
  messageId?: string;
};

type CareContactReplyContext = {
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

export function buildCareContactReplyMessage(
  messageBody: string,
  context: {
    careContactName: string;
    contactRelationship?: string;
    contactRole?: string;
    contactAvailabilityNotes?: string;
    coordinationEventTitle?: string;
    coordinationEventDescription?: string;
    outreachPurpose?: string;
    outreachMessageBody?: string;
  },
): string {
  const contextLines = [
    `Incoming speaker: care contact ${context.careContactName}.`,
    context.contactRelationship
      ? `Relationship: ${context.contactRelationship}.`
      : "",
    context.contactRole ? `Role: ${context.contactRole}.` : "",
    context.contactAvailabilityNotes
      ? `Known availability/context: ${context.contactAvailabilityNotes}.`
      : "",
    context.coordinationEventTitle
      ? `Related coordination event: ${context.coordinationEventTitle}.`
      : "",
    context.coordinationEventDescription
      ? `Event description: ${context.coordinationEventDescription}.`
      : "",
    context.outreachPurpose ? `Original outreach purpose: ${context.outreachPurpose}.` : "",
    context.outreachMessageBody
      ? `Original CareSupport message to this contact: "${truncateReplyQuote(
          context.outreachMessageBody,
        )}".`
      : "",
    "Do not treat this speaker as the primary coordinator. Use care_contact_updates for facts about this contact and coordination_event_updates for scheduling/coverage state.",
  ].filter(Boolean);

  return `[Care contact reply context]\n${contextLines.join("\n")}\n\n[Message]\n${messageBody}`;
}

function buildCoordinatorReplyUpdate(
  context: CareContactReplyContext,
  messageBody: string,
): string {
  const eventText = context.coordinationEventTitle
    ? ` about ${context.coordinationEventTitle}`
    : "";
  return `${context.careContactName} replied${eventText}: "${truncateReplyQuote(
    messageBody,
  )}"`;
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

export function isUnsupportedCoordinationRequest(message: string): boolean {
  return COORDINATION_REQUEST_PATTERN.test(message);
}

export function shouldFireCoordinationBoundaryOverride(
  messageBody: string,
  recentMessages: Array<{ direction: "inbound" | "outbound"; body: string }>,
): boolean {
  if (!isUnsupportedCoordinationRequest(messageBody)) return false;
  const recentOutboundContainsBoundary = recentMessages
    .slice(-COORDINATION_BOUNDARY_RECENT_HISTORY_WINDOW)
    .some(
      (message) =>
        message.direction === "outbound" &&
        message.body.includes(COORDINATION_BOUNDARY_OUTBOUND_MARKER),
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

function formatOutreachBlockReason(reason: string): string {
  switch (reason) {
    case "no_phone":
      return "there is no phone number saved";
    case "texting_disabled":
      return "texting is disabled for that contact";
    case "contact_consent_denied":
      return "outreach consent is marked no";
    case "contact_inactive":
      return "that contact is inactive";
    default:
      return "the contact is not ready for outreach";
  }
}

function formatOutreachFailureReason(reason: string | undefined): string {
  if (!reason) return "the send step failed";
  switch (reason) {
    case "linq_env_missing":
      return "the Linq sending credentials are not configured";
    case "not_approved_or_not_found":
      return "the approved outreach could not be found";
    default:
      return reason;
  }
}

export function approvalResolutionResponse(
  resolution: OutreachApprovalResolution,
  executionResult?: OutreachExecutionResult,
): string | null {
  if (resolution.action === "none") return null;

  if (resolution.action === "ambiguous") {
    const names = resolution.contactNames.join(", ");
    return `I found pending outreach for ${names}. Which one do you want me to approve?`;
  }

  if (resolution.action === "blocked") {
    return `I can't approve outreach to ${resolution.contactName} yet because ${formatOutreachBlockReason(resolution.reason)}. I have not messaged them.`;
  }

  if (executionResult?.sent) {
    return `Done. I asked ${resolution.contactName}. I will let you know when they reply.`;
  }

  if (executionResult && !executionResult.sent) {
    return `I have your approval to ask ${resolution.contactName}, but I could not send the message yet because ${formatOutreachFailureReason(executionResult.reason)}. I have not messaged them.`;
  }

  return `Got it. I have your approval to ask ${resolution.contactName}. I am preparing the send step now.`;
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

    const careContactReply = await ctx.runMutation(
      internal.contactReplies.resolveInbound,
      { senderPhone, chatId },
    ) as CareContactReplyContext | null;

    let user: Doc<"users"> | null = null;
    if (careContactReply) {
      user = await ctx.runMutation(
        internal.mutations.getUserById,
        { id: careContactReply.userId },
      ) as Doc<"users"> | null;
    } else {
      user = await ctx.runMutation(internal.mutations.getUserByPhone, {
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
    }

    if (!user) {
      throw new Error("Unable to resolve or create user");
    }

    let activeUser: Doc<"users"> = user;
    const careCaseId = careContactReply?.careCaseId ?? activeUser.careCaseId;
    const userId = activeUser._id;

    if (!careContactReply && !activeUser.chatId && chatId) {
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

    const inboundMessageId = await ctx.runMutation(internal.mutations.logMessage, {
      careCaseId,
      userId,
      senderPhone,
      actorType: "user",
      direction: "inbound",
      displayName: careContactReply?.careContactName ?? activeUser.name,
      body: messageBody,
      timestamp: now,
      linqMessageId: args.sourceMessageId,
      careContactId: careContactReply?.careContactId,
      coordinationEventId: careContactReply?.coordinationEventId,
      outreachAttemptId: careContactReply?.outreachAttemptId,
    });

    if (careContactReply) {
      const replyState = await ctx.runMutation(
        internal.contactReplies.applyInboundReplyToEvent,
        {
          careCaseId,
          careContactId: careContactReply.careContactId,
          coordinationEventId: careContactReply.coordinationEventId,
          messageBody,
          sourceMessageId: inboundMessageId,
        },
      );
      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId,
        userId,
        event: "care_contact_reply_received",
        phone: senderPhone,
        details: {
          careContactId: careContactReply.careContactId,
          coordinationEventId: careContactReply.coordinationEventId,
          outreachAttemptId: careContactReply.outreachAttemptId,
          sourceMessageId: inboundMessageId,
          messageBody: messageBody.slice(0, 500),
          status: replyState.status,
          linqChatId: chatId,
          linqMessageId: args.sourceMessageId,
        },
        timestamp: now,
      });
    }

    const compiledContext = await ctx.runMutation(
      internal.mutations.getCompiledPromptContext,
      { userId, careCaseId },
    );
    if (!compiledContext) {
      throw new Error("Unable to compile prompt context");
    }
    const replyDisplayName = careContactReply?.careContactName ?? compiledContext.user.name;

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

    const approvalResolution = careContactReply
      ? ({ action: "none" } as OutreachApprovalResolution)
      : await ctx.runMutation(
          internal.outreachAttempts.resolveApprovalFromMessage,
          { careCaseId, approvedByUserId: userId, messageBody },
        ) as OutreachApprovalResolution;
    let outreachExecutionResult: OutreachExecutionResult | undefined;
    if (approvalResolution.action === "approved") {
      try {
        outreachExecutionResult = await ctx.runAction(
          internal.outreachExecution.executeApproved,
          { outreachAttemptId: approvalResolution.id },
        ) as OutreachExecutionResult;
      } catch (error) {
        outreachExecutionResult = {
          sent: false,
          reason: error instanceof Error ? error.message : String(error),
          contactName: approvalResolution.contactName,
        };
      }
    }
    const deterministicApprovalResponse = approvalResolutionResponse(
      approvalResolution,
      outreachExecutionResult,
    );
    if (deterministicApprovalResponse) {
      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId,
        userId,
        event: "response_sent",
        phone: senderPhone,
        details: {
          triggerMessage: "outreach_approval_resolution",
          responseLength: deterministicApprovalResponse.length,
          leakageCheckPassed: true,
          matchedCount:
            approvalResolution.action === "ambiguous"
              ? approvalResolution.matchedCount
              : undefined,
        },
        timestamp: now,
      });

      const outboundMessageId = await logOutbound(
        ctx,
        careCaseId,
        userId,
        senderPhone,
        compiledContext.user.name,
        deterministicApprovalResponse,
        now,
      );
      const linqMessageIds = await sendResponse(
        chatId,
        deterministicApprovalResponse,
        env(),
        startedAt,
      );
      if (linqMessageIds.length > 0) {
        await ctx.runMutation(internal.mutations.updateMessageLinqId, {
          messageId: outboundMessageId,
          linqMessageId: linqMessageIds[0],
        });
      }

      return {
        success: true,
        response: deterministicApprovalResponse,
        routedIntent: "GENERAL",
        lessonsLearned: 0,
        memoriesSaved: 0,
        blocked: approvalResolution.action === "blocked",
      };
    }

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
    if (careContactReply) {
      messageForModel = buildCareContactReplyMessage(
        messageForModel,
        careContactReply,
      );
    }

    const routeResult = route(messageForModel);
    const intent = careContactReply
      ? routeResult.intent
      : buildIntent(compiledContext.careCase.status, messageForModel);

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
      modelConstitutionContent: MODEL_CONSTITUTION_CONTENT,
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
        `Sorry ${replyDisplayName}, I wasn't able to process that. Can you send it again?`;
      await logOutbound(
        ctx,
        careCaseId,
        userId,
        senderPhone,
        replyDisplayName,
        fallback,
        now,
        careContactReply,
      );
      await sendResponse(chatId, fallback, env());
      return { success: false, response: fallback, error: errorMessage };
    }

    let smsResponse = stripMarkdown(parsed.smsResponse);
    const coordinationBoundaryBlocked = careContactReply
      ? false
      : shouldFireCoordinationBoundaryOverride(messageBody, recentMessages);
    if (coordinationBoundaryBlocked) {
      smsResponse = COORDINATION_BOUNDARY_RESPONSE;
      parsed.reactions = [];
      parsed.effect = null;
    }

    const userMemoryUpdates = careContactReply
      ? []
      : ensureExplicitUserMemoryUpdate(
          parsed.userMemoryUpdates,
          messageBody,
          compiledContext.userContext,
        );

    if (!careContactReply && parsed.userProfileUpdate) {
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
        try {
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
        } catch (err) {
          const failureReason =
            err instanceof Error ? err.message : String(err);
          await ctx.runMutation(internal.mutations.logAudit, {
            careCaseId,
            userId,
            event: "message_failed",
            phone: senderPhone,
            details: {
              failureReason: `Invalid schedule_update for "${schedule.title}": ${failureReason}`,
            },
            timestamp: Date.now(),
          });
        }
      }
    }

    if (parsed.careContactUpdates?.length) {
      for (const contact of parsed.careContactUpdates) {
        await ctx.runMutation(internal.mutations.upsertCareContactFromModel, {
          careCaseId,
          update: contact,
        });
      }
    }

    if (parsed.coordinationEventUpdates?.length) {
      for (const event of parsed.coordinationEventUpdates) {
        await ctx.runMutation(internal.mutations.upsertCoordinationEventFromModel, {
          careCaseId,
          update: event,
        });
      }
    }

    if (!careContactReply && parsed.outreachRequests?.length) {
      for (const request of parsed.outreachRequests) {
        await ctx.runMutation(internal.outreachAttempts.createPendingFromModel, {
          careCaseId,
          requestedByUserId: userId,
          request,
          approvalPrompt: smsResponse,
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
      replyDisplayName,
      smsResponse,
      now,
      careContactReply,
    );
    const linqMessageIds = await sendResponse(chatId, smsResponse, env(), startedAt, effectForSend);
    if (linqMessageIds.length > 0) {
      await ctx.runMutation(internal.mutations.updateMessageLinqId, {
        messageId: outboundMessageId,
        linqMessageId: linqMessageIds[0],
      });
    }

    if (careContactReply) {
      const coordinatorUpdate = buildCoordinatorReplyUpdate(
        careContactReply,
        messageBody,
      );
      const coordinatorMessageId = await logOutbound(
        ctx,
        careCaseId,
        userId,
        activeUser.phone,
        activeUser.name,
        coordinatorUpdate,
        Date.now(),
        careContactReply,
      );
      if (activeUser.chatId && activeUser.chatId !== chatId) {
        const coordinatorLinqMessageIds = await sendResponse(
          activeUser.chatId,
          coordinatorUpdate,
          env(),
          Date.now() - MAX_RESPONSE_MS,
        );
        if (coordinatorLinqMessageIds.length > 0) {
          await ctx.runMutation(internal.mutations.updateMessageLinqId, {
            messageId: coordinatorMessageId,
            linqMessageId: coordinatorLinqMessageIds[0],
          });
        }
      }
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
      blocked: coordinationBoundaryBlocked,
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
  context?: {
    careContactId?: Id<"careContacts">;
    coordinationEventId?: Id<"coordinationEvents">;
    outreachAttemptId?: Id<"outreachAttempts">;
  } | null,
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
    careContactId: context?.careContactId,
    coordinationEventId: context?.coordinationEventId,
    outreachAttemptId: context?.outreachAttemptId,
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
