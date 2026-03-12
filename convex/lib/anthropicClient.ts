import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  TextBlockParam,
  ThinkingConfigParam,
} from "@anthropic-ai/sdk/resources/messages/messages";
import type { SystemBlock } from "./pipeline/types";

const MAX_TOKENS = 16_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const MODEL_FALLBACK_CHAIN = [
  "claude-haiku-4-5",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
] as const;

export interface AnthropicInput {
  systemBlocks: SystemBlock[];
  messages: MessageParam[];
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

function buildSystemParam(blocks: SystemBlock[]): TextBlockParam[] {
  return blocks.map((block) => {
    const entry: TextBlockParam = { type: "text", text: block.text };
    if (block.cacheBreakpoint) {
      entry.cache_control = { type: "ephemeral" };
    }
    return entry;
  });
}

function thinkingConfig(model: string): ThinkingConfigParam | undefined {
  if (model.includes("haiku")) return undefined;
  return { type: "adaptive" };
}

function effortLevel(model: string): "medium" | "high" | undefined {
  if (model.includes("haiku")) return undefined;
  if (model.includes("opus")) return "high";
  return "medium";
}

async function tryModel(
  client: Anthropic,
  model: string,
  system: TextBlockParam[],
  messages: MessageParam[],
  timeoutMs: number,
): Promise<AnthropicResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const thinkingParam = thinkingConfig(model);
  const effort = effortLevel(model);

  try {
    const stream = client.messages.stream(
      {
        model,
        max_tokens: MAX_TOKENS,
        ...(thinkingParam && { thinking: thinkingParam }),
        ...(effort && { output_config: { effort } }),
        system,
        messages,
      },
      { signal: controller.signal },
    );

    const response = await stream.finalMessage();

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
