# Medications Playbook

Loaded when the agent classifies intent as MEDICATION.

## What to read from family.md
- **Active Medications** — current med list with doses, schedules, status
- **Medication Hold Log** — any meds currently on hold
- **For Next Visit** — pending medication questions for providers
- **Emergency Protocols > Missed Medication** — escalation timing

## HARD RULES (from protocol)

1. Never update Active Medications without prescriber order + coordinator confirmation
2. Recording "med taken" does NOT require approval
3. Always include drug name AND dose in every medication message
4. Never relay medication advice — route to the prescriber
5. Side effect reports from the care recipient are always valid — log and route

## Common Requests

### "Mom took her [med]" / "Meds done"
1. Log in Recent Updates: `{date}: {med_name} {dose} taken at {time}. [{reporter}]`
2. Confirm: "Got it — {med_name} logged as taken."
3. No approval needed

### "Mom missed her [med]"
1. Log in Recent Updates: `{date}: {med_name} MISSED. [{reporter}]`
2. Add to For Next Visit: `{date}: Missed {med_name} — discuss at next appointment`
3. Follow Missed Medication escalation protocol if within timeframes
4. Respond: "Logged. I'll note this for the next provider visit."

### "Update [med] to [new dose]"
1. DO NOT apply the change
2. Ask: "That change needs a prescriber order. Has Dr. {prescriber} approved this?"
3. If YES → queue the change as a pending approval for the coordinator
4. If NO → "I'll add this to the 'For Next Visit' list so you can discuss it with Dr. {prescriber}."

### "Add new medication [name] [dose]"
1. DO NOT add it
2. Ask for prescriber and pharmacy
3. Queue as pending approval with full details
4. Response: "I'll send this to {coordinator} for confirmation. New meds need prescriber verification."

### "What meds is [recipient] on?"
1. Read Active Medications table
2. List: name, dose, schedule — omit pharmacy/prescriber unless asked
3. Respect access level — schedule-only members cannot see medications

### "[Recipient] says [med] makes them feel [symptom]"
1. Log the report: `{date}: {recipient} reported {symptom} with {med_name}. [{reporter}]`
2. Add to For Next Visit
3. Notify coordinator: "{recipient} reported {symptom} with {med_name}. Added to provider list."
4. Never dismiss: "That's worth noting for Dr. {prescriber}. I've logged it."

### "Refill needed for [med]"
1. Check Active Medications for pharmacy info
2. Log in Recent Updates
3. Queue outreach to coordinator: "{med_name} needs a refill. Pharmacy: {pharmacy}."
4. If no pharmacy on file: "Who should I contact for the refill?"

## Updates to family.md

| Action | Section | Operation | Approval |
|--------|---------|-----------|----------|
| Med taken | Recent Updates | prepend | No |
| Med missed | Recent Updates + For Next Visit | prepend | No |
| Dose change | Active Medications | replace | YES — requires pending approval |
| New med | Active Medications | append | YES — requires pending approval |
| Discontinue | Active Medications (status) | replace | YES — requires pending approval |
| Side effect report | Recent Updates + For Next Visit | prepend | No |
| Med hold | Medication Hold Log | append | YES — requires pending approval |
