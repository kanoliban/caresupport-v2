import Anthropic from "@anthropic-ai/sdk";
import type {
  JSONOutputFormat,
  MessageParam,
  OutputConfig,
  TextBlockParam,
  ThinkingConfigParam,
} from "@anthropic-ai/sdk/resources/messages/messages";
import type { SystemBlock } from "./pipeline/types";

const MAX_TOKENS = 16_000;
const DEFAULT_TIMEOUT_MS = 120_000;

const FILE_UPDATE_SCHEMA = {
  type: "object",
  required: ["section", "operation", "content", "old_content"],
  properties: {
    section: { type: "string" },
    operation: { type: "string" },
    content: { type: "string" },
    old_content: { type: "string" },
  },
} as const;

const AGENT_RESPONSE_FORMAT: JSONOutputFormat = {
  type: "json_schema",
  schema: {
    type: "object",
    required: [
      "sms_response",
      "internal_notes",
      "needs_outreach",
      "family_file_updates",
      "self_corrections",
      "member_updates",
      "routing_updates",
      "reactions",
      "effect",
    ],
    properties: {
      sms_response: { type: "string" },
      internal_notes: { type: "string" },
      needs_outreach: {
        type: "array",
        items: {
          type: "object",
          required: ["phone", "name", "message"],
          properties: {
            phone: { type: "string" },
            name: { type: "string" },
            message: { type: "string" },
          },
        },
      },
      family_file_updates: { type: "array", items: FILE_UPDATE_SCHEMA },
      self_corrections: { type: "array", items: { type: "string" } },
      member_updates: { type: "array", items: FILE_UPDATE_SCHEMA },
      routing_updates: {
        type: "array",
        items: {
          type: "object",
          required: ["action", "phone", "name", "role", "relationship", "access_level"],
          properties: {
            action: { type: "string" },
            phone: { type: "string" },
            name: { type: "string" },
            role: { type: "string" },
            relationship: { type: "string" },
            access_level: { type: "string" },
          },
        },
      },
      reactions: {
        type: "array",
        items: {
          type: "object",
          required: ["target_message", "type"],
          properties: {
            target_message: { type: "string", enum: ["last_inbound", "last_outbound"] },
            type: { type: "string", enum: ["love", "like", "dislike", "laugh", "emphasize", "question"] },
          },
        },
      },
      effect: {
        anyOf: [
          {
            type: "object",
            required: ["type", "name"],
            properties: {
              type: { type: "string", enum: ["screen", "bubble"] },
              name: { type: "string" },
            },
          },
          { type: "null" },
        ],
      },
    },
  },
};

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
  const outputConfig: OutputConfig = {
    ...(effort && { effort }),
    format: AGENT_RESPONSE_FORMAT,
  };

  try {
    const stream = client.messages.stream(
      {
        model,
        max_tokens: MAX_TOKENS,
        ...(thinkingParam && { thinking: thinkingParam }),
        output_config: outputConfig,
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
