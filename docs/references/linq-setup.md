# Linq Partner API Setup — iMessage-First Messaging

> API Version: V3 | Docs: https://apidocs.linqapp.com/

CareSupport uses Linq's Partner API for iMessage-first messaging with automatic
fallback to RCS and SMS.

## Why Linq (iMessage) Over Twilio (SMS)

| Feature | Linq (iMessage) | Twilio (SMS) |
|---------|-----------------|--------------|
| Trust signal | 🔵 Blue bubble | 🟢 Green bubble |
| Read receipts | ✅ Know message was seen | ❌ Delivery only |
| Typing indicators | ✅ "..." during processing | ❌ No feedback |
| Tapback confirmations | ✅ 👍 to confirm meds | ❌ Must type "YES" |
| Encryption | ✅ End-to-end (iMessage) | ❌ Carrier network |
| Registration | None needed | ⏳ A2P 10DLC pending |

## Setup Checklist

### 1. Get Linq API Access
- [ ] Contact Linq team (https://linqapp.com/)
- [ ] Receive API token and Linq Blue phone number
- [ ] Store in `runtime/scripts/linq_config.json` (copy from `.example`)

### 2. Configure Contact Card
- [ ] Send Linq: display name ("CareSupport"), profile photo

### 3. Line Warming
- [ ] Ask Linq to warm the line (5-7 days)

### 4. Set Up Webhooks
- [ ] Deploy webhook endpoint
- [ ] Create subscription:
```bash
python runtime/scripts/linq_gateway.py webhooks  # list existing
# Or via curl:
curl -X POST https://api.linqapp.com/api/partner/v3/webhook-subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://your-endpoint/webhook?version=2026-02-03",
    "subscribed_events": [
      "message.received", "message.read", "message.delivered",
      "message.sent", "message.failed", "reaction.added", "reaction.removed"
    ]
  }'
```
- [ ] Store `signing_secret` in `linq_config.json`

### 5. Update Phone Routing
- [ ] Add `chat_id`, `service`, `transport` fields to per-family `phone_routing.json`
- [ ] `chat_id` auto-populates on first interaction

### 6. Test
```bash
python runtime/scripts/linq_gateway.py phones
python runtime/scripts/linq_gateway.py create --to "+1YOUR_PHONE" --body "CareSupport test"
python runtime/scripts/webhook_receiver.py --port 8080
```

## Architecture Integration

```
Linq webhook → webhook_receiver.py → sms_handler.handle_sms()
                                       ↓
                                    FULL enforcement pipeline:
                                    role_filter → phi_audit → AI → leakage check
                                       ↓
                                    linq_gateway.send_message()
```

The handler doesn't know or care whether the message arrived via iMessage or SMS.
The webhook receiver handles transport; the handler handles intelligence + safety.

## Flagging Prevention

Apple can disable iMessage on a number if it detects spam:
1. **Inbound-first flow** — families text CareSupport first
2. **Never send unsolicited** — only message existing care relationships
3. **Ramp gradually** — don't onboard 50 families on day 1
4. **Line warming** — 5-7 days before production use
5. **Multiple lines at scale** — shard so one flagging doesn't kill service

## Volume Limits

| Metric | Limit |
|--------|-------|
| Messages/day/line | ~3,000 (soft) |
| File attachment (URL) | 10MB |
| File attachment (pre-upload) | 100MB |
| Webhook timeout | 10 seconds |
| Webhook retries | 6 (exponential: 2s → 30s) |
