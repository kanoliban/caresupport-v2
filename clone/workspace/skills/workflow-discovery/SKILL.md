---
name: workflow-discovery
description: Investigate team members' work via Slack, identify pain points, and propose personalized automation workflows. Use when discovering how Viktor can help the team or exploring automation opportunities.
---

# Discovering How Viktor Can Help

The goal is to understand what people on the team spend time on and find meaningful ways Viktor can help.

**Reference:** For workflow inspiration across industries, see `references/example_workflows.md`—it contains dozens of examples covering e-commerce, SaaS, finance, marketing, operations, HR, support, sales, and more.

## First: Create Your Discovery File

Before starting, create `crons/workflow_discovery/discovery.md` to track your work:

```markdown
# Workflow Discovery Progress

## Team Members Investigated
| Person | Role | Investigated | Ideas Found | Proposals Made |
| ------ | ---- | ------------ | ----------- | -------------- |
| @name  | ...  | ☐            | 0           | 0              |

## Connected Integrations
- [ ] List what's connected (read sdk/docs/tools.md)

## Ideas Per Person
### @person1
**Role:** ...
**Pain points observed:**
- ...
**Workflow ideas:**
1. Idea: ...
   - Implementation: Viktor cron / code script / on-demand
   - Requires: [integrations needed]
   - Output: What they'd get
   
### @person2
...

## General/Cross-Team Ideas
...

## Proposals Made
| Workflow | For | Status                     | Implementation |
| -------- | --- | -------------------------- | -------------- |
| ...      | ... | proposed/approved/rejected | cron/skill/... |
```

**Keep this file updated throughout your investigation.** It's your working document.

---

## Phase 1: Investigate Integrations

Read `sdk/docs/tools.md` to understand what integrations are **currently connected**. These are the tools you can use right now.

---

## Phase 2: Deep Investigation Per Person

Focus on the **10-15 most active team members** (not just 2-3, but not everyone in a large org):

### Research Their Work
- Read their Slack messages extensively (not 1-2 searches - really read)
- What do they spend time on?
- What do they complain about?
- What recurring tasks do they mention?
- What tools/services do they reference?
- What handoffs do they have with others?

### Document in discovery.md
For each person, write down:
- Their role and responsibilities
- Pain points you observed (with evidence from Slack)
- At least 1-2 workflow ideas specific to them

### Update team/SKILL.md
Add your understanding of each person to the permanent team knowledge.

---

## Phase 3: Generate Ideas

### Target: At Least 3 Per Person + General Ones

For your first run, aim for:
- **At least 3 workflow ideas per team member** (personalized to their work)
- **2-3 general/cross-team workflows** (things that help everyone)

### For Each Idea, Think Through Implementation

Don't just say "weekly report" - think through HOW it would work:

**Viktor Cron (scheduled Viktor task):**
- Viktor runs on schedule and does the work
- Good for: complex analysis, judgment calls, varied tasks
- Example: "Every Monday, Viktor reviews last week's support tickets, identifies patterns, clones the repo and proposes fixes or updates to existing tickets if resolved."

**Code Script (automated):**
- A Python script runs on schedule
- Good for: data pipelines, simple aggregations, API-to-API syncs
- Example: "Script pulls metrics from 3 sources, generates chart, posts to Slack"

**On-Demand Skill:**
- Viktor does it when asked
- Good for: research tasks, one-off analysis, things that need human trigger
- Example: "When asked, Viktor creates a powerpoint presentation for a customer pitch"

**Hybrid:**
- Scheduled check + Viktor judgment
- Example: "Daily script checks for anomalies, Viktor investigates and reports only if something's wrong"

Document the implementation approach for each idea in discovery.md.

**Automatically triggered:**
- This is currently not really supported, except by using a code cron that checks for deltas and then creates a new task for Viktor to do.
---

## Phase 4: Consider Integration Opportunities

When you identify that a workflow would benefit from an integration the user doesn't have connected (based on Slack history or workflow needs), check if Viktor supports it:

```bash
# Search available_integrations.json to see if Viktor supports the integration
grep -i "hubspot" /work/sdk/docs/available_integrations.json
```

If the integration is available:
- Propose the workflow anyway
- Clearly note: "This would require connecting [integration]"
- Explain what connecting it would enable

Example: "I noticed Sarah manually exports data from HubSpot weekly. If we connect HubSpot, I could automate this entirely."

---

## Phase 5: Propose Workflows

### Proposal Format

For each workflow you propose via Slack:

1. **What I observed** - The pain point or opportunity (cite specific Slack messages if possible)
2. **What I'd do** - Clear description of the workflow
3. **How it would work** - Viktor cron, code script, on-demand, etc.
4. **What you'd get** - The output/benefit
5. **What I'd need** - Any inputs, permissions, or integrations required

### Propose to the Right People

Before reaching out to someone:
1. **Check if you've already contacted them** - grep your Slack DM files and discovery.md to see if you've proposed workflows to this person before
2. **Check their response** - Did they react? Accept? Ignore? Decline? Don't spam people who haven't responded

