import type { Intent, RouteResult, RouteTier } from "./types";

export const MODELS: Record<RouteTier, string> = {
  fast: "claude-sonnet-4-6",
  reason: "claude-sonnet-4-6",
  critical: "claude-opus-4-6",
};

export const TIER_ORDER: RouteTier[] = ["fast", "reason", "critical"];

const EMERGENCY = /\b(911|emergency|ambulance|chest pain|can't breathe|not breathing|stroke|heart attack|unconscious|unresponsive|seizure|overdose)\b/i;
const MEDICATION_CHANGE = /\b(change|stop|start|switch|adjust|increase|decrease|new|discontinue|hold|pause|resume).{0,30}\b(med|medication|prescription|dosage|dose|pill)\b|\b(med|medication|prescription|dosage|dose)\s+(change|update|adjustment)\b/i;
const BILLING = /\b(price|pricing|cost|charge|billing|bill|free|paid|plan)\b/i;

const PATTERNS: Array<{
  pattern: RegExp;
  tier: RouteTier;
  intent: Intent;
  reason: string;
}> = [
  { pattern: EMERGENCY, tier: "critical", intent: "EMERGENCY", reason: "emergency keywords detected" },
  { pattern: MEDICATION_CHANGE, tier: "reason", intent: "MEDICATION_CHANGE", reason: "medication request detected" },
  { pattern: BILLING, tier: "fast", intent: "BILLING", reason: "billing question detected" },
];

export function route(message: string): RouteResult {
  const msg = message.trim();

  for (const { pattern, tier, intent, reason } of PATTERNS) {
    if (pattern.test(msg)) {
      return { tier, model: MODELS[tier], intent, reason };
    }
  }

  return { tier: "fast", model: MODELS.fast, intent: "GENERAL", reason: "default routing" };
}

export function fallbackChain(startModel: string): string[] {
  const chain = [startModel];
  const startTier = (Object.entries(MODELS) as [RouteTier, string][])
    .find(([, model]) => model === startModel)?.[0];

  if (startTier) {
    const index = TIER_ORDER.indexOf(startTier);
    for (const tier of TIER_ORDER.slice(index + 1)) {
      if (!chain.includes(MODELS[tier])) {
        chain.push(MODELS[tier]);
      }
    }
  }

  return chain;
}
