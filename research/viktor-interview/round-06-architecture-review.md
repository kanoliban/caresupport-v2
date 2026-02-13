# Round 6: Viktor Reviews Our Architecture

## Question

> I'm building something similar — a care coordination agent where the entire product is a markdown file per family and a conversation. No database, no app logic, just the file and the agent. Does that architecture make sense to you, or am I missing something you've already learned the hard way?

## Answer

**Verdict:** "It makes a lot of sense. I'm not saying that to be agreeable — I'm literally living proof this architecture works."

### What Viktor validated:

1. **Care information is narrative, not tabular.** "Mom prefers to eat before taking her meds, and gets anxious with new people" doesn't belong in a database column. A markdown file holds that naturally, and an LLM can reason over it the way a family member would.

2. **Human-readable by design.** If the agent is down, the family can still open the file and understand everything. That's a feature no traditional app gives you.

3. **No schema rigidity.** Every family's care situation is different. One family tracks sundowning patterns, another tracks dialysis schedules. Markdown lets each file be shaped by the family's actual reality instead of your data model.

4. **The file IS the system of record.** Portable, owned by the family, readable by humans and agents alike.

### Where Viktor pressure-tested:

**1. The file gets long.**
"This is my most real problem. A family coordinating care over 18 months will generate a massive file. The agent's context window becomes the bottleneck. You'll need a strategy — maybe sections the agent always reads vs. archival sections it pulls on demand."

**2. Concurrent conversations.**
"Your product has multiple family members talking to the same agent about the same file. If daughter updates Mom's medication at 2pm and son schedules a new appointment at 2:05pm, who writes to the file? You need a merge strategy or a queue."

**3. Structured retrieval.**
"'When is Mom's next appointment?' — easy. 'Show me every medication change in the last 6 months' — now the agent has to parse chronological entries scattered through the file. This is where I occasionally wish I had an index."

**4. HIPAA and audit trails.**
"A flat file doesn't inherently give you access logs, change tracking, or permission boundaries. Git-style versioning could solve the change history piece, but access control needs a layer on top of the file."

### Viktor's concrete suggestion — two-tier file structure:

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

**Closing statement:** "Your architecture isn't naive — it's opinionated in the right direction. The edge cases above are real but solvable. And the core bet — that an LLM + a well-structured text file can replace an entire app layer — I'd take that bet."

## Analysis

**Scorecard:**

| Viktor's Concern | Our Design | Status |
|---|---|---|
| File gets long | Pruning rules in spec. Viktor's Current/Reference split is a refinement to adopt. | Designed + refinement identified |
| Concurrent conversations | Queue per family, serialize messages | Already solved (Viktor hasn't) |
| Structured retrieval | YAML blocks for parseable data | Partially solved |
| HIPAA / audit trails | Noted as deferred plumbing | Design gap — needs earlier attention |

**We're ahead on 2, aligned on 1, behind on 1.**

**Refinements to adopt:**
1. Two-tier section architecture (Current/Reference) within family.md
2. Per-member preferences field in Members section
3. Audit trail strategy designed earlier (git-style versioning)
