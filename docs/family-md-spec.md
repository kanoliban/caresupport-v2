# family.md Specification

## What It Is

A markdown file maintained by the care coordination agent. One file per care network. The single source of truth for everything the agent knows about this family's care.

Family members never see this file directly. They interact with the agent via SMS. The agent reads family.md at the start of every interaction and updates it before responding.

## File Location

```
families/{family_id}/family.md
```

The `family_id` is derived from the first member's phone number or assigned at onboarding. The permission handler restricts the agent's Read/Edit tools to the family's directory only.

## Structure

Every family.md follows this section order. Sections can be empty but should exist once the relevant information is known.

### Header

```markdown
# {Family Name}'s Care Network

Coordinator: {Name} ({Role})
Backup Coordinator: {Name} ({Role})
Coverage Window: {HH:MM}–{HH:MM}
Created: {YYYY-MM-DD}
Last Updated: {YYYY-MM-DD HH:MM}
```

### Members

One entry per person in the network. Role and capabilities matter for assignment logic.

```markdown
## Members

### {Name}
- Role: Care Recipient | Family Caregiver | Professional Caregiver | Community Supporter
- Phone: {number}
- Coordinator: yes | no | backup
- Capabilities: [mobility_assist, med_admin, driving, cooking, companionship, ...]
- Notes: {free text — preferences, constraints, relevant context}
```

### Care Recipient

Profile of the person receiving care. Conditions, preferences, routines.

```markdown
## Care Recipient

Name: {Name}
Conditions: {list}
Mobility: {description}
Communication: {preferences — e.g., voice-first, large text}
Routine: {daily structure in plain language}
Emergency Contact: {Name} ({Phone})
```

### Schedule

YAML block for current and upcoming coverage assignments. Past shifts drop off. This is the most frequently updated section.

````markdown
## Schedule

```yaml
shifts:
  - date: 2026-02-12
    window: "07:00-12:00"
    assigned: James
    type: morning_routine
    status: confirmed

  - date: 2026-02-12
    window: "14:00-18:00"
    assigned: Sarah
    type: afternoon_care
    status: confirmed

  - date: 2026-02-13
    window: "07:00-12:00"
    assigned: null
    type: morning_routine
    status: uncovered
    notes: "James called in sick"
```
````

### Medications

YAML block for medication schedules and requirements.

````markdown
## Medications

```yaml
medications:
  - name: Lisinopril
    dosage: "10mg"
    schedule: "08:00 daily"
    requires: med_admin
    notes: "Take with food"

  - name: Metformin
    dosage: "500mg"
    schedule: "08:00, 20:00"
    requires: med_admin
    notes: "Monitor for low blood sugar"
```
````

### Appointments

Upcoming appointments with transport and escort needs.

```markdown
## Appointments

- **Feb 18, 10:00 AM** — Dr. Chen (cardiology), Mercy Medical
  - Transport: needed (wheelchair van)
  - Escort: Marta (confirmed)
  - Prep: fasting after midnight, bring medication list
```

### Availability

YAML block for per-member availability rules and preferences.

````markdown
## Availability

```yaml
availability:
  - member: Sarah
    regular: "Tue, Thu 14:00-18:00"
    exceptions: []

  - member: James
    regular: "Mon-Fri 07:00-12:00"
    exceptions:
      - date: 2026-02-13
        status: unavailable
        reason: "sick"

  - member: Linda
    regular: "Mon-Sat, flexible hours"
    constraints: "No Sundays"
    tasks_only: true  # community supporter — no medical tasks

  - member: Marta
    regular: "flexible — backup coordinator"
    preferred: "afternoons"
```
````

### Active Issues

Checklist of unresolved items. The agent adds items when problems are detected and removes them when resolved.

```markdown
## Active Issues

- [ ] Feb 13 morning shift uncovered (James sick) — seeking replacement
- [ ] Dr. Chen appointment needs wheelchair van booking
```

### Recent Events

