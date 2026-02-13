# CLAUDE.md — CareSupport Family

## What This Is

CareSupport is a care coordination agent that texts with family members 1-to-1 and maintains a persistent context file (`family.md`) per care network.

One file. One conversation at a time. That's the entire product.

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

## The Primitive: `family.md`

`family.md` is everything the agent knows about a care network. It's a markdown file with embedded YAML blocks for structured data. The agent reads it at the start of every interaction and updates it before responding.

One file per family. The spec lives in `docs/family-md-spec.md`. A realistic example lives in `examples/rob-family.md`.

### Why One File

- **Context window friendly**: One read loads all relevant state
- **Atomic updates**: Edit tool does surgical string replacement — no partial writes
- **Human auditable**: A coordinator could read the file and understand everything
- **Portable**: Filesystem for dev, S3 for prod, database for scale — the agent doesn't care

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
│   └── family-md-spec.md        # The spec: what family.md is, how it works
├── examples/
│   └── rob-family.md            # Realistic populated example
├── agent/
│   └── system-prompt.md         # Agent system prompt template
├── package.json
├── tsconfig.json
└── src/
    └── index.ts                 # Prototype: SMS → agent → family.md → response
```

## Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Session model | Fresh per SMS | File is memory; session resume leaks context across users, costs grow linearly |
| Persistence | family.md (one file per network) | CLAUDE.md pattern — agent reads at start, updates at end |
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
