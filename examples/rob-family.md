# Moreno Care Network

Coordinator: Rob Moreno (Care Recipient)
Backup Coordinator: Marta Moreno (Family Caregiver)
Coverage Window: 07:00–22:00
Created: 2026-01-15
Last Updated: 2026-02-12 09:15

## Members

### Rob Moreno
- Role: Care Recipient
- Phone: +1-555-0101
- Coordinator: yes
- Capabilities: []
- Notes: Prefers voice-first interaction. Uses large text on phone. Coordinates his own care with Marta as backup.

### Marta Moreno
- Role: Family Caregiver
- Phone: +1-555-0102
- Coordinator: backup
- Capabilities: [mobility_assist, med_admin, driving, cooking, companionship]
- Notes: Rob's daughter. Steps in quickly when gaps arise. Prefers text over calls. Works full-time — most available evenings and weekends.

### Sarah Nguyen
- Role: Professional Caregiver
- Phone: +1-555-0201
- Coordinator: no
- Capabilities: [mobility_assist, med_admin, companionship, PT_exercises]
- Notes: Independent caregiver. Very reliable. Handles afternoon routine including PT exercises and medication.

### James Porter
- Role: Professional Caregiver
- Phone: +1-555-0202
- Coordinator: no
- Capabilities: [mobility_assist, med_admin, cooking, morning_routine]
- Notes: Handles morning routine — breakfast, medications, light housekeeping. Flexible on short notice except when sick.

### Linda Okafor
- Role: Community Supporter
- Phone: +1-555-0301
- Coordinator: no
- Capabilities: [driving, cooking, companionship, errands]
- Notes: Neighbor and family friend. Helps with groceries, errands, companionship. No Sundays — church commitments. No medical tasks.

## Care Recipient

Name: Rob Moreno
Conditions: Type 2 diabetes, hypertension, limited mobility (uses walker)
Mobility: Walker indoors, wheelchair for longer distances/outings
Communication: Prefers voice messages. Uses large text size. Responds faster to short, direct messages.
Routine: Wakes 6:30am. Breakfast and meds by 8am. Morning is best energy. Afternoon nap ~1-2pm. PT exercises 3pm. Dinner 6pm. Evening meds 8pm. Bed by 10pm.
Emergency Contact: Marta Moreno (+1-555-0102)

## Schedule

```yaml
shifts:
  - date: 2026-02-12
    window: "07:00-12:00"
    assigned: James
    type: morning_routine
    status: confirmed
    tasks: [breakfast, morning_meds, light_housekeeping]

  - date: 2026-02-12
    window: "14:00-18:00"
    assigned: Sarah
    type: afternoon_care
    status: confirmed
    tasks: [PT_exercises, afternoon_companionship, snack_prep]

  - date: 2026-02-12
    window: "18:00-22:00"
    assigned: Marta
    type: evening_care
    status: confirmed
    tasks: [dinner, evening_meds, bedtime_routine]

  - date: 2026-02-13
    window: "07:00-12:00"
    assigned: null
    type: morning_routine
    status: uncovered
    tasks: [breakfast, morning_meds, light_housekeeping]
    notes: "James called in sick 2/12 9:15am"

  - date: 2026-02-13
    window: "14:00-18:00"
    assigned: Sarah
    type: afternoon_care
    status: confirmed
    tasks: [PT_exercises, afternoon_companionship, snack_prep]

  - date: 2026-02-14
    window: "07:00-12:00"
    assigned: James
    type: morning_routine
    status: tentative
    notes: "Depends on James feeling better"

  - date: 2026-02-14
    window: "14:00-18:00"
    assigned: Sarah
    type: afternoon_care
    status: confirmed

  - date: 2026-02-15
    window: "07:00-12:00"
    assigned: James
    type: morning_routine
    status: tentative

  - date: 2026-02-16
    window: "10:00-14:00"
    assigned: Linda
    type: errands_companionship
    status: confirmed
    tasks: [grocery_shopping, lunch_companionship]
```

## Medications

