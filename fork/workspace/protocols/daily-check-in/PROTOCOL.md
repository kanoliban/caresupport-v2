---
name: daily-check-in
description: Regular wellness check-ins with care team members. Use for scheduled morning/evening check-ins and when asking about sleep, meals, mood, or general wellbeing.
safety_level: standard
requires_approval: false
---

# Daily Check-In

> **Viktor equivalent:** The heartbeat cron — periodic check-in to find
> opportunities to help. Our version checks on a person, not a Slack workspace.

## Schedule

- **Morning check-in** (default 8am): Ask current caregiver about overnight/morning
- **Evening check-in** (default 8pm): Summarize the day, prep for overnight

Schedules are customizable per family in care_schedules.

## Morning Check-In Flow

1. Read family.md → who is currently with care recipient?
2. Message them:
   ```
   Good morning {caregiver_name} 🌅
   How did {recipient} sleep last night?
   Any concerns this morning?
   ```
3. Record response in Recent Updates
4. If concerning (poor sleep, pain, confusion) → flag in Urgent Notes
5. Remind of today's schedule: "Today: {appointments, aide schedule, etc.}"

## Evening Check-In Flow

1. Read family.md → Current section
2. Compile day summary from Recent Updates
3. Message primary caregiver:
   ```
   Evening update for {recipient}:
   - Meals: {status}
   - Meds: {all confirmed / missed X}
   - Mood: {from reports today}
   - Tomorrow: {first appointment or task}
   Any concerns tonight?
   ```
4. If anything was missed (meds, meals) → note in Urgent Notes

## Adaptive Behavior

- If family responds with one-word answers consistently → shorten check-ins
- If family shares detailed updates → match their level
- Weekend vs weekday tone can differ (more relaxed on weekends)
- After a bad night or incident → check in more frequently that day
- Don't check in during times the family has asked for quiet (see Care Preferences)

## Data Tracking

Each check-in records in Recent Updates:
```
{timestamp}: Morning check-in — slept well, ate breakfast, meds on time. [aide name] reporting.
```

Over time, patterns emerge. Flag to primary caregiver monthly:
- Sleep quality trends
- Missed medication frequency
- Mood patterns
- Appetite changes

## Proactive Scanning

During each check-in, the agent ALSO checks family.md for:
- **Medication refills**: any Refill Due dates within 7 days? → alert
- **Upcoming appointments**: anything in the next 2 days? → remind
- **Overdue follow-ups**: any "For Next Visit" items older than 14 days
  without a scheduled appointment? → suggest scheduling
- **Condition Tracking thresholds**: any progressive condition metric
  approaching a documented concern threshold? → flag

## Caregiver Wellness Check

**Soft rule:** When the primary caregiver is also the person responding to
check-ins, periodically (every 3-5 days) include a gentle caregiver-focused
question:

```
"And how are YOU doing, {caregiver}? Don't forget to take care of yourself too."
```

If the caregiver expresses burnout, exhaustion, or emotional distress:
1. Acknowledge it. Don't redirect to the care recipient immediately.
2. Offer practical help: "Want me to look into respite care options?"
3. If Caregiver Health Notes exist in family.md → check for red flags
4. Log in Recent Updates — caregiver wellness is care-relevant data

## Cognitive Impairment Notifications

If the care recipient texts independently during high-risk hours (10pm-6am):
1. Respond normally and warmly
2. Send a silent notification to the primary caregiver:
   "[Recipient] texted at [time]: '[brief summary]'. Just letting you know."
3. Do NOT tell the care recipient that you're notifying someone (unless safety
   requires it)
4. This is a soft rule — the primary caregiver can disable it
