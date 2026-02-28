# CareRouter — Intent-Aware Model Selection

Routes each message to the right Claude model based on complexity and safety-criticality.
Implemented in `runtime/scripts/care_router.py`, wired via `sms_handler.py`.

## Model Tiers

| Tier | Model | When |
|------|-------|------|
| **Fast** | Haiku 4.5 | Greetings, schedule, check-ins, general Q&A, meta (~80%) |
| **Reason** | Sonnet 4.6 | Medication changes, onboarding, multi-member coordination (~15%) |
| **Critical** | Opus 4.6 | Emergencies, escalation triggers (~5%) |

## Routing Rules (priority order — first match wins)

| Priority | Pattern | Tier | Intent |
|----------|---------|------|--------|
| 1 | Emergency keywords (911, fell, chest pain, seizure, etc.) | Critical | EMERGENCY |
| 2 | Escalation triggers (missed medication, no coverage, nobody showed) | Critical | ESCALATION |
| 3 | Medication change signals (change/stop/start/adjust + med) | Reason | MEDICATION_CHANGE |
| 4 | Onboarding signals (new caregiver, add someone, join the team) | Reason | ONBOARDING |
| 5 | Multi-member coordination (tell X and Y, notify everyone) | Reason | MULTI_MEMBER |
| 6 | Everything else | Fast | GENERAL |

## Fallback Chain

If the routed model fails (429/529/timeout), the system falls up to the next tier:
- Fast fails → try Reason → try Critical
- Reason fails → try Critical
- Critical fails → fall back to OpenRouter cross-provider chain

## Cost Benchmarks (Feb 2026)

| Model | Input $/1M | Output $/1M | Cached Input $/1M |
|-------|-----------|------------|-------------------|
| Haiku 4.5 | $1.00 | $5.00 | $0.10 |
| Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Opus 4.6 | $5.00 | $25.00 | $0.50 |

With prompt caching (live), cached input tokens get 90% off.

## Observability

Every message logs its route to stderr:
```
[CareSupport] Route: GENERAL → fast (default routing)
[CareSupport] Route: EMERGENCY → critical (emergency keywords detected)
```

Dry-run output includes a `routing` block with tier, model, intent, and reason.
