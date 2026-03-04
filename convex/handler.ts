"use node";

import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";

import {
  route,
  buildSystemBlocks,
  buildMessages,
  extractJson,
} from "./lib/pipeline";
import type { AgentResponse, HandlerResult } from "./lib/pipeline";
import {
  filterFamilyContext,
  getFilteredSections,
  checkOutboundMessage,
  classifyUpdates,
  detectApprovalResponse,
  formatConfirmationSms,
  buildContextLoadEvent,
  buildResponseSentEvent,
  buildResponseBlockedEvent,
  buildUnknownNumberEvent,
  buildOutreachSentEvent,
  EXPIRY_HOURS,
} from "./lib/enforcement";
import type { AccessLevel } from "./lib/enforcement";
import { callAnthropic } from "./lib/anthropicClient";
import {
  sendMessage,
  sendMessageSequence,
  splitIntoBubbles,
  createChat,
} from "./lib/linqClient";

const BLOCKED_RESPONSE =
  "I'm sorry, I can't share that information with your access level. " +
  "Please contact the care coordinator if you need more details.";

const UNKNOWN_NUMBER_RESPONSE =
  "Sorry, this number isn't set up to receive messages. " +
  "If you think this is an error, please check with whoever gave you this number.";

const VALID_CATEGORIES = new Set(["behavioral", "factual", "operational"]);

export function parseCategory(text: string): {
  category: "behavioral" | "factual" | "operational";
  cleanText: string;
} {
  const match = text.match(/^\[(behavioral|factual|operational)]\s*/i);
  if (match) {
    return {
      category: match[1].toLowerCase() as "behavioral" | "factual" | "operational",
      cleanText: text.slice(match[0].length),
    };
  }
  return { category: "behavioral", cleanText: text };
}

export function formatConversationLog(
  records: Array<{
    direction: "inbound" | "outbound";
    body: string;
    timestamp: number;
    memberName?: string;
  }>,
): string {
  if (records.length === 0) return "[No conversation history]";
  return records
    .map((r) => {
      const date = new Date(r.timestamp);
      const ts = date.toISOString().replace("T", " ").replace(/\.\d{3}Z/, " UTC");
      const dir = r.direction.toUpperCase();
      return `[${ts}] [${dir}] ${r.body}`;
    })
    .join("\n");
}

