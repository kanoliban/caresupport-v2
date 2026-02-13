# CareSupport Production Plan — Option A

> **Premise:** CareSupport runs on Viktor's infrastructure. Swap the channel,
> swap the tools, swap the context file, keep the machine.

---

## The Four Swaps

| Layer | Viktor (Current) | CareSupport (Target) | Complexity |
|---|---|---|---|
| **Channel** | Slack messages | SMS/iMessage via Twilio | Medium |
| **Tools** | GitHub, Linear, Google Ads | Pharmacy, Calendar, Insurance, Health Records | High |
| **Context** | SKILL.md files per capability | family.md per family | Medium |
| **Crons** | Workspace-level (standup, discovery) | Family-level (reminders, check-ins) | Low |

### What Stays the Same
- Model + system prompt + reasoning engine
- Tool Gateway (API proxy, credential management)
- State management (filesystem, file read/write)
- Cron infrastructure (scheduled descriptions + filesystem access)
- Draft/approval pattern
- Audit logging framework
- Session lifecycle (fresh context per message)

---

## Phase 0: Infrastructure Assessment
**Duration: 1 week**
**Goal: Verify what Viktor's runtime can and cannot do today**

### Tasks
1. **Audit Viktor's Tool Gateway**
   - How does it route API calls?
   - How does it manage OAuth tokens per integration?
   - Can it handle multiple concurrent families (multi-tenancy)?
   - What's the latency profile for tool calls?

2. **Audit the message pipeline**
   - Slack message → agent invocation: what's the full path?
   - What would need to change to accept SMS webhooks instead?
   - Can both channels run simultaneously? (Viktor on Slack + CareSupport on SMS)

3. **Audit the cron system**
   - How are crons scoped? (workspace-level or configurable?)
   - Can we run per-family crons? (medication reminders per family)
   - What's the scheduling granularity?

