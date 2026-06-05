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

const MEMORY_UPDATE_SCHEMA = {
  type: "object",
  required: ["category", "content"],
  additionalProperties: false,
  properties: {
    category: {
      type: "string",
      enum: [
        "profile",
        "communication_preference",
        "care_preference",
        "care_note",
        "lesson",
      ],
    },
    content: { type: "string" },
  },
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
    ],
    properties: {
      sms_response: { type: "string" },
      internal_notes: { type: "string" },
      user_profile_update: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              relationship_to_recipient: { type: "string" },
              status: {
                type: "string",
                enum: ["onboarding", "active", "paused", "archived"],
              },
            },
          },
          { type: "null" },
        ],
      },
      care_case_profile_update: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            properties: {
              care_recipient_name: { type: "string" },
              relationship_to_recipient: { type: "string" },
              timezone: { type: "string" },
              status: {
                type: "string",
                enum: ["onboarding", "active", "paused", "archived"],
              },
            },
          },
          { type: "null" },
        ],
      },
      user_memory_updates: { type: "array", items: MEMORY_UPDATE_SCHEMA },
      care_case_memory_updates: { type: "array", items: MEMORY_UPDATE_SCHEMA },
      self_corrections: { type: "array", items: { type: "string" } },
      reactions: {
        type: "array",
        items: {
          type: "object",
          required: ["target_message", "type"],
          additionalProperties: false,
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
            additionalProperties: false,
            properties: {
              type: { type: "string", enum: ["screen", "bubble"] },
              name: { type: "string" },
            },
          },
          { type: "null" },
        ],
      },
      medication_updates: {
        type: "array",
        items: {
          type: "object",
          required: ["action", "name"],
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["add", "update", "remove"] },
            name: { type: "string" },
            dose: { type: "string" },
            schedule: { type: "string" },
            notes: { type: "string" },
          },
        },
      },
      schedule_updates: {
        type: "array",
        items: {
          type: "object",
          required: ["action", "type", "title"],
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["add", "update", "remove"] },
            type: { type: "string", enum: ["appointment", "task", "reminder"] },
            title: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
            end_time: { type: "string" },
            location: { type: "string" },
          },
        },
      },
      calendar_updates: {
        type: "array",
        items: {
          type: "object",
          required: ["action"],
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["create", "update", "delete"] },
            title: { type: "string" },
            date: { type: "string" },
            startTime: { type: "string" },
            endTime: { type: "string" },
            location: { type: "string" },
            eventId: { type: "string" },
            recurrence: {
              type: "string",
              enum: [
                "none",
                "daily",
                "weekdays",
                "weekly",
                "biweekly",
                "monthly",
                "yearly",
              ],
            },
          },
        },
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
