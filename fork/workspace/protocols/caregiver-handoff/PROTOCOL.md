---
name: caregiver-handoff
description: Manage shift transitions between caregivers. Use when a caregiver's shift is ending and another is beginning, or when asking for a status update during transitions.
safety_level: standard
requires_approval: false
---

# Caregiver Handoff

> **Viktor equivalent:** No direct equivalent. Viktor doesn't have "shifts."
> This solves the information gap when care transfers between people.

## Trigger

- Scheduled shift change (from care_schedules)
- Manual request: "I'm heading out, [Name] is taking over"

## Handoff Flow

1. Read family.md → compile since last handoff:
   - Meals (what, when)
   - Medications (confirmed? missed?)
   - Mood and behavior
   - Any incidents or concerns
   - Upcoming tasks for next shift

2. Message outgoing caregiver:
   ```
   Before you go — quick summary for handoff:
   Anything to add about today that {incoming} should know?
   ```

3. Message incoming caregiver:
   ```
   Handoff from {outgoing}:
   - Last meal: {time, what}
   - Meds: {status}
   - Mood: {description}
   - Concerns: {any}
   - Next up: {upcoming task/appointment}
   ```

4. Log handoff in Recent Updates

## What a Good Handoff Includes

- **Always**: last meal, medication status, mood
- **If applicable**: any falls or incidents, bathroom assistance timing, pain level
- **Upcoming**: next medication due time, appointments, visitors expected
- **Context**: "She's been asking about her sister today" — emotional context matters

## Missed Handoff

If outgoing caregiver doesn't respond to handoff prompt:
1. Wait 15 minutes
2. Compile automated summary from today's logged data
3. Send to incoming with note: "Auto-generated from today's logs (couldn't reach {outgoing})"
4. Alert primary caregiver if pattern repeats

## Rotating/New Staff Identity Verification

For professional caregivers (agency aides, rotating CNAs):
1. First message from a new phone number claiming to be staff:
   - Verify: "Hi! Can you confirm the agency name and the client's name?"
   - Do NOT share any PHI until identity is confirmed.
   - If the agency is documented in family.md and the name is correct → proceed.
   - If not → "I'll need to check with [primary caregiver] before sharing
     information. Just a moment."
2. For known rotating staff (documented in family.md with phone numbers):
   - Normal handoff, access-level filtered per their documented role.
3. Track rotation patterns in family.md for scheduling optimization.

## Cold-Start Orientation for New Caregivers

When a new caregiver joins the care team for the first time:
1. Provide a comprehensive orientation summary (access-level filtered):
   - Care recipient name, conditions, mobility status
   - Current medications + schedule (if schedule+meds access)
   - Daily routine and preferences
   - Emergency protocols (customized to this family)
   - Key things that work well ("She responds to music", "He prefers to be
     called Mr. Martinez")
   - Things to avoid ("Don't mention the nursing home")
2. Ask: "Any questions before your shift starts?"
3. Check in 1 hour into first shift: "How is everything going? Any questions?"
4. End-of-first-shift: extra-detailed handoff prompt to gather observations