4. **Audit the filesystem**
   - Where are SKILL.md files stored?
   - What isolation exists between different "contexts"?
   - Can we enforce family.md isolation (family A's agent can't read family B's file)?

### Deliverable
- `assessment.md` — gap analysis between Viktor's current runtime and CareSupport's needs

---

## Phase 1: Single-Family Pilot (The "Kano Family" Test)
**Duration: 2-3 weeks**
**Goal: One real family using CareSupport over SMS**

### Why start with one family
- Eliminates multi-tenancy complexity
- Eliminates phone routing complexity
- Tests the REASONING (system prompt + protocols + family.md) in production
- Tests the UX (SMS as interface for care coordination)
- Tests the family.md lifecycle (does it actually accumulate useful context?)

### Architecture (minimal)
```
┌─────────────────────────────────────────────┐
│           Twilio SMS Gateway                │
│  (receives SMS → webhook → agent invocation)│
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│        Message Router (minimal)             │
│  Phone → family_id (hardcoded for pilot)    │
│  Phone → member_name, role, access_level    │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│           Agent Runtime                     │
│  (same as Viktor: model + system prompt +   │
│   tool gateway + filesystem)                │
│                                             │
│  Context: families/kano/family.md           │
│  Protocols: workspace/protocols/            │
│  Conversations: conversations/{phone}/      │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│           Tool Gateway                      │
│  Google Calendar (appointments)             │
│  Email (provider communication)             │
│  Web search (health info, resources)        │
│  [Pharmacy/Insurance: mock or manual V1]    │
└─────────────────────────────────────────────┘
```

### Step-by-step

**Week 1: Plumbing**
1. Set up Twilio phone number for CareSupport
2. Build SMS webhook handler → agent invocation bridge
   - Receive SMS → extract phone, message body
   - Map phone to family (hardcoded lookup for V1)
   - Invoke agent with: system prompt + family.md + message
   - Return response via Twilio SMS
3. Build SMS response handler
   - Agent response → Twilio API → SMS back to sender
   - Handle message segmentation (long responses → multiple SMS)
   - Handle delivery failures gracefully
4. Set up the family.md for the Kano family (or a test family)
5. Set up basic crons: medication reminders, morning/evening check-ins

**Week 2: Integration**
6. Connect Google Calendar for appointment management
7. Connect email for provider communication
8. Test the full loop:
   - Family member texts → agent reads family.md → responds
   - Agent sends medication reminder → family confirms → file updated
   - Appointment reminder → prep checklist → follow-up
   - Emergency keyword → correct response → team notified
9. PHI audit logging: every message logged with timestamp, phone, direction
10. Conversation persistence: conversations/{phone}/{date}.log

**Week 3: Living with it**
11. Run the system with the test family for a full week
12. Daily review of agent responses — are they correct? Tone right? Info filtered correctly?
13. Edge case testing: what happens when...
    - Two family members text at the same time?
    - A message comes in at 3am?
    - The family member sends a voice note? (transcription needed)
    - The family member sends a photo? (e.g., photo of discharge papers)
14. Iterate on system prompt and protocols based on real-world behavior

### Metrics
- Response time (message received → response sent)
- Accuracy (did the agent do the right thing?)
- Tone appropriateness (would the family feel cared for?)
- family.md quality (is it accumulating useful context?)
- Error rate (wrong medication, wrong person, wrong access level)

### Deliverable
- Working single-family CareSupport pilot
- 1 week of production data
- Iteration log (what we changed and why)

---

## Phase 2: Multi-Family (3-5 Families)
**Duration: 3-4 weeks**
**Goal: Validate isolation, routing, and scaling**

### New infrastructure needed

1. **Phone → Family Router**
   - Database (or structured file): phone_number → family_id → member → role → access_level
   - Lookup on every incoming message
   - Unknown number handling (per hard rules: zero PHI, generic response)

2. **Family isolation**
   - Each family gets: `families/{family_id}/family.md` (already designed)
   - Agent context ONLY includes the matched family's file
   - Conversation logs separated by family
   - Verify: no cross-family data leakage (the SIM-051 error)

3. **Per-family crons**
   - Each family has its own medication schedule, check-in times, appointment reminders
   - Cron system must support: "For family_id X, at 8am, run morning check-in"

4. **Concurrent message handling**
   - What happens when Family A and Family B both text at the same time?
   - Message queue with family-level isolation

### Family selection criteria
- Mix of complexity: one simple (healthy aging, 2-3 team members), one complex (multiple conditions, 5+ team members)
- Geographic diversity if possible
- At least one family with professional caregivers (rotating staff)
- Informed consent for beta testing

### Deliverables
- Multi-family architecture running in production
- Isolation verification tests (automated)
- 3-4 weeks of production data across 3-5 families
- Revised system prompt and protocols based on multi-family learnings

---

## Phase 3: Healthcare API Integration
**Duration: 4-6 weeks (can overlap with Phase 2)**
**Goal: Connect real pharmacy, calendar, and insurance APIs**

### Priority order (based on simulation findings)

1. **Calendar integration** (highest immediate impact)
   - Google Calendar or Apple Calendar via CalDAV
   - Bidirectional: agent reads/writes appointments
   - Appointment reminders auto-fire from calendar events
   - Complexity: Low — standard OAuth, well-documented APIs

2. **Pharmacy integration** (highest safety impact)
   - Surescripts or pharmacy-specific APIs
   - Medication verification, interaction checking, refill requests
   - Complexity: HIGH — requires pharmacy partnerships, regulatory compliance
   - V1 alternative: agent emails/calls pharmacy on behalf of family (manual bridge)

3. **Health records / EHR** (highest longitudinal value)
   - FHIR (Fast Healthcare Interoperability Resources) API
   - Read: lab results, visit summaries, provider notes
   - Complexity: VERY HIGH — Epic/Cerner/Allscripts integration, requires healthcare IT partnerships
   - V1 alternative: family forwards/photos lab results, agent transcribes

4. **Insurance verification**
   - Coverage checks, prior auth status, claims
   - Complexity: HIGH — payer-specific APIs, highly variable
   - V1 alternative: agent helps family navigate phone calls with scripts and checklists

### The "Manual Bridge" Strategy
For V1, many integrations can work through MANUAL BRIDGES:
- Pharmacy: agent prepares the refill request → family calls pharmacy
- Insurance: agent prepares the question → family calls member services
- EHR: family shares results → agent transcribes and tracks
- Provider: agent drafts email → family reviews and sends

This is NOT a hack. It's the correct V1 approach because:
1. It tests whether the COORDINATION is valuable even without API automation
2. It avoids premature integration work that might not match real usage patterns
3. It keeps the family in control (builds trust)
4. It satisfies HIPAA more easily (no direct PHI exchange with third parties)

---

## Phase 4: Compliance & Security
**Duration: Ongoing, but foundational work in parallel**

### HIPAA Requirements
1. **PHI Audit Trail** — every message, every file read/write, timestamped
   (Viktor already logs agent runs; extend to PHI-specific logging)
2. **Access controls** — verified in simulation, need production verification
3. **Data encryption** — at rest and in transit
4. **BAA (Business Associate Agreement)** — with model provider (Anthropic),
   hosting provider, Twilio
5. **Breach notification** — incident response plan

### SOC 2 Path
If Poke achieved SOC 2 Type II, the same path is available for CareSupport.
Phase 2+ should document controls that will form the basis of the audit.

### State-Specific Regulations
Care coordination touches state-specific rules around:
- Who can administer medications (varies by state)
- Telehealth consent requirements
- Recording/monitoring consent (two-party consent states)
- Mandated reporting requirements
Research per-state requirements before expanding beyond the pilot state.

---

## Timeline Summary

```
Month 1:  Phase 0 (assessment) + Phase 1 (single-family pilot)
Month 2:  Phase 1 continues + Phase 2 begins (3-5 families)
Month 3:  Phase 2 continues + Phase 3 begins (API integrations)
Month 4+: Phase 3 continues + Phase 4 (compliance)
```

### Key Decision Points
- **End of Phase 1:** Does the reasoning work in production? Is SMS sufficient as an interface? → Go/No-Go on Phase 2
- **End of Phase 2:** Does multi-family isolation work? Is the architecture scaling? → Go/No-Go on Phase 3
- **During Phase 3:** Is the manual bridge strategy working, or are API integrations urgently needed?
- **After Phase 3:** Review OpenPoke architecture for potential orchestration improvements

---

## The Fastest Path to "One Real Family"

If we optimize for speed to first real interaction:

1. **Day 1-3:** Twilio number + SMS webhook → agent invocation bridge
2. **Day 3-5:** Populate family.md for test family, test full message loop
3. **Day 5-7:** Connect basic crons (medication reminders, check-ins)
4. **Day 7:** First real family member texts the number and gets a correct response

Everything else is iteration from that point.

The system prompt works. The protocols work. The family.md structure works.
We proved all of that in simulation. The only question is whether the
plumbing delivers the messages correctly and whether real humans interact
with the system the way simulated humans did.

**The fastest way to answer that question is to build the smallest possible
pipe and put a real message through it.**
