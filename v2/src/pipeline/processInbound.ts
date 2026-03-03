import type { LinqInboundPayload } from "../contracts/inbound.js";
import type { ProcessResult } from "../contracts/processResult.js";
import { extractText } from "../contracts/inbound.js";
import { ClaudeOrchestrator } from "../agent/orchestrator.js";
import { postModelGuard, preModelGuard, enforceOrThrow } from "../enforcement/policies.js";
import { ConvexGateway } from "../convex/client.js";
import { LinqClient } from "../linq/client.js";
import { config } from "../config.js";
import { splitIntoBubbles } from "../utils/bubbles.js";
import { logger } from "../utils/logger.js";
import type { ActorContext, FamilyContext, ProcessingInput } from "../types/domain.js";
import { LocalWorkspaceContext } from "../context/localWorkspace.js";

export interface ProcessInboundOptions {
  dryRun?: boolean;
}

export interface ProcessStageTimings {
  totalMs: number;
  signalMs: number;
  naturalDelayMs: number;
  idempotencyMs: number;
  resolveActorMs: number;
  loadContextMs: number;
  preGuardMs: number;
  modelMs: number;
  postGuardMs: number;
  persistMs: number;
  outboundMs: number;
  outreachMs: number;
}

export interface ProcessInboundResponse {
  ok: boolean;
  actor: ActorContext;
  result: ProcessResult;
  enforcementWarnings: string[];
  stageTimings: ProcessStageTimings;
  duplicate?: boolean;
}

const FALLBACK_FAMILY_CONTEXT: FamilyContext = {
  familyId: "unknown",
  familyName: "Unknown Family",
  careRecipient: "Unknown",
  markdown: "[No family context loaded]",
  recentConversation: "[No conversation history]",
};