Append-only log of recent interactions and events. The agent adds entries as things happen. Oldest entries get pruned when the section exceeds ~50 entries.

```markdown
## Recent Events

- **2026-02-12 09:15** — James texted: won't make Thursday morning, feeling sick. Marked Feb 13 shift uncovered. Notified Marta.
- **2026-02-12 08:00** — Morning shift started (James). Medications administered: Lisinopril, Metformin.
- **2026-02-11 17:45** — Sarah completed afternoon shift. Handoff note: Rob had good energy, ate full lunch, PT exercises done.
- **2026-02-11 14:00** — Sarah started afternoon shift. Confirmed with Rob.
```

### Patterns

Agent-observed regularities. Not written by family members — the agent notices and records these over time. Used to make better assignment decisions.

```markdown
## Patterns

- Sarah is consistently reliable for afternoon shifts; rarely cancels
- James prefers mornings and is usually flexible on short notice, except when sick
- Linda prefers light tasks: groceries, companionship, errands — no medical
- Rob is most alert in the morning; afternoon energy dips around 3pm
- Marta steps in quickly when notified of gaps; prefers text over calls
```

## How It Grows

### Bootstrap

The first SMS creates a skeleton family.md with:
- The sender's name, phone, and role
- Whatever immediate need they expressed
- Empty sections for everything else

The agent fills in sections as information arrives naturally through conversation. It doesn't interrogate — it builds context over time.

### Accretion

Each interaction may add information:
- New member mentioned → added to Members
- Schedule detail shared → added to Schedule
- Medication mentioned → added to Medications
- Pattern observed → noted in Patterns

The agent uses the Edit tool (surgical string replacement) for updates — never Write (full overwrite). This minimizes corruption risk and makes changes auditable.

### Pruning

The file must stay within a reasonable size for context window loading. Pruning rules:

| Section | Pruning Strategy |
|---------|-----------------|
| Schedule | Keep current week + next 2 weeks. Past shifts drop off. |
| Recent Events | Keep last ~50 entries. Older entries summarized into Patterns or deleted. |
| Active Issues | Resolved issues removed (optionally logged to Recent Events first). |
| Medications | Only pruned when discontinued. |
| Appointments | Past appointments removed after completion. |
| Patterns | Periodically reviewed; outdated patterns removed. |
| Members | Only removed when someone leaves the network. |

### Corruption Prevention

- **Edit, not Write**: Surgical string replacement prevents accidental overwrites
- **YAML validation**: Agent should validate YAML blocks parse correctly after edits
- **Backup on heartbeat**: Heartbeat cron can snapshot family.md before scanning (implementation detail)
- **Concurrency queue**: One message processed at a time per family prevents race conditions

## What It Does NOT Contain

- Full conversation transcripts (sessions are ephemeral)
- Dashboard state (dashboard reads family.md; separate concern)
- Billing or payment information
- Multi-family cross-references (v1: one family, one file)
- Authentication credentials or API keys
- PHI beyond what's needed for care coordination

## Size Guidelines

A typical family.md for an active network:
- Members: 5-15 entries (~50 lines)
- Schedule: 2-3 weeks of shifts (~30-50 lines)
- Medications: 2-10 entries (~20-40 lines)
- Recent Events: ~50 entries (~50-75 lines)
- Everything else: ~50 lines

**Target size: 300-500 lines** (~5,000-10,000 tokens). Well within context window limits for any modern model. If a file grows beyond 800 lines, the agent should prune more aggressively.

## Information Scoping by Role

When the agent responds to an SMS, it reads the full family.md but scopes its response based on the sender's role:

| Sender Role | What They Can See/Affect |
|-------------|--------------------------|
| Care Recipient | Everything about their own care |
| Family Caregiver | Full access (schedule, meds, notes, all members) |
| Coordination Lead | Full access + can modify policies and membership |
| Professional Caregiver | Their own shifts, care-relevant notes, medications they administer, handoff context |
| Community Supporter | Their assigned tasks, free/busy schedule — no medical details, no other members' schedules |
