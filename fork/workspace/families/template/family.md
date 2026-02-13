---
family_id: "{family_id}"
created: "{date}"
last_updated: "{timestamp}"
primary_caregiver: "{phone_number}"
care_recipient: "{name}"
status: active
---

# Current
<!-- ═══════════════════════════════════════════════════════════ -->
<!-- ALWAYS LOADED — agent reads this section every message     -->
<!-- Keep this under 2000 tokens. Move historical data to       -->
<!-- Reference when Current grows too large.                    -->
<!-- ═══════════════════════════════════════════════════════════ -->

## Care Recipient
- Name:
- Age:
- Primary conditions:
- Mobility:
- Cognitive status:
- Allergies:
- Blood type:
- Language:
- Emergency contact:

## Care Team

| Role | Name | Phone | Access Level | Hours | Active |
|---|---|---|---|---|---|
| Primary caregiver | | | full | | ✓ |
| Secondary caregiver | | | full | | ✓ |
| Weekday aide | | | schedule+meds | M-F 8a-4p | ✓ |
| Weekend aide | | | schedule+meds | Sa-Su 8a-4p | ✓ |
| Primary physician | | | provider | | ✓ |

### Access Levels
- **full** — Sees everything. Can approve care plan changes.
- **schedule+meds** — Sees schedule, medications, urgent notes. Cannot see insurance, financial, or family-only discussions.
- **schedule** — Sees schedule and urgent notes only.
- **provider** — Sees medical info, medications, appointments, care team.

## This Week

- Mon:
- Tue:
- Wed:
- Thu:
- Fri:
- Sat:
- Sun:

## Active Medications

| Medication | Dose | Schedule | Prescriber | Pharmacy | Last Confirmed |
|---|---|---|---|---|---|
| | | | | | |

## Urgent Notes
<!-- Active concerns that every team member should see -->
- (none)

## Recent Updates
<!-- Last 10 updates, timestamped. Oldest roll to Reference. -->
- {date}: Family created. Initial setup in progress.

---

# Reference
<!-- ═══════════════════════════════════════════════════════════ -->
<!-- LOADED ON DEMAND — agent pulls specific sections when      -->
<!-- the conversation requires historical or detailed context.  -->
<!-- No token limit, but each section should be self-contained. -->
<!-- ═══════════════════════════════════════════════════════════ -->

## Full Medication History
<!-- All medication changes, with dates, reasons, and who approved -->

## Past Appointments
<!-- Chronological. Include outcomes and follow-up items. -->

## Provider Contacts

| Role | Name | Practice | Phone | Fax | Portal |
|---|---|---|---|---|---|
| Primary care | | | | | |
| Cardiologist | | | | | |
| Pharmacy | | | | | |

## Insurance & Coverage
- Plan:
- Member ID:
- Group:
- Deductible: $ / $ used
- Key covered services:
- Prior auth required for:

## Care Preferences & Personality
<!-- How the care recipient likes things done. Personal details that -->
<!-- make care feel human, not clinical. Update as you learn.       -->

## Emergency Protocols
<!-- Family-specific emergency procedures -->

### Fall
1.
2.
3.

### Missed Medication
1.
2.

### Confusion / Disorientation
1.
2.

### Chest Pain / Difficulty Breathing
1. Call 911 immediately
2. Notify all full-access members
3. Location: [home address]

## Decision History
<!-- Major care decisions with context, date, and who decided -->
<!-- "Why did we switch from Brand X?" — the answer is here.  -->
