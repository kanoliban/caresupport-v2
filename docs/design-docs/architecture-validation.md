# Architecture Validation — Viktor Interview (February 2025)

We interviewed a production agent running the same primitive to pressure-test our architecture before building further. This document captures what we learned.

---

## What Is Viktor

Viktor is a workspace agent built on OpenClaw (open source), packaged into Slack, powered by Claude. It ships as a paid product through getviktor.com. It is not a prototype — it runs in production workspaces with real users.

Viktor's architecture:

- **Persistence:** Skill files (markdown with YAML frontmatter) stored on disk, read at session start
- **Session model:** Fresh invocation per message (no persistent conversation state)
- **Context:** `company/SKILL.md` and `team/SKILL.md` read before every task
- **History:** Slack messages logged to searchable files, grep-able across conversations
- **Tools:** Code sandbox, persistent file storage, 3000+ integrations (Linear, GitHub, Google Ads, etc.)
- **Proactive behavior:** Cron scheduling for autonomous recurring tasks
- **Workspace:** `/work` directory for scripts, files, and reusable workflows

Viktor independently converged on the same scaffolding pattern (SKILL.md files, fresh sessions, file-based persistence) — because the primitive demands it. What Viktor does NOT have is `family.md`: an operational state file for an ongoing care relationship. SKILL.md stores knowledge. family.md stores live state. These are different concepts — both exist in our architecture.

---

## Why This Interview Matters

We are betting the entire product on a single architectural claim: an LLM plus a well-structured markdown file can replace an application layer. Before building further, we needed to know whether a production system running this pattern had hit walls we haven't anticipated.

Viktor is the closest analog we could find: same underlying model (Claude), same persistence pattern (markdown files read at session start), same session model (fresh per interaction), same proactive behavior (cron). Different domain (workspace coordination vs. care coordination), different interface (Slack vs. SMS), different scope (general-purpose vs. single-domain).

The differences make Viktor's feedback more valuable, not less. A general-purpose agent hits scaling problems earlier because it serves more varied queries. What Viktor has already felt, we will eventually feel.

---

## The Five Questions and What They Revealed

### Round 1: "Show me your skill files."

We asked Viktor to share the actual contents of `company/SKILL.md` — its knowledge file about the workspace it serves. Note: SKILL.md (knowledge) and family.md (operational state) are different concepts. SKILL.md stores what things ARE. family.md stores what's HAPPENING.

**What Viktor shared:**

```markdown
# CareSupport

## Overview
- Website: caresupport.com
- Founded: 2024
- Stage: Early-stage startup
- Industry: Health tech / Family caregiving

## What They Do
Family care coordination platform...

## Key Partnerships
- CAN (Caregiver Action Network)

## Product Priorities (from Linear)
- HIPAA compliance messaging
- Multi-language support
- Caregiver respite tracking...

## Connected Integrations
- Linear ✅ Working
- Google Ads ⚠️ Connected but auth broken
- GitHub ⚠️ Connected, GitHub App install erroring

## Company Culture Notes
- Founded by a caregiver — deeply personal mission
- Small team (solo founder + external collaborator)
- Casual, direct communication style
```

It also shared `team/SKILL.md` with individual profiles for each team member: role, background, communication style, open questions.

**What this tells us:**

Viktor's skill files are entity snapshots — what the company IS, who the people ARE. This is the state clock: current truth, no reasoning history. Compare to family.md, which captures operational state (this week's schedule, active medications, recent events, observed patterns). Viktor's files are a CRM. Family.md is an operational brain.

The structural difference: Viktor uses prose and bullet points. Family.md uses markdown with YAML blocks for parseable structured data (schedules, medications, availability). For care coordination, where the agent needs to reason about shift times and medication windows, structured data matters. For a general-purpose workspace agent, prose is sufficient.

**Data sources matter too.** Viktor built its skill files from web search, the Linear backlog, and Slack workspace data — broad but shallow. Family.md gets built from SMS conversations with family members — narrow but operationally deep. The capture mechanism shapes the file's character.

---

### Round 2: "What happens when skill files get long?"

**Viktor's architecture for managing growth:**

