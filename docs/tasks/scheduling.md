# Scheduling Playbook

Loaded when the agent classifies intent as SCHEDULE or AVAILABILITY.

## What to read from family.md
- **This Week** — current schedule
- **Care Team** — who's available, their hours
- **Urgent Notes** — anything that affects scheduling

## Common Requests

### "Can someone take [recipient] to [place] on [day]?"
1. Check This Week for conflicts on that day
2. Check Care Team for who's available that day
3. If someone is clearly available → suggest them
4. If unclear → queue outreach: "Hey {name}, can you take {recipient} to {place} on {day}?"
5. Update This Week with the tentative entry

### "What's the schedule for [day/week]?"
1. Read This Week section
2. Format as a clean list: time, who, what
3. Flag any gaps: "No one is scheduled for Thursday afternoon"

### "I can't make it on [day]"
1. Acknowledge: "Got it, I'll take you off {day}."
2. Update This Week — remove their entry
3. Check if that creates a gap
4. If gap → notify coordinator or suggest alternatives
5. Queue outreach if needed

### "Add [event] on [day] at [time]"
1. Check for conflicts in This Week
2. If conflict → "There's already {existing} at that time. Should I move it or double-book?"
3. If clear → add to This Week
4. Confirm: "Added {event} on {day} at {time}."

## Vague Language Handling

| They say | You interpret | You ask |
|----------|---------------|---------|
| "tomorrow" | Next calendar day | Nothing — you know the date |
| "this weekend" | Saturday + Sunday | "Saturday or Sunday?" |
| "next week" | Mon-Sun of the following week | "Any specific day?" |
| "morning" | Before noon | "What time works best?" |
| "the usual time" | Check This Week for recurring patterns | If no pattern found: "What time is usual?" |

## Updates to family.md

**Section:** This Week
**Operation:** replace (for full day update) or append (for adding an event)
**Format:** `- {Day}: {Time} — {Who} — {What}`

## Escalation

If a gap can't be filled and it's within 24 hours:
1. Flag in Urgent Notes
2. Queue outreach to ALL Care Team members with schedule access
3. Message coordinator: "No one is available for {day}. I've reached out to the team."