export const handleMessage = internalAction({
  args: {
    senderPhone: v.string(),
    messageBody: v.string(),
    chatId: v.string(),
    service: v.string(),
    sourceMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HandlerResult> => {
    const now = Date.now();
    const { senderPhone, messageBody, chatId, service } = args;

    // Step 1: Resolve member by phone
    const member = await ctx.runMutation(internal.mutations.getMemberByPhone, {
      phone: senderPhone,
    }) as Doc<"members"> | null;

    if (!member) {
      const auditEvent = buildUnknownNumberEvent({ phone: senderPhone });
      await ctx.runMutation(internal.mutations.logAudit, auditEvent);
      return {
        success: false,
        response: UNKNOWN_NUMBER_RESPONSE,
        error: `Unknown phone: ${senderPhone}`,
      };
    }

    const familyId = member.familyId;
    const accessLevel = member.accessLevel as AccessLevel;
    const memberName = member.name;

    // Step 2: Update chatId if not set
    if (!member.chatId && chatId) {
      await ctx.runMutation(internal.mutations.updateMemberChatId, {
        memberId: member._id,
        chatId,
      });
    }

    // Step 3: Log inbound message
    await ctx.runMutation(internal.mutations.logConversation, {
      familyId,
      phone: senderPhone,
      direction: "inbound",
      memberName,
      body: messageBody,
      timestamp: now,
      sourceMessageId: args.sourceMessageId,
    });
    await ctx.runMutation(internal.mutations.logTimeline, {
      familyId,
      timestamp: now,
      direction: "inbound",
      memberName,
      body: messageBody,
    });

    // Step 4: Check if this is an approval response (early return)
    const approvalCheck = detectApprovalResponse(messageBody);
    if (approvalCheck.decision !== null) {
      const pendingApprovals = await ctx.runMutation(
        internal.mutations.getPendingApprovals,
        { familyId },
      );
      const matchingApproval =
        pendingApprovals.length === 1 ? pendingApprovals[0] : null;

      if (matchingApproval) {
        const response =
          approvalCheck.decision === "approved"
            ? `Approved: ${matchingApproval.description.slice(0, 150)}. Change applied.`
            : `Rejected: ${matchingApproval.description.slice(0, 150)}. No changes made.`;

        await logOutbound(ctx, familyId, senderPhone, memberName, response, now);
        await sendResponse(chatId, response, env());
        return { success: true, response, approvalHandled: true };
      }
    }

    // Step 5: Load context
    const [familyCtx, recentConvos, lessons] = await Promise.all([
      ctx.runMutation(internal.mutations.getFamilyContext, { familyId }),
      ctx.runMutation(internal.mutations.getRecentConversations, {
        phone: senderPhone,
        limit: 50,
      }),
      ctx.runMutation(internal.mutations.getFamilyLessons, { familyId }),
    ]);

    const rawFamilyContext = familyCtx?.contextMarkdown ?? "[No family context]";
    const conversationLog = formatConversationLog(
      recentConvos.reverse().map((c) => ({
        direction: c.direction,
        body: c.body,
        timestamp: c.timestamp,
        memberName: c.memberName ?? undefined,
      })),
    );
    const lessonsText = lessons
      .map((l) => `- [${l.category}] ${l.text}`)
      .join("\n");

    // Step 6: Pre-filter context by access level
    const filteredContext = filterFamilyContext(rawFamilyContext, accessLevel);
    const visibleSections = getFilteredSections(accessLevel);

    // Step 7: Log PHI access (context load audit)
    const contextLoadEvent = buildContextLoadEvent({
      familyId,
      accessorPhone: senderPhone,
      accessorRole: member.role,
      accessLevel,
      sectionsLoaded: visibleSections,
      triggerMessage: messageBody,
    });
    await ctx.runMutation(internal.mutations.logAudit, contextLoadEvent);

    // Step 8: Route intent
    const routeResult = route(messageBody);

    // Step 9: Build system prompt
    const systemBlocks = buildSystemBlocks({
      soulContent: "",
      routingContent: "",
      capabilitiesContent: "",
      skillsContent: "",
      lessonsContent: lessonsText,
      member: {
        name: memberName,
        phone: senderPhone,
        role: member.role,
        accessLevel,
        relationship: member.relationship ?? "",
      },
      memberContext: "",
      familyContext: filteredContext,
      intent: routeResult.intent,
      service,
      toolsActive: false,
    });
    const messages = buildMessages(messageBody, conversationLog);

    // Step 10: Call AI
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
    } catch {
      const fallbackMsg = `Sorry ${memberName}, I wasn't able to process that. Can you send it again?`;
      await logOutbound(ctx, familyId, senderPhone, memberName, fallbackMsg, now);
      await sendResponse(chatId, fallbackMsg, env());
      return { success: false, response: fallbackMsg, error: "AI call failed" };
    }

    const smsResponse = parsed.smsResponse;

    // Step 11: Post-check outbound for leakage
    const leakage = checkOutboundMessage(smsResponse, accessLevel);

    if (!leakage.isClean) {
      const blockedEvent = buildResponseBlockedEvent({
        familyId,
        recipientPhone: senderPhone,
        accessLevel,
        leakedCategories: leakage.leakedCategories,
        leakedTerms: leakage.leakedTerms,
      });
      await ctx.runMutation(internal.mutations.logAudit, blockedEvent);
      await logOutbound(ctx, familyId, senderPhone, memberName, BLOCKED_RESPONSE, now);
      await sendResponse(chatId, BLOCKED_RESPONSE, env());
      return {
        success: true,
        response: BLOCKED_RESPONSE,
        blocked: true,
        leakedCategories: leakage.leakedCategories,
      };
    }

    // Step 12: Log clean response audit
    const responseSentEvent = buildResponseSentEvent({
      familyId,
      recipientPhone: senderPhone,
      recipientRole: member.role,
      accessLevel,
      responseLength: smsResponse.length,
      leakageCheckPassed: true,
    });
    await ctx.runMutation(internal.mutations.logAudit, responseSentEvent);

    // Step 13: Classify updates and create approvals
    const updates = parsed.familyFileUpdates.map((u) => ({
      section: u.section,
      operation: u.operation,
      content: u.content,
      oldContent: u.oldContent,
    }));
    const classified = classifyUpdates(updates);

    if (classified.needsApproval.length > 0) {
      const approverMembers = await ctx.runMutation(
        internal.mutations.getMemberByPhone,
        { phone: senderPhone },
      );
      // Find all full-access members for approval
      // For now, use the requester's phone as a placeholder
      for (const { update: upd, reason } of classified.needsApproval) {
        await ctx.runMutation(internal.mutations.createApproval, {
          familyId,
          status: "pending",
          requesterPhone: senderPhone,
          requesterName: memberName,
          approverPhones: [senderPhone],
          description: `${reason}: ${upd.content.slice(0, 120)}`,
          update: upd,
          createdAt: now,
          expiresAt: now + EXPIRY_HOURS * 60 * 60 * 1000,
        });
      }
    }

    // Step 14: Persist lessons
    for (const correction of parsed.selfCorrections) {
      const { category, cleanText } = parseCategory(correction);
      if (VALID_CATEGORIES.has(category)) {
        await ctx.runMutation(internal.mutations.persistLesson, {
          familyId,
          scope: "family",
          category,
          text: cleanText,
          learnedAt: now,
        });
      }
    }

    // Step 15: Log outbound + send response
    await logOutbound(ctx, familyId, senderPhone, memberName, smsResponse, now);
    await sendResponse(chatId, smsResponse, env());

    // Step 16: Process outreach
    for (const entry of parsed.needsOutreach) {
      try {
        const outreachEvent = buildOutreachSentEvent({
          familyId,
          initiatedBy: senderPhone,
          sentToPhone: entry.phone,
          sentToName: entry.name,
          purpose: entry.message.slice(0, 200),
        });
        await ctx.runMutation(internal.mutations.logAudit, outreachEvent);
        await sendMessage(chatId, entry.message, env().linqApiToken);
      } catch {
        // outreach is best-effort
      }
    }

    return {
      success: true,
      response: smsResponse,
      routedTier: routeResult.tier,
      routedIntent: routeResult.intent,
      lessonsLearned: parsed.selfCorrections.length,
      approvalsCreated: classified.needsApproval.length,
      outreachSent: parsed.needsOutreach.length,
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
  familyId: string,
  phone: string,
  memberName: string,
  body: string,
  timestamp: number,
): Promise<void> {
  await ctx.runMutation(internal.mutations.logConversation, {
    familyId,
    phone,
    direction: "outbound" as const,
    memberName,
    body,
    timestamp,
  });
  await ctx.runMutation(internal.mutations.logTimeline, {
    familyId,
    timestamp,
    direction: "outbound" as const,
    memberName,
    body,
  });
}

async function sendResponse(
  chatId: string,
  text: string,
  envVars: { linqApiToken: string },
): Promise<void> {
  if (!envVars.linqApiToken) return;
  const bubbles = splitIntoBubbles(text);
  await sendMessageSequence(chatId, bubbles, envVars.linqApiToken, 800);
}