1. **YAML frontmatter indexing.** Each skill file has YAML frontmatter (name, description). Descriptions are loaded into the system prompt automatically — so Viktor always knows what skills exist without reading them all. When a task comes in, it reads the full SKILL.md for whatever is relevant.

2. **Progressive disclosure.** SKILL.md stays a concise entry point. Detailed docs, examples, and edge cases go in `references/` subfolders, pulled only when needed.

3. **Pruning by relevance.** If a skill file grows past ~500 lines, split it. Core context stays top-level, historical details move to reference files.

4. **Judgment-based, not automated.** Viktor admitted this is a rough edge: "I don't have a great automated mechanism for this yet. It's judgment-based — I restructure files when I notice they're getting unwieldy. A human with good information architecture instincts would probably do it better."

**What this tells us:**

The real constraint is the context window, not disk space. Files can be arbitrarily large on disk, but the agent can only hold so much in a single conversation. Viktor's solution is two-tier: lightweight index always in context, full files loaded on demand.

Our pruning strategy is more structured than Viktor's: Recent Events keeps the last ~50 entries, older entries summarize into the Patterns section, the Schedule section reflects current and future only. This is by design — care coordination cannot afford "hazy edges." Viktor's general-purpose workspace can tolerate some fuzziness. A missed medication cannot.

**Key takeaway:** No one in the Claude wrapper ecosystem has solved automated context pruning well yet. Viktor confirmed this is an active, unsolved problem. Our structured approach (explicit pruning rules in the family-md-spec) is ahead of where Viktor is, but both are early.

---

### Round 3: "What goes wrong because you start fresh?"

Viktor identified four failure modes. We mapped each against family.md's design.

**Failure Mode 1: Tone and preference drift.**

Viktor: "You might tell me 'don't make the pitch deck so formal' — and if I don't capture that in a skill file, next time I'll default back to formal."

family.md gap: Our spec has Members with roles, contact info, and capabilities — but no explicit field for communication preferences or interaction style per member. "Rob prefers bullet points" or "don't text Marta before 9am" doesn't have a natural home yet. The Patterns section could capture this organically, but it's not guaranteed.

**Failure Mode 2: "We already tried that."**

Viktor: "If you explored a strategy last month and decided it was a dead end, that nuance lives in a Slack thread I might not think to search."

family.md answer: Recent Events and Patterns sections exist specifically for this. When the agent tries something and it doesn't work, or the family makes a decision, it gets logged. "Tried moving James to afternoons — didn't work because of his commute" becomes searchable precedent. This is one of family.md's structural advantages over Viktor's skill files.

**Failure Mode 3: Offline context.**

Viktor: "If Koemen pushes back on something in #pitchdeck and you two resolve it in a call, I have no idea. I only know what's in Slack and connected tools. Offline context is my biggest structural gap."

family.md's partial answer: SMS is the only interface. Each family member texts the agent independently, which creates a natural pull for information to flow through the agent rather than around it. In Slack, people talk to each other constantly — the agent is one participant among many. In our model, the agent is the hub.

But this doesn't fully solve it. Care decisions happen at the bedside, on phone calls, during doctor visits. The agent can prompt — "How did the appointment go?" — but can't know what it wasn't told. This is a fundamental limit of any file-based agent, not a design flaw.

**Failure Mode 4: Half-finished work.**

Viktor: "If I start building something, get interrupted, and come back later — I need to reconstruct what I was doing from files I left behind."

family.md answer: Active Issues section with a checklist of unresolved items. When the agent identifies a coverage gap or starts coordinating a schedule change, it's tracked in Active Issues until resolved. This is our explicit solution to Viktor's "someone else's desk" problem.

**The summary sentence Viktor offered:**

"The hardest thing about starting fresh is not knowing what I don't know. Skill files capture what I've explicitly learned. They don't capture vibes, unspoken decisions, or things that happened outside my view."

This is the fundamental limit of the file-based primitive. It applies to family.md exactly as it applies to Viktor. The mitigation is architectural: make the agent the hub so information flows through it by default, and design prompts that surface what the agent might be missing.

---

### Round 4: "Have you ever wished you had a database?"

**Viktor's answer, verbatim:**

"Flat files are surprisingly good for my use case. I'm a language model. I think in natural language. A markdown file with structured headers is closer to how I reason than a SQL table would be."

