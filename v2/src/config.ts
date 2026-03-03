import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "8787")),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  claudeModel: optional("CLAUDE_MODEL", "claude-haiku-4-5-20251001"),
  claudeMaxTokens: Number(optional("CLAUDE_MAX_TOKENS", "180")),
  claudeRequestTimeoutMs: Number(optional("CLAUDE_REQUEST_TIMEOUT_MS", "4500")),
  promptFamilyMaxChars: Number(optional("PROMPT_FAMILY_MAX_CHARS", "1600")),
  promptConversationMaxChars: Number(optional("PROMPT_CONVERSATION_MAX_CHARS", "800")),
  promptMemberMaxChars: Number(optional("PROMPT_MEMBER_MAX_CHARS", "500")),
  linqRequestTimeoutMs: Number(optional("LINQ_REQUEST_TIMEOUT_MS", "4500")),
  linqReadReceiptDelayMs: Number(optional("LINQ_READ_RECEIPT_DELAY_MS", "900")),
  linqTypingStartDelayMs: Number(optional("LINQ_TYPING_START_DELAY_MS", "1200")),
  linqTypingHeartbeatMs: Number(optional("LINQ_TYPING_HEARTBEAT_MS", "5000")),
  linqInterBubbleDelayMs: Number(optional("LINQ_INTER_BUBBLE_DELAY_MS", "500")),
  naturalResponseDelayEnabled: optional("CARESUPPORT_NATURAL_RESPONSE_DELAY", "1") !== "0",
  responseDelayMinMs: Number(optional("CARESUPPORT_RESPONSE_DELAY_MIN_MS", "1200")),
  responseDelayMaxMs: Number(optional("CARESUPPORT_RESPONSE_DELAY_MAX_MS", "2800")),
  responseDelayPerCharMs: Number(optional("CARESUPPORT_RESPONSE_DELAY_PER_CHAR_MS", "2")),
  responseDelayJitterMs: Number(optional("CARESUPPORT_RESPONSE_DELAY_JITTER_MS", "300")),
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: optional("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  openRouterModel: process.env.OPENROUTER_MODEL,
  convexUrl: process.env.CONVEX_URL,
  linq: {
    baseUrl: optional("LINQ_BASE_URL", "https://api.linqapp.com/api/partner/v3"),
    apiToken: process.env.LINQ_API_TOKEN,
    phone: process.env.LINQ_PHONE,
    webhookSecret: process.env.LINQ_WEBHOOK_SECRET,
  },
  snapshotOut: optional("SNAPSHOT_OUT", "./fixtures/snapshot.ndjson"),
  snapshotChecksumOut: optional("SNAPSHOT_CHECKSUM", "./fixtures/snapshot-checksums.json"),
};

export function assertServerConfig(): void {
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for the V2 processing server");
  }
}

export function assertLinqConfig(): void {
  required("LINQ_API_TOKEN");
}
