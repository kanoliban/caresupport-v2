# Concierge Beta Runbook

## Purpose

Run CareSupport as a free solo-caregiver beta for 20–50 users and optimize for weekly retention.

## Target user

One person managing a loved one's care who wants help staying on top of:
- medications
- appointments
- tasks and rides
- reminders
- care notes and preferences

## Onboarding goal

Get the user to first value quickly.

By the end of onboarding, the thread should know:
- the user's name
- who they are caring for
- the first care item to track
- at least one reminder or planning need

## What operators should watch

- Did the user get to a saved care item in the first conversation?
- Did they come back the same week?
- What did they ask for that solo beta does not support?
- What wording or reminder behavior created confusion?

## Signals to review weekly

- weekly active / retained users
- first-value completion rate
- number of saved medications, appointments, and tasks
- blocked multiplayer requests

## Convex reset

Use the repo scripts:

```bash
npm run reset:dev
npm run reset:prod
```

These commands clear the core app tables so the solo-beta relaunch starts from a clean slate.
