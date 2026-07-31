"use node";

// Langfuse tracing setup for the CareSupport runtime.
//
// This wires the Langfuse JS/TS SDK (v5, OpenTelemetry-based) into the Convex
// Node.js action runtime. Design constraints that shaped this file:
//
//   1. Fail open. CareSupport is a production care system. If Langfuse keys are
//      absent or the SDK errors, tracing must degrade to a silent no-op and
//      never break message handling. Everything here is guarded on
//      `isTracingEnabled`.
//   2. Serverless flush. Convex Node actions freeze between invocations, so the
//      batching span processor must be force-flushed at the end of every
//      request or spans are lost. See `flushTracing()`, called in handler.ts.
//   3. PII masking. Traces carry care-coordination data (names, meds, phone
//      numbers, message bodies). The mask hook redacts obvious identifiers
//      (phone numbers, emails) before spans leave the process, per the project
//      decision to "redact identifiers, keep text".
//   4. Isolation. We register an isolated Langfuse TracerProvider rather than a
//      global one, so we never intercept or export non-Langfuse spans.
//
// Docs: https://langfuse.com/docs/observability/sdk/typescript (v5)

import {
  getActiveTraceId,
  LangfuseOtelSpanAttributes,
  setActiveTraceIO,
  setLangfuseTracerProvider,
  startActiveObservation,
  startObservation,
} from "@langfuse/tracing";
import { LangfuseSpanProcessor, type MaskFunction } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { context as otelContext, trace as otelTrace } from "@opentelemetry/api";
import type { Span as OtelSpan } from "@opentelemetry/api";

// --- PII masking -----------------------------------------------------------

// E.164 (e.g. +15551234567) — the normalized form phones take in this codebase.
const E164_RE = /\+\d{10,15}\b/g;
// Common US-formatted phone numbers: (555) 123-4567, 555-123-4567, 555.123.4567.
// No leading \b so an opening paren is consumed too. The required separators
// keep this from matching ISO dates (2026-07-04) or plain number runs.
const US_PHONE_RE = /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function redactString(value: string): string {
  return value
    .replace(EMAIL_RE, "[REDACTED_EMAIL]")
    .replace(E164_RE, "[REDACTED_PHONE]")
    .replace(US_PHONE_RE, "[REDACTED_PHONE]");
}

function maskValue(data: unknown): unknown {
  if (typeof data === "string") return redactString(data);
  if (Array.isArray(data)) return data.map(maskValue);
  if (data && typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      out[key] = maskValue(val);
    }
    return out;
  }
  return data;
}

// If the mask throws, Langfuse drops the entire export batch — so we swallow
// errors and return a placeholder rather than risk leaking unmasked PII.
const mask: MaskFunction = ({ data }) => {
  try {
    return maskValue(data);
  } catch {
    return "[LANGFUSE_MASK_ERROR]";
  }
};

// --- Setup -----------------------------------------------------------------

function resolveEnvironment(): string {
  switch (process.env.APP_ENV) {
    case "production":
      return "production";
    case "test":
      return "test";
    default:
      return "development";
  }
}

let initialized = false;
let tracingEnabled = false;
let spanProcessor: LangfuseSpanProcessor | undefined;

function ensureInit(): void {
  if (initialized) return;
  initialized = true;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) {
    // No credentials → tracing stays a no-op. This is the normal state for
    // deployments that haven't opted into Langfuse.
    return;
  }

  try {
    // Register an async context manager so active-span context propagates
    // across await boundaries (required for generations to nest under their
    // request span). This is orthogonal to the isolated tracer provider below.
    otelContext.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );

    spanProcessor = new LangfuseSpanProcessor({
      publicKey,
      secretKey,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://us.cloud.langfuse.com",
      environment: resolveEnvironment(),
      ...(process.env.LANGFUSE_RELEASE
        ? { release: process.env.LANGFUSE_RELEASE }
        : {}),
      mask,
    });

    // Isolated provider — do NOT register globally, so only Langfuse spans are
    // exported and third-party spans never reach Langfuse.
    const provider = new NodeTracerProvider({ spanProcessors: [spanProcessor] });
    setLangfuseTracerProvider(provider);

    tracingEnabled = true;
  } catch (error) {
    // Never let observability setup take down the runtime.
    console.error(
      "[langfuse] init failed; tracing disabled:",
      String(error).slice(0, 200),
    );
    spanProcessor = undefined;
    tracingEnabled = false;
  }
}

export function isTracingEnabled(): boolean {
  ensureInit();
  return tracingEnabled;
}

/**
 * Force-flush pending spans. MUST be called at the end of every Convex action
 * invocation — the runtime freezes between calls and buffered spans would
 * otherwise be lost. Never throws.
 */
export async function flushTracing(): Promise<void> {
  ensureInit();
  if (!tracingEnabled || !spanProcessor) return;
  try {
    await spanProcessor.forceFlush();
  } catch (error) {
    console.error("[langfuse] flush failed:", String(error).slice(0, 200));
  }
}

// --- Tracing helpers -------------------------------------------------------

