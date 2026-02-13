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
