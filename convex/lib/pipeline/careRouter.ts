import type { Intent, RouteResult, RouteTier } from "./types";

export const MODELS: Record<RouteTier, string> = {
  fast: "claude-sonnet-4-6",
  reason: "claude-sonnet-4-6",
  critical: "claude-opus-4-6",
};

export const TIER_ORDER: RouteTier[] = ["fast", "reason", "critical"];

const EMERGENCY = new RegExp(
  "\\b(911|emergency|ambulance|chest pain|can'?t breathe|" +
    "choking|seizure|unconscious|unresponsive|bleeding|overdose|" +
    "heart attack|stroke|passed out|not breathing)\\b|" +
    "\\bfell\\b(?!\\s*(asleep|behind|short|silent|quiet|flat|in love))",
  "i",
);

const ESCALATION = new RegExp(
  "\\b(missed (his|her|the|a) (med|medication|pill|dose)|" +
    "hasn'?t taken|didn'?t take (his|her|the)|" +
    "no one (is|was) (here|available|scheduled)|" +
    "no coverage|gap in coverage|nobody showed|" +
    "hasn'?t shown up|didn'?t show up)\\b",
  "i",
);

const MEDICATION_CHANGE = new RegExp(
  "\\b(change|stop|start|switch|adjust|increase|decrease|new|discontinue|hold|pause|resume) " +
    "(his|her|the|a|my)?\\s*(\\w+\\s+){0,3}(med|medication|prescription|dosage|dose|pill)\\b|" +
    "\\b(med|medication|prescription|dosage|dose) (change|adjustment|update)\\b",
  "i",
);

const ONBOARDING = new RegExp(
  "\\b(new (caregiver|member|person|helper|aide)|" +
    "add (someone|a member|a caregiver|a helper|them|her|him)|" +
    "join(ing)? the (team|circle|care)|" +
    "set(ting)? (up|me up)|" +
    "sign(ing)? up)\\b",
  "i",
);

const MULTI_MEMBER = new RegExp(
  "\\b(tell|message|text|contact|reach out to|let .+ know|notify)\\b.*" +
    "\\b(and|also|both|everyone|all|the team)\\b",
  "i",
);

const PATTERNS: Array<{
  pattern: RegExp;
  tier: RouteTier;
  intent: Intent;
  reason: string;
}> = [
  { pattern: EMERGENCY, tier: "critical", intent: "EMERGENCY", reason: "emergency keywords detected" },
  { pattern: ESCALATION, tier: "critical", intent: "ESCALATION", reason: "escalation trigger detected" },
  { pattern: MEDICATION_CHANGE, tier: "reason", intent: "MEDICATION_CHANGE", reason: "medication change request" },
  { pattern: ONBOARDING, tier: "reason", intent: "ONBOARDING", reason: "new member onboarding" },
  { pattern: MULTI_MEMBER, tier: "reason", intent: "MULTI_MEMBER", reason: "multi-member coordination" },
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
  const startTier = (Object.entries(MODELS) as [RouteTier, string][]).find(
    ([, m]) => m === startModel,
  )?.[0];

  if (startTier && TIER_ORDER.includes(startTier)) {
    const idx = TIER_ORDER.indexOf(startTier);
    for (const tier of TIER_ORDER.slice(idx + 1)) {
      if (!chain.includes(MODELS[tier])) {
        chain.push(MODELS[tier]);
      }
    }
  }

  return chain;
}
