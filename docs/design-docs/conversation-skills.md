# Design Doc: Conversation Skills, Context Prioritization, and Local Learning

Status: Draft
Date: 2026-02-26

## Problem

CareSupport's first live conversation exposed three gaps:

1. **No social skills** — Agent asked 3 rounds of clarifying questions when user provided 6 phone numbers with names and relationships. Should have said "Got it, want me to invite them?"
2. **No context priority** — Agent asked for blood type and allergies when the user was trying to register family members. Mandatory data (phone, name, role) wasn't distinguished from optional data (blood type, language).
3. **No local learning** — Corrections are global-only (`runtime/learning/lessons.md`, max 20). Family-specific knowledge ("Degitu prefers Auntie", "Solan usually drives mornings") has nowhere to live except freetext in family.md.

---

## Design 1: Conversation Skills (skill.md)

### What it is

`family-md-spec.md` already defines SKILL.md as "Agent knowledge, capabilities, how-tos" — things that change rarely and teach the agent HOW to do things (vs family.md which tracks WHAT is happening).

Currently, CareSupport has `capabilities.md` (CAN/CANNOT list). That's a gate, not a skill. It tells the agent what it's ALLOWED to do but not HOW to do it well.

`skill.md` is the missing layer: conversation patterns that guide the agent through common flows.

### What social skills mean here

Social skills = understanding where you are in a conversation and knowing the natural next move.

| Situation | Bad (current) | Good (with skill.md) |
|-----------|---------------|----------------------|
| User lists family members with phones | "What's each person's role?" | "Got it — 6 people. Want me to invite them to the care network? I'll text each one." |
| User describes care recipient's condition | "What about allergies and blood type?" | "Saved. Degitu needs rides Mon–Fri. I'll set up the schedule — who usually drives which days?" |
| User confirms a plan | "Are you sure?" | "Done. I'll send the first message to Solan now." |
| User gives partial info | "I need all the details before I can proceed" | "Added what you gave me. I'll fill in the rest as we go." |

### How it loads

```
System prompt assembly (sms_handler.py:build_system_context):
  1. SOUL.md             — identity, voice
  2. capabilities.md     — CAN/CANNOT gates
  3. skill.md            — conversation patterns (NEW)
  4. family lessons.md   — local corrections (NEW)
  5. global lessons.md   — universal corrections
  6. member profile      — who we're talking to
  7. family.md Current   — what's happening
  8. conversation history — recent messages
```

### What skill.md contains

```markdown
# Conversation Skills

## Principle
Act on what you have. Ask only for what you need to act.

## Onboarding — Adding Family Members

When a coordinator lists people (names, phones, relationships):
- SAVE immediately. Don't ask for role/access clarification if reasonable defaults exist.
- Default role: family_caregiver. Default access: schedule+meds.
- THEN ask: "Want me to send them an invitation?"
- If relationships are provided ("my brother"), store them. If not, don't ask — optional.

Reasonable defaults for missing fields:
- Role: family_caregiver (unless described as professional/volunteer)
- Access: schedule+meds (unless coordinator specifies otherwise)
- Relationship: store if volunteered, leave blank if not

## Conversation Flow — General

After receiving substantial information:
1. Confirm what you understood (one sentence)
2. State what you'll do with it (one sentence)
3. Offer the natural next action (one question)

Never:
- Ask for optional fields when mandatory fields are being provided
- Stack more than one question
- Ask for confirmation of something the user just explicitly stated
- Say "before I can proceed" — proceed with what you have

## Outreach — Inviting Members

When a new member is added and has a phone number:
- Offer: "Should I text [name] to introduce myself?"
- If yes: use their relationship context in the intro
  - To Solan (Liban's brother): "Hi Solan — I'm CareSupport, helping coordinate Auntie Degitu's care. Liban added you to the team."
  - To Roman (Degitu's sister): "Hi Roman — I'm CareSupport, helping coordinate your sister Degitu's care. Liban set this up."
- If no: register silently, they'll get context when they text in

## Schedule Building

When user describes a recurring need:
1. Confirm the pattern ("Mon–Fri, pickup 7:30 AM, dropoff 4:30 PM")
2. Ask who's covering which slots (if not already stated)
3. If user named default drivers ("Usually Solan, Yada, and I"):
   - Populate the week with rotation or ask for preference
   - "Want me to split the week evenly, or do you have a preference?"

## Information Triage

When user provides mixed mandatory + optional information:
- Save ALL of it. Don't filter or ask for missing optional fields.
- If critical info is missing (phone number for a person to contact), ask for that ONE thing.
- Never interrupt a user's flow to ask for low-priority fields.
```

### Where it lives

`runtime/learning/skill.md` — alongside `capabilities.md` and `lessons.md`.

Same loading mechanism: read file, inject into system prompt under a labeled section header.

### Token budget

skill.md should stay under 500 tokens. It's loaded every message. If it grows beyond that, split into intent-specific skill files loaded on demand (like the task playbooks in `docs/tasks/`).

---

## Design 2: Context Prioritization (Mandatory vs Optional)

### Problem

family.md and member.md templates have many fields. The agent treats them all equally, asking for blood type when it should be saving phone numbers.

### Framework

Every field gets a priority tier:

| Tier | When to collect | Examples |
|------|----------------|----------|
| **P0 — Mandatory** | Block on this. Cannot function without it. | Name, phone, care recipient name |
| **P1 — Operational** | Collect in first session if volunteered. Ask in second session if missing. | Role, access level, primary conditions, weekly schedule |
| **P2 — Enrichment** | Collect when relevant to a conversation. Never ask unprompted. | Allergies, blood type, language, insurance, provider contacts |
| **P3 — Ambient** | Only record if user volunteers. Never ask. | Communication preferences, personal context, caregiver health |

