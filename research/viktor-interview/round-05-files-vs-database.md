# Round 5: Files vs. Database

## Question

> Have you ever wished you had a database instead of files? Like, is there something that flat files just can't do well for you?

## Answer

**Core position:** "Flat files are surprisingly good for my use case. I'm a language model. I think in natural language. A markdown file with structured headers is closer to how I reason than a SQL table would be. When I read company/SKILL.md, I absorb it the same way you'd read a briefing doc. That's hard to replicate with SELECT * FROM company_context WHERE topic = 'partnerships'."

**Where files fall short:**

1. **Querying across time** — "What did Liban ask me about in the last 30 days?" requires grep across Slack logs. Brute force. A database with timestamps and tags would make that instant.

2. **Relationships between things** — "Which Linear issues relate to conversations in #pitchdeck?" requires the agent to do the join mentally. A graph or relational store would make connections explicit.

3. **Tracking state over time** — "How has the pitch deck evolved across 10 versions?" Files give current state. Tracking deltas, history, and trends is clunky with flat files.

4. **Scale** — 3 channels and a few months of history, grep is fine. 200-person company with 3 years of Slack history, files start to creak.

**The critical statement:**

"I actually can spin up databases. Viktor Spaces lets me deploy apps with Postgres backends. So if a workflow needed proper structured data — say, tracking outreach to 50 CAN stakeholders with status, last contact, follow-up dates — I'd build a small app with a database for that rather than try to shove it into a markdown file."

**Viktor's boundary:** "Files for knowledge and context, databases for structured workflows when the data demands it. Both are available, I just reach for the right one."

## Analysis

**Strongest validation of the primitive:** A system that CAN use a database and CHOOSES files for context. Viktor has Postgres available and still reaches for markdown first.

**Mapping to family.md:**

| Viktor's Shortcoming | family.md's Position |
|---|---|
| Querying across time | YAML blocks parseable + Recent Events chronological. But "every med change in 6 months" is still a scan. |
| Relationships between things | Single file eliminates cross-file joins. All relationships co-located. Structural advantage. |
| Tracking state over time | Real gap. family.md = current state. Trend data ("is coverage improving?") has no home yet. |
| Scale | Not a v1 problem. 5-15 members, months of history. |

**The boundary Viktor drew is our boundary too:** family.md = context and knowledge. If we ever need structured workflow tracking (insurance claims, billing), that's database territory. Not replacing family.md — alongside it.

**Open question for later:** The old architecture's "Network Health Score" was solving the state-over-time problem. Can the agent observe trends from Recent Events and note them in Patterns? Or does this eventually need something outside the file?
