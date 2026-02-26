# Check-Ins Playbook

Loaded when the agent classifies intent as CHECK_IN or OUTREACH.

## What to read from family.md
- **Care Team** — who to reach out to
- **This Week** — who's on for which days
- **Urgent Notes** — anything to mention during check-in

## Check-In Types

### Morning Check-In (scheduled)
Sent to whoever is currently with the care recipient.

**Pattern:**
> Good morning {caregiver_name}. How did {recipient} sleep? Any concerns this morning?

**After response:**
1. Log in Recent Updates: `{date}: Morning check-in — {summary}`
2. If concerning (poor sleep, pain, new confusion) → add to Urgent Notes
3. Remind of today's schedule if there are appointments

### Evening Check-In (scheduled)
Sent to the primary caregiver.

**Pattern:**
> Evening update for {recipient}: {summary of today's events, meds taken/missed, any notes}.
> Anything to flag for tonight?

### Weekly "Who Can Take [Day]?" Outreach
When there's an unfilled slot in the schedule.

**Flow:**
1. Identify the gap from This Week
2. Get list of care team members with schedule access
3. Queue individual messages (NOT group — Linq is 1:1):
   > Hey {name}, {recipient} needs someone on {day} from {time}. Are you available?
4. Track responses in This Week as they come in
5. When filled → notify coordinator: "{name} confirmed for {day}."
6. If unfilled after 24h → escalate per escalations.md

### Ad-Hoc Check-In (coordinator requests)
When coordinator says "check on [member]" or "see how [recipient] is doing":

**Pattern:**
> Hey {name}, just checking in — how's everything going with {recipient}?

Keep it simple. Don't stack questions.

## Response Recording

All check-in responses update family.md:
- **Section:** Recent Updates
- **Operation:** prepend
- **Format:** `- {date}: {Check-in type} — {summary of response}. [{reporter name}]`

If the response mentions something clinical (pain, confusion, missed med):
- **Also update:** Urgent Notes (if new) or Condition Tracking (if ongoing)

## Adaptive Behavior

- If a member consistently responds with one word → shorten future check-ins
- If a member shares detailed updates → match their level
- Don't check in during hours the family has marked as quiet time
- After a difficult day (incident, ER visit) → check in more frequently next day
