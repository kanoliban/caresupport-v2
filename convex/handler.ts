// 2026-06-17: Core chat runtime handler; guards malformed AI replies so production never logs or sends silent outbound messages.
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
import {
  refreshAccessToken,
  fetchEventsForRange,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  formatEventsForPrompt,
  buildRecurrenceRule,
  toSeriesEventId,
} from "./lib/providers/googleCalendar";
import { computeReminderFireAt, zonedDateTimeToUtcMs } from "./lib/reminderTiming";

const MIN_RESPONSE_MS = 3_000;
const EXTRA_RESPONSE_MS_PER_BUBBLE = 1_000;
const MAX_RESPONSE_MS = 6_000;
const MAX_REPLY_QUOTE_LENGTH = 200;

const TEST_ENV_MARKER = "TEST ENVIRONMENT INITIALIZED";

// Detects first-person claims that something was written to the user's calendar,
// used to suppress false "added it to your calendar" replies when no write landed.
const CALENDAR_WRITE_CLAIM_PATTERN =
  /\b(add(?:ed|ing)?|creat(?:e|ed|ing)|schedul(?:e|ed|ing)|put|plac(?:e|ed)|book(?:ed)?|sav(?:e|ed)|updat(?:e|ed)|mov(?:e|ed)|remov(?:e|ed)|delet(?:e|ed)|cancel(?:ed|led)?)\b[^.?!\n]{0,60}\b(calendar|gcal)\b/i;

const COORDINATION_BOUNDARY_RESPONSE =
  "I can't add them or message them for you yet. I can draft the message and keep track of the coordination issue here. Want me to put one together?";

const COORDINATION_BOUNDARY_OUTBOUND_MARKER =
  "I can't add them or message them for you yet";
const COORDINATION_BOUNDARY_RECENT_HISTORY_WINDOW = 5;
const ERROR_MESSAGE_MAX_LENGTH = 500;

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

export interface RuntimeErrorSummary {
  name: string;
  message: string;
  status?: number;
  type?: string;
  code?: string;
}

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

const CALENDAR_CONNECT_PATTERN =
  /\b(connect|add|link|sync|attach|set\s*up)\b.{0,30}\b(google\s*calendar|calendar|gcal)\b/i;

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

export function stripAssistantSpeakerPrefix(text: string): string {
  return text.replace(/^\s*\[[^\]\n]{1,80}]:\s*/, "");
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

export function summarizeRuntimeError(error: unknown): RuntimeErrorSummary {
  if (error instanceof Error) {
    const record = isRecord(error) ? error : {};
    return {
      name: error.name || "Error",
      message: truncateErrorMessage(scrubSensitiveText(error.message)),
      status: numberProperty(record, "status"),
      type: stringProperty(record, "type"),
      code: stringProperty(record, "code"),
    };
  }

  if (isRecord(error)) {
    const message =
      stringProperty(error, "message") ??
      stringProperty(error, "error") ??
      JSON.stringify(error);
    return {
      name: stringProperty(error, "name") ?? "UnknownError",
      message: truncateErrorMessage(scrubSensitiveText(message)),
      status: numberProperty(error, "status"),
      type: stringProperty(error, "type"),
      code: stringProperty(error, "code"),
    };
  }

  return {
    name: "UnknownError",
    message: truncateErrorMessage(scrubSensitiveText(String(error))),
  };
}

function formatRuntimeErrorSummary(summary: RuntimeErrorSummary): string {
  const metadata = [
    summary.status === undefined ? null : `status=${summary.status}`,
    summary.type ? `type=${summary.type}` : null,
    summary.code ? `code=${summary.code}` : null,
  ].filter((value): value is string => Boolean(value));
  const suffix = metadata.length > 0 ? ` (${metadata.join(", ")})` : "";
  return `${summary.name}: ${summary.message}${suffix}`;
}

