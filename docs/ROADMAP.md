# Product Roadmap

Last updated: 2026-02-26

## Current State

CareSupport runs as a single-family pilot (Kano family). One care recipient (Degitu), one registered member (Liban), SMS via Linq/iMessage. Files are the database. No self-service onboarding. No multi-family routing beyond directory scanning.

---

## Active Work — Lighthouse Pilot (Kano Family)

### What's proven
- 13-step SMS pipeline works end-to-end
- Approval gating blocks sensitive changes until confirmed
- PHI filtering, role-based access, audit logging all mechanical
- Family.md + member profiles update through conversation
- Outreach queuing (needs_outreach → Linq create_chat) works

### What's broken right now
- Agent asks excessive clarifying questions instead of acting on clear input
- 6 family members listed with phone numbers → 0 added to routing.json
- Pending approval for care recipient update → user hasn't been prompted to confirm
- No per-family learning — corrections are global only
- Relationship context stored as single field (to care recipient), not member-to-member

---

## Roadmap

### Phase 0 — Fix the Pilot (now)

Make the Kano family work properly before scaling anything.

| Item | What | Why |
|------|------|-----|
| **Conversation skills** | Add `skill.md` — social skills that guide conversation flow | Agent should prompt "Want me to invite them?" after receiving member list, not ask 3 more clarifying questions |
| **Context prioritization** | Define mandatory vs optional fields in family.md and member.md | Agent wastes turns asking for blood type when it should be saving the 6 phone numbers it already has |
| **Per-family lessons** | Add `families/{id}/lessons.md` — local corrections | "Degitu prefers Auntie" shouldn't leak to other families; "always confirm before adding members" should be global |
| **Resolve pending state** | Clear the pending approval backlog, add the 6 family members | The pilot is stuck because the agent over-gated a straightforward update |

### Phase 1 — Complete Single-Family Depth (0–30 days)

Prove the full coordination loop within one family before expanding.

| Item | What | Success metric |
|------|------|----------------|
| All members registered | 7 people in routing.json with profiles | 7/7 can text CareSupport and get context-aware responses |
| Transportation schedule | Mon–Fri pickup/dropoff in family.md This Week | Schedule populated, visible to drivers |
| First outreach | CareSupport texts Solan or Yada about a shift | Outreach sent, reply received, logged |
| First handoff | Driver change captured and next driver notified | Handoff summary in timeline |
| NHS baseline | Network Health Score v0 calculated | Coverage %, gap minutes, time-to-fill measurable |

### Phase 2 — Multi-Family Architecture (30–60 days)

Make the system capable of running 2+ families without operator intervention.

| Item | What | Challenge |
|------|------|-----------|
| Family creation CLI | `python scripts/create_family.py --name "tefera" --coordinator "+1..."` | Seed routing.json, family.md, member profile from templates |
| SMS self-service signup | New number texts in → "Start a care network" flow | Need to distinguish new family vs existing member on unknown number |
| Cross-family isolation | One member in 2 families (e.g., caregiver serves multiple) | routing.json currently maps phone → one family. Need multi-family resolution |
| Global lesson graduation | Local lesson appears in 2+ families → promote to global | Need a review mechanism, not automatic (family-specific context could be wrong globally) |

### Phase 3 — Pro Integration (60–90 days)

Pull in professional caregivers via CareGiver OS concepts.

| Item | What |
|------|------|
| Pro invite flow | Family coordinator invites pro → pro joins with scoped access |
| Multi-family dashboard | Pro sees schedule across families they serve |
| Session logging | Pro logs visits, family sees summaries in timeline |
| Availability rules | Pro sets hours, system prevents invalid assignments |

---

## Challenges

### Challenge 1: Scaling Families

**Problem:** Every new family requires manual directory creation, routing.json seeding, family.md templating, first-message-via-Linq to establish chat_id. This is 6 manual steps that require operator knowledge.

**Why it's hard:**
- Phone number is the primary key, but one person can be in multiple families
- Chat_id (Linq's UUID) is only known after first message — chicken-and-egg
- Template family.md has sections that may not apply to every family (not everyone tracks medications)
- No rollback if onboarding fails halfway

**Constraints:**
- Must work over SMS (no web UI for onboarding)
- Must preserve file-as-database architecture (no external DB)
- Must maintain approval gating for sensitive data from day one

**Proposed approach:**
1. CLI tool first (operator-assisted, Phase 2)
2. SMS self-service second (fully automated, Phase 2 stretch)
3. Web dashboard third (Phase 3+, only if needed)

### Challenge 2: Context Explosion

**Problem:** As families grow, the amount of context loaded per message grows. family.md Current section has a 2000-token soft limit, but with 7+ members, active medications, and weekly schedules, it'll exceed that.

**Why it's hard:**
- Every message loads Current section in full
- Agent needs enough context to be useful but not so much it hallucinates
- Different messages need different context (schedule question vs medication question)

**Proposed approach:** See `docs/design-docs/conversation-skills.md` — mandatory/optional framework and intent-based context loading.

### Challenge 3: Conversation Quality at Scale

**Problem:** CareSupport's conversation quality depends on prompt engineering in SOUL.md + capabilities.md. As we add families with different dynamics, a single prompt may not generalize.

**Why it's hard:**
- Each family has different communication norms
- Some families are terse, some are verbose
- Cultural context matters (naming conventions, family structure, communication expectations)
- Global lessons from one family may not apply to another

**Proposed approach:** Per-family `skill.md` for conversation patterns + per-family `lessons.md` for corrections. Global lessons only for universal patterns.