```yaml
medications:
  - name: Lisinopril
    dosage: "10mg"
    schedule: "08:00 daily"
    requires: med_admin
    notes: "Take with food. Monitor blood pressure."

  - name: Metformin
    dosage: "500mg"
    schedule: "08:00, 20:00"
    requires: med_admin
    notes: "Take with meals. Monitor for low blood sugar symptoms."
```

## Appointments

- **Feb 18, 10:00 AM** — Dr. Chen (cardiology follow-up), Mercy Medical Center
  - Transport: wheelchair van needed — book by Feb 16
  - Escort: Marta (confirmed)
  - Prep: fasting after midnight, bring medication list and blood pressure log
  - Duration: ~2 hours including wait time

## Availability

```yaml
availability:
  - member: Sarah
    regular: "Tue, Thu 14:00-18:00"
    flexibility: "Can occasionally do Wed or Fri with 48h notice"
    exceptions: []

  - member: James
    regular: "Mon-Fri 07:00-12:00"
    flexibility: "Very flexible on short notice"
    exceptions:
      - date: 2026-02-13
        status: unavailable
        reason: "sick"
      - date: 2026-02-14
        status: tentative
        reason: "depends on recovery"

  - member: Linda
    regular: "Mon-Sat, flexible hours"
    constraints: "No Sundays. Light tasks only — no medical."
    flexibility: "Prefers 48h notice but can do same-day for errands"
    exceptions: []

  - member: Marta
    regular: "Evenings after 5pm weekdays. Weekends flexible."
    constraints: "Works full-time. Can take time off for emergencies."
    flexibility: "Backup coordinator — responds quickly to gap alerts"
    exceptions: []
```

## Active Issues

- [ ] Feb 13 morning shift uncovered (James sick) — texted Marta, awaiting response
- [ ] Dr. Chen appointment Feb 18 — wheelchair van not yet booked
- [ ] Feb 14 morning shift tentative — depends on James recovery

## Recent Events

- **2026-02-12 09:15** — James texted: "Not feeling great, won't be able to make it tomorrow morning." Marked Feb 13 AM shift uncovered. Texted Marta to check if she can cover or find replacement.
- **2026-02-12 08:05** — James confirmed morning meds administered (Lisinopril, Metformin). Rob had good appetite at breakfast.
- **2026-02-11 17:50** — Sarah completed afternoon shift. Handoff: Rob did full PT routine, good energy. Ate apple and crackers for snack. Mentioned knee felt stiff — worth monitoring.
- **2026-02-11 17:00** — Marta confirmed she'll escort Rob to Dr. Chen appointment Feb 18.
- **2026-02-11 14:05** — Sarah started afternoon shift. Rob resting after lunch, will start PT at 3pm.
- **2026-02-10 19:30** — Marta completed evening routine. Evening meds given. Rob in good spirits, watched basketball, in bed by 9:45pm.
- **2026-02-10 12:00** — James completed morning shift. Handoff: Rob ate half his breakfast (not very hungry). All meds taken. Did some reading.
- **2026-02-09 16:00** — Linda did grocery run. Stocked fridge for the week. Spent an hour chatting with Rob — he enjoyed the company.
- **2026-02-08 11:00** — Rob texted: "Can Linda pick up my prescription at CVS Saturday?" Relayed to Linda, she confirmed.
- **2026-02-07 17:45** — Sarah completed shift. Handoff: PT went well, Rob walked to the kitchen and back with walker (good progress). Blood sugar check normal.

## Patterns

- Sarah is consistently reliable for Tue/Thu afternoons. Rarely cancels. Rob enjoys her company.
- James handles mornings well but gets sick 2-3 times per year. When he's out, Marta usually covers or finds a replacement within a few hours.
- Linda prefers grocery runs and companionship. She and Rob have a good rapport — he looks forward to her visits.
- Rob is most alert and energetic in the morning. Afternoon energy dips around 1-2pm (nap time). Second wind after 3pm for PT.
- Marta responds to gap alerts within 30 minutes during work hours, faster on evenings/weekends.
- Evening meds (Metformin 8pm) are sometimes delayed when Marta works late — Rob can self-administer if reminded.
