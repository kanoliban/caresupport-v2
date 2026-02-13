---
name: appointment-coordination
description: Schedule, remind, confirm, and prepare for medical appointments. Use when messages mention appointments, doctors, visits, check-ups, or scheduling.
safety_level: standard
requires_approval: true  # for schedule changes
---

# Appointment Coordination

> **Viktor equivalent:** No direct equivalent. Viktor manages Linear tickets.
> We manage doctor visits — different domain, same pattern of tracking state
> and notifying people.

## Workflows

### New Appointment
1. Family reports: "Mom has a cardiology appointment next Tuesday at 2pm"
2. Read family.md → check This Week for conflicts
3. **DRAFT**: "Adding to {recipient}'s schedule: Cardiology with Dr. {name}, Tuesday 2pm. Reply YES to confirm."
4. On confirm: update This Week + set reminder for day-before and morning-of
5. Notify relevant team members (whoever is on shift that day)

### Day-Before Reminder
Automated via care_schedules:
```
Reminder: {recipient} has {type} with Dr. {name} tomorrow at {time}.

Prep checklist:
- Insurance card
- Current medication list (I can send this)
- Allergies: {allergy list from family.md — ALWAYS include}
- Questions for the doctor: {items from "For Next Visit" section}
- Transportation: {who is taking them?}
```

**For Next Visit auto-surface:** At day-before reminder, check family.md →
"For Next Visit" section. If items exist, include them in the prep message.
After the appointment, clear those items from "For Next Visit" and log
that they were addressed (or not) in Past Appointments.

### Morning-Of Reminder
```
{recipient}'s {type} appointment is today at {time} with Dr. {name}.
Address: {if known}
Need the medication list sent to your phone? Reply MEDS.
```

### After Appointment
Prompt for notes:
```
How did {recipient}'s appointment go?
Any changes to medications or care plan?
```

If changes reported → route to care-plan-updates and/or medication-management protocol.

### Cancellation / Reschedule
1. "Need to cancel Mom's appointment Thursday"
2. **DRAFT**: "Removing: {appointment details}. Reply YES to confirm."
3. On confirm: update This Week, cancel reminders
4. Ask: "Want me to help reschedule?"
