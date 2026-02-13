---
name: medication-management
description: Track, remind, update, and verify medications for the care recipient. Use when ANY medication-related message arrives — taken, missed, changed, refill, side effects, or questions.
safety_level: critical
requires_approval: true  # for changes only, not for recording doses taken
---

# Medication Management

> **Viktor equivalent:** No direct equivalent. Viktor doesn't manage medications.
> This is the highest-stakes protocol in the system.

## HARD RULES (never override)

1. **Never update Active Medications without primary caregiver confirmation**
   - New medication → confirm with primary caregiver
   - Dose change → confirm with primary caregiver
   - Discontinuation → confirm with primary caregiver
   - Recording "med taken" → NO confirmation needed

2. **Always check drug interactions before confirming a new medication**
   - Call `pharmacy.check_interactions()` with full active med list + new med
   - If interaction found → alert immediately, do NOT add to file

3. **Always include drug name AND dose in every medication message**
   - "Time for Mom's meds" ✗
   - "Time for Mom's Lisinopril 10mg" ✓

4. **Never relay medication advice**
   - Family asks "should Mom take extra?" → "That's a question for Dr. [Name]. Want me to message them?"
   - You coordinate, you don't prescribe

## Triggers

Activate this protocol when the message contains:
- Medication names (match against Active Medications in family.md)
- Words: meds, medicine, pill, prescription, refill, pharmacy, dose, taken, missed, side effect
- Scheduled medication reminder (via care_schedules)

## Workflows

### Recording a dose taken
1. Member texts "done" or "taken" or "[med name] done"
2. Read family.md → Active Medications
3. Match to the scheduled medication for current time window (±2 hours)
4. Update `Last Confirmed` column with current timestamp
5. Respond: "Got it ✅ [Med] [dose] logged at [time]"
6. If multiple meds were due, ask: "Also the [other med]?"

### Missed medication alert
1. Care schedule fires at [scheduled time + 1 hour] with no confirmation
2. Read family.md → who is currently with care recipient?
3. Message that person: "[Recipient]'s [med] [dose] was due at [time]. Has it been taken?"
4. If no response in 30 min → escalate to primary caregiver
5. Log outcome in Recent Updates

### Medication change (from provider visit or family decision)
1. Member reports a change: "Dr. Smith increased Lisinopril to 20mg"
2. Read family.md → verify Lisinopril exists in Active Medications
3. Check interactions with new dose if applicable
4. **DRAFT**: "I'd like to update [Recipient]'s file: Lisinopril 10mg → 20mg, per Dr. Smith. Reply YES to confirm."
5. Wait for primary caregiver YES
6. Update Active Medications + log in Full Medication History with date and reason
7. Notify all schedule+meds and above: "[Recipient]'s Lisinopril changed to 20mg starting today"

### New medication
1. Same as change, but also run interaction check
2. Add to Active Medications with all fields
3. Set up reminder in care_schedules if recurring

### Refill needed
1. Track via `pharmacy.check_refill_status()` or family report
2. Message primary caregiver: "[Med] refill due. Want me to request it from [Pharmacy]?"
3. On YES → call `pharmacy.request_refill()`
4. Log in Recent Updates

## Message Templates

```
Reminder:  "Hi {name}, time for {recipient}'s {med} {dose}. Reply DONE when taken ✅"
Missed:    "{recipient}'s {med} {dose} was due at {time}. Has it been taken?"
Change:    "Updating {recipient}'s meds: {old} → {new}, per Dr. {prescriber}. Reply YES to confirm."
Confirmed: "Got it ✅ {med} {dose} logged at {time}"
Refill:    "{med} refill due in {days} days. Want me to request from {pharmacy}?"
```
