# CareSupport Runtime

Scripts and configuration for the CareSupport care coordination agent.

## Architecture

```
/work/families/{family-id}/
├── family.md            # Operational state (members, schedule, needs, meds)
├── phone_routing.json   # Phone → member lookup
└── timeline/            # Family event timeline

/work/conversations/{phone}/
└── {YYYY-MM}.log       # Per-member conversation history

/work/scripts/caresupport/
├── config.json          # Phone numbers, account IDs (not in repo)
├── sms_handler.py       # Core: phone → family → AI reasoning → response
├── sms_gateway.py       # Twilio send/receive wrapper
├── check_verification.py # Carrier registration status checker
└── poll_inbound.py      # Inbound message processing cron
```

## V1 Supervised Loop

1. Inbound SMS → Twilio → poll_inbound.py → sms_handler.py (AI reasoning)
2. AI generates response + outreach messages
3. Slack notification to coordinator for review
4. Coordinator approves → SMS sent to family members
5. All conversations logged per-member and to family timeline

## Key Design Decisions

- **family.md is the single source of truth** — not a database, a living document
- **Session model** — fresh context per message, file is the memory
- **Human-in-the-loop for V1** — coordinator reviews outgoing SMS
- **Phone routing** — E.164 format, lookup against all registered families
- **Conversation logging** — both per-phone and per-family timeline views
