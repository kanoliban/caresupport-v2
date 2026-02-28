"""
CareRouter — Intent-aware model selection for CareSupport.

Routes each inbound message to the right Claude model based on complexity
and safety-criticality. Zero extra API calls — pure pattern matching.

Tiers:
  fast     → Haiku   (greetings, schedule, check-ins, general)
  reason   → Sonnet  (medication changes, onboarding, multi-member coordination)
  critical → Opus    (emergencies, escalation triggers)
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class RouteResult:
    tier: str       # "fast" | "reason" | "critical"
    model: str      # Anthropic model ID
    intent: str     # classified intent for logging
    reason: str     # why this tier was chosen


MODELS = {
    "fast": "claude-haiku-4-5-20251001",
    "reason": "claude-sonnet-4-6",
    "critical": "claude-opus-4-6",
}

TIER_ORDER = ["fast", "reason", "critical"]


# ─── Pattern Definitions ─────────────────────────────────────────────────

_EMERGENCY = re.compile(
    r"\b(911|emergency|ambulance|chest pain|can'?t breathe|"
    r"choking|seizure|unconscious|unresponsive|bleeding|overdose|"
    r"heart attack|stroke|passed out|not breathing)\b|"
    r"\bfell\b(?!\s*(asleep|behind|short|silent|quiet|flat|in love))",
    re.IGNORECASE,
)

_ESCALATION = re.compile(
    r"\b(missed (his|her|the|a) (med|medication|pill|dose)|"
    r"hasn'?t taken|didn'?t take (his|her|the)|"
    r"no one (is|was) (here|available|scheduled)|"
    r"no coverage|gap in coverage|nobody showed|"
    r"hasn'?t shown up|didn'?t show up)\b",
    re.IGNORECASE,
)

_MEDICATION_CHANGE = re.compile(
    r"\b(change|stop|start|switch|adjust|increase|decrease|new|discontinue|hold|pause|resume) "
    r"(his|her|the|a|my)?\s*(\w+\s+){0,3}(med|medication|prescription|dosage|dose|pill)\b|"
    r"\b(med|medication|prescription|dosage|dose) (change|adjustment|update)\b",
    re.IGNORECASE,
)

_ONBOARDING = re.compile(
    r"\b(new (caregiver|member|person|helper|aide)|"
    r"add (someone|a member|a caregiver|a helper|them|her|him)|"
    r"join(ing)? the (team|circle|care)|"
    r"set(ting)? (up|me up)|"
    r"sign(ing)? up)\b",
    re.IGNORECASE,
)

_MULTI_MEMBER = re.compile(
    r"\b(tell|message|text|contact|reach out to|let .+ know|notify)\b.*"
    r"\b(and|also|both|everyone|all|the team)\b",
    re.IGNORECASE,
)


# ─── Router ───────────────────────────────────────────────────────────────

def route(message: str, member: dict | None = None) -> RouteResult:
    """Classify message intent and select model tier.

    Priority order — first match wins:
      1. Emergency keywords → critical
      2. Escalation triggers → critical
      3. Medication change → reason
      4. Onboarding signals → reason
      5. Multi-member coordination → reason
      6. Everything else → fast
    """
    msg = message.strip()

    if _EMERGENCY.search(msg):
        return RouteResult("critical", MODELS["critical"], "EMERGENCY", "emergency keywords detected")

    if _ESCALATION.search(msg):
        return RouteResult("critical", MODELS["critical"], "ESCALATION", "escalation trigger detected")

    if _MEDICATION_CHANGE.search(msg):
        return RouteResult("reason", MODELS["reason"], "MEDICATION_CHANGE", "medication change request")

    if _ONBOARDING.search(msg):
        return RouteResult("reason", MODELS["reason"], "ONBOARDING", "new member onboarding")

    if _MULTI_MEMBER.search(msg):
        return RouteResult("reason", MODELS["reason"], "MULTI_MEMBER", "multi-member coordination")

    return RouteResult("fast", MODELS["fast"], "GENERAL", "default routing")


def fallback_chain(start_model: str) -> list[str]:
    """Return models to try: start_model, then each higher tier."""
    chain = [start_model]
    start_tier = next((t for t, m in MODELS.items() if m == start_model), None)
    if start_tier and start_tier in TIER_ORDER:
        idx = TIER_ORDER.index(start_tier)
        for tier in TIER_ORDER[idx + 1:]:
            chain.append(MODELS[tier])
    return chain