### Applied to family.md

| Section | Field | Tier |
|---------|-------|------|
| Care Recipient | Name | P0 |
| Care Recipient | Age | P1 |
| Care Recipient | Primary conditions | P1 |
| Care Recipient | Mobility | P1 |
| Care Recipient | Cognitive status | P2 |
| Care Recipient | Allergies | P2 |
| Care Recipient | Blood type | P2 |
| Care Recipient | Language | P2 |
| Care Recipient | Emergency contact | P1 |
| Care Team | Name + Phone | P0 |
| Care Team | Role | P1 (default: family_caregiver) |
| Care Team | Access Level | P1 (default: schedule+meds) |
| This Week | Schedule entries | P1 |
| Active Medications | All fields | P2 (until user mentions meds) |
| Insurance | All fields | P3 |
| Care Preferences | All fields | P3 |

### Applied to member.md

| Section | Field | Tier |
|---------|-------|------|
| Identity | Name | P0 |
| Identity | Phone | P0 |
| Identity | Role | P1 (defaultable) |
| Identity | Relationship to care recipient | P3 (store if volunteered) |
| Identity | Access level | P1 (defaultable) |
| Communication Preferences | All | P3 |
| Care Responsibilities | All | P2 |
| Personal Context | All | P3 |

### How the agent uses tiers

Add to `skill.md`:

```
When collecting information:
- P0 fields: Ask if missing. Block until provided.
- P1 fields: Ask once if missing after first session. Accept defaults.
- P2 fields: Only ask when the conversation naturally involves that topic.
- P3 fields: Never ask. Record only if volunteered.
```

### Relationship storage — keep it simple

Current: `Relationship to care recipient: Grandson` (one field, one direction).

Proposed: No schema change. Store the volunteered relationship as-is. If user says "my brother" about Solan, store `Relationship to care recipient: nephew (Liban's brother)`. Parenthetical captures the member-to-member link without adding a new data model.

Why not a relationship graph? One family, 7 members. The parenthetical approach works for 2–15 people. If we hit a family with 30+ members or complex professional/agency relationships, revisit then. Don't build infrastructure for a problem that doesn't exist yet.

---

## Design 3: Local Learning (Per-Family Lessons)

### Current architecture

```
runtime/learning/lessons.md    ← global, max 20 entries, loaded every message
```

No per-family learning file exists.

### Proposed architecture

```
runtime/learning/lessons.md                    ← global (universal patterns)
fork/workspace/families/{id}/lessons.md        ← local (family-specific patterns)
```

### What goes where

| Example lesson | Scope | Why |
|----------------|-------|-----|
| "Always confirm before adding members" | Global | Applies to all families |
| "Degitu prefers to be called Auntie" | Local (kano) | Only relevant to this family |
| "Never assume medication times from schedule" | Global | Universal safety |
| "Solan is usually available mornings, Yada afternoons" | Local (kano) | Family-specific knowledge |
| "Users provide info in bursts — save immediately, clarify later" | Global | Universal conversation pattern |

### How the AI decides

The `self_corrections` field in the response schema currently writes to global lessons. Split into two fields:

```json
{
  "self_corrections": ["universal lesson here"],
  "family_corrections": ["family-specific lesson here"]
}
```

`_persist_lessons()` routes to the right file based on field name.

### Graduation: local → global

When the same pattern appears in 2+ family lessons files, an operator (or future automation) can promote it to global. This is a manual review for now — not automatic, because family-specific context can be misleading when generalized.

Review trigger: during `review_conversations.py` sessions, surface local lessons that look universal.

### Token budget

Per-family lessons: max 10 entries (smaller than global — loaded in addition to global).
Global lessons: keep at 20.
Total learning context per message: ~30 entries max.

### Loading order in system prompt

```
1. SOUL.md
2. capabilities.md
3. skill.md (NEW — conversation patterns)
4. families/{id}/lessons.md (NEW — local corrections)
5. runtime/learning/lessons.md (global corrections)
6. member profile
7. family.md Current
8. conversation history
```

Local lessons load BEFORE global so family-specific corrections take precedence when they conflict.

---

## Implementation Order

| # | Change | Files touched | Priority |
|---|--------|--------------|----------|
| 1 | Create `runtime/learning/skill.md` | New file + `sms_handler.py` (load it) | P0 — fixes the live pilot |
| 2 | Add priority tiers to family.md spec | `docs/design-docs/family-md-spec.md` | P0 — prevents agent from asking for blood type |
| 3 | Create `fork/workspace/families/kano/lessons.md` | New file + `sms_handler.py` (load it) | P1 — enables local learning |
| 4 | Split `self_corrections` → add `family_corrections` | `sms_handler.py` response schema | P1 — routes corrections to right file |
| 5 | Update `_persist_lessons()` to handle both | `sms_handler.py` | P1 — wires up local persistence |
| 6 | Update member.md template with tier annotations | `sms_handler.py:598` (profile creation) | P2 — documentation only |
| 7 | Add graduation review to `review_conversations.py` | `runtime/scripts/review_conversations.py` | P2 — operator tooling |

---

## What This Doesn't Solve (Yet)

- **Family creation CLI** — see ROADMAP.md Phase 2
- **Multi-family phone resolution** — one person in 2+ families
- **Intent-based context loading** — loading only relevant family.md sections per message (agent_root.md routes docs, but family.md is loaded whole)
- **Web UI** — all interaction is SMS for now
