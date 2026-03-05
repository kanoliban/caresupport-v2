# Available Tools (CareSupport)

> Viktor equivalent: sdk/docs/tools.md — same source-of-truth pattern.
> Lists every callable function. Core modules always present; healthcare
> integrations appear when connected.

## Usage

```python
from sdk.tools import messaging

await messaging.send_message(
    phone="+15551234567",
    body="Time for Mom's Lisinopril 10mg. Reply DONE when taken ✅",
    family_id="kano"
)
```

---

## Core Modules (always present)

### messaging
- `send_message` — Send SMS/iMessage to one member
- `send_group_message` — Send to all members at an access level
- `send_confirmation_request` — Draft/approval via YES/NO reply
- `read_conversation` — Read conversation history

### family_admin
- `list_family_members` — List care team
- `add_family_member` — Add member (requires approval)
- `update_member_role` — Change role/access (requires approval)
- `remove_family_member` — Remove member (requires approval)
- `get_confirmations` — Check pending YES/NO replies

### care_schedules
- `create_care_schedule` — Agent-type recurring schedule
- `create_reminder` — Script-type recurring reminder
- `list_schedules` — List all active schedules
- `delete_schedule` — Remove a schedule (requires approval)
- `trigger_schedule` — Run a schedule immediately

### email
- `send_email` — Send email to provider/insurance

### utils
- `quick_health_search` — Search authoritative health info
- `file_to_markdown` — Convert PDF/DOCX to markdown
- `ai_structured_output` — Parse unstructured text to schema

### emergency
- `trigger_emergency_alert` — Mass-notify all full-access members
- `notify_provider_urgent` — Urgent message to provider

---

## Healthcare Integration Modules (present when connected)

### pharmacy (via Surescripts)
- `lookup_medication` — Drug info, side effects, uses
- `check_interactions` — Drug-drug interaction check
- `check_refill_status` — Refill availability
- `request_refill` — Request prescription refill

### calendar (via Google/Apple Calendar)
- `list_appointments` — Upcoming appointments
- `create_appointment` — Schedule with reminders
- `cancel_appointment` — Cancel with reminder cleanup

### insurance (via payer APIs)
- `check_coverage` — Service coverage lookup
- `get_deductible_status` — Deductible/OOP tracking

### health_records (via Epic/Cerner/FHIR)
- `get_recent_labs` — Lab results
- `get_visit_summary` — Provider visit notes

---

## Translation from Viktor

| Viktor Module | CareSupport Module | Functions |
|---|---|---|
| default_tools (Slack) | messaging | 4 |
| slack_admin_tools | family_admin | 5 |
| scheduled_crons | care_schedules | 5 |
| email_tools | email | 1 |
| utils_tools | utils | 3 |
| browser_tools | *(removed)* | — |
| docs_tools | *(removed)* | — |
| thread_orchestration_tools | *(removed)* | — |
| viktor_spaces_tools | *(removed)* | — |
| *(none)* | emergency | 2 |
| *(none)* | pharmacy | 4 |
| *(none)* | calendar | 3 |
| *(none)* | insurance | 2 |
| *(none)* | health_records | 2 |

**Viktor core:** 9 modules, 45 functions
**CareSupport core:** 6 modules, 20 functions
**CareSupport with all integrations:** 10 modules, 31 functions

Smaller surface area. Tighter. Every function maps to a care action.
