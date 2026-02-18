# Runtime — SMS Pipeline

The plumbing that connects Twilio SMS to the CareSupport agent.

## Data Flow

```
Inbound SMS arrives at Twilio
        │
        ▼
┌─── poll_inbound.py (cron, every 30-60s) ───┐
│                                              │
│  1. Lists recent messages via twilio_proxy   │
│  2. Filters to unprocessed (by SID)         │
│  3. For each new message:                    │
│     └─ calls sms_handler.handle_sms()       │
│  4. Sends response via twilio_proxy          │
│  5. Sends outreach to other members          │
│  6. Marks SIDs as processed                  │
└──────────────────────────────────────────────┘
        │
        ▼
┌─── sms_handler.py ──────────────────────────┐
│                                              │
│  1. resolve_phone() → family, member, role   │
│  2. load_family_context() → family.md text   │
│  3. load_recent_conversations() → history    │
│  4. build_system_context() → full prompt     │
│  5. generate_response() → AI call            │
│  6. log_message() → conversation log         │
│                                              │
│  Returns:                                    │
│    - sms_response (text to send back)        │
│    - needs_outreach (other people to text)   │
│    - family_file_updates (⚠️ NOT APPLIED)    │
│    - internal_notes                          │
└──────────────────────────────────────────────┘
        │
        ▼
┌─── twilio_proxy.py ─────────────────────────┐
│                                              │
│  Wraps Twilio REST API via Pipedream proxy:  │
│    send_sms(to, body)                        │
│    list_inbound_messages(limit)              │
│    list_outbound_messages(limit)             │
│    get_message(sid)                          │
│    get_account_balance()                     │
│    update_phone_webhook(url)                 │
└──────────────────────────────────────────────┘

┌─── sms_gateway.py ──────────────────────────┐
│                                              │
│  Alternative gateway using custom API        │
│  integration (direct Twilio REST, not        │
│  Pipedream proxy). Draft approval support.   │
│                                              │
│  CLI: send, poll, check, process, balance    │
└──────────────────────────────────────────────┘
```

## Scripts

| Script | Purpose | Entry point |
|--------|---------|-------------|
| `sms_handler.py` | Core: phone → AI → response | `handle_sms(from_phone, body)` |
| `poll_inbound.py` | Cron: polls Twilio, processes new messages | `poll_and_process()` |
| `twilio_proxy.py` | Library: Twilio API wrapper (Pipedream) | `send_sms()`, `list_inbound_messages()` |
| `sms_gateway.py` | Library: Twilio API wrapper (Custom API) | `send_sms()`, `list_inbound()`, `process_inbound()` |

## Configuration

All paths and settings in `runtime/config.py`. No hardcoded absolute paths in scripts.

```python
from config import paths, twilio, ensure_sdk_path

ensure_sdk_path()
family_file = paths.family_file("kano")
```

Twilio credentials in `runtime/scripts/config.json`:
```json
{
    "twilio_account_sid": "AC...",
    "caresupport_phone": "+1...",
    "twilio_phone_sid": "PN..."
}
```

## Known Issues

See `docs/exec-plans/tech-debt-tracker.md` for the full list. Key ones:

- `family_file_updates` are generated but never applied to family.md
- Role filter exists but is not wired into the handler
- PHI audit logger exists but is not wired into the handler
- No delivery verification for outbound messages
- Two gateway implementations (twilio_proxy + sms_gateway) — need to consolidate
- No per-family message queue (concurrent messages could race on family.md)

## How to Run

```bash
# Process inbound messages (one-shot)
cd runtime/scripts && python poll_inbound.py

# Send a test SMS
cd runtime/scripts && python sms_gateway.py send --to "+1..." --body "test"

# Check Twilio balance
cd runtime/scripts && python sms_gateway.py balance

# Test handler without AI call
cd runtime/scripts && python sms_handler.py --from "+1..." --body "test" --dry-run
```

## Dependencies

- Python 3.11+
- `/work/sdk/` — Viktor's SDK (tools, structured output)
- Twilio account (credentials in config.json)
- Pipedream Twilio integration OR custom API integration