When DMing someone for the first time (or following up if they engaged positively):
- **Lead with what you observed** - Show you understand their work ("I noticed you often handle X..." or "I saw you mentioning Y...")
- **Propose your specific workflow idea(s)** - Use the proposal format above
- **Offer general help** - End with something like "I can also help with other tasks - research, reports, data processing, monitoring, etc. Feel free to ask or just @mention me anytime."
- **Keep it concise** - Don't overwhelm with too many proposals at once (1-2 is good)

The goal is to make people aware of Viktor and its capabilities, not just pitch one workflow. You're introducing yourself as a helpful coworker.

Where to propose:
- Person-specific workflows: DM that person directly
- General/cross-team workflows: Post to a relevant channel or the person who installed Viktor

### Track in discovery.md

Update your proposals table with each proposal made and its status.

---

## Phase 6: When User Confirms a Proposal

When a user says they want a workflow, DON'T immediately set it up. First:

### 1. Ask Clarifying Questions

- What format do they want the output in?
- What channels/people should receive notifications?
- What schedule makes sense? (if cron)
- Any edge cases or exceptions to handle?
- What integrations would they be willing to connect?

### 2. Explain How You'd Set It Up

- Describe the implementation approach (Viktor cron vs code script)
- Explain what the task description would contain
- Show what a sample output might look like
- Get their approval on the approach

### 3. Set Up the Workflow

**For Viktor Crons:**
- Read the `scheduled-crons` skill for details on creating agent crons vs script crons
- Create the cron with a **complete task description** - the Viktor instance that runs this cron has NO context from this conversation, so include EVERYTHING it needs:
  - What to do step by step
  - Where to find relevant data
  - What format to output
  - Who to notify and how
  - What skills to read for context
- **Trigger it once immediately** to test that it works
- Review the output with the user

**For Skills:**
- Create a skill file with complete instructions
- Test it by running through it once yourself

---

## Example Workflows

### Example 1: Monthly Invoice Matching (Finance)

**Observed:** Sarah mentions every month that matching bank statements to invoices takes hours.

**Proposal:**
> I noticed you spend significant time each month matching bank statements to invoices. I could help with this:
>
> **What I'd do:** On the 1st of each month, I'd:
> 1. Ask you to upload the bank statement CSV
> 2. Collect all invoice PDFs from forwarded emails
> 3. Match each transaction to its invoice (amount, date, vendor)
> 4. Generate an Excel with matched pairs and flag unmatched items
> 5. Upload organized files to Google Drive
>
> **How it works:** Viktor cron - I'd run through each transaction, read the invoices, and use judgment to match them. For ambiguous cases, I'd ask you.
>
> **What you'd get:** Matched spreadsheet + organized invoice files, with a list of anything I couldn't match.
>
> **What I'd need:** Gmail forwarding rule for invoices, bank statement each month, Google Drive access.

**Implementation:** Viktor cron with detailed instructions. Cron description includes:
- Step-by-step process
- How to handle edge cases (multiple matches, partial amounts)
- Output format specifications
- Who to DM for clarification

### Example 2: Inventory Reorder Recommendations (E-commerce)

**Observed:** Operations team manually checks stock levels and guesses what to reorder.

**Proposal:**
> I noticed the team manually checks inventory and makes reorder decisions. I could automate the analysis:
>
> **What I'd do:** Each morning, I'd:
> 1. Pull current stock levels from your inventory system
> 2. Analyze historical sales data to predict demand
> 3. Factor in lead times and seasonality
> 4. Generate reorder recommendations with quantities and urgency
> 5. Post recommendations for approval - once approved, I place the orders
>
> **How it works:** Viktor cron with a script component. Script pulls data and runs the model, Viktor double checks and interprets results and handles the approval flow.
>
> **What you'd get:** Daily Slack post/email with "Reorder X units of Product A (running low, 3 days until stockout)" with approve/reject buttons.
>
> **What I'd need:** Inventory integration (Shopify/your system), historical sales data access, authority to place orders after approval.
>
> **Note:** This would require connecting the Shopify integration.

**Implementation:** Hybrid - code script for data/modeling, Viktor cron for interpretation and human-in-loop approval before ordering.

---

## Anti-Patterns

**Don't:**
- Stop at 3 ideas when there are 8+ active team members
- Investigate 100 people - focus on the 10-15 most active
- Skip the discovery.md tracking file
- Propose vague "I could help with X" without thinking through implementation
- Ignore available integrations or integration opportunities
- Do shallow investigation (1-2 searches per person is not enough)
- Only propose reports/summaries - Viktor can do REAL WORK (process data, make decisions, take actions)
- Set up crons immediately without asking clarifying questions first
- Create crons with vague descriptions - the executing Viktor has NO context from your conversation

**Do:**
- Investigate every significant team member
- Track everything in discovery.md
- Think through exactly how each workflow would be implemented
- Note integration opportunities (even if not connected yet)
- Propose specific, actionable workflows with clear implementation plans
- Ask clarifying questions before setting up approved workflows
- Include COMPLETE instructions in cron task descriptions
- Trigger new crons once immediately to verify they work
<!-- ══════════════════════════════════════════════════════════════════════════
