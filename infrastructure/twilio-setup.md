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

## Architecture Notes

- Using the local 651 number as primary (not toll-free) for V1
- A2P 10DLC registration is required for carrier delivery approval on local numbers
- Inbound SMS processing cron runs every 2 minutes, checking verification status
- Viktor sandbox scripts: `/work/scripts/caresupport/`