Then Viktor identified four specific areas where files fall short:

1. **Querying across time.** "What did Liban ask me about in the last 30 days?" requires grep across Slack logs. A database with timestamps would make it instant.

2. **Relationships between things.** "Which Linear issues relate to conversations in #pitchdeck?" requires the agent to do the join mentally. A graph or relational store would make connections explicit.

3. **Tracking state over time.** "How has the pitch deck evolved across 10 versions?" Files give current state. Tracking deltas, history, and trends is clunky.

4. **Scale.** 3 channels and a few months of history — grep is fine. 200-person company with 3 years of history — files creak.

**Then the critical statement:**

"I actually can spin up databases. Viktor Spaces lets me deploy apps with Postgres backends. So the real answer: files for knowledge and context, databases for structured workflows when the data demands it. Both are available, I just reach for the right one."

**What this tells us:**

A system that CAN use a database and CHOOSES files for context is the strongest possible validation of the primitive. Viktor isn't limited to files — it has Postgres available — and still reaches for markdown first.

The four shortcomings Viktor identified map to family.md as follows:

- **Querying across time:** Our YAML blocks for schedule and medications are parseable, and Recent Events provides chronological history. But "every medication change in the last 6 months" is still a scan problem. The Patterns section partially addresses this by summarizing regularities, but trend queries are genuinely harder with flat files.

- **Relationships between things:** Family.md co-locates all information in one file, which eliminates the cross-file join problem Viktor has. The agent reads one file and all relationships are present. This is an advantage of our single-file design over Viktor's multi-file approach.

- **Tracking state over time:** This is our one real gap. family.md reflects current state. "Is Rob's coverage getting better or worse month over month?" requires comparing snapshots that we don't store. The old CareSupport architecture's "Network Health Score" was solving this problem — with the wrong primitive, but for a real need.

- **Scale:** Not our problem in v1. One family, 5-15 members, months of history. Worth noting the ceiling, but not a design concern yet.

**The boundary Viktor drew — files for context, databases for structured workflows — is the right boundary.** Family.md is context. If we ever need structured workflow tracking (e.g., insurance claim status across 50 line items), that's where a database layer would enter. Not for replacing family.md, but alongside it for data that is genuinely tabular.

---

### Round 5: "Does our architecture make sense to you?"

We described CareSupport's architecture directly: a care coordination agent where the entire product is a markdown file per family and a conversation. No database, no app logic, just the file and the agent.

**Viktor's response:**

"It makes a lot of sense. I'm not saying that to be agreeable — I'm literally living proof this architecture works."

Then it validated four design choices:

1. **Care information is narrative, not tabular.** "Mom prefers to eat before taking her meds, and gets anxious with new people" doesn't belong in a database column.

2. **Human-readable by design.** If the agent is down, the family can still open the file and understand everything. No traditional app gives you this.

3. **No schema rigidity.** Every family's care situation is different. Markdown lets each file be shaped by the family's reality instead of a predetermined data model.

4. **The file IS the system of record.** Portable, owned by the family, readable by humans and agents alike.

Then it pressure-tested with four concerns (all mapped above in the scorecard), and offered one concrete architectural suggestion.

**Viktor's suggested file structure:**

```markdown
## Current (always loaded)
### Care team
### This week
### Active medications
### Urgent notes

## Reference (loaded on demand)
### Full medication history
### Past appointments
### Provider contacts
### Care preferences & personality
```

The agent always reads Current. It pulls from Reference when the question requires it. Same file. Same primitive. Better context window management.

This is a refinement of our pruning strategy worth adopting. Our current spec treats all sections as peers. Viktor's production experience says: partition into "always read" and "read on demand" zones. The system prompt enforces the boundary: "Always read the Current section. Read Reference sections only when the user's question requires historical or detailed context."

---

## Synthesis: What We Learned

### Validated (high confidence)

- **The primitive is sound.** A production system running the same pattern confirms: markdown file + fresh sessions + file-based persistence works.
- **Fresh sessions are correct.** Viktor uses the same model: no persistent conversation state, file is the memory, session is ephemeral.
- **Markdown over database for context.** Viktor has Postgres available and still reaches for files first. The strongest possible validation.
- **Human-readability as a feature.** Viktor called this out unprompted. If the system is down, the file is still useful. No app layer required.
- **No schema rigidity.** Each context file shaped by reality, not a data model. Care networks vary wildly — this matters.

