"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { createChat, sendMessage } from "./lib/linqClient";

export interface OutreachExecutionResult {
  sent: boolean;
  reason?: string;
  contactName?: string;
  chatId?: string;
  messageId?: string;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown_error";
  }
}

function contactBlockReason(contact: {
  active: boolean;
  phone?: string;
  canReceiveTexts: boolean;
  consentToContact?: boolean;
}): string | null {
  if (!contact.active) return "contact_inactive";
  if (!contact.phone) return "no_phone";
  if (!contact.canReceiveTexts) return "texting_disabled";
  if (contact.consentToContact === false) return "contact_consent_denied";
  return null;
}

export const executeApproved = internalAction({
  args: { outreachAttemptId: v.id("outreachAttempts") },
  handler: async (ctx, args): Promise<OutreachExecutionResult> => {
    const payload = await ctx.runQuery(
      internal.outreachAttempts.getApprovedForExecution,
      { outreachAttemptId: args.outreachAttemptId },
    );

    if (!payload) {
      return { sent: false, reason: "not_approved_or_not_found" };
    }

    const { attempt, contact } = payload;
    const blockReason = contactBlockReason(contact);
    if (blockReason) {
      await ctx.runMutation(internal.outreachAttempts.markFailed, {
        outreachAttemptId: attempt._id,
        failureReason: blockReason,
      });
      return {
        sent: false,
        reason: blockReason,
        contactName: contact.name,
      };
    }
    const contactPhone = contact.phone;
    if (!contactPhone) {
      const reason = "no_phone";
      await ctx.runMutation(internal.outreachAttempts.markFailed, {
        outreachAttemptId: attempt._id,
        failureReason: reason,
      });
      return { sent: false, reason, contactName: contact.name };
    }

    const linqApiToken = process.env.LINQ_API_TOKEN ?? "";
    const linqPhoneNumber = process.env.LINQ_PHONE_NUMBER ?? "";
    if (!linqApiToken || !linqPhoneNumber) {
      const reason = "linq_env_missing";
      await ctx.runMutation(internal.outreachAttempts.markFailed, {
        outreachAttemptId: attempt._id,
        failureReason: reason,
      });
      return { sent: false, reason, contactName: contact.name };
    }

    const existingChatId = attempt.linqChatId ?? contact.linqChatId;
    if (existingChatId) {
      try {
        const result = await sendMessage(
          existingChatId,
          attempt.messageBody,
          linqApiToken,
        );
        if (!result.success) {
          const reason = stringifyError(result.error ?? "linq_send_failed");
          await ctx.runMutation(internal.outreachAttempts.markFailed, {
            outreachAttemptId: attempt._id,
            failureReason: reason,
          });
          return { sent: false, reason, contactName: contact.name };
        }

        await ctx.runMutation(internal.outreachAttempts.markSent, {
          outreachAttemptId: attempt._id,
          linqChatId: existingChatId,
          linqMessageId: result.messageId,
        });

        return {
          sent: true,
          contactName: contact.name,
          chatId: existingChatId,
          messageId: result.messageId,
        };
      } catch (error) {
        const reason = stringifyError(error);
        await ctx.runMutation(internal.outreachAttempts.markFailed, {
          outreachAttemptId: attempt._id,
          failureReason: reason,
        });
        return { sent: false, reason, contactName: contact.name };
      }
    }

    try {
      const result = await createChat(
        contactPhone,
        attempt.messageBody,
        linqPhoneNumber,
        linqApiToken,
      );
      if (!result.success || !result.chatId) {
        const reason = stringifyError(result.error ?? "linq_create_chat_failed");
        await ctx.runMutation(internal.outreachAttempts.markFailed, {
          outreachAttemptId: attempt._id,
          failureReason: reason,
        });
        return { sent: false, reason, contactName: contact.name };
      }

      await ctx.runMutation(internal.outreachAttempts.markSent, {
        outreachAttemptId: attempt._id,
        linqChatId: result.chatId,
        linqMessageId: result.messageId,
      });

      return {
        sent: true,
        contactName: contact.name,
        chatId: result.chatId,
        messageId: result.messageId,
      };
    } catch (error) {
      const reason = stringifyError(error);
      await ctx.runMutation(internal.outreachAttempts.markFailed, {
        outreachAttemptId: attempt._id,
        failureReason: reason,
      });
      return { sent: false, reason, contactName: contact.name };
    }
  },
});
