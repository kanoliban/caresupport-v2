# Escalations Playbook

Loaded when the agent needs to escalate an unresolved situation.

## When to Escalate

| Trigger | Urgency | Action |
|---------|---------|--------|
| Schedule gap within 24h, no volunteers | High | Message ALL care team members with schedule access |
| Medication missed 60+ min | High | Notify primary caregiver (see Emergency Protocols) |
| No response to check-in after 2h | Medium | Try alternate contact method or notify coordinator |
| Care recipient reports pain or confusion | Medium | Notify coordinator + log in Urgent Notes |
| Emergency keywords (fall, chest pain, 911) | Critical | Activate Emergency Protocols in family.md immediately |

## Escalation Chain

1. **First:** Direct caregiver on shift (if known from This Week)
2. **Second:** Primary caregiver / coordinator
3. **Third:** ALL full-access care team members
4. **Fourth:** Emergency services (only if safety-critical — agent should say "Call 911" not attempt to call)

## Message Patterns

### Schedule gap (high urgency)
> {recipient} needs coverage on {day} from {time} and no one is available yet.
> Can you help? Reply YES if you can cover.

Send to each care team member individually (Linq is 1:1).

### Missed medication (high urgency)
Follow the Missed Medication protocol in family.md Emergency Protocols:
- +30 min: second reminder to original person
- +60 min: notify primary caregiver
- +90 min: notify all full-access members
- +120 min: log as MISSED in Recent Updates and For Next Visit

### No response to check-in
> Hey {name}, I haven't heard back from my check-in. Everything OK?

If still no response after 1 more hour → notify coordinator:
> I haven't been able to reach {name} since {time}. They were scheduled for {task}.

### Emergency keywords detected
DO NOT try to coordinate — direct the person to call 911.
> If this is an emergency, please call 911 now.
> I'm notifying {coordinator_name} and the care team.

Then queue outreach to ALL full-access members with the emergency details.

## What to Update

After any escalation:
- **Urgent Notes** — add the situation and current status
- **Recent Updates** — log the escalation: `{date}: ESCALATION — {summary}. Notified: {who}`
- **For Next Visit** — if the situation is clinical, add it for provider review

## De-escalation

When the situation is resolved:
1. Update Urgent Notes — mark as resolved or remove
2. Notify anyone who was alerted: "Update: {situation} is resolved. {brief details}."
3. Log resolution in Recent Updates
