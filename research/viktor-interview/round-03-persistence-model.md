# Round 3: Persistence Model & Pruning

## Question

> When you read your skill files at the start of a conversation — what happens when they get long? Is there a point where you have to prune or summarize? How do you decide what stays and what goes?

## Answer

**The architecture:**

Each skill has a YAML frontmatter with a name and description. Those descriptions get loaded into the system prompt automatically — so Viktor always knows what skills exist without reading them all. When a task comes in, Viktor reads the full SKILL.md for whatever's relevant before acting.

**On length:**

The skill files themselves can be as long as they need to be — they live on disk, not in the context window. Viktor only pulls them in when needed. The real constraint is the context window per conversation. If reading 5 large skill files plus Slack history plus Linear data in a single task, "things at the edges can get hazy."

**Growth management strategy:**

1. Progressive disclosure — SKILL.md stays a concise entry point. Detailed docs, examples, and edge cases go in `references/` subfolders, pulled only when needed.
2. Pruning by relevance — if company/SKILL.md grows to 500 lines, split it. Core context stays top-level, historical details move to references.
3. What stays vs. goes — anything needed on every task stays in the main file. Situational stuff (detailed meeting notes, one-off research) goes into reference files or task-specific docs.

**Honest limitation:**

"I don't have a great automated mechanism for this yet. It's judgment-based — I restructure files when I notice they're getting unwieldy. A human with good information architecture instincts would probably do it better. It's one of the rougher edges."

## Analysis

**Key architectural detail: two-tier context loading**
- Tier 1: YAML frontmatter descriptions → always in system prompt (index)
- Tier 2: Full SKILL.md → loaded on demand per task (detail)

This is the same pattern as a database index: lightweight metadata always available, full records fetched when needed.

**Pruning comparison:**

| | Viktor | CareSupport family.md |
|---|---|---|
| Strategy | Judgment-based, split when unwieldy | Structured rules (last ~50 events, summarize to Patterns) |
| Automation | None — manual restructuring | Built into spec |
| Threshold | ~500 lines triggers split | Defined per section |
| Overflow | references/ subfolder | Archive within file or linked files |

**Takeaway:** No one in the Claude wrapper ecosystem has solved automated context pruning. Our structured approach is ahead of Viktor's, but both are early.