### Ahead of Viktor (our design is more mature)

- **Concurrency.** Viktor handles one conversation at a time per task. We designed queue-per-family serialization from day one. This is a solved problem in our architecture that Viktor hasn't addressed.
- **Structured pruning.** Viktor's pruning is judgment-based and acknowledged as a rough edge. Our spec defines explicit rules: Recent Events keeps last ~50, older entries summarize to Patterns, Schedule reflects current/future only.
- **Decision history.** Viktor's skill files capture entity state (what things are). Family.md's Recent Events and Patterns sections capture decisions and outcomes (what happened and what was learned). This is the state clock vs. event clock distinction from our original architecture — preserved in the new primitive.
- **Single-file co-location.** Viktor fragments context across multiple skill files and must cross-reference. Family.md puts everything in one file. All relationships are co-located. The agent reads once and has full context.

### Aligned (same understanding, same challenges)

- **Context window is the real constraint.** Both architectures are limited by how much the agent can hold in one conversation, not by storage.
- **Offline context is the fundamental blind spot.** Things that happen outside the agent's view (phone calls, bedside decisions, in-person meetings) are invisible. SMS-as-hub mitigates this for us better than Slack-as-channel does for Viktor, but neither fully solves it.
- **Temporal queries are clunky.** "Every medication change in 6 months" is a scan problem in both architectures. YAML blocks help with parseability but don't eliminate the issue.

### Behind Viktor (gaps to address)

- **Audit trails and change tracking.** Viktor suggested git-style versioning for the file. We noted HIPAA compliance as deferred plumbing but haven't designed it. For care coordination with PHI, this needs to be designed earlier than we planned.
- **Preference and communication style capture.** Viktor identified tone drift as its first failure mode. Our Members section doesn't have an explicit field for per-member communication preferences. This should be added to the spec.
- **Two-tier file structure.** Viktor's Current/Reference partition within the file is a practical refinement we should adopt. The system prompt enforces which sections the agent always reads vs. reads on demand.

---

## Refinements to Adopt

Based on this interview, three changes to family.md's design are warranted:

### 1. Two-tier section architecture

Partition family.md into Current (always read) and Reference (read on demand):

```markdown
# {Family Name}'s Care Network

## Current
### Members
### Care Recipient
### Schedule (this week + next)
### Medications (active)
### Active Issues
### Urgent Notes

## Reference
### Availability (full rules)
### Appointments (upcoming + past)
### Recent Events (last ~50)
### Patterns (observed regularities)
### Medication History
### Provider Contacts
### Member Preferences & Communication Style
```

The system prompt instructs the agent: "Always read Current. Read Reference sections when the question requires historical context, detailed availability rules, or member preferences."

### 2. Member preferences field

Add to each member entry in the Members section:

```yaml
- name: Marta
  role: Family Caregiver, Backup Coordinator
  contact: +1-555-0102
  preferences: "Prefers texts over calls. Don't message before 9am. Wants brief updates, not detailed summaries."
```

This prevents Viktor's "tone drift" failure mode.

### 3. Audit trail strategy (design placeholder)

The file should be stored with version history from day one. Not a database — git-style versioning of the file itself. Every agent edit creates a new version. Change history is queryable. This satisfies HIPAA change tracking requirements without abandoning the file primitive.

Implementation deferred to the storage backend decision, but the requirement is documented now.

---

## What This Means

We set out to validate whether a markdown file and a conversation could replace an application layer for care coordination. We found a production system — different domain, same primitive — that confirmed the architecture works, identified the same scaling challenges we anticipated, and offered practical refinements from lived experience.

The primitive holds. The file is the product. The agent is commodity infrastructure. The competitive advantage is in the file's structure — how well it captures the reality of a care network in a format that both humans and agents can reason over.

Viktor's closing statement applies to us directly:

"Your architecture isn't naive — it's opinionated in the right direction. The edge cases are real but solvable. And the core bet — that an LLM plus a well-structured text file can replace an entire app layer — I'd take that bet."

A production system already took that bet and is running on it today.
