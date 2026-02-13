# Round 8: Context Loading Sequence

## Question

> When I send you a message, what happens before you respond? Like, walk me through the first few seconds — what do you read, what do you check, what's already in your head before you even see my words?

## Answer

### Four Layers of Context (in load order)

**Layer 1: System Prompt (always loaded, every conversation)**
Hard-coded into every Viktor instance:
```
- Who I am: "You are Viktor, an autonomous AI coworker"
- Core philosophy: Work by programming, skills are memory,
  quality is non-negotiable
- How to work: Read skills first, script everything,
  verify output, update learnings
- Operating rules: Parallelize, use relative paths,
  log actions, don't guess
- Slack rules: Humans can't see my thoughts — only
  Slack messages reach them
- Current datetime and timezone
```

**Layer 2: Skill Descriptions (always in system prompt)**
Not the full files — just the one-line `description` from every SKILL.md YAML frontmatter. ~30 entries. This is the index:
```
- company: "CareSupport company overview..."
- team: "CareSupport team members, roles..."
- linear: "Use when working with linear..."
- browser: "Browse websites, fill forms..."
- pdf-creation, excel-editing, remotion-video, etc.
```
Viktor always *knows what it knows* without reading everything.

**Layer 3: Conversation Context**
The Slack thread or DM history for the specific conversation.

**Layer 4: The Trigger Message**
The user's actual words. Last thing loaded.

### First Few Seconds After Message Arrives

1. Read message, understand intent
2. Decide which skills are relevant → `file_read` those full SKILL.md files
3. If needed: grep Slack history, query Linear, search web
4. *Then* start forming response or writing code

### What's NOT Pre-Loaded

- Other Slack channels (must grep/file_read the logs)
- Previous conversations outside this thread (must search)
- Full skill file contents (loaded on demand)
- Linear/GitHub/Google Ads data (fetched per-request via API)

> "The system prompt is the only thing that's truly 'always there.' Everything else is pull-based. I'm a brain that knows where its filing cabinets are, and grabs the right folders before answering."

## Analysis

**Critical pattern for CareSupport:**

```
Layer 1: Agent system prompt (always loaded)
Layer 2: Family.md section index / table of contents (always loaded)
Layer 3: Conversation history with this family member (loaded)
Layer 4: The incoming SMS/WhatsApp message (trigger)
```

The YAML frontmatter → description index pattern is directly applicable. Our family.md could have a structured header that's always loaded (the "Current" section), with "Reference" sections pulled on demand.

**Key insight:** "Index in the prompt, detail on demand" — this is how you scale knowledge without blowing the context window. We should design family.md with this loading pattern in mind from day one.
