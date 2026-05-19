# Concierge Beta Runbook

## Purpose

Run CareSupport as a first-thread family care agent for 20-50 users and optimize
for useful retained care coordination.

This beta still uses the solo-thread runtime. The product framing should be
"CareSupport is starting with you so it can learn the care situation," not
"CareSupport is only for one caregiver."

## Target User

One person who is carrying meaningful coordination load around a loved one's
care.

The sharpest target is Rob:

- care recipient and coordinator
- many caregivers across disconnected organizations
- high physical cost for every extra phone interaction
- needs fewer manual follow-ups, status checks, and reminders

Other early users may be family caregivers coordinating medications,
appointments, routines, rides, and handoffs.

## Onboarding Goal

Get to first value quickly.

By the end of onboarding, the thread should know:

- the user's name
- who they are caring for
- the first care item or coordination issue to track
- at least one useful care fact, schedule item, medication, routine, or memory

## What Operators Should Watch

- Did the user get to a saved care artifact in the first conversation?
- Did they come back the same week?
- Did they ask CareSupport to contact someone, schedule something, or track a
  handoff?
- Did the assistant expose the current boundary without denying the larger
  family-care direction?
- Did the user have to repeat context that CareSupport should have remembered?

## Signals To Review Weekly

- weekly active / retained users
- first-value completion rate
- number of saved medications, appointments, tasks, routines, and memories
- requests for care contacts, outreach, coverage gaps, reminders, calendar sync,
  or status updates
- false claims that an action was completed
- **crisis-line (988) mentions in outbound messages** - until #37 has been in
  prod for 2 weeks, scan daily:

```bash
npx convex data messages --prod | grep -i 988
```

Confirm each 988 referral was preceded by explicit first-person harm intent from
the user. False positives should be logged and used to seed self-corrections.

## Operator Notes

When a user asks for multiplayer help that the runtime cannot execute yet, the
operator should preserve the future product promise:

> CareSupport cannot text them for you yet, but it can help draft the message and track the issue here.

Capture these requests as evidence for:

- `careContacts`
- `coordinationEvents`
- permissioned outreach
- calendar/reminder integrations
- operational status summaries

## Convex Reset

Use the repo scripts:

```bash
npm run reset:dev
npm run reset:prod
```

These commands clear the core app tables so the first-thread beta can restart
from a clean slate when needed.
