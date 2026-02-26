# Model Routing — Cost Optimization

Rules for selecting models via OpenRouter based on message complexity.

## Current Model Fallback Chain

```python
_MODEL_FALLBACK = [
    "anthropic/claude-haiku-4-5",     # Primary — fast, cheap
    "google/gemini-2.5-flash",        # Fallback 1
    "openai/gpt-4o-mini",             # Fallback 2
]
```

## Routing Recommendations

| Intent | Recommended Model | Reasoning |
|--------|-------------------|-----------|
| GREETING / WHO_ARE_YOU | Haiku | Zero reasoning needed, pure personality |
| SCHEDULE / AVAILABILITY | Haiku | Straightforward lookup and formatting |
| CHECK_IN / OUTREACH | Haiku | Template-based messages |
| GENERAL_QUESTION | Haiku | Simple Q&A from loaded context |
| META / CORRECTION | Haiku | Acknowledge and record |
| MEDICATION (recording taken) | Haiku | Simple log operation |
| MEDICATION (change request) | Sonnet | Requires approval gating reasoning |
| ONBOARDING / NEW_MEMBER | Sonnet | Multi-step data collection, judgment calls |
| TASK_REQUEST (multi-member coordination) | Sonnet | Complex scheduling across multiple people |
| Emergency | Sonnet | Safety-critical — maximize reasoning quality |

## Implementation Notes

This is currently informational. The sms_handler.py model selection is static
(always tries Haiku first with fallback chain). Future work:

1. Add intent classification as a cheap pre-call (Haiku classifies, result selects model)
2. Or: let the routing doc guide the agent to flag when Sonnet is needed
3. Track token usage per intent to validate cost savings

## Cost Benchmarks (approximate)

| Model | Input $/1M tokens | Output $/1M tokens |
|-------|-------------------|--------------------|
| Claude Haiku 4.5 | $0.80 | $4.00 |
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| GPT-4o Mini | $0.15 | $0.60 |

For a typical greeting exchange (~500 input tokens, ~100 output tokens):
- Haiku: ~$0.0008
- Sonnet: ~$0.003 (3.75x more expensive for the same quality of response)
