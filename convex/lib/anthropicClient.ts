import Anthropic from "@anthropic-ai/sdk";
import type { SystemBlock } from "./pipeline/types";

const THINKING_BUDGET = 10_000;
const MAX_TOKENS = 16_000;
const DEFAULT_TIMEOUT_MS = 45_000;

const MODEL_FALLBACK_CHAIN = [
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-5-20250514",
  "claude-opus-4-20250514",
] as const;

export interface AnthropicInput {
  systemBlocks: SystemBlock[];
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: string;
  apiKey: string;
}

export interface AnthropicResult {
  text: string;
  thinking: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

function buildSystemParam(
  blocks: SystemBlock[],
): Array<{ type: "text"; text: string; cache_control?: { type: "ephemeral" } }> {
  return blocks.map((block) => {
    const entry: {
      type: "text";
      text: string;
      cache_control?: { type: "ephemeral" };
    } = { type: "text", text: block.text };
    if (block.cacheBreakpoint) {
      entry.cache_control = { type: "ephemeral" };
    }
    return entry;
  });
}

async function tryModel(
  client: Anthropic,
  model: string,
  system: ReturnType<typeof buildSystemParam>,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  timeoutMs: number,
): Promise<AnthropicResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: MAX_TOKENS,
        thinking: { type: "enabled", budget_tokens: THINKING_BUDGET },
        system,
        messages,
      },
      { signal: controller.signal },
    );

    let text = "";
    let thinking = "";
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "thinking") {
        thinking += block.thinking;
      }
    }

    return {
      text,
      thinking,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableStatus(error: unknown): boolean {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof (error as Record<string, unknown>).status === "number"
  ) {
    const status = (error as Record<string, unknown>).status as number;
    return status === 429 || status === 529;
  }
  return false;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function callAnthropic(
  input: AnthropicInput,
): Promise<AnthropicResult> {
  const client = new Anthropic({ apiKey: input.apiKey });
  const system = buildSystemParam(input.systemBlocks);
  const startModel = input.model ?? MODEL_FALLBACK_CHAIN[0];

  const startIdx = MODEL_FALLBACK_CHAIN.indexOf(
    startModel as (typeof MODEL_FALLBACK_CHAIN)[number],
  );
  const chain =
    startIdx >= 0
      ? MODEL_FALLBACK_CHAIN.slice(startIdx)
      : [startModel, ...MODEL_FALLBACK_CHAIN];

  let lastError: unknown;
  for (const model of chain) {
    try {
      return await tryModel(
        client,
        model,
        system,
        input.messages,
        DEFAULT_TIMEOUT_MS,
      );
    } catch (error: unknown) {
      lastError = error;
      if (isRetryableStatus(error) || isAbortError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
