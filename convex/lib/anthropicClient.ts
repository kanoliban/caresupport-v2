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
const DEFAULT_TIMEOUT_MS = 45_000;

const FREEFORM_OBJECT_SCHEMA = {
  type: "object",
  additionalProperties: true,
} as const;

const FREEFORM_OBJECT_OR_NULL_SCHEMA = {
  anyOf: [
    FREEFORM_OBJECT_SCHEMA,
    { type: "null" },
  ],
} as const;

const FREEFORM_OBJECT_ARRAY_SCHEMA = {
  type: "array",
  items: FREEFORM_OBJECT_SCHEMA,
} as const;

const AGENT_RESPONSE_FORMAT: JSONOutputFormat = {
  type: "json_schema",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "sms_response",
      "internal_notes",
      "user_profile_update",
      "care_case_profile_update",
      "user_memory_updates",
      "care_case_memory_updates",
      "self_corrections",
      "reactions",
      "effect",
      "medication_updates",
      "schedule_updates",
      "care_contact_updates",
      "coordination_event_updates",
      "outreach_requests",
    ],
    properties: {
      sms_response: { type: "string" },
      internal_notes: { type: "string" },
      user_profile_update: FREEFORM_OBJECT_OR_NULL_SCHEMA,
      care_case_profile_update: FREEFORM_OBJECT_OR_NULL_SCHEMA,
      user_memory_updates: FREEFORM_OBJECT_ARRAY_SCHEMA,
      care_case_memory_updates: FREEFORM_OBJECT_ARRAY_SCHEMA,
      self_corrections: { type: "array", items: { type: "string" } },
      reactions: FREEFORM_OBJECT_ARRAY_SCHEMA,
      effect: FREEFORM_OBJECT_OR_NULL_SCHEMA,
      medication_updates: FREEFORM_OBJECT_ARRAY_SCHEMA,
      schedule_updates: FREEFORM_OBJECT_ARRAY_SCHEMA,
      care_contact_updates: FREEFORM_OBJECT_ARRAY_SCHEMA,
      coordination_event_updates: FREEFORM_OBJECT_ARRAY_SCHEMA,
      outreach_requests: FREEFORM_OBJECT_ARRAY_SCHEMA,
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

function thinkingConfig(_model: string): ThinkingConfigParam | undefined {
  // structured JSON output (json_schema) and adaptive thinking are mutually exclusive
  return undefined;
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
      if (isAbortError(error)) {
        throw error;
      }
      if (isRetryableStatus(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