export function runtimeFailureFallback(displayName: string): string {
  return `Sorry ${displayName}, I'm having a system issue on my side right now. I have your message, but I can't respond properly yet.`;
}

export function ensureFinalSmsResponse(
  smsResponse: string,
  options: {
    replyDisplayName: string;
    calendarWriteSucceeded?: boolean;
  },
): string {
  const trimmed = smsResponse.trim();
  if (trimmed) {
    return trimmed;
  }
  if (options.calendarWriteSucceeded) {
    return "Done — I updated your Google Calendar.";
  }
  return runtimeFailureFallback(options.replyDisplayName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringProperty(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberProperty(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function truncateErrorMessage(message: string): string {
  if (message.length <= ERROR_MESSAGE_MAX_LENGTH) {
    return message;
  }
  return `${message.slice(0, ERROR_MESSAGE_MAX_LENGTH)}...`;
}

function scrubSensitiveText(text: string): string {
  return text
    .replace(/\bsk-ant-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\bsso-key\s+[A-Za-z0-9:_-]+/gi, "sso-key [redacted]");
}

export const handleMessage = internalAction({
  args: {
    senderPhone: v.string(),
    messageBody: v.string(),
    chatId: v.string(),
    service: v.string(),
    sourceMessageId: v.optional(v.string()),
    replyToMessageId: v.optional(v.string()),
    // IANA timezone (e.g. "America/New_York") detected client-side. Optional —
    // the iMessage/Linq path doesn't supply it; the web test UI does.
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HandlerResult> => {
    const startedAt = Date.now();
    const now = startedAt;
    const { senderPhone, messageBody, chatId, service, replyToMessageId } = args;

    // Identity resolution: a reply from a known care contact maps back to the
    // existing care case/user rather than creating a new onboarding user.
    const careContactReply = await ctx.runMutation(
      internal.contactReplies.resolveInbound,
      { senderPhone, chatId },
    ) as CareContactReplyContext | null;

    let user: Doc<"users"> | null = null;
    if (careContactReply) {
      user = await ctx.runMutation(internal.mutations.getUserById, {
        id: careContactReply.userId,
      }) as Doc<"users"> | null;
    } else {
      user = await ctx.runMutation(internal.mutations.getUserByPhone, {
        phone: senderPhone,
      }) as Doc<"users"> | null;
    }

    const isTestEnv = process.env.APP_ENV === "test";
    const isNewUser = !user;

    if (!user && !careContactReply) {
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
    if (chatId && !isTestChat(chatId) && envVarsEarly.linqApiToken) {
      try {
        await markAsRead(chatId, envVarsEarly.linqApiToken);
        await startTyping(chatId, envVarsEarly.linqApiToken);
      } catch {
        // best effort
      }
    }

    // Handle "connect my calendar" intent before routing to the AI
    if (CALENDAR_CONNECT_PATTERN.test(messageBody)) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        await logInbound(ctx, careCaseId, userId, senderPhone, activeUser.name, messageBody, now, args.sourceMessageId);
        const reply = "Google Calendar isn't configured yet — check back soon!";
        await logOutbound(ctx, careCaseId, userId, senderPhone, activeUser.name, reply, now);
        await sendResponse(chatId, reply, envVarsEarly);
        return { success: true, response: reply };
      }
      const oauthUrl = `${process.env.CONVEX_SITE_URL}/oauth/google/start?u=${userId}`;
      await logInbound(ctx, careCaseId, userId, senderPhone, activeUser.name, messageBody, now, args.sourceMessageId);
      const reply = `Tap this link to connect your Google Calendar:\n\n${oauthUrl}\n\nYou'll be redirected back here once it's done.`;
      await logOutbound(ctx, careCaseId, userId, senderPhone, activeUser.name, reply, now);
      await sendResponse(chatId, reply, envVarsEarly);
      return { success: true, response: reply };
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
          outreachAttemptId: careContactReply.outreachAttemptId,
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
    const replyDisplayName = careContactReply?.careContactName ?? activeUser.name;

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

    // Prefer a client-detected timezone (web UI) over the stored one, and
    // persist it so calendar/schedule/reminders use the real zone going forward.
    const storedTimezone = compiledContext.careCase.timezone || "UTC";
    const detectedTimezone = isValidTimeZone(args.timezone) ? args.timezone : undefined;
    const timezone = detectedTimezone ?? storedTimezone;
    if (detectedTimezone && detectedTimezone !== storedTimezone) {
      await ctx.runMutation(internal.mutations.updateCareCaseProfile, {
        careCaseId,
        timezone: detectedTimezone,
        timezoneConfirmed: true,
      });
    }
    // A client-detected zone means we already know it — no need to ask later.
    const timezoneConfirmed =
      compiledContext.careCase.timezoneConfirmed === true ||
      detectedTimezone !== undefined;

    const calendarContext = await loadCalendarContext(ctx, userId, timezone, nowDate);

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
      timezoneConfirmed,
      calendarContext: calendarContext ?? undefined,
      isTestEnv: process.env.APP_ENV === "test",
    });
    const messages = buildMessages(messageForModel, conversationLog);

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const apiKey = openRouterKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Neither OPENROUTER_API_KEY nor ANTHROPIC_API_KEY environment variable is set",
      );
    }

    let parsed: AgentResponse;
    try {
      const aiResult = await callAnthropic({
        systemBlocks,
        messages,
        model: routeResult.model,
        apiKey,
        ...(openRouterKey ? { baseURL: "https://openrouter.ai/api" } : {}),
      });
      if (/calendar_updates/.test(aiResult.text)) {
        console.log("[calendar] RAW model text:", aiResult.text.slice(0, 900));
      }
      parsed = extractJson(aiResult.text);
    } catch (error: unknown) {
      const errorSummary = summarizeRuntimeError(error);
      const errorMessage = formatRuntimeErrorSummary(errorSummary);
      console.error("[handler] ai_response_failed", {
        careCaseId,
        userId,
        error: errorSummary,
      });

      const fallback = runtimeFailureFallback(replyDisplayName);
      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId,
        userId,
        event: "message_failed",
        phone: senderPhone,
        details: {
          failureReason: `ai_response_failed: ${errorMessage}`,
          triggerMessage: messageBody.slice(0, 200),
          sourceMessageId: inboundMessageId,
          linqChatId: chatId,
          linqMessageId: args.sourceMessageId,
        },
        timestamp: Date.now(),
      });

      const outboundMessageId = await logOutbound(
        ctx,
        careCaseId,
        userId,
        senderPhone,
        replyDisplayName,
        fallback,
        now,
        careContactReply,
      );
      const linqMessageIds = await sendResponse(chatId, fallback, env(), startedAt);
      if (linqMessageIds.length > 0) {
        await ctx.runMutation(internal.mutations.updateMessageLinqId, {
          messageId: outboundMessageId,
          linqMessageId: linqMessageIds[0],
        });
      }
      return { success: false, response: fallback, error: errorMessage };
    }

    let smsResponse = stripAssistantSpeakerPrefix(stripMarkdown(parsed.smsResponse));
    const coordinationBoundaryBlocked = careContactReply
      ? false
      : shouldFireCoordinationBoundaryOverride(messageBody, recentMessages);
    if (coordinationBoundaryBlocked) {
      smsResponse = COORDINATION_BOUNDARY_RESPONSE;
      parsed.userProfileUpdate = null;
      parsed.careCaseProfileUpdate = null;
      parsed.userMemoryUpdates = [];
      parsed.careCaseMemoryUpdates = [];
      parsed.medicationUpdates = [];
      parsed.scheduleUpdates = [];
      parsed.reactions = [];
      parsed.effect = null;
    }

    // In the test environment, mark the first-contact introduction so it's
    // unmistakable which environment is replying. Enforced mechanically rather
    // than relying on the model to remember.
    if (isTestEnv && isNewUser && !smsResponse.startsWith(TEST_ENV_MARKER)) {
      smsResponse = `${TEST_ENV_MARKER}\n\n${smsResponse}`;
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
        // Any timezone the model resolves (e.g. from the user's stated city)
        // counts as confirmed, so we stop asking on future scheduling.
        timezoneConfirmed: parsed.careCaseProfileUpdate.timezone
          ? true
          : undefined,
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

    const scheduledItemReminders: Array<{
      scheduleItemId: Id<"scheduleItems">;
      title: string;
      startMs: number;
    }> = [];
    if (parsed.scheduleUpdates?.length) {
      for (const schedule of parsed.scheduleUpdates) {
        try {
          const result = await ctx.runMutation(
            internal.mutations.upsertScheduleItem,
            {
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
            },
          );
          // Queue a pre-event reminder for timed items. (Items created via this
          // path are one-off; recurring items go through the daily digest.)
          if (result) {
            const startMs = zonedDateTimeToUtcMs(
              result.date,
              result.time,
              timezone,
            );
            if (startMs !== null) {
              scheduledItemReminders.push({
                scheduleItemId: result.scheduleItemId,
                title: schedule.title,
                startMs,
              });
            }
          }
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

    // The fast model often tacks a spurious recurrence onto a simple move/retime,
    // which corrupts a one-off event into a repeating series. Only honor
    // recurrence when the user actually asked for repetition — checked across the
    // last few inbound messages so the "...make it weekly" → "yes" flow still works.
    const recentInboundText = recentMessages
      .filter((m: { direction: string }) => m.direction === "inbound")
      .slice(0, 4)
      .map((m: { body: string }) => m.body)
      .join(" ");
    const userWantsRecurrence =
      /\b(every|each|recurring|recur|repeat|weekly|daily|monthly|bi-?weekly|fortnight|yearly|annual|biweekly)\b/i.test(
        `${messageBody} ${recentInboundText}`,
      );

    let calendarWriteSucceeded = false;
    if (parsed.calendarUpdates?.length) {
      console.log("[calendar] updates payload:", JSON.stringify(parsed.calendarUpdates));
      const accessToken = await getValidGoogleToken(ctx, userId, timezone);
      if (accessToken) {
        for (const update of parsed.calendarUpdates) {
          try {
            if (update.action === "create" && update.title && update.date) {
              const created = await createCalendarEvent(accessToken, {
                title: update.title,
                date: update.date,
                startTime: update.startTime,
                endTime: update.endTime,
                description: update.description,
                location: update.location,
                timezone,
                recurrence: userWantsRecurrence
                  ? buildRecurrenceRule(update.recurrence)
                  : undefined,
              });
              calendarWriteSucceeded = true;
              await ctx.runMutation(internal.mutations.logAudit, {
                careCaseId,
                userId,
                event: "calendar_event_created",
                phone: senderPhone,
                details: { calendarEventId: created.id },
                timestamp: Date.now(),
              });
              // Schedule a "heads up" reminder ahead of the event start.
              const startIso = created.start?.dateTime;
              if (startIso) {
                const startMs = Date.parse(startIso);
                if (!Number.isNaN(startMs)) {
                  const fireAt = computeReminderFireAt(startMs, Date.now(), isTestEnv);
                  if (fireAt !== null) {
                    await ctx.scheduler.runAt(
                      fireAt,
                      internal.calendarReminders.sendCalendarReminder,
                      {
                        careCaseId,
                        userId,
                        chatId,
                        eventId: created.id,
                        expectedStartMs: startMs,
                        title: update.title,
                      },
                    );
                  }
                }
              }
            } else if (update.action === "update" && update.eventId) {
              // Target the whole recurring series, not a single occurrence, so
              // "change it to 7:30pm" updates every future instance too.
              const seriesId = toSeriesEventId(update.eventId);
              await updateCalendarEvent(accessToken, seriesId, {
                title: update.title,
                date: update.date,
                startTime: update.startTime,
                endTime: update.endTime,
                description: update.description,
                location: update.location,
                timezone,
                recurrence: userWantsRecurrence
                  ? buildRecurrenceRule(update.recurrence)
                  : undefined,
              });
              calendarWriteSucceeded = true;
              await ctx.runMutation(internal.mutations.logAudit, {
                careCaseId,
                userId,
                event: "calendar_event_updated",
                phone: senderPhone,
                details: { calendarEventId: seriesId },
                timestamp: Date.now(),
              });
            } else if (update.action === "delete" && update.eventId) {
              const seriesId = toSeriesEventId(update.eventId);
              await deleteCalendarEvent(accessToken, seriesId);
              calendarWriteSucceeded = true;
              await ctx.runMutation(internal.mutations.logAudit, {
                careCaseId,
                userId,
                event: "calendar_event_deleted",
                phone: senderPhone,
                details: { calendarEventId: seriesId },
                timestamp: Date.now(),
              });
            } else {
              console.log("[calendar] skipped update — missing required fields:", JSON.stringify(update));
            }
          } catch (err) {
            const failureReason = err instanceof Error ? err.message : String(err);
            console.error("[calendar] write failed:", update.action, update.title, failureReason);
            await ctx.runMutation(internal.mutations.logAudit, {
              careCaseId,
              userId,
              event: "message_failed",
              phone: senderPhone,
              details: {
                failureReason: `Calendar ${update.action} failed for "${update.title ?? update.eventId ?? "event"}": ${failureReason}`,
              },
              timestamp: Date.now(),
            });
          }
        }
      } else {
        console.log("[calendar] calendar_updates requested but no valid Google token");
      }
    }

    // Schedule pre-event reminders for plain schedule items. Skipped when a
    // Google Calendar event was written this turn, since that path schedules its
    // own reminder and we don't want to double-notify.
    if (!calendarWriteSucceeded && scheduledItemReminders.length > 0) {
      for (const reminder of scheduledItemReminders) {
        const fireAt = computeReminderFireAt(
          reminder.startMs,
          Date.now(),
          isTestEnv,
        );
        if (fireAt !== null) {
          await ctx.scheduler.runAt(
            fireAt,
            internal.reminders.sendScheduleItemReminder,
            {
              scheduleItemId: reminder.scheduleItemId,
              careCaseId,
              userId,
              chatId,
              expectedStartMs: reminder.startMs,
              title: reminder.title,
            },
          );
        }
      }
    }

    // Mechanical honesty guard: never let the reply claim a calendar change that
    // did not actually land on Google Calendar (e.g. calendar not connected, API
    // disabled, or the write threw). The fast model ignores prompt instructions
    // here, so enforce it in code. Fire when the model TRIED to write but nothing
    // succeeded (catches "moved it to tomorrow" with no "calendar" wording), or
    // when the reply makes a calendar-write claim with no successful write.
    const calendarWriteAttempted = Boolean(parsed.calendarUpdates?.length);
    if (
      !calendarWriteSucceeded &&
      (calendarWriteAttempted || CALENDAR_WRITE_CLAIM_PATTERN.test(smsResponse))
    ) {
      smsResponse = calendarContext
        ? "I hit a snag updating your Google Calendar just now, so that change didn't go through. Want me to try again?"
        : "I'm not connected to your Google Calendar yet, so I couldn't do that. Text \"connect my calendar\" to link it — or I can keep track of it here in the meantime.";
    }

    const hadEmptySmsResponse = !smsResponse.trim();
    smsResponse = ensureFinalSmsResponse(smsResponse, {
      replyDisplayName,
      calendarWriteSucceeded,
    });
    if (hadEmptySmsResponse) {
      await ctx.runMutation(internal.mutations.logAudit, {
        careCaseId,
        userId,
        event: "message_failed",
        phone: senderPhone,
        details: {
          failureReason: "empty_sms_response",
          triggerMessage: messageBody.slice(0, 200),
          sourceMessageId: inboundMessageId,
          linqChatId: chatId,
          linqMessageId: args.sourceMessageId,
        },
        timestamp: Date.now(),
      });
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
      blocked: shouldFireCoordinationBoundaryOverride(messageBody, recentMessages),
    };
  },
});

/**
 * True for web-test-UI conversations, whose synthetic chat ids are prefixed
 * `test:` (see convex/testChat.ts). These must never touch the Linq API even
 * when LINQ_API_TOKEN is set on the deployment.
 */
export function isTestChat(chatId: string): boolean {
  return chatId.startsWith("test:");
}

/** True if `tz` is a valid IANA timezone the runtime can resolve. */
export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

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
  // Test chats (web UI) never go out over Linq — the reply is returned to the
  // caller and read reactively from the messages table instead.
  if (!envVars.linqApiToken || !chatId || isTestChat(chatId)) {
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

async function logInbound(
  ctx: ActionCtx,
  careCaseId: Id<"careCases">,
  userId: Id<"users">,
  phone: string,
  displayName: string,
  body: string,
  timestamp: number,
  linqMessageId?: string,
): Promise<void> {
  await ctx.runMutation(internal.mutations.logMessage, {
    careCaseId,
    userId,
    senderPhone: phone,
    actorType: "user",
    direction: "inbound",
    displayName,
    body,
    timestamp,
    linqMessageId,
  });
}

export async function getValidGoogleToken(
  ctx: ActionCtx,
  userId: Id<"users">,
  _timezone: string,
): Promise<string | null> {
  const account = await ctx.runMutation(internal.mutations.getConnectedAccount, {
    userId,
    provider: "google",
  });
  if (!account) return null;

  const BUFFER_MS = 5 * 60 * 1000;
  if (account.tokenExpiresAt > Date.now() + BUFFER_MS) {
    return account.accessToken;
  }

  if (!account.refreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  try {
    const tokens = await refreshAccessToken(account.refreshToken, clientId, clientSecret);
    const newExpiresAt = Date.now() + tokens.expires_in * 1000;
    await ctx.runMutation(internal.mutations.updateConnectedAccountTokens, {
      userId,
      provider: "google",
      accessToken: tokens.access_token,
      tokenExpiresAt: newExpiresAt,
    });
    return tokens.access_token;
  } catch {
    return null;
  }
}

async function loadCalendarContext(
  ctx: ActionCtx,
  userId: Id<"users">,
  timezone: string,
  now: Date,
): Promise<string | null> {
  const accessToken = await getValidGoogleToken(ctx, userId, timezone);
  if (!accessToken) return null;

  try {
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(todayStart);
    tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 2);

    const events = await fetchEventsForRange(
      accessToken,
      todayStart.toISOString(),
      tomorrowEnd.toISOString(),
      timezone,
    );

    const todayIso = todayStart.toISOString().slice(0, 10);
    const tomorrowIso = new Date(todayStart.getTime() + 86400000).toISOString().slice(0, 10);

    const todayEvents = events.filter((e) => {
      const d = e.start.dateTime ?? e.start.date ?? "";
      return d.startsWith(todayIso);
    });
    const tomorrowEvents = events.filter((e) => {
      const d = e.start.dateTime ?? e.start.date ?? "";
      return d.startsWith(tomorrowIso);
    });

    const todayLabel = `Today (${todayIso})`;
    const tomorrowLabel = `Tomorrow (${tomorrowIso})`;

    return [
      formatEventsForPrompt(todayEvents, todayLabel, timezone),
      formatEventsForPrompt(tomorrowEvents, tomorrowLabel, timezone),
    ].join("\n\n");
  } catch (err) {
    console.error("[calendar] loadContext fetch failed:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
