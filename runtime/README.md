# Runtime — Messaging Pipeline

The plumbing that connects messaging providers to the CareSupport agent.

Two transport paths: Linq (iMessage-first, primary) and Twilio (SMS fallback).
Both route through the same handler and enforcement pipeline.

## Data Flow — Primary (Linq / iMessage)

```
Inbound message arrives via Linq webhook (real-time push)
        │
        ▼
┌─── webhook_receiver.py ─────────────────────┐
│                                              │
│  1. Verify HMAC signature                    │
│  2. Deduplicate by event_id                  │
│  3. Dispatch by event type:                  │
│     ├─ message.received → sms_handler        │
│     ├─ reaction.added → reaction_handler     │
│     ├─ message.read → log                    │
│     └─ message.failed → alert                │
│  4. For inbound messages:                    │
│     ├─ Start typing indicator (iMessage)     │
│     ├─ Call sms_handler.handle_sms()         │
│     ├─ Send response via linq_gateway        │
│     └─ Handle outreach + approval requests   │
│  5. Auto-populate chat_id in routing         │
└──────────────────────────────────────────────┘
```

## Data Flow — Fallback (Twilio / SMS)

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

| Script | Transport | Purpose | Entry point |
|--------|-----------|---------|-------------|
| `sms_handler.py` | Agnostic | Core: phone → enforcement → AI → response | `handle_sms(from_phone, body)` |
| `webhook_receiver.py` | Linq | Real-time webhook handler (push) | `handle_webhook_event(type, data)` |
| `linq_gateway.py` | Linq | Linq Partner API V3 client | `send_message()`, `create_chat()` |
| `reaction_handler.py` | Linq | Tapback → approval pipeline bridge | `handle_reaction(msg_id, type)` |
| `poll_inbound.py` | Twilio | Cron: polls Twilio, processes new messages | `poll_and_process()` |
| `twilio_proxy.py` | Twilio | Library: Twilio API wrapper (Pipedream) | `send_sms()`, `list_inbound_messages()` |
| `sms_gateway.py` | Twilio | Library: Twilio API wrapper (Custom API) | `send_sms()`, `list_inbound()` |

## Configuration

All paths and settings in `runtime/config.py`. No hardcoded absolute paths in scripts.

```python
from config import paths, twilio, linq, linq_paths, ensure_sdk_path

ensure_sdk_path()
family_file = paths.family_file("kano")
```

### Twilio credentials: `runtime/scripts/config.json`
```json
{
    "twilio_account_sid": "AC...",
    "caresupport_phone": "+1...",
    "twilio_phone_sid": "PN..."
}
```

### Linq credentials: `runtime/scripts/linq_config.json`
```json
{
    "linq_api_token": "YOUR_TOKEN",
    "linq_phone": "+1...",
    "base_url": "https://api.linqapp.com/api/partner/v3",
    "webhook_signing_secret": "YOUR_SECRET"
}
```

## Known Issues

See `docs/exec-plans/tech-debt-tracker.md` for the full list. Key ones:

- ✅ ~~`family_file_updates` never applied~~ — Fixed: family_editor with backup/rollback
- ✅ ~~Role filter not wired~~ — Fixed: pre-filter + post-check in handler
- ✅ ~~PHI audit not wired~~ — Fixed: all event types logged
- ✅ ~~SMS-only transport~~ — Fixed: Linq (iMessage/RCS/SMS) as primary, Twilio as fallback
- Two Twilio gateways (twilio_proxy + sms_gateway) — consolidate eventually
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
