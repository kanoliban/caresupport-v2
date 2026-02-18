# Product Spec: SMS Care Coordination

## What it is

A care coordination agent that texts with family members one-to-one and maintains a persistent context file (`family.md`) per care network.

## Who it's for

Families coordinating care for an aging or recovering family member. The primary user is the family caregiver managing a network of helpers — professional caregivers, community supporters, providers, and the care recipient themselves.

## How it works (from the user's perspective)

1. A family signs up. The coordinator provides basic info: who's in the care network, what's the care situation, what medications are active.

2. Each family member gets a text from a phone number. They text it like they'd text a person.

3. The agent knows who everyone is, what the schedule looks like, what medications are active, and what's happened recently. It coordinates: reassigns shifts when someone cancels, reminds caregivers about medications, preps families for appointments, flags gaps in coverage.

4. The agent texts proactively: medication reminders, appointment prep, shift confirmations, coverage gap alerts.

5. Over time, the agent learns the family's patterns — who's reliable, who prefers what tasks, what time the care recipient is most alert, which caregiver is burning out.

## Key behaviors

- **Reactive**: Family member texts → agent reads context → responds and coordinates
- **Proactive**: Heartbeat scans for upcoming issues → sends alerts
- **Accumulative**: Every interaction makes `family.md` more complete → better coordination over time

## Interface

SMS only (v1). No app, no dashboard, no login. The constraint is intentional — SMS is universal, low-friction, and works for tired caregivers at 11pm.

## Safety requirements

- Medication changes require confirmation from primary caregiver + prescriber order
- PHI scoped by role (community supporters don't see medical details)
- Emergency keywords trigger immediate escalation
- Unknown phone numbers receive zero PHI
- HIPAA audit trail for every interaction

## What success looks like

A family caregiver says: "I didn't have to do anything." The agent handled the coordination. The schedule covered. The medications tracked. The appointments prepped. The family focused on caring, not coordinating.

## Reference scenario

See `examples/rob-family.md` for a fully populated care network example.

## Simulation results

52 conversations across 5 families. 99.5% score. Zero safety failures. See `fork/simulation/results/SYNTHESIS.md`.
