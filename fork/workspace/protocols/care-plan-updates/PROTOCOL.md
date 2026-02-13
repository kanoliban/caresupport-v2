---
name: care-plan-updates
description: Handle any modification to family.md — medication changes, schedule changes, care team changes, preference updates. Use the draft/approval pattern for all changes. CRITICAL safety level.
safety_level: critical
requires_approval: true
---

# Care Plan Updates

> **Viktor equivalent:** Viktor's draft/approval system for Linear/Google Ads write operations.
> Same pattern, higher stakes. Viktor asks "approve this Linear issue?" We ask
> "approve this medication change?"

## HARD RULES

1. **Every write to family.md requires confirmation** (except logging that meds were taken)
2. **Only full-access members can approve changes**
3. **Every change gets timestamped and attributed** in Recent Updates
4. **Medication changes require the medication-management protocol** (not this one alone)

## The Draft/Approval Pattern

This is the care equivalent of Viktor's draft system:

### Viktor's pattern:
```
Viktor: "I'd like to create this Linear issue: [details]. Approve / Reject?"
User: clicks Approve
Viktor: executes
```

### Our pattern:
```
Agent: "I'd like to update [Recipient]'s file: [change description]. Reply YES to confirm."
Primary caregiver: "YES"
Agent: updates family.md, notifies relevant team members
```

### Why SMS confirmation instead of buttons:
- iMessage/SMS doesn't have interactive buttons
- "Reply YES" is the universal SMS confirmation pattern
- Parse: YES, Y, yes, yeah, confirm, approved, ok → approve
- Parse: NO, N, no, nope, cancel, wait → reject
- Anything else → "I need a clear YES or NO on this change."

## Change Categories

### Schedule changes (standard)
- Trigger: "Mom's appointment moved to Thursday"
- Draft: "Updating this week: [old] → [new]. Reply YES to confirm."
- On confirm: update This Week, notify affected team members
- On reject: "OK, leaving the schedule as is."

### Care team changes (critical)
- Trigger: "We have a new weekend aide"
- Draft: "Adding [Name] ([phone]) as weekend aide with schedule+meds access. Reply YES to confirm."
- On confirm: update Care Team, send onboarding message to new member
- On reject: discard

### Preference updates (standard)
- Trigger: "Mom really hates when we wake her before 7am"
- Draft: "Adding to care preferences: 'Do not wake before 7am.' Reply YES to confirm."
- On confirm: update Care Preferences & Personality
- Log but don't notify (preferences are context, not alerts)

### Emergency protocol updates (critical)
- Trigger: family wants to change emergency procedures
- Draft: explain the change clearly, flag any safety implications
- On confirm: update Emergency Protocols
- Notify ALL full-access members of the change

## Conflict Resolution

When new information conflicts with the file:
1. Don't silently overwrite
2. Surface the conflict: "The file says [X] but you're saying [Y]. Which is current?"
3. Wait for clarification before updating
4. Log the resolution in Decision History

## Audit Trail

Every change writes to:
1. **Recent Updates** (in Current section): `{timestamp}: {change summary} — confirmed by {member}`
2. **Relevant Reference section**: full details in medication history, past appointments, etc.
3. **Decision History** (if it's a significant care decision): `{date}: {decision} — decided by {who}, reason: {why}`
4. **logs/{date}/phi_access.log**: `{timestamp} WRITE family:{family_id} section:{section} by:{phone} change:{summary}`
