# CLAUDE.md — CareSupport Family

## What This Is

CareSupport is a care coordination agent that texts with family members 1-to-1. It uses two types of persistent files:

- **SKILL.md** files — agent knowledge: how to coordinate care, how to handle medications, how to communicate over SMS. Relatively static. Adopted wholesale from Viktor/OpenClaw's production-tested pattern.
- **family.md** — operational state for one care network: members, schedule, medications, active issues, recent events. Changes every interaction. Our new concept — Viktor doesn't have this because it doesn't maintain ongoing care relationships.

These are different things. Don't conflate them.

## How It Works

```
SMS arrives ("Marta: Can't make Tuesday 2pm")
  → Message router identifies family by phone number
  → Fresh query() session (never resumed — the file IS the memory)
      System prompt: care coordinator role
      User prompt: SMS content + sender identity
      Tools: Read, Edit (restricted to this family's family.md)
  → Agent reads family.md → processes → updates family.md → responds
  → Response sent via SMS
  → Session ends
```

Every interaction follows this loop. No session persistence, no database, no state outside the file.

## Two File Types

### SKILL.md — Agent Knowledge

SKILL.md files teach the agent how to do things. They are the same format and pattern as Viktor/OpenClaw (production-tested, don't reinvent):

- `skills/care-coordination/SKILL.md` — how to coordinate care
- `skills/medication-management/SKILL.md` — how to handle med changes
- `skills/sms-communication/SKILL.md` — how to communicate over SMS
- `company/SKILL.md` — about CareSupport as an organization

Each has YAML frontmatter with a name and description. Descriptions are loaded into the system prompt as an index. Full files read on demand when relevant.

### family.md — Operational State

`family.md` is the live operational state of one care network. Members, this week's schedule, active medications, unresolved issues, recent events. It changes every interaction. One file per family.

The spec lives in `docs/family-md-spec.md`. A realistic example lives in `examples/rob-family.md`.

**Why family.md is distinct from SKILL.md:**
- SKILL.md = knowledge (what to do, how to do it). Changes rarely.
- family.md = state (what's happening right now). Changes every interaction.
- Viktor has SKILL.md. Viktor does NOT have family.md. This is our new concept.

## Agent Behavior

The agent's system prompt lives in `agent/system-prompt.md`. Key behaviors:

**Reactive (SMS-triggered):**
- Read family.md, process the message, update state, respond
- Match the sender's communication style — warm but direct, no jargon
- Scope information by role (professional caregivers see care-relevant details; community supporters see tasks only)

**Proactive (heartbeat):**
- Cron fires every N hours with prompt: "Scan family.md for issues in next 48 hours"
- Agent checks upcoming coverage, medications, appointments
- Returns alerts → alert system sends SMS notifications

**When uncertain:**
- Ask one clarifying question rather than guess
- Surface what you know and what you're missing
- Never fabricate schedule details or medication information

## Reference Scenario: Rob's Network

Rob (care recipient, coordinates his own care) with:
- Marta (family caregiver, backup coordinator)
- Sarah (professional caregiver — Tue/Thu afternoons)
- James (professional caregiver — weekday mornings)
- Linda (community supporter — no Sundays)

Coverage window: 07:00–22:00. This network is the reference for all design decisions.

## Build & Run

```bash
npm install
npx tsc --noEmit     # Type check
npm run dev           # Development (requires ANTHROPIC_API_KEY)
```

## Project Structure

```
caresupport-family/
├── CLAUDE.md                     # You're reading it
├── docs/
│   ├── family-md-spec.md        # The spec: what family.md is, how it works
│   ├── primitive-shift.md       # Why this architecture exists
│   └── the-machine-that-builds-the-machine.md  # How to build without drifting
├── examples/
│   └── rob-family.md            # Realistic populated example
├── agent/
│   └── system-prompt.md         # Agent system prompt template
├── research/
│   └── viktor-interview/        # Production validation from Viktor/OpenClaw
├── skills/                       # SKILL.md files — agent knowledge (Viktor's pattern)
│   ├── care-coordination/SKILL.md
│   ├── medication-management/SKILL.md
│   └── sms-communication/SKILL.md
├── families/                     # family.md files — operational state per network
│   └── {family_id}/family.md
├── company/SKILL.md              # About CareSupport
├── package.json
├── tsconfig.json
└── src/
    └── index.ts                 # Prototype: SMS → agent → family.md → response
```

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Session model | Fresh per SMS | File is memory; session resume leaks context across users, costs grow linearly |
| Knowledge persistence | SKILL.md files (Viktor's pattern wholesale) | Agent knowledge, capabilities, protocols — read on demand |
| State persistence | family.md (one file per network) | Operational state — agent reads at start, updates at end |
| Structured data | YAML blocks inside markdown | Readable, parseable, less corruption-prone than raw JSON in markdown |
| Concurrency | Queue per family | Serialize within a family; parallel across families |
| Tools | Read + Edit (built-in) | Simpler than Memory Tool; direct control; Edit does surgical replacement |
| Proactive | Heartbeat cron | Periodic scan, not long-running process |
| Interface | SMS (1-to-1) | Each family member texts independently |
| Multi-family caregiver | Out of scope (v1) | Focus on one family, one file |

## What's Deferred (v2)

- **Dashboard**: Another interface to the same family.md (reads and writes). Agent present in both SMS and dashboard.
- **Multi-family caregiver**: Sarah across 3 families. Does she get a `caregiver.md`? Separate exploration needed.
- **Storage backend**: Filesystem now. S3 or database later. Agent uses Read/Edit; permission handler routes to backend.
