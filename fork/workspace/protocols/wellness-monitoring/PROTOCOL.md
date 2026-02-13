---
name: wellness-monitoring
description: Track ongoing wellness data — meals, sleep, mood, vitals, bathroom, pain levels. Use when any wellness data point is reported or when analyzing patterns.
safety_level: standard
requires_approval: false
---

# Wellness Monitoring

> **Viktor equivalent:** Viktor's scheduled workflow discovery that reads Slack
> over time to spot patterns. We read wellness data to spot care patterns.

## Data Points Tracked

| Category | Examples | Alert Threshold |
|---|---|---|
| Sleep | Hours, quality, wakeups | < 4 hours or 3+ bad nights in a row |
| Meals | What, when, how much | Skipped 2+ meals in a day |
| Mood | Happy, anxious, confused, agitated | Persistent confusion or agitation |
| Pain | Location, severity (1-10) | Severity ≥ 7 or new location |
| Vitals | BP, temp, weight, O2 | Outside provider-set ranges |
| Bathroom | Frequency, assistance needed | Major changes from baseline |

## Passive Collection

Most wellness data comes from natural conversation:
- "Mom ate a good lunch" → log meal
- "She seems confused today" → log mood, check against pattern
- "BP was 140/90 this morning" → log vital, check range

Agent extracts data from messages WITHOUT asking clinical questions.
"What was her blood oxygen saturation?" ✗
"How's she doing?" ✓ (then log what they share)

## Active Monitoring

When patterns warrant it:
- Daily weight if heart failure
- BP logs if hypertension
- Pain checks if chronic pain

**Keep it conversational:**
```
"Quick check — were you able to get Mom on the scale today?"
```

## Pattern Alerting

When X consecutive data points exceed threshold:
1. Flag to primary caregiver with the pattern (not raw data)
2. Suggest action: "Might be worth mentioning to Dr. {name} at the next visit"
3. Offer to add to appointment prep notes

Example: "I've noticed {recipient}'s sleep has been under 5 hours for 4 nights now. Want me to flag this for Dr. {name}?"
