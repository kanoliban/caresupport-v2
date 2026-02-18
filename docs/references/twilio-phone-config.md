# Twilio Phone Number Configuration — (651) 372-1746

> Last updated: 2026-02-13
> Number SID: `PN60ffbd12996ef5e740eca559fcf87c01`

This documents the current Twilio Console configuration for CareSupport's primary local number and what needs to change before go-live.

---

## Current State (as of 2026-02-13)

### Voice Configuration

| Setting | Current Value | Status |
|---------|--------------|--------|
| Routing | US1 Regional | ✅ Active |
| Configure with | Webhook, TwiML Bin, Function, Studio Flow, Proxy Service | — |
| A call comes in | Webhook → `https://demo.twilio.com/welcome/voice/` (HTTP POST) | ⚠️ Default demo |
| Primary handler fails | Webhook → (empty) | — |
| Call status changes | (empty) | — |
| Caller Name Lookup | Disabled | — |
| Emergency Calling | Registered — 525 5th Ave NW, New Brighton, Minnesota, 55112 | ✅ Set |

### Messaging Configuration

| Setting | Current Value | Status |
|---------|--------------|--------|
| A2P 10DLC | Registration submitted, pending carrier vetting | ⏳ Pending |
| Routing | US1 Regional | ✅ Active |
| Messaging Service | Low Volume Mixed A2P Messaging Service (`MG3ff687ba222cb036d2dcf0b4b1490be9`) | ✅ Linked |
| Configure with | Webhook, TwiML Bin, Function, Studio Flow, Proxy Service | — |
| A message comes in | Webhook → `https://demo.twilio.com/welcome/sms/reply` (HTTP POST) | 🔴 **Needs change** |
| Primary handler fails | Webhook → (empty) | — |

---

## What Needs to Change (Go-Live Checklist)

### 1. Inbound SMS Webhook URL — REQUIRED

**Current:** `https://demo.twilio.com/welcome/sms/reply` (Twilio's default demo — just echoes back a canned response)

**Needs to be:** CareSupport's SMS handler endpoint

**Why:** This is how Twilio tells us when someone texts the CareSupport number. When a family member sends an SMS to (651) 372-1746, Twilio fires an HTTP POST to this URL with the message body, sender phone number, and metadata. Our handler receives it, looks up the family member, runs the AI agent, and responds.

**Options for the handler URL:**
- **Viktor Spaces app** — a Vercel-hosted endpoint (e.g., `https://caresupport-sms.vercel.app/api/webhook`)
- **External service** — AWS Lambda, Cloud Function, or any HTTPS endpoint
- **Twilio Function** — serverless function hosted directly in Twilio

**When to change:** The moment A2P 10DLC campaign is approved and we're ready to receive live messages.

### 2. Inbound Voice Webhook URL — LOW PRIORITY (V2+)

**Current:** `https://demo.twilio.com/welcome/voice/` (Twilio's default demo — plays a welcome message)

**Needs to be:** CareSupport's voice handler (future — not needed for V1 SMS-only)

**Why:** If someone calls (651) 372-1746 instead of texting, this controls what happens. For V1 we could leave it as the demo or set up a simple TwiML response: "Thanks for calling CareSupport. Please text this number for care coordination."

### 3. A2P 10DLC Approval — WAITING

**Current status:** Campaign submitted (2026-02-13), pending carrier vetting

**What it unblocks:** All outbound SMS from this number. Until approved, carriers (AT&T, T-Mobile, Verizon) will block messages with error 30034.

**Expected timeline:** A few hours to 24-48 hours for Low Volume campaigns.

**No action needed** — just waiting. Viktor has a cron checking status every 2 minutes.

---

## What's Already Correct (Don't Touch)

- ✅ **Messaging Service** linked to `Low Volume Mixed A2P Messaging Service` — this ties the number to the A2P campaign
- ✅ **Message routing** is Active (US1 region)
- ✅ **Emergency address** is registered (required for local numbers)
- ✅ **Number is in the Messaging Service sender pool** — confirmed in Twilio Console

---

## Related Files

- [`infrastructure/twilio-setup.md`](./twilio-setup.md) — Account details, phone numbers, A2P registration IDs, messaging services
- [`runtime/scripts/sms_handler.py`](../runtime/scripts/sms_handler.py) — SMS processing logic
- [`runtime/scripts/poll_inbound.py`](../runtime/scripts/poll_inbound.py) — Inbound SMS polling (interim solution until webhook is live)