/** Trace-level context for one care-coordination request. */
export interface CareTraceContext {
  /** Human-readable trace name, e.g. "care-response" or "doorman-check". */
  name: string;
  /** Coordinator user id — populates Langfuse user filtering. */
  userId?: string;
  /** careCaseId — groups a conversation thread in the Sessions view. */
  sessionId?: string;
  /** Filterable tags, e.g. intent, routing tier, feature. */
  tags?: string[];
  /** The inbound message (relevant input only — never the full arg object). */
  input?: unknown;
}

/** Minimal shape a traced model call must return for usage/output capture. */
export interface TracedModelResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Set by traceModelCall — the Langfuse trace id, so callers can later
   * attach scores (e.g. founder feedback) to this exact trace. */
  langfuseTraceId?: string;
}

function applyTraceAttributes(span: OtelSpan, ctx: CareTraceContext): void {
  const A = LangfuseOtelSpanAttributes;
  span.setAttribute(A.TRACE_NAME, ctx.name);
  if (ctx.userId) span.setAttribute(A.TRACE_USER_ID, ctx.userId);
  if (ctx.sessionId) span.setAttribute(A.TRACE_SESSION_ID, ctx.sessionId);
  if (ctx.tags && ctx.tags.length > 0) span.setAttribute(A.TRACE_TAGS, ctx.tags);
}

/**
 * Wrap a single LLM call as a Langfuse `generation` observation, optionally
 * nested under a request-level trace span carrying user/session/tags. Captures
 * model, token usage, model parameters, and input/output. No-op (just runs
 * `run`) when tracing is disabled.
 *
 * The generation is created synchronously at the top of the trace callback so
 * it correctly parents under the request span before any await.
 */
export async function traceModelCall<T extends TracedModelResult>(
  params: {
    trace?: CareTraceContext;
    generationName: string;
    /** The model requested (actual served model is read from the result). */
    requestedModel: string;
    modelParameters?: Record<string, string | number>;
    /** Relevant model input — the conversation messages, not system prompts. */
    input: unknown;
  },
  run: () => Promise<T>,
): Promise<T> {
  ensureInit();
  if (!tracingEnabled) return run();

  const runWithGeneration = async (): Promise<T> => {
    const generation = startObservation(
      params.generationName,
      {
        model: params.requestedModel,
        ...(params.modelParameters
          ? { modelParameters: params.modelParameters }
          : {}),
        input: params.input,
      },
      { asType: "generation" },
    );
    try {
      const result = await run();
      generation.update({
        model: result.model,
        output: result.text,
        usageDetails: {
          input: result.inputTokens,
          output: result.outputTokens,
          total: result.inputTokens + result.outputTokens,
        },
      });
      generation.end();
      return result;
    } catch (error) {
      generation.update({
        level: "ERROR",
        statusMessage:
          error instanceof Error
            ? error.message.slice(0, 300)
            : String(error).slice(0, 300),
      });
      generation.end();
      throw error;
    }
  };

  const traceCtx = params.trace;
  if (!traceCtx) return runWithGeneration();

  // If we're already inside a recording span (future: multi-step traces),
  // attach trace attributes to it and nest the generation as a child.
  const activeSpan = otelTrace.getActiveSpan();
  if (activeSpan && activeSpan.isRecording()) {
    applyTraceAttributes(activeSpan, traceCtx);
    return runWithGeneration();
  }

  // Otherwise open a request-level root span for this call.
  return startActiveObservation(
    traceCtx.name,
    async (root) => {
      applyTraceAttributes(root.otelSpan, traceCtx);
      // Capture the trace id so callers can attach scores to it later.
      const traceId = getActiveTraceId();
      if (traceCtx.input !== undefined) {
        setActiveTraceIO({ input: traceCtx.input });
      }
      const result = await runWithGeneration();
      setActiveTraceIO({ output: result.text });
      if (traceId) result.langfuseTraceId = traceId;
      return result;
    },
    { asType: "span" },
  );
}

/**
 * Attach a score to an existing trace via the Langfuse public API. Used for
 * human/founder feedback that arrives after the model call has ended (so the
 * trace context is no longer active). Guarded and never throws — scoring must
 * not affect message handling. The `comment` is redacted for PII, consistent
 * with span masking (the scores endpoint bypasses the OTEL mask hook).
 */
export async function scoreTrace(params: {
  traceId: string;
  name: string;
  value: string | number;
  dataType?: "NUMERIC" | "CATEGORICAL" | "BOOLEAN";
  comment?: string;
}): Promise<void> {
  ensureInit();
  if (!tracingEnabled || !params.traceId) return;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return;

  const baseUrl = (
    process.env.LANGFUSE_BASE_URL ?? "https://us.cloud.langfuse.com"
  ).replace(/\/$/, "");
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  try {
    const res = await fetch(`${baseUrl}/api/public/scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        traceId: params.traceId,
        name: params.name,
        value: params.value,
        environment: resolveEnvironment(),
        ...(params.dataType ? { dataType: params.dataType } : {}),
        ...(params.comment ? { comment: redactString(params.comment) } : {}),
      }),
    });
    if (!res.ok) {
      console.error(
        "[langfuse] score failed:",
        res.status,
        (await res.text()).slice(0, 200),
      );
    }
  } catch (error) {
    console.error("[langfuse] score error:", String(error).slice(0, 200));
  }
}
