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
  isAccessLevel,
} from "./lib/enforcement";
import type { AccessLevel } from "./lib/enforcement";
import { normalizePhone } from "./mutations";
import { callAnthropic } from "./lib/anthropicClient";
import {
  sendMessage,
  sendMessageSequence,
  splitIntoBubbles,
  createChat,
  markAsRead,
  startTyping,
  sendReaction,
  shareContactCard,
} from "./lib/linqClient";
import type { MessageEffect } from "./lib/linqClient";
import {
  SOUL_CONTENT,
  ROUTING_CONTENT,
  CAPABILITIES_CONTENT,
  SKILLS_CONTENT,
} from "./lib/promptContent";

const MIN_RESPONSE_MS = 3_000;
const EXTRA_RESPONSE_MS_PER_BUBBLE = 1_000;
const MAX_RESPONSE_MS = 6_000;
const MAX_REPLY_QUOTE_LENGTH = 200;

const BLOCKED_RESPONSE =
  "I'm sorry, I can't share that information with your access level. " +
  "Please contact the care coordinator if you need more details.";

const UNKNOWN_NUMBER_RESPONSE =
  "Hi! Welcome to CareSupport — I help families coordinate care.\n\n" +
  "To get started: are you caring for someone, or are you being cared for?";

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
    senderPhone?: string;
  }>,
): string {
  if (records.length === 0) return "[No conversation history]";
  return records
    .map((r) => {
      const date = new Date(r.timestamp);
      const ts = date.toISOString().replace("T", " ").replace(/\.\d{3}Z/, " UTC");
      const attribution = r.direction === "inbound"
        ? `INBOUND from ${r.memberName ?? r.senderPhone ?? "unknown"}`
        : `OUTBOUND to ${r.memberName ?? r.senderPhone ?? "unknown"}`;
      return `[${ts}] [${attribution}] ${r.body}`;
    })
    .join("\n");
}

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
    const handlerStart = Date.now();
    const now = handlerStart;
    const { senderPhone, messageBody, chatId, service, replyToMessageId } = args;
    console.log(`[CS] Handler start — sender=${senderPhone} len=${messageBody.length}`);

    // Step 1: Resolve member by phone
    let member = await ctx.runMutation(internal.mutations.getMemberByPhone, {
      phone: senderPhone,
    }) as Doc<"members"> | null;

    if (!member) {
      const result = await ctx.runMutation(
        internal.mutations.createOnboardingFamily,
        { phone: senderPhone, chatId },
      );

      member = await ctx.runMutation(
        internal.mutations.getMemberById,
        { id: result.memberId },
      ) as Doc<"members">;

      await ctx.runMutation(internal.mutations.logAudit, {
        familyId: result.familyId,
        event: "family_created" as const,
        phone: senderPhone,
        details: { initiatedBy: senderPhone, purpose: "self-service onboarding" },
        timestamp: now,
      });
    }

    const familyId = member.familyId;

    // Step 1c: Check for pending outreach threads where this sender is the target
    const pendingThreads = await ctx.runMutation(
      internal.mutations.getPendingOutreachForSender,
      { targetPhone: senderPhone },
    ) as Doc<"outreachThreads">[];

    const rawAccessLevel = member.accessLevel;
    const hasValidAccessLevel = isAccessLevel(rawAccessLevel);
    const accessLevel: AccessLevel = hasValidAccessLevel ? rawAccessLevel : "limited";
    const memberName = member.name;

    if (!hasValidAccessLevel) {
      await ctx.runMutation(internal.mutations.logAudit, {
        familyId,
        event: "response_blocked",
        phone: senderPhone,
        accessLevel: String(rawAccessLevel),
        role: member.role,
        details: {
          severity: "HIGH",
          recipientPhone: senderPhone,
          failureReason: `Invalid member access level: ${String(rawAccessLevel)}`,
        },
        timestamp: now,
      });
    }

    // Step 2: Update chatId if not set
    if (!member.chatId && chatId) {
      await ctx.runMutation(internal.mutations.updateMemberChatId, {
        memberId: member._id,
        chatId,
      });
    }

    // Step 2b: Read receipt + typing indicator (human feel)
    const pacingStart = Date.now();
    const envVarsEarly = env();
    if (chatId && envVarsEarly.linqApiToken) {
      try {
        await markAsRead(chatId, envVarsEarly.linqApiToken);
        await startTyping(chatId, envVarsEarly.linqApiToken);
      } catch {
        // best-effort — don't block the pipeline
      }
    }

    // Step 3: Log inbound message
    await ctx.runMutation(internal.mutations.logMessage, {
      familyId,
      senderPhone,
      direction: "inbound",
      memberName,
      body: messageBody,
      timestamp: now,
      linqMessageId: args.sourceMessageId,
    });

    // Step 3b: Check for upgrade intent (early return — before AI call)
    const trimmed = messageBody.trim();
    const upgradeIntent =
      /^(upgrade|subscribe|go premium|family plan)$/i.test(trimmed) ||
      /^(i want to |i'd like to |let's |ready to )?(upgrade|subscribe|go premium|get family plan)/i.test(trimmed);
    if (upgradeIntent) {
      const family = await ctx.runQuery(internal.queries.getFamily, { familyId });
      const tier = family?.planTier ?? "free";
      if (tier === "free") {
        const priceId = process.env.FAMILY_MONTHLY_PRICE_ID;
        if (!priceId) {
          const errMsg = "Upgrade isn't available just yet — we're still setting things up. Try again soon!";
          await logOutbound(ctx, familyId, senderPhone, memberName, errMsg, now);
          await sendResponse(chatId, errMsg, env());
          return { success: false, response: errMsg, error: "FAMILY_MONTHLY_PRICE_ID not configured" };
        }
        const session = await ctx.runAction(internal.stripe.createFamilyCheckout, {
          familyId,
          priceId,
        });
        if (session.url) {
          const upgradeMsg =
            `Here's your upgrade link for CareSupport Family ($14/mo):\n\n${session.url}\n\n` +
            `Once you're set, you can add anyone to your care network.`;
          await logOutbound(ctx, familyId, senderPhone, memberName, upgradeMsg, now);
          await sendResponse(chatId, upgradeMsg, env());
          return { success: true, response: upgradeMsg };
        }
      } else {
        const alreadyMsg = "You're already on CareSupport Family — go ahead and add anyone you need!";
        await logOutbound(ctx, familyId, senderPhone, memberName, alreadyMsg, now);
        await sendResponse(chatId, alreadyMsg, env());
        return { success: true, response: alreadyMsg };
      }
    }

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

    // Step 5: Load context (family-wide conversation awareness)
    const [familyCtx, recentConvos, lessons, structuredCtx] = await Promise.all([
      ctx.runMutation(internal.mutations.getFamilyContext, { familyId }),
      ctx.runMutation(internal.mutations.getFamilyRecentMessages, {
        familyId,
        limit: 80,
      }),
      ctx.runMutation(internal.mutations.getFamilyLessons, { familyId }),
      ctx.runMutation(internal.mutations.getFamilyStructuredContext, { familyId }),
    ]);

    const rawNotes = familyCtx?.context ?? "";
    const rawFamilyContext = structuredCtx
      ? `${structuredCtx}\n\n## Notes\n${rawNotes}`
      : rawNotes || "[No family context]";
    const conversationLog = formatConversationLog(
      recentConvos.reverse().map((c) => ({
        direction: c.direction,
        body: c.body,
        timestamp: c.timestamp,
        memberName: c.memberName ?? undefined,
        senderPhone: c.senderPhone ?? undefined,
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

    // Step 7b: Load quoted reply context when available
    let messageForClaude = messageBody;
    if (replyToMessageId) {
      const repliedToMessage = await ctx.runMutation(
        internal.mutations.getMessageByLinqId,
        { linqMessageId: replyToMessageId },
      );
      const quotedBody = repliedToMessage?.body ?? "";
      if (quotedBody.trim()) {
        messageForClaude = prependReplyContext(messageBody, quotedBody);
      }
    }

    // Step 8: Route intent
    const routeResult = route(messageForClaude);

    // Step 9: Build system prompt
    const systemBlocks = buildSystemBlocks({
      soulContent: SOUL_CONTENT,
      routingContent: ROUTING_CONTENT,
      capabilitiesContent: CAPABILITIES_CONTENT,
      skillsContent: SKILLS_CONTENT,
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
    const messages = buildMessages(messageForClaude, conversationLog);

    // Step 10: Call AI
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }

    let parsed: AgentResponse;
    try {
      const aiStart = Date.now();
      const aiResult = await callAnthropic({
        systemBlocks,
        messages,
        model: routeResult.model,
        apiKey,
      });
      console.log(`[CS] AI call — model=${routeResult.model} ms=${Date.now() - aiStart}`);

      parsed = extractJson(aiResult.text);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("[CS] AI call failed:", errMsg);
      if (err instanceof Error && err.stack) {
        console.error("[handleMessage] Stack:", err.stack.slice(0, 500));
      }
      const fallbackMsg = `Sorry ${memberName}, I wasn't able to process that. Can you send it again?`;
      await logOutbound(ctx, familyId, senderPhone, memberName, fallbackMsg, now);
      await sendResponse(chatId, fallbackMsg, env());
      return { success: false, response: fallbackMsg, error: errMsg };
    }

    const smsResponse = stripMarkdown(parsed.smsResponse);

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

    if (classified.autoApply.length > 0) {
      await ctx.runMutation(internal.mutations.applyContextUpdates, {
        familyId,
        updates: classified.autoApply,
      });
      await ctx.runMutation(internal.mutations.logAudit, {
        familyId,
        event: "context_updated",
        phone: senderPhone,
        accessLevel,
        role: member.role,
        details: {
          triggerMessage: messageBody.slice(0, 120),
          sectionsLoaded: classified.autoApply.map((u: { section: string }) => u.section),
        },
        timestamp: now,
      });
    }

    if (classified.needsApproval.length > 0) {
      const approverPhones = await ctx.runMutation(
        internal.mutations.getCoordinators,
        { familyId },
      );

      for (const { update: upd, reason } of classified.needsApproval) {
        await ctx.runMutation(internal.mutations.createApproval, {
          familyId,
          status: "pending",
          requesterPhone: senderPhone,
          requesterName: memberName,
          approverPhones,
          description: `${reason}: ${upd.content.slice(0, 120)}`,
          update: upd,
          createdAt: now,
          expiresAt: now + EXPIRY_HOURS * 60 * 60 * 1000,
        });
      }
    }

    // Step 13b: Process structured table updates (if present)
    if (parsed.medicationUpdates?.length) {
      for (const med of parsed.medicationUpdates) {
        await ctx.runMutation(internal.mutations.upsertMedication, {
          familyId,
          action: med.action,
          name: med.name,
          dose: med.dose,
          schedule: med.schedule,
          prescriber: med.prescriber,
        });
      }
    }

    if (parsed.scheduleUpdates?.length) {
      for (const sched of parsed.scheduleUpdates) {
        const raw = sched as unknown as Record<string, string>;
        await ctx.runMutation(internal.mutations.upsertScheduleItem, {
          familyId,
          action: sched.action,
          type: sched.type,
          title: sched.title,
          date: sched.date,
          time: sched.time,
          assignedTo: sched.assignedTo ?? raw["assigned_to"],
        });
      }
    }

    if (parsed.careTeamUpdates?.length) {
      for (const ct of parsed.careTeamUpdates) {
        await ctx.runMutation(internal.mutations.upsertCareTeamMember, {
          familyId,
          action: ct.action,
          name: ct.name,
          role: ct.role,
          phone: ct.phone,
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

    // Step 14b: Process routing updates (member registration)
    for (const routing of parsed.routingUpdates) {
      if (routing.action === "add" && routing.phone && routing.name) {
        try {
          await ctx.runMutation(internal.mutations.createMember, {
            familyId,
            phone: routing.phone,
            name: routing.name,
            role: routing.role || "family_caregiver",
            relationship: routing.relationship || undefined,
            accessLevel: routing.accessLevel || "schedule+meds",
          });
          await ctx.runMutation(internal.mutations.logAudit, {
            familyId,
            event: "member_added",
            phone: routing.phone,
            details: {
              recipientPhone: routing.phone,
              initiatedBy: senderPhone,
            },
            timestamp: Date.now(),
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.message === "PLAN_LIMIT_REACHED") {
            const upgradeMsg =
              `I'd love to add ${routing.name}, but the free plan is just you and your care recipient (1:1:1). ` +
              `Upgrade to CareSupport Family ($14/mo) for unlimited members — ` +
              `just reply "upgrade" and I'll send you a link.`;
            await logOutbound(ctx, familyId, senderPhone, memberName, upgradeMsg, Date.now());
            await sendResponse(chatId, upgradeMsg, env());
          }
        }
      }

      if (routing.action === "update" && routing.phone && routing.name) {
        try {
          const targetMember = await ctx.runMutation(
            internal.mutations.getMemberByPhone,
            { phone: routing.phone },
          );
          if (targetMember && targetMember.familyId === familyId) {
            await ctx.runMutation(internal.mutations.updateMemberName, {
              memberId: targetMember._id,
              name: routing.name,
            });
          }
        } catch {
          // member update is best-effort — don't block the response
        }
      }
    }

    // Step 15: Pace response + log outbound + send
    const effectForSend: MessageEffect | null =
      parsed.effect
        ? { type: parsed.effect.type, name: parsed.effect.name }
        : null;
    const outboundMessageId = await logOutbound(ctx, familyId, senderPhone, memberName, smsResponse, now);
    const linqMessageIds = await sendResponse(chatId, smsResponse, env(), pacingStart, effectForSend);
    if (linqMessageIds.length > 0) {
      await ctx.runMutation(internal.mutations.updateMessageLinqId, {
        messageId: outboundMessageId,
        linqMessageId: linqMessageIds[0],
      });
    }

    // Step 15b: Send reactions
    const envVarsForReaction = env();
    for (const reaction of parsed.reactions) {
      if (reaction.targetMessage === "last_inbound" && args.sourceMessageId) {
        try {
          await sendReaction(
            args.sourceMessageId,
            "add",
            reaction.type,
            envVarsForReaction.linqApiToken,
          );
        } catch {
          // reactions are best-effort
        }
      }
    }

    // Step 15c: Notify coordinators about outreach responses
    if (pendingThreads.length > 0) {
      const envVarsForNotify = env();
      for (const thread of pendingThreads) {
        if (thread.initiatorChatId && envVarsForNotify.linqApiToken) {
          const summary = `${memberName} responded: "${messageBody.length > 200 ? messageBody.slice(0, 200) + "..." : messageBody}"`;
          try {
            const initiatorMember = await ctx.runMutation(
              internal.mutations.getMemberByPhone,
              { phone: thread.initiatorPhone },
            ) as Doc<"members"> | null;
            const initiatorName = initiatorMember?.name ?? "Coordinator";
            const notifyMsgId = await logOutbound(
              ctx,
              thread.familyId,
              thread.initiatorPhone,
              initiatorName,
              summary,
              Date.now(),
            );
            const notifyResult = await sendMessage(
              thread.initiatorChatId,
              summary,
              envVarsForNotify.linqApiToken,
            );
            if (notifyResult.messageId) {
              await ctx.runMutation(internal.mutations.updateMessageLinqId, {
                messageId: notifyMsgId,
                linqMessageId: notifyResult.messageId,
              });
            }
          } catch {
            // coordinator notification is best-effort
          }
        }
        await ctx.runMutation(internal.mutations.updateOutreachThread, {
          threadId: thread._id,
          status: "responded",
          respondedAt: Date.now(),
        });
      }
    }

    // Step 16: Process outreach
    const envVars = env();
    const outreachResults: Array<{ name: string; success: boolean; message?: string }> = [];
    for (const entry of parsed.needsOutreach) {
      try {
        // Resolve phone from memberId if provided (authoritative), fall back to phone field
        let resolvedPhone = entry.phone ? (normalizePhone(entry.phone) ?? entry.phone) : "";
        let resolvedName = entry.name;
        if (entry.memberId) {
          try {
            const targetById = await ctx.runMutation(
              internal.mutations.getMemberById,
              { id: entry.memberId as Id<"members"> },
            ) as Doc<"members"> | null;
            if (targetById?.phone && targetById.familyId === familyId) {
              resolvedPhone = targetById.phone;
              resolvedName = targetById.name;
              console.log(`[CS] Resolved outreach memberId=${entry.memberId} → ${resolvedName} (${resolvedPhone})`);
            } else {
              console.log(`[CS] memberId=${entry.memberId} not found or wrong family, falling back to phone`);
            }
          } catch {
            console.log(`[CS] Failed to resolve memberId=${entry.memberId}, falling back to phone`);
          }
        }
        const normalizedPhone = resolvedPhone;

        if (!normalizedPhone) {
          console.log(`[CS] Skipping outreach — no phone resolved for ${resolvedName}`);
          outreachResults.push({ name: resolvedName, success: false });
          continue;
        }

        if (normalizedPhone === senderPhone) {
          console.log(`[CS] Skipping outreach to sender's own phone: ${normalizedPhone}`);
          continue;
        }

        const outreachEvent = buildOutreachSentEvent({
          familyId,
          initiatedBy: senderPhone,
          sentToPhone: normalizedPhone,
          sentToName: resolvedName,
          purpose: entry.message.slice(0, 200),
        });
        await ctx.runMutation(internal.mutations.logAudit, outreachEvent);

        const targetMember = await ctx.runMutation(
          internal.mutations.getMemberByPhone,
          { phone: normalizedPhone },
        );

        if (!targetMember) {
          await ctx.runMutation(internal.mutations.logAudit, {
            familyId,
            event: "message_failed",
            phone: normalizedPhone,
            details: {
              recipientPhone: normalizedPhone,
              failureReason: "outreach target not found",
            },
            timestamp: Date.now(),
          });
          outreachResults.push({ name: resolvedName, success: false, message: entry.message });
          continue;
        }

        if (targetMember.familyId !== familyId) {
          await ctx.runMutation(internal.mutations.logAudit, {
            familyId,
            event: "message_failed",
            phone: normalizedPhone,
            details: {
              recipientPhone: normalizedPhone,
              failureReason: "recipient not in family",
            },
            timestamp: Date.now(),
          });
          outreachResults.push({ name: resolvedName, success: false, message: entry.message });
          continue;
        }

        let sendSuccess = false;
        let linqMessageId: string | undefined;
        if (targetMember.chatId) {
          const sendResult = await sendMessage(targetMember.chatId, entry.message, envVars.linqApiToken);
          sendSuccess = sendResult.success;
          linqMessageId = sendResult.messageId;
        } else {
          const result = await createChat(
            normalizedPhone,
            entry.message,
            envVars.linqPhoneNumber,
            envVars.linqApiToken,
          );
          sendSuccess = result.success;
          linqMessageId = result.messageId;
          if (result.success && result.chatId) {
            await ctx.runMutation(internal.mutations.updateMemberChatId, {
              memberId: targetMember._id,
              chatId: result.chatId,
            });
            try {
              await shareContactCard(result.chatId, envVars.linqApiToken);
            } catch {
              // contact card sharing is best-effort
            }
          }
        }

        if (sendSuccess) {
          const msgId = await logOutbound(ctx, familyId, normalizedPhone, resolvedName, entry.message, Date.now());
          if (linqMessageId) {
            await ctx.runMutation(internal.mutations.updateMessageLinqId, {
              messageId: msgId,
              linqMessageId,
            });
          }

          // Step 16b: Create outreach thread for feedback loop
          if (chatId) {
            await ctx.runMutation(internal.mutations.createOutreachThread, {
              familyId,
              initiatorPhone: senderPhone,
              initiatorChatId: chatId,
              targetPhone: normalizedPhone,
              targetName: resolvedName,
              outboundMessageId: msgId,
              purpose: entry.message.slice(0, 200),
            });
          }
        }

        outreachResults.push({ name: resolvedName, success: sendSuccess, message: entry.message });
      } catch {
        outreachResults.push({ name: entry.name, success: false });
      }
    }

    // Step 16b: Honest cc confirmation to coordinator
    if (outreachResults.length > 0 && chatId && envVars.linqApiToken) {
      const sent = outreachResults.filter((r) => r.success);
      const failed = outreachResults.filter((r) => !r.success);
      const lines: string[] = [];

      for (const r of sent) {
        const preview =
          r.message && r.message.length > 80
            ? r.message.slice(0, 80) + "..."
            : (r.message ?? "");
        lines.push(
          `Just texted ${r.name}: "${preview}"\nI'll let you know when they respond.`,
        );
      }

      for (const r of failed) {
        lines.push(`Couldn't reach ${r.name} — want me to try again?`);
      }

      if (lines.length > 0) {
        const confirmation = lines.join("\n\n");
        try {
          const ccMsgId = await logOutbound(
            ctx,
            familyId,
            senderPhone,
            memberName,
            confirmation,
            Date.now(),
          );
          const ccResult = await sendMessage(
            chatId,
            confirmation,
            envVars.linqApiToken,
          );
          if (ccResult.messageId) {
            await ctx.runMutation(internal.mutations.updateMessageLinqId, {
              messageId: ccMsgId,
              linqMessageId: ccResult.messageId,
            });
          }
        } catch {
          // cc confirmation is best-effort
        }
      }
    }

    console.log(`[CS] Handler done — ms=${Date.now() - handlerStart} intent=${routeResult.intent} outreach=${parsed.needsOutreach.length}`);
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
  familyId: Id<"families">,
  phone: string,
  memberName: string,
  body: string,
  timestamp: number,
): Promise<Id<"messages">> {
  return await ctx.runMutation(internal.mutations.logMessage, {
    familyId,
    senderPhone: phone,
    direction: "outbound" as const,
    memberName,
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
  if (!envVars.linqApiToken) {
    console.error("[sendResponse] No LINQ_API_TOKEN — skipping send");
    return [];
  }
  if (!chatId) {
    console.error("[sendResponse] No chatId — cannot send");
    return [];
  }
  const bubbles = splitIntoBubbles(text);
  const initialDelayMs = getInitialResponseDelayMs(bubbles.length);
  const elapsed = Date.now() - pacingStart;
  if (elapsed < initialDelayMs) {
    await new Promise((resolve) => setTimeout(resolve, initialDelayMs - elapsed));
  }
  console.log(
    `[sendResponse] Sending to chatId=${chatId}, text length=${text.length}, bubbles=${bubbles.length}`,
  );
  const allResults: { success: boolean; messageId?: string; error?: unknown }[] = [];
  if (effect && bubbles.length > 0) {
    const firstResult = await sendMessage(chatId, bubbles[0], envVars.linqApiToken, effect);
    allResults.push(firstResult);
    if (!firstResult.success) {
      console.error("[sendResponse] Send failed:", JSON.stringify(firstResult.error));
    }
    if (bubbles.length > 1) {
      const remaining = await sendMessageSequence(chatId, bubbles.slice(1), envVars.linqApiToken);
      for (const r of remaining) {
        allResults.push(r);
        if (!r.success) {
          console.error("[sendResponse] Send failed:", JSON.stringify(r.error));
        }
      }
    }
  } else {
    const results = await sendMessageSequence(chatId, bubbles, envVars.linqApiToken);
    for (const r of results) {
      allResults.push(r);
      if (!r.success) {
        console.error("[sendResponse] Send failed:", JSON.stringify(r.error));
      }
    }
  }
  return allResults
    .filter((r) => r.success && r.messageId)
    .map((r) => r.messageId as string);
}
