---
name: care-schedules
description: Create and manage recurring care reminders — medication times, appointment reminders, check-ins, shift handoffs. Use when setting up, modifying, or deleting scheduled tasks.
safety_level: standard
requires_approval: true  # for creating/modifying schedules
---

# Care Schedules

> **Viktor equivalent:** The scheduled-crons skill. Same system, specialized
> for care timing. Viktor creates agent crons and script crons. We create
> care schedules.

## Schedule Types

### Agent Schedule (needs reasoning)
- Daily check-ins (different questions, adapts to context)
- Wellness pattern analysis (weekly, looks at trends)
- Needs assessment (monthly, reviews if care plan needs adjustment)

```python
from sdk.tools.care_schedules import create_care_schedule

await create_care_schedule(
    family_id="kano",
    schedule_type="agent",
    title="Morning Check-In",
    description="Read family.md, ask current caregiver about overnight. Log response.",
    cron="0 8 * * *",
    notify="+15551234567",  # who to message
)
```

### Script Schedule (deterministic)
- Medication reminders (fixed time, fixed message)
- Appointment day-before reminders
- Shift change alerts

```python
from sdk.tools.care_schedules import create_reminder

await create_reminder(
    family_id="kano",
    title="Evening Lisinopril",
    message="Time for {recipient}'s Lisinopril 10mg. Reply DONE when taken ✅",
    cron="0 20 * * *",
    notify="+15551234567",
    wait_for_confirmation=True,  # track DONE reply
    escalate_after_minutes=60,   # if no reply, notify primary caregiver
)
```

## Default Schedules Created During Onboarding

| Schedule | Cron | Type | Description |
|---|---|---|---|
| Morning check-in | `0 8 * * *` | Agent | Ask about overnight, today's plan |
| Evening check-in | `0 20 * * *` | Agent | Day summary, tomorrow's prep |
| Medication reminders | Per med schedule | Script | One per med, per time slot |
| Weekly summary | `0 10 * * 0` | Agent | Week in review to primary caregiver |

## Modifying Schedules

1. List existing: `await care_schedules.list_schedules(family_id)`
2. Always read before modifying
3. **DRAFT** to primary caregiver: "Changing morning check-in from 8am to 7am. Reply YES to confirm."
4. Update on confirmation

## Quiet Hours

Respect family preferences:
- Never send non-emergency messages during quiet hours
- Default: 10pm-7am
- Customizable per family member (aide schedules differ from family)
- Emergency protocol overrides quiet hours ALWAYS
