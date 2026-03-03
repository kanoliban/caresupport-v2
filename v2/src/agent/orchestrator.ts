import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import { ProcessResultSchema, type ProcessResult } from "../contracts/processResult.js";
import type { FamilyContext, ProcessingInput } from "../types/domain.js";
import { logger } from "../utils/logger.js";
import { buildAgentPrompt } from "./prompt.js";

const DIRECTIVE = [
  "Return only JSON matching the required ProcessResult schema.",
  "Do not include markdown fences or extra prose.",
  "If unsure, keep updates empty and ask a clarifying response in sms_response.",
].join(" ");

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const first = withoutFence.indexOf("{");
  const last = withoutFence.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    return null;
  }
  return withoutFence.slice(first, last + 1);
}

function fallbackResult(reason: string): ProcessResult {
  return {
    sms_response:
      "I got your message. I need one quick confirmation before I make any updates. What should I prioritize first?",
    needs_outreach: [],
    family_updates: [],
    member_updates: [],
    routing_updates: [],
    audit: {
      model: "anthropic-fallback",
      intent: "GENERAL",
      decisions: ["fallback_response"],
      warnings: [reason],
    },
  };
}

export class ClaudeOrchestrator {
  private readonly client: Anthropic;

  constructor() {
    const apiKey = config.anthropicApiKey;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for ClaudeOrchestrator");
    }

    this.client = new Anthropic({
      apiKey,
      maxRetries: 0,
      timeout: Math.max(1500, config.claudeRequestTimeoutMs),
    });
  }

  async generate(input: ProcessingInput, familyContext: FamilyContext): Promise<ProcessResult> {
    if (process.env.CARESUPPORT_USE_AGENT_SDK === "1") {
      logger.warn(
        "CARESUPPORT_USE_AGENT_SDK=1 set, but direct Anthropic path is currently enforced for latency stability",
      );
    }

    const prompt = `${DIRECTIVE}\n\n${buildAgentPrompt(input, familyContext)}`;

    try {
      const response = await this.client.messages.create({
        model: config.claudeModel,
        max_tokens: Math.max(120, config.claudeMaxTokens),
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content
        .filter((part): part is Anthropic.TextBlock => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim();

      const jsonText = extractJson(text);
      if (!jsonText) {
        logger.warn({ model: response.model, preview: text.slice(0, 320) }, "Claude response missing JSON object");
        return fallbackResult("missing_json_object");
      }

      const parsed = ProcessResultSchema.safeParse(JSON.parse(jsonText));
      if (!parsed.success) {
        logger.warn({ issues: parsed.error.issues.slice(0, 5) }, "Claude JSON failed ProcessResult validation");
        return fallbackResult("invalid_process_result");
      }

      const normalized: ProcessResult = {
        ...parsed.data,
        audit: {
          ...parsed.data.audit,
          model: response.model ?? parsed.data.audit.model,
          token_usage:
            response.usage &&
            typeof response.usage.input_tokens === "number" &&
            typeof response.usage.output_tokens === "number"
              ? {
                  input: response.usage.input_tokens,
                  output: response.usage.output_tokens,
                }
              : parsed.data.audit.token_usage,
        },
      };

      return normalized;
    } catch (error) {
      logger.error({ error }, "Claude generation failed");
      return fallbackResult(error instanceof Error ? error.message : "claude_generation_error");
    }
  }
}
