# Runtime — Messaging Pipeline

The plumbing that connects Linq (iMessage-first) to the CareSupport agent.

All messages route through the same handler and enforcement pipeline regardless
of transport (iMessage, RCS, SMS fallback — Linq handles protocol selection).

## Data Flow — Primary (Linq Webhook / Real-Time)

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
│     ├─ Acquire family lock (serialization)   │
│     ├─ Call sms_handler.handle_sms()         │
│     ├─ Send response via linq_gateway        │
│     └─ Handle outreach + approval requests   │
│  5. Auto-populate chat_id in routing         │
└──────────────────────────────────────────────┘
```

## Data Flow — Fallback (Linq Polling)

```
Cron fires every 30-60 seconds
        │
        ▼
┌─── poll_inbound.py (cron) ──────────────────┐
│                                              │
│  1. Lists active chats from Linq API         │
│  2. Checks each chat for new messages        │
│  3. Filters to unprocessed (by message ID)   │
│  4. For each new message:                    │
│     ├─ mark_as_read() + start_typing()       │
│     └─ calls sms_handler.handle_sms()        │
│  5. Sends response via linq_gateway          │
│  6. Marks message IDs as processed           │
└──────────────────────────────────────────────┘
        │
        ▼
┌─── sms_handler.py ──────────────────────────┐
│                                              │
│  1. resolve_member() → family, member, role  │
│  2. Acquire per-family lock (serialization)  │
│  3. load_family_context() → family.md text   │
│  4. load_recent_conversations() → history    │
│  5. ENFORCEMENT:                             │
│     ├─ Pre-filter by access level            │
│     ├─ PHI audit: log context load           │
│     ├─ Check for approval responses          │
│     ├─ Classify updates (approval pipeline)  │
│     └─ Post-check for leakage               │
│  6. build_system_context() → full prompt     │
│  7. generate_response() → AI call            │
│  8. apply_updates() → family.md edits        │
│  9. log_message() → conversation log         │
│                                              │
│  Returns:                                    │
│    - response (text to send back)            │
│    - needs_outreach (other people to text)   │
│    - family_file_updates (applied)           │
│    - internal_notes                          │
│    - enforcement metadata                    │
└──────────────────────────────────────────────┘
        │
        ▼
┌─── linq_gateway.py ─────────────────────────┐
│                                              │
│  Linq Partner API V3 client:                 │
│    send_message(chat_id, body)               │
│    create_chat(to_phone, body)               │
│    start_typing(chat_id)                     │
│    mark_as_read(chat_id)                     │
│    add_reaction(message_id, type)            │
│    list_chats()                              │
│    get_chat_messages(chat_id, limit)         │
│    list_phone_numbers()                      │
│    verify_webhook_signature(payload, ...)    │
└──────────────────────────────────────────────┘
```

## Scripts

| Script | Purpose | Entry point |
|--------|---------|-------------|
| `sms_handler.py` | Core: phone → lock → enforcement → AI → response | `handle_sms(from_phone, body)` |
| `webhook_receiver.py` | Real-time Linq webhook handler (push) | `handle_webhook_event(type, data)` |
| `linq_gateway.py` | Linq Partner API V3 client | `send_message()`, `create_chat()` |
| `reaction_handler.py` | Tapback → approval pipeline bridge | `handle_reaction(msg_id, type)` |
| `poll_inbound.py` | Fallback: polls Linq API for new messages | `poll_and_process()` |
| `heartbeat.py` | 48-hour lookahead scanner | `run_heartbeat()` |
| `maintenance.py` | GC + consistency validation | `run_maintenance()` |

## Enforcement Layer

Five modules in `runtime/enforcement/` — mechanical, not optional:

| Module | What it does |
|--------|-------------|
| `role_filter.py` | Pre-filters context by access level, post-checks for leakage |
| `phi_audit.py` | HIPAA-compliant logging for every PHI access |
| `family_editor.py` | Edit-not-write file updates with backup and rollback |
| `approval_pipeline.py` | YES/NO (or 👍) confirmation for medication/member changes |
| `message_lock.py` | Per-family file lock — serializes concurrent message processing |

The structural tests (`test_structural.py`) verify all 5 modules are wired into the handler.
If any module is removed or unwired, CI fails.

## Configuration

All paths and settings in `runtime/config.py`. No hardcoded absolute paths in scripts.

```python
from config import paths, linq, linq_paths, ensure_sdk_path

ensure_sdk_path()
family_file = paths.family_file("kano")
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

## How to Run

```bash
# Process inbound messages (poll mode)
cd runtime/scripts && python poll_inbound.py

# Send a test message via Linq
cd runtime/scripts && python linq_gateway.py create --to "+1..." --body "test"

# List assigned phone numbers
cd runtime/scripts && python linq_gateway.py phones

# List active chats
cd runtime/scripts && python linq_gateway.py list-chats

# Test handler without AI call
cd runtime/scripts && python sms_handler.py --from "+1..." --body "test" --dry-run

# Run all tests
cd runtime && PYTHONPATH=. python -m pytest tests/ -v
```

## Dependencies

- Python 3.11+
- `/work/sdk/` — Viktor's SDK (tools, structured output)
- Linq Partner API account (token in linq_config.json)