const OUTREACH_PROMISE_RE = /\b(i(?:\s*|')ll|i will)\s+(reach out|message|text|contact|send)\b/gi;

function hasPromiseWithoutActionIssue(issues: { code: string }[]): boolean {
  return issues.some((issue) => issue.code === "PROMISE_WITHOUT_ACTION");
}

function repairPromiseWithoutAction(result: ProcessResult): ProcessResult {
  if (result.needs_outreach.length > 0) {
    return result;
  }

  const rewritten = result.sms_response.replace(OUTREACH_PROMISE_RE, "I can help coordinate");
  const sms =
    rewritten.trim().length > 0
      ? `${rewritten.trim()} Please confirm who I should contact and the best phone number?`
      : "I need one more detail before I can coordinate outreach safely. Please confirm who I should contact and the best phone number?";

  return {
    ...result,
    sms_response: sms,
    audit: {
      ...result.audit,
      warnings: [...result.audit.warnings, "Rewrote outreach promise because needs_outreach was empty."],
    },
  };
}

function modelTimeoutFallback(timeoutMs: number): ProcessResult {
  return {
    sms_response:
      "I saw your message and I’m checking the care details now. I’ll send a full update shortly.",
    needs_outreach: [],
    family_updates: [],
    member_updates: [],
    routing_updates: [],
    audit: {
      model: "model-timeout-fallback",
      intent: "GENERAL",
      decisions: ["model_timeout_fallback"],
      warnings: [`Model generation timed out at ${timeoutMs}ms`],
    },
  };
}

export class CareSupportProcessor {
  private static readonly inFlightMessageIds = new Set<string>();
  private localContext: LocalWorkspaceContext | null = null;

  constructor(
    private readonly orchestrator: ClaudeOrchestrator,
    private readonly convex: ConvexGateway,
    private readonly linq: LinqClient,
  ) {}

  async process(payload: LinqInboundPayload, options: ProcessInboundOptions = {}): Promise<ProcessInboundResponse> {
    const startedAt = Date.now();
    const stageTimings: ProcessStageTimings = {
      totalMs: 0,
      signalMs: 0,
      naturalDelayMs: 0,
      idempotencyMs: 0,
      resolveActorMs: 0,
      loadContextMs: 0,
      preGuardMs: 0,
      modelMs: 0,
      postGuardMs: 0,
      persistMs: 0,
      outboundMs: 0,
      outreachMs: 0,
    };
    const finalizeStageTimings = (): ProcessStageTimings => ({
      ...stageTimings,
      totalMs: Date.now() - startedAt,
    });
    const enforceIdempotency = !options.dryRun;
    let lockAcquired = false;
    let stopRealtimeSignals: (() => Promise<void>) | null = null;

    if (enforceIdempotency) {
      lockAcquired = this.tryAcquireMessageLock(payload.message_id);
      if (!lockAcquired) {
        const actorStartedAt = Date.now();
        const actor = await this.resolveActor(payload, false);
        stageTimings.resolveActorMs += Date.now() - actorStartedAt;
        return {
          ok: true,
          actor,
          stageTimings: finalizeStageTimings(),
          duplicate: true,
          result: {
            sms_response: "Duplicate delivery ignored while original is still processing.",
            needs_outreach: [],
            family_updates: [],
            member_updates: [],
            routing_updates: [],
            audit: {
              model: "runtime-idempotency",
              intent: "GENERAL",
              decisions: ["duplicate_delivery_inflight"],
              warnings: [],
            },
          },
          enforcementWarnings: [],
        };
      }
    }

    try {
      const text = extractText(payload.parts);
      const preferLocal = Boolean(options.dryRun);
      if (!options.dryRun) {
        const signalStartedAt = Date.now();
        stopRealtimeSignals = this.startRealtimeSignals(payload.chat_id);
        stageTimings.signalMs += Date.now() - signalStartedAt;
      }
      const actorStartedAt = Date.now();
      const actor = await this.resolveActor(payload, preferLocal);
      stageTimings.resolveActorMs += Date.now() - actorStartedAt;
      const loadContextStartedAt = Date.now();
      const familyContext = await this.loadFamilyContext(actor, payload, preferLocal);
      stageTimings.loadContextMs += Date.now() - loadContextStartedAt;
      let skipInboundPersist = false;

      if (enforceIdempotency) {
        const idempotencyStartedAt = Date.now();
        const deliveryStatus = await this.getDeliveryStatus(payload.message_id);
        stageTimings.idempotencyMs += Date.now() - idempotencyStartedAt;
        if (deliveryStatus.outboundExists) {
          return {
            ok: true,
            actor,
            stageTimings: finalizeStageTimings(),
            duplicate: true,
            result: {
              sms_response: deliveryStatus.outboundText ?? "Duplicate delivery ignored.",
              needs_outreach: [],
              family_updates: [],
              member_updates: [],
              routing_updates: [],
              audit: {
                model: "runtime-idempotency",
                intent: "GENERAL",
                decisions: ["duplicate_delivery_completed"],
                warnings: [],
              },
            },
            enforcementWarnings: [],
          };
        }
        skipInboundPersist = deliveryStatus.inboundExists;
      }

      const input: ProcessingInput = {
        actor,
        text,
        service: payload.service,
        messageId: payload.message_id,
        receivedAt: payload.received_at,
      };

      const preGuardStartedAt = Date.now();
      const preIssues = preModelGuard(input);
      stageTimings.preGuardMs += Date.now() - preGuardStartedAt;
      enforceOrThrow(preIssues);

      const modelStartedAt = Date.now();
      const modelTimeoutMs = Math.max(2500, config.claudeRequestTimeoutMs);
      let result = await Promise.race<ProcessResult>([
        this.orchestrator.generate(input, familyContext),
        new Promise<ProcessResult>((resolve) =>
          setTimeout(() => resolve(modelTimeoutFallback(modelTimeoutMs)), modelTimeoutMs),
        ),
      ]);
      stageTimings.modelMs += Date.now() - modelStartedAt;

      const postGuardStartedAt = Date.now();
      let postIssues = postModelGuard(result);
      if (hasPromiseWithoutActionIssue(postIssues)) {
        result = repairPromiseWithoutAction(result);
        postIssues = postModelGuard(result);
      }
      stageTimings.postGuardMs += Date.now() - postGuardStartedAt;
      enforceOrThrow(postIssues);

      if (!options.dryRun) {
        const persistInboundStartedAt = Date.now();
        if (!skipInboundPersist) {
          await this.persistInbound(actor, payload, text);
        }
        stageTimings.persistMs += Date.now() - persistInboundStartedAt;
        const naturalDelayStartedAt = Date.now();
        await this.applyNaturalResponseDelay(payload.received_at, result.sms_response, false);
        stageTimings.naturalDelayMs += Date.now() - naturalDelayStartedAt;
        const outboundStartedAt = Date.now();
        await this.sendOutbound(payload.chat_id, result.sms_response);
        stageTimings.outboundMs += Date.now() - outboundStartedAt;
        const persistResultStartedAt = Date.now();
        await this.persistResult(actor, payload, result);
        stageTimings.persistMs += Date.now() - persistResultStartedAt;
        if (result.needs_outreach.length > 0) {
          const outreachStartedAt = Date.now();
          await this.convex.action("process_v2.js:dispatchOutreach", {
            familyId: actor.familyId,
            sourceMessageId: payload.message_id,
            tasks: result.needs_outreach,
          });
          stageTimings.outreachMs += Date.now() - outreachStartedAt;
        }
      }

      return {
        ok: true,
        actor,
        stageTimings: finalizeStageTimings(),
        result,
        enforcementWarnings: [...preIssues, ...postIssues].map((i) => `${i.code}:${i.detail}`),
      };
    } finally {
      if (stopRealtimeSignals) {
        try {
          await stopRealtimeSignals();
        } catch (error) {
          logger.warn({ error, chatId: payload.chat_id }, "Failed to stop realtime Linq signals");
        }
      }
      if (lockAcquired) {
        this.releaseMessageLock(payload.message_id);
      }
    }
  }

  private tryAcquireMessageLock(messageId: string): boolean {
    if (CareSupportProcessor.inFlightMessageIds.has(messageId)) {
      return false;
    }
    CareSupportProcessor.inFlightMessageIds.add(messageId);
    return true;
  }

  private releaseMessageLock(messageId: string): void {
    CareSupportProcessor.inFlightMessageIds.delete(messageId);
  }

  private async getDeliveryStatus(messageId: string): Promise<{
    inboundExists: boolean;
    outboundExists: boolean;
    outboundText: string | null;
  }> {
    try {
      const status = await this.convex.query<{
        inboundExists: boolean;
        outboundExists: boolean;
        outboundText: string | null;
      } | null>("conversations_v2.js:getDeliveryStatus", { messageId });
      if (status) {
        return status;
      }
      return { inboundExists: false, outboundExists: false, outboundText: null };
    } catch (error) {
      logger.warn({ error, messageId }, "Delivery status query failed; proceeding without dedupe status");
      return { inboundExists: false, outboundExists: false, outboundText: null };
    }
  }

  private async resolveActor(payload: LinqInboundPayload, preferLocal: boolean): Promise<ActorContext> {
    if (preferLocal) {
      const local = this.getLocalContext().resolveActor(payload.from, payload.chat_id);
      if (local) return local;
    }

    try {
      const resolved = await this.convex.query<ActorContext | null>("members_v2.js:resolveActor", {
        chatId: payload.chat_id,
        phone: payload.from,
      });
      if (resolved) {
        return resolved;
      }
    } catch (error) {
      logger.warn({ error }, "resolveActor query failed; using fallback actor");
    }

    const local = this.getLocalContext().resolveActor(payload.from, payload.chat_id);
    if (local) {
      return local;
    }

    return {
      familyId: "unknown",
      memberId: payload.from,
      memberName: payload.from,
      role: "family_caregiver",
      accessLevel: "limited",
      phone: payload.from,
      chatId: payload.chat_id,
    };
  }

  private async loadFamilyContext(
    actor: ActorContext,
    payload: LinqInboundPayload,
    preferLocal: boolean,
  ): Promise<FamilyContext> {
    if (preferLocal) {
      const localContext = this.getLocalContext().loadFamilyContext(actor, payload.received_at);
      if (localContext) {
        return localContext;
      }
    }

    try {
      const context = await this.convex.query<FamilyContext>("families_v2.js:getFamilyContext", {
        familyId: actor.familyId,
        memberId: actor.memberId,
        intent: "GENERAL",
      });

      const recentConversation = await this.convex.query<string>("conversations_v2.js:getRecentConversation", {
        memberId: actor.memberId,
        limit: 50,
      });

      return {
        ...context,
        recentConversation,
      };
    } catch (error) {
      logger.warn({ error, familyId: actor.familyId }, "Family context query failed; fallback context used");
      const localContext = this.getLocalContext().loadFamilyContext(actor, payload.received_at);
      if (localContext) {
        return localContext;
      }
      return {
        ...FALLBACK_FAMILY_CONTEXT,
        familyId: actor.familyId,
        familyName: actor.familyId === "unknown" ? FALLBACK_FAMILY_CONTEXT.familyName : actor.familyId,
        recentConversation: `Fallback context for message ${payload.message_id}`,
      };
    }
  }

  private async sendOutbound(chatId: string, responseText: string): Promise<void> {
    const bubbles = splitIntoBubbles(responseText);
    const sendResults = await this.linq.sendMessageSequence(
      chatId,
      bubbles.length > 0 ? bubbles : [responseText],
      config.linqInterBubbleDelayMs,
    );
    const failed = sendResults.filter((r) => !r.success);
    if (failed.length > 0) {
      throw new Error(`Outbound send failed for ${failed.length}/${sendResults.length} bubbles`);
    }
  }

  private async applyNaturalResponseDelay(receivedAt: string, responseText: string, isDryRun: boolean): Promise<void> {
    if (isDryRun) return;
    if (!config.naturalResponseDelayEnabled) return;
    if (config.nodeEnv === "test" || process.env.VITEST === "true") return;

    const receivedAtMs = Date.parse(receivedAt);
    if (Number.isNaN(receivedAtMs)) return;

    const minMs = Math.max(0, config.responseDelayMinMs);
    const maxMs = Math.max(minMs, config.responseDelayMaxMs);
    const perCharMs = Math.max(0, config.responseDelayPerCharMs);
    const jitterMs = Math.max(0, config.responseDelayJitterMs);

    const dynamicMs = Math.min(maxMs - minMs, responseText.trim().length * perCharMs);
    const randomJitterMs = jitterMs > 0 ? Math.floor(Math.random() * (jitterMs + 1)) : 0;
    const targetTotalMs = Math.min(maxMs, minMs + dynamicMs + randomJitterMs);

    const elapsedMs = Math.max(0, Date.now() - receivedAtMs);
    const remainingMs = Math.max(0, targetTotalMs - elapsedMs);
    if (remainingMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingMs));
    }
  }

  private startRealtimeSignals(chatId: string): () => Promise<void> {
    const isTestEnv = config.nodeEnv === "test" || process.env.VITEST === "true";
    const readReceiptDelayMs = isTestEnv ? 0 : Math.max(0, config.linqReadReceiptDelayMs);
    const typingStartDelayMs = isTestEnv ? 0 : Math.max(0, config.linqTypingStartDelayMs);
    const typingIntervalMs = Math.max(1000, config.linqTypingHeartbeatMs);
    let stopped = false;
    let typingStarted = false;
    let readSent = false;
    let typingInterval: NodeJS.Timeout | null = null;

    const markAsRead = async () => {
      if (readSent) return;
      try {
        const result = await this.linq.markAsRead(chatId);
        if (!result.success) {
          logger.warn({ chatId, status: result.status, body: result.body }, "Linq mark-as-read failed");
        } else {
          readSent = true;
        }
      } catch (error) {
        logger.warn({ error, chatId }, "Linq mark-as-read request failed");
      }
    };

    const startTyping = async () => {
      try {
        const result = await this.linq.startTyping(chatId);
        if (!result.success) {
          logger.warn({ chatId, status: result.status, body: result.body }, "Linq start-typing failed");
        } else {
          typingStarted = true;
        }
      } catch (error) {
        logger.warn({ error, chatId }, "Linq start-typing request failed");
      }
    };

    const readTimer = setTimeout(() => {
      if (stopped) return;
      void markAsRead();
    }, readReceiptDelayMs);

    const typingStartTimer = setTimeout(() => {
      if (stopped) return;
      void startTyping();
      typingInterval = setInterval(() => {
        if (stopped) return;
        void startTyping();
      }, typingIntervalMs);
    }, typingStartDelayMs);

    return async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      clearTimeout(readTimer);
      clearTimeout(typingStartTimer);
      if (typingInterval) {
        clearInterval(typingInterval);
      }
      if (!readSent) {
        await markAsRead();
      }
      if (!typingStarted) {
        await startTyping();
      }
      try {
        const result = await this.linq.stopTyping(chatId);
        if (!result.success) {
          logger.warn({ chatId, status: result.status, body: result.body }, "Linq stop-typing failed");
        }
      } catch (error) {
        logger.warn({ error, chatId }, "Linq stop-typing request failed");
      }
    };
  }

  private async persistInbound(actor: ActorContext, payload: LinqInboundPayload, text: string): Promise<void> {
    await this.convex.mutation("conversations_v2.js:appendInbound", {
      familyId: actor.familyId,
      memberId: actor.memberId,
      messageId: payload.message_id,
      chatId: payload.chat_id,
      phone: payload.from,
      service: payload.service,
      text,
      receivedAt: payload.received_at,
    });
  }

  private async persistResult(actor: ActorContext, payload: LinqInboundPayload, result: ProcessResult): Promise<void> {
    await this.convex.mutation("families_v2.js:applyFamilyUpdates", {
      familyId: actor.familyId,
      actor: { memberId: actor.memberId, memberName: actor.memberName, role: actor.role },
      updates: result.family_updates,
    });

    await this.convex.mutation("members_v2.js:applyMemberUpdates", {
      familyId: actor.familyId,
      actor: { memberId: actor.memberId, memberName: actor.memberName, role: actor.role },
      updates: result.member_updates,
    });

    await this.convex.mutation("members_v2.js:applyRoutingUpdates", {
      familyId: actor.familyId,
      actor: { memberId: actor.memberId, memberName: actor.memberName, role: actor.role },
      updates: result.routing_updates,
    });

    await this.convex.mutation("conversations_v2.js:appendOutbound", {
      familyId: actor.familyId,
      memberId: actor.memberId,
      sourceMessageId: payload.message_id,
      text: result.sms_response,
      createdAt: new Date().toISOString(),
    });

    await this.convex.mutation("audit_v2.js:record", {
      familyId: actor.familyId,
      actor: { memberId: actor.memberId, memberName: actor.memberName, role: actor.role },
      sourceMessageId: payload.message_id,
      audit: result.audit,
      outcome: {
        hasOutreach: result.needs_outreach.length > 0,
        familyUpdates: result.family_updates.length,
        memberUpdates: result.member_updates.length,
        routingUpdates: result.routing_updates.length,
      },
    });
  }

  private getLocalContext(): LocalWorkspaceContext {
    if (!this.localContext) {
      this.localContext = new LocalWorkspaceContext();
    }
    return this.localContext;
  }
}
