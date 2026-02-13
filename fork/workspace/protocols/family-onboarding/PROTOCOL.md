---
name: family-onboarding
description: Set up a new family — create family.md, onboard care team members, establish schedules. Use when a new family signs up or texts START.
safety_level: standard
requires_approval: true  # family.md creation needs confirmation
---

# Family Onboarding

> **Viktor equivalent:** Viktor's onboarding flow — welcome DM, research company,
> create company/SKILL.md and team/SKILL.md, set up crons. Same pattern, adapted
> for a family instead of a company.

## Viktor's Onboarding → CareSupport Onboarding

| Viktor Step | CareSupport Equivalent |
|---|---|
| User installs Viktor in Slack | Family texts START to CareSupport number |
| Research company via web | Ask 3-5 setup questions via SMS |
| Create company/SKILL.md | Create families/{id}/family.md |
| Create team/SKILL.md | Populate Care Team section |
| Set up heartbeat cron | Set up daily check-in schedule |
| Set up workflow discovery | Set up needs assessment schedule |
| Channel introductions | Introduce agent to each care team member |

## Onboarding Flow

### Step 1: Initial Contact
Family texts START (or signs up via web → receives first text)

**Response:**
```
Welcome to CareSupport 💙
I'm here to help coordinate care for your family.

Let's set things up — I'll ask a few questions.
Who needs care? (Name and relationship to you)
```

### Step 2: Care Recipient
Parse response → extract name, relationship

**Response:**
```
Got it. Tell me a bit about {name}'s situation:
- Main health conditions?
- Living situation? (home alone, with family, facility)
- Mobility? (independent, needs help, wheelchair, bedridden)
```

### Step 3: Care Team
**Response:**
```
Who helps care for {name}? Give me names and phone numbers
for anyone who should be in the loop.

Example: "My sister Jane 555-1234, aide Maria 555-5678"
```

### Step 4: Create family.md
1. Generate family_id from primary caregiver's name
2. Create `families/{family_id}/family.md` from template
3. Populate with collected information
4. **DRAFT**: Send summary to primary caregiver for confirmation

**Response:**
```
Here's what I have:

Care for: {name}
Conditions: {conditions}
Care team:
- You ({role}, full access)
- {member2} ({role})
- {member3} ({role})

Reply YES to confirm, or tell me what to change.
```

### Step 5: Onboard Team Members
On confirmation:
1. Save family.md
2. Set up daily check-in schedule (morning + evening)
3. Set up medication reminders if medications were provided
4. Send intro message to each care team member:

```
Hi {name}, I'm the CareSupport coordinator for {recipient}'s care.
{primary_caregiver} added you to the care team.

I'll help with medication reminders, schedule coordination,
and keeping everyone in the loop.

You can text me anytime with updates about {recipient}.
Reply HELP for a list of things I can do.
```

### Step 6: Needs Assessment (first week)
- Day 1: Basic setup complete
- Day 2: "How was the first day? Anything I should know about {recipient}'s routine?"
- Day 3: "Do you want me to remind about medications? Tell me what {recipient} takes."
- Day 5: "Checking in — is the schedule working? Any changes needed?"
- Day 7: Full assessment → suggest additional schedules and protocols

## HELP Response

When any member texts HELP:
```
Things I can help with:
- MEDS — medication reminders and tracking
- SCHEDULE — this week's appointments and coverage
- UPDATE — add a note about {recipient}
- TEAM — see who's on the care team
- EMERGENCY — see emergency contacts and protocols

Or just text me naturally — "Mom took her meds"
or "What's the schedule tomorrow?"
```
