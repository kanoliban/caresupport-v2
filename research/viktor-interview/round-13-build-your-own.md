# Round 13: "Build Something Like You"

## Question

> If I wanted to build something like you — not a competitor, just for a personal project — but specifically for one domain, like coordinating a small team over SMS text, iMessage, WhatsApp instead of Slack, what would you tell me to focus on? What's the hardest part of making something like you actually work?

## Answer

### The Hardest Part: Short Messages → Correct File Updates

In Viktor's architecture, Slack is the interface and `/work` is the brain. Messages come in, read files, do work, respond. Files persist, conversation is just the trigger.

With SMS/WhatsApp, you lose rich context per message — Block Kit formatting, file attachments, threads, channel context. You get 160 characters and maybe an image.

> "The hardest engineering problem is: how does a short, messy text message get correctly routed to the right part of the family markdown file, update the right section, and confirm back in a way that feels natural — not like talking to a database?"

This is the Voice-to-Recommend™ thesis. Voice/text is the input, the file is the brain, the agent is the translation layer.

### The Second Hardest Part: Multi-User State on a Single File

Viktor has it easy — one user per thread. CareSupport has a daughter, son, home aide, and nurse all texting about the same care recipient, possibly simultaneously:

```
2:00pm  Daughter: "Mom's doctor moved her appt to Thursday"
2:02pm  Son: "Can someone cover Tuesday morning?"
2:03pm  Aide: "She didn't eat lunch today"
```

Three updates to the same file, three sections, three people needing different confirmations. If aide shouldn't see doctor details (HIPAA), you need per-message access control before the agent responds.

Suggested solution:
- Lightweight write queue (messages ordered, applied sequentially)
- Section-level locking (not file-level)
- Role-based read filtering on agent's responses, not the file itself

### Phased Build Order

**Phase 1 — Core loop**
```
SMS/WhatsApp in → agent reads family.md → reasons →
updates family.md → responds via SMS/WhatsApp
```
One family, one care recipient, 2-3 users. Twilio for SMS, WhatsApp Business API. Agent is Claude with family markdown as context. Don't build an app — the conversation IS the app.

**Phase 2 — Smart file**
Section-level architecture (Current vs Reference). Agent always loads Current, pulls Reference on demand. Timestamps on every update for audit trail.

**Phase 3 — Multi-user awareness**
Map phone numbers to care team roles. Filter responses by role. "Mom's doctor changed meds" goes to everyone. "Insurance billing code" goes to primary caregiver only.

**Phase 4 — Proactive nudges (the heartbeat cron)**
Agent checks the file on schedule:
- "No one has confirmed coverage for tomorrow morning"
- "Mom's prescription refill is due in 3 days"
- "It's been 48 hours since anyone logged a meal"

> "This is where the value compounds. The family stops having to remember — the file remembers for them."

### Patterns to Steal From Viktor

```
Skill files        → Care protocols ("how to handle a fall",
                     "medication change process")
Crons/heartbeat    → Proactive care nudges
Draft/approval     → "I'm about to update Mom's medication
                     list — confirm?" before writing
Slack logs → files → SMS conversation logs → files
                     (same pattern, different transport)
Tool gateway       → Integration layer for pharmacy APIs,
                     insurance, medical records
```

### What's Harder Than Viktor's Setup

1. **Delivery reliability** — Slack is always-on. SMS fails, gets delayed. For care coordination, a missed message could be dangerous. Need delivery confirmation and escalation paths.
2. **No rich UI fallback** — Can't post formatted tables over SMS. Agent must summarize complex state in plain, short language.
3. **Onboarding without a screen** — Viktor had a Slack thread for onboarding. SMS users get a text. First impression must be dead simple: "Text START to begin" → 3 questions → family file created.
4. **Cost** — SMS costs per message. Agent must be concise not just for UX but for unit economics.

### Viktor's Verdict

> "The shortest answer to 'what's the hardest part': making a stateful, multi-user, role-aware system feel like you're just texting a helpful friend. The technology is all solvable. The UX over a constrained channel is the real craft."

## Analysis

**This round is the synthesis.** Viktor independently validated our architecture and then proposed the exact build order we should follow.

**What we're adopting:**
1. Phased approach (core loop → smart file → multi-user → proactive)
2. Heartbeat/cron pattern for care nudges
3. Draft/approval pattern for medication and schedule changes
4. Gateway pattern for external healthcare integrations

**What Viktor identified that we hadn't fully solved:**
1. Delivery reliability + escalation paths (critical for care)
2. SMS cost optimization (brevity as unit economics)
3. Text-only onboarding flow design

**Closing insight:** The 8 transferable design patterns from Viktor's architecture, mapped to CareSupport:

| Viktor Pattern | CareSupport Implementation |
|---|---|
| File-as-brain, conversation-as-interface | family.md + SMS/WhatsApp |
| Section-level architecture | Current (always loaded) / Reference (on demand) |
| Skill files as persistent memory | Care protocols as reference docs |
| Cron-as-heartbeat | Proactive care nudges |
| Draft/approval for writes | Confirmation before care plan changes |
| Gateway for credential isolation | HIPAA-compliant integration layer |
| Conversation logs → flat files | SMS/WhatsApp logs for searchable history |
| Index in prompt, detail on demand | family.md TOC always loaded, sections on demand |
