---
name: hospitalization
description: Meta-protocol for hospital admission, inpatient stay, and discharge. Coordinates medication hold, schedule pause, team notification, insurance verification, and discharge planning. Activate when ANY family member reports a hospital admission.
safety_level: critical
requires_approval: true  # discharge medication changes need confirmation
---

# Hospitalization

> **New protocol.** No Viktor equivalent.
> Source: SIM-043 (Reyes), SIM-044 (Okafor), SIM-049 (Okafor discharge)
>
> A hospitalization event changes EVERYTHING simultaneously: medications,
> schedules, insurance, care team, appointments. This meta-protocol
> coordinates all other protocols during the inpatient period.

## HARD RULES (never override)

1. **SUSPEND all home medication reminders during inpatient stay**
   - The hospital manages medications. Double-dosing from home reminders
     + hospital administration is dangerous.
   - Add all medications to the Medication Hold Log with reason: "Hospitalized"

2. **Verify admission status: "admitted" not "observation"**
   - "Observation" is outpatient and Medicare/insurance covers it differently
   - Alert primary caregiver: "Make sure the paperwork says 'admitted' not
     'observation.' This affects coverage."

3. **Medication reconciliation at discharge is MANDATORY**
   - Before resuming home medication reminders, reconcile ALL medication
     changes per the medication-management protocol's Hospital-to-Home
     Medication Reconciliation workflow.

## Triggers

- Family member reports: admitted, hospital, ER, emergency room, ambulance,
  hospitalized, inpatient, staying overnight
- Following a Tier 1 emergency that results in transport

## Phase 1: Admission

**Immediate actions (within first message exchange):**

1. Collect essential information:
   - Hospital name
   - Room number (when available)
   - Attending physician
   - Floor nurse / nursing station phone
   - Diagnosis (if known)

2. Coordinate care transitions:
   - SUSPEND all home medication reminders → add to Hold Log
   - PAUSE home care staff schedule → notify aides
   - CANCEL/RESCHEDULE all upcoming home appointments
   - NOTIFY all care team members (access-appropriate):
     - Full access: full clinical details
     - Schedule+meds: "hospitalized, location, expected duration"
     - Schedule: "care recipient is in the hospital, schedule paused"
     - Providers: clinical notification with relevant history

3. Provide hospital staff with care information (via on-site family member):
   - Full medication list with doses and schedules
   - ALL allergies (drug + non-drug) — include severity and reaction type
   - Insurance information (plan, member ID)
   - Primary physician name and phone
   - Emergency contacts
   - Advance directives status (if documented)

4. Update family.md:
   - Urgent Notes: "⚠️ HOSPITALIZED — [hospital], admitted [date]. [diagnosis]."
   - This Week: all entries replaced with hospital status
   - Recent Updates: timestamped admission entry

## Phase 2: Inpatient Stay

**Daily during hospitalization:**

1. Morning check-in with family member at hospital:
   "How is [recipient] this morning? Any updates from the medical team?"

2. Route information between family members:
   - On-site family member → remote family members (access-filtered)
   - Maintain consistent, calibrated messaging (avoid both minimizing
     and catastrophizing)

3. Track:
   - Diagnosis updates
   - Treatment plan changes
   - Expected discharge date
   - Any new medications started in hospital

4. Continue managing non-hospital care needs:
   - Update providers not involved in hospitalization
   - Handle insurance questions
   - Coordinate visitors/family logistics

## Phase 3: Discharge

**When discharge is confirmed:**

1. **Medication reconciliation** (CRITICAL — see medication-management protocol):
   - Get FULL discharge medication list from family member
   - Compare against pre-hospitalization Active Medications
   - Run interaction checks on ALL new combinations
   - Confirm: what's new, what changed, what resumes, what's discontinued
   - Identify who will administer each medication at home
   - Get primary caregiver confirmation for the complete updated list

2. **Resume home care:**
   - Notify home care staff with updated care requirements
   - Prepare discharge summary for returning aides (new meds, new restrictions,
     new equipment needs, activity limitations)
   - Resume medication reminders with updated schedule
   - Resume home care staff shifts

3. **Schedule follow-ups:**
   - Discharge follow-up with hospitalist/attending
   - Follow-up with primary physician
   - Specialist follow-ups as ordered
   - Lab work as ordered
   - Home health/PT if prescribed

4. **Update family.md:**
   - Remove hospitalization from Urgent Notes
   - Add comprehensive discharge summary to Recent Updates
   - Update Active Medications with reconciled list
   - Release medication holds in Hold Log
   - Update This Week with new schedule
   - Add hospitalization summary to Reference → Past Appointments

## Message Templates

```
Admission:   "I'm handling the coordination. [Steps being taken]. Focus on being with [recipient]."
Daily:       "Morning — how is [recipient] today? Any updates from the team?"
Discharge:   "Great news! Before [recipient] comes home, I need the medication list from discharge. What changed?"
Aide resume: "Welcome back! [Recipient] is home. Changes since hospitalization: [summary]"
```
