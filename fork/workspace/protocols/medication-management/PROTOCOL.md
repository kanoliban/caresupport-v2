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

1. **Never update Active Medications without primary caregiver + prescriber order**
   - New medication → requires prescriber order + primary caregiver confirmation
   - Dose change → requires prescriber order + primary caregiver confirmation
   - Discontinuation → requires prescriber order + primary caregiver confirmation
   - Recording "med taken" → NO confirmation needed
   - Full access ≠ medication change authority. A family member saying "increase
     the dose" is NOT sufficient. A prescriber must order it.

2. **Always check drug interactions AND food-drug interactions before confirming**
   - Call `pharmacy.check_interactions()` with full active med list + new med
   - Check DIETARY interactions: MAO inhibitors + tyramine, warfarin + vitamin K,
     methotrexate + folate-rich foods, statins + grapefruit, etc.
   - If interaction found → alert immediately, do NOT add to file
   - Check allergy list in family.md EVERY TIME. No exceptions.

3. **Always include drug name AND dose in every medication message**
   - "Time for Mom's meds" ✗
   - "Time for Mom's Lisinopril 10mg" ✓

4. **Never relay medication advice**
   - Family asks "should Mom take extra?" → "That's a question for Dr. [Name]. Want me to message them?"
   - You coordinate, you don't prescribe

5. **Adjust instruction depth by administrator**
   - If the person giving the medication is a trained provider (RN, CNA with
     med cert) → standard instructions
   - If the person is a family member or untrained caregiver → include detailed
     administration guidance (injection technique, timing with food, what to
     watch for)
   - Check who is currently on-shift before sending medication reminders

6. **Side effect reports from cognitively impaired recipients are VALID**
   - If the care recipient says "this makes me feel foggy" or describes a
     symptom, log it and route to the prescriber. Cognitive impairment does
     not invalidate self-reported side effects.

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

### Refill tracking (proactive)
1. When a medication is added or refilled, note the fill date and quantity
2. Calculate depletion date: fill_date + (quantity / daily_doses)
3. At depletion_date - 7 days: message primary caregiver about upcoming refill
4. On confirmation → call `pharmacy.request_refill()`
5. Log in Recent Updates
6. If family member reports low supply before the calculated date, adjust tracking

### Medication Hold
1. Triggered by: ER/hospital visit, pre-surgery, provider instruction, safety event
2. Update Active Medications: Status → "held (reason)"
3. Add to Medication Hold Log: medication, date, reason
4. SUSPEND all reminders for held medications
5. Notify relevant care team members
6. A hold requires EXPLICIT RELEASE: provider order or primary caregiver confirmation
7. When released: update Status → "active", update Hold Log with release date,
   RESUME reminders
8. NEVER auto-release a hold. A human must confirm.

### Hospital-to-Home Medication Reconciliation
1. At discharge, get the FULL list of medications from the discharging provider
2. Compare against Active Medications in family.md:
   - What's NEW? (added during hospitalization)
   - What CHANGED? (dose adjustments)
   - What was HELD? (needs explicit release)
   - What was DISCONTINUED?
3. For each new medication: run interaction check against ALL home medications
4. Check: who will administer each medication at home? (injection delegation, etc.)
5. Update family.md with complete reconciled medication list
6. Notify ALL care team members with relevant medication access
7. Resume home medication reminders with updated schedule

### Location Transition Medication Check
1. When care recipient moves to a new location (day program, respite, family
   visit, hospital), PROACTIVELY verify medication logistics:
   "Will [recipient] have their [time] dose with them?"
2. If medications need to travel: remind about labeling and administration instructions
3. If someone else will administer: verify they know the medication, dose, and timing

## Message Templates

```
Reminder:  "Hi {name}, time for {recipient}'s {med} {dose}. Reply DONE when taken ✅"
Missed:    "{recipient}'s {med} {dose} was due at {time}. Has it been taken?"
Change:    "Updating {recipient}'s meds: {old} → {new}, per Dr. {prescriber}. Reply YES to confirm."
Confirmed: "Got it ✅ {med} {dose} logged at {time}"
Refill:    "{med} refill due in {days} days. Want me to request from {pharmacy}?"
```
