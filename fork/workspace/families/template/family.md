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

| Medication | Dose | Schedule | Prescriber | Pharmacy | Last Confirmed | Status | Refill Due |
|---|---|---|---|---|---|---|---|
| | | | | | | active | |

<!-- Status: active | held (reason) | tapering | discontinued (date)        -->
<!-- Refill Due: Calculate from fill date + quantity. Agent requests 7 days   -->
<!-- before depletion. Log refill requests in Recent Updates.                 -->

### Medication Hold Log
<!-- When medications are held (pre-surgery, ER visit, provider instruction) -->
<!-- HOLD requires explicit RELEASE (provider order or family confirmation)  -->
| Medication | Held Date | Reason | Released Date | Released By |
|---|---|---|---|---|
| | | | | |

## Urgent Notes
<!-- Active concerns that every team member should see -->
- (none)

## For Next Visit
<!-- Items to surface at next provider appointment.                           -->
<!-- Created during care events, cleared after the visit.                     -->
<!-- Agent auto-includes these in appointment prep messages.                  -->
| Date Noted | Item | Context | For Provider |
|---|---|---|---|
| | | | |

## Condition Tracking
<!-- For progressive conditions: persists key metrics longer than Recent      -->
<!-- Updates. Updated when new data arrives. Use for longitudinal trending.   -->
<!-- Example: "Alzheimer's: MMSE 22→20→18 over 6 months. Next MMSE due May." -->
<!-- Example: "CHF: Weight trend 155-161 range. 3lb/2day threshold active."   -->

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

## Caregiver Health Notes
<!-- For families where the primary caregiver has their own health conditions.  -->
<!-- This section exists because caregiver health IS care recipient safety.     -->
<!-- A caregiver who collapses can't coordinate care.                           -->
| Caregiver | Condition | Doctor | Phone | Normal Baseline | Red Flags |
|---|---|---|---|---|---|
| | | | | | |

<!-- Emergency protocol: what to do if the caregiver has an episode            -->
<!-- Example: "If Kevin reports chest pain or extreme fatigue, he is a PATIENT -->
<!-- not a coordinator. Activate emergency protocol for HIM. Simultaneously    -->
<!-- ensure Dorothy's care coverage."                                          -->

## Emergency Protocols
<!-- Family-specific emergency procedures.                                     -->
<!-- IMPORTANT: Include condition-specific clinical knowledge IN THIS SECTION, -->
<!-- not in the agent's reasoning. Time-critical actions must be in the file.  -->

### Fall
1. Stay with care recipient. Do NOT move them.
2. Check: head impact? Bleeding? On blood thinners?
3. If head impact → call 911. If on blood thinners + any injury → call 911.
4. If no head impact and no bleeding → call primary physician before moving.
5. Notify ALL full-access members.

### Missed Medication
<!-- Escalation tiers -->
1. +30 min: Send second reminder to person who received first reminder.
2. +60 min: If primary caregiver is different from current caregiver, notify primary.
3. +90 min: Notify ALL full-access members.
4. +120 min: Log as MISSED. Note in Recent Updates and For Next Visit.
<!-- If the person who received the reminder IS the primary caregiver,       -->
<!-- skip tier 2 and go directly to tier 3 at +60 min.                       -->

### Confusion / Disorientation
1. Assess: is this BASELINE confusion or NEW/worse confusion?
2. Baseline (for progressive conditions): comfort and redirect. Log in Recent Updates.
3. New or significantly worse: notify primary caregiver immediately.
4. If combined with: severe headache, one-sided weakness, difficulty speaking → call 911 (stroke signs).

### Chest Pain / Difficulty Breathing
1. Call 911 immediately.
2. Notify ALL care team members (ALL access levels for Tier 1 emergencies).
3. Location: [home address]
4. If CHF patient: keep UPRIGHT. Do NOT lay flat. Sitting position with legs down.
5. If on blood thinners: tell 911 dispatcher which anticoagulant and dose.

### Post-Surgical Emergency
<!-- For patients recovering from surgery                                      -->
1. If fall affects surgical site → call SURGEON first (not 911) unless:
   head injury, loss of consciousness, uncontrolled bleeding, or severe distress.
2. Provide surgeon: surgery date, current medications (especially blood thinners), description of event.
3. If surgeon says ER → call 911.

### Expected Symptom Patterns
<!-- For progressive conditions: document what fluctuations are NORMAL         -->
<!-- so the agent can distinguish baseline from concerning.                    -->
<!-- Example: "Sundowning typically 4-7pm. Extended past 9pm is concerning."   -->
<!-- Example: "Parkinson's tremor is worse when tired. Significantly worse     -->
<!-- unilaterally or with new rigidity is concerning."                         -->

## Decision History
<!-- Major care decisions with context, date, and who decided -->
<!-- "Why did we switch from Brand X?" — the answer is here.  -->
