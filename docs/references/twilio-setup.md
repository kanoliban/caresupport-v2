# Twilio Infrastructure Setup

> Last updated: 2026-02-13

## Account Details

| Field | Value |
|-------|-------|
| Account SID | `ACe6bfbd5b18c9d2fe0eadd1039080ac5e` |
| Account Type | Full (upgraded from trial) |
| Balance | $20.00 |

## Phone Numbers

### Local Number (Primary — V1)
- **Number:** (651) 372-1746 / `+16513721746`
- **Use:** Primary CareSupport number for V1 launch

### Toll-Free Number
- **Number:** (844) 200-7742 / `+18442007742`
- **SID:** `PN582e1702cad70cd4a48dc58f7260c7ff`

## A2P 10DLC Registration

Submitted 2026-02-13. Required for carrier-approved SMS delivery on local numbers.

| Resource | ID |
|----------|----|
| Customer Profile | `BUb146ace2079d411a68b4aa770d43080d` |
| A2P Brand | `BN4ebc0e01aa1243b79a09e31b14e4c66c` |
| A2P Campaign | `CMa9f58417d4887649193a6a4252111b04` |

**Status:** Pending carrier vetting

## Messaging Services

| Name | SID | Notes |
|------|-----|-------|
| Low Volume Mixed A2P | `MG3ff687ba222cb036d2dcf0b4b1490be9` | Linked to A2P campaign; `+16513721746` in sender pool |
| CareSupport | `MGdbb1d70807951044a76e663288cf32023` | — |

## Phone Number Configuration — (651) 372-1746

The Twilio Console phone number config page controls how calls and messages are routed.

### Voice Configuration
| Setting | Current Value | Action Needed |
|---------|--------------|---------------|
| A call comes in | Webhook → `https://demo.twilio.com/welcome/voice/` | **Change later** — point to CareSupport voice handler if/when voice is supported |
| Primary handler fails | Webhook → (empty) | No action |
| Caller Name Lookup | Disabled | No action |
| Emergency Address | 525 5th Ave NW, New Brighton, MN 55112 | Already set ✅ |

### Messaging Configuration
| Setting | Current Value | Action Needed |
|---------|--------------|---------------|
| Messaging Service | `Low Volume Mixed A2P Messaging Service` | Already linked to A2P campaign ✅ |
| Message routing | Active (US1 Region) | Already set ✅ |
| A message comes in | Webhook → `https://demo.twilio.com/welcome/sms/reply` | **Change at go-live** — point to CareSupport SMS handler endpoint |
| Primary handler fails | Webhook → (empty) | No action |

### What's Already Done (no action needed)
- ✅ Number linked to correct Messaging Service (the one tied to A2P campaign)
- ✅ A2P 10DLC registration submitted and pending carrier vetting
- ✅ Number added to Messaging Service sender pool
- ✅ Emergency address registered

### What Needs To Change Before Go-Live
1. **SMS webhook URL** — Currently `demo.twilio.com/welcome/sms/reply` (Twilio's default demo). Must be changed to CareSupport's actual SMS handler endpoint once the bridge is deployed. This is a build step Viktor handles, not a manual config step.
2. **Voice webhook URL** — Optional. Only needed if CareSupport adds voice support. Can remain as demo for now.

### Why The Webhook URL Matters
When a family member texts (651) 372-1746:
1. Twilio receives the SMS
2. Twilio sends the message body + sender phone to whatever URL is configured in "A message comes in"
3. That endpoint processes the message (routes to family, invokes agent, sends response)

Currently it hits Twilio's demo endpoint (which just replies "Thank you for your message"). Once we deploy the CareSupport SMS bridge, we swap this to our endpoint and messages flow to the agent.

## Toll-Free Number Configuration — (844) 200-7742

### Status
- **Toll-Free Verification:** Submitted 2026-02-13, pending review (24-72 hrs typical)
- **Use case:** Backup / future use. Not primary for V1.
- If TF verification clears before A2P 10DLC, can use as primary temporarily

## Architecture Notes

- Using the local 651 number as primary (not toll-free) for V1
- A2P 10DLC registration is required for carrier delivery approval on local numbers
- Inbound SMS processing cron runs every 2 minutes, checking verification status
- Viktor sandbox scripts: `/work/scripts/caresupport/`
- Both numbers are blocked from sending until their respective registrations clear
- Whichever registration clears first becomes the active sending number
