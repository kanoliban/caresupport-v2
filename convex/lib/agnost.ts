import * as agnost from "agnostai";

/**
 * Agnost conversation analytics for the care runtime.
 *
 * Two constraints shape this module:
 *
 * 1. Analytics must never break a care turn. Every entry point swallows its
 *    own failures, and the whole module no-ops when `AGNOST_ORG_ID` is unset.
 * 2. Convex actions are serverless. The SDK drains its queue on a 100ms
 *    background interval, which a frozen container never runs, so a recorded
 *    turn awaits `flush()` before the action returns.
 *
 * Identity is deferred: a turn starts when the message arrives but only
 * becomes an Agnost interaction once the runtime has resolved who is talking
 * and which care case they belong to. Turns that end before that — group
 * chats, screened-out agents — produce no event at all.
 */

const DEFAULT_ENDPOINT = "https://api.agnost.ai";
const REDACTED = "[redacted]";

/** The full care coordination agent: memory, tools, outreach, calendar. */
export const CARE_AGENT_NAME = "care-coordinator";

/** First-contact screening agent for unknown senders. */
export const DOORMAN_AGENT_NAME = "doorman";

/**
 * Stable, non-PII identifiers. Phone numbers never leave the runtime — the
 * care agent reports Convex user/care-case ids, the doorman reports the
 * stranger record it is screening.
 */
export interface TurnIdentity {
  userId: string;
  conversationId: string;
}

/** The shape `handleMessage` already returns, narrowed to what Agnost needs. */
export interface TurnOutcome {
  response: string;
  success: boolean;
  error?: string;
}

export interface TurnRecorder {
  /**
   * Binds the turn to a user and conversation and opens the Agnost
   * interaction. Call this once the runtime is committed to producing a
   * reply, before the model runs, so the session exists by the time the
   * event lands.
   */
  identify(identity: TurnIdentity, properties?: TurnProperties): void;
  setProperties(properties: TurnProperties): void;
  /** Records the turn and flushes. Idempotent; returns `outcome` unchanged. */
  finish<T extends TurnOutcome>(outcome: T): Promise<T>;
}

export type TurnProperties = Record<string, string | number | boolean | undefined>;

export interface TurnStart {
  agentName: string;
  input: string;
  /** Turn start in epoch ms, so reported latency covers the whole turn. */
  startedAt?: number;
}

let initFailed = false;

function client(): typeof agnost | null {
  const orgId = process.env.AGNOST_ORG_ID;
  if (!orgId || initFailed) {
    return null;
  }
  if (!agnost.isInitialized()) {
    const initialized = agnost.init(orgId, {
      endpoint: process.env.AGNOST_ENDPOINT ?? DEFAULT_ENDPOINT,
      debug: process.env.AGNOST_DEBUG === "true",
    });
    if (!initialized) {
      initFailed = true;
      return null;
    }
  }
  return agnost;
}

/**
 * Message bodies carry care details. Capture is on by default; set
 * `AGNOST_DISABLE_CONTENT=true` to keep the timing/success telemetry while
 * redacting what was said.
 */
function content(text: string): string {
  return process.env.AGNOST_DISABLE_CONTENT === "true" ? REDACTED : text;
}

function assign(target: TurnProperties, source: TurnProperties | undefined): void {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      target[key] = value;
    }
  }
}

export function startTurn(start: TurnStart): TurnRecorder {
  const startedAt = start.startedAt ?? Date.now();
  const properties: TurnProperties = {};
  let interaction: ReturnType<typeof agnost.begin> = null;
  let finished = false;

  return {
    identify(identity, extra) {
      assign(properties, extra);
      if (interaction) return;
      const sdk = client();
      if (!sdk) return;
      try {
        interaction = sdk.begin({
          userId: identity.userId,
          conversationId: identity.conversationId,
          agentName: start.agentName,
          input: content(start.input),
        });
      } catch (error) {
        console.warn("[agnost] begin failed", error);
      }
    },

    setProperties(extra) {
      assign(properties, extra);
    },

    async finish(outcome) {
      if (finished || !interaction) {
        return outcome;
      }
      finished = true;
      const sdk = client();
      if (!sdk) return outcome;
      try {
        const extra: TurnProperties = { ...properties };
        if (outcome.error) {
          extra.error = outcome.error;
        }
        interaction.end(
          content(outcome.response),
          outcome.success,
          Date.now() - startedAt,
          extra,
        );
        await sdk.flush();
      } catch (error) {
        console.warn("[agnost] finish failed", error);
      }
      return outcome;
    },
  };
}
