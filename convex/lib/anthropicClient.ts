import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  TextBlockParam,
  ThinkingConfigParam,
} from "@anthropic-ai/sdk/resources/messages/messages";
import type { SystemBlock } from "./pipeline/types";

const MAX_TOKENS = 16_000;
const DEFAULT_TIMEOUT_MS = 45_000;

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

function thinkingConfig(_model: string): ThinkingConfigParam | undefined {
  return undefined;
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
  try {
    const stream = client.messages.stream(
      {
        model,
        max_tokens: MAX_TOKENS,
        ...(thinkingParam && { thinking: thinkingParam }),
        system,
        messages,
      },
      { signal: controller.signal },
    );

    const response = await stream.finalMessage();

    let text = "";
    let thinking = "";
    const blockTypes = response.content.map((b) => b.type);
    console.log(`[anthropic] model=${response.model} stop=${response.stop_reason} blocks=${JSON.stringify(blockTypes)} tokens_in=${response.usage.input_tokens} tokens_out=${response.usage.output_tokens}`);
    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "thinking") {
        thinking += block.thinking;
      }
    }
    if (!text) {
      console.error(`[anthropic] EMPTY TEXT. Full content: ${JSON.stringify(response.content).slice(0, 500)}`);
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
      // A timeout (abort) or an overloaded/rate-limited model should fall back
      // to the next model in the chain rather than failing the whole request.
      // Only surface the error once every model has been exhausted.
      if (isAbortError(error) || isRetryableStatus(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
