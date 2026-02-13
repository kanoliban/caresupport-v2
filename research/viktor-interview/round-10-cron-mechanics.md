# Round 10: Cron & Autonomy Mechanics

## Question

> You mentioned you can do things on a schedule — cron jobs. Can you show me how that works? Like, if I wanted you to check my Google calendar and Linear board every morning and summarize what's new, how would you set that up? Walk me through the actual mechanics.

## Answer

### Two Types of Crons

| Type | What It Is | Best For |
|---|---|---|
| **Agent cron** | Fresh Viktor instance wakes up on schedule, receives a prompt, does work with full reasoning | Tasks needing judgment, variable output |
| **Script cron** | Python script runs on schedule. No AI, just code. | Data pulls, simple checks, deterministic work |

A morning summary would be an **agent cron**.

### Building the Morning Summary — Step by Step

**Step 1: Handle the integration gap**
Google Calendar isn't connected. Options: connect Google Drive integration (includes Calendar), or set up custom API integration.

**Step 2: Write and test the logic**
Write script that pulls calendar events + Linear activity, run manually, iterate on output format.

**Step 3: Create the cron**
```python
from sdk.tools.scheduled_crons import create_agent_cron

await create_agent_cron(
    path="/morning-briefing",
    title="Morning Briefing for Liban",
    description="""
    Every weekday morning, prepare a briefing for Liban.

    1. Read company/SKILL.md and team/SKILL.md for context
    2. Query Linear for:
       - Issues updated in the last 24 hours
       - New issues created
       - Status changes (anything moved to Done, In Progress, etc)
       - Approaching due dates
    3. Pull today's Google Calendar events (meetings, deadlines)
    4. Check Slack channels for important overnight messages
    5. Compose a concise morning briefing:
       - 📅 Today's schedule
       - 🔄 What changed in Linear since yesterday
       - 💬 Anything notable in Slack
       - 🎯 Suggested focus for the day
    6. DM Liban (U08D74NH27L) with the briefing
    """,
    cron="0 8 * * 1-5",  # 8am CT, Monday-Friday
    trigger_now=True,     # Run once now to test
)
```

### The Critical Insight: Description = Brain

> "That `description` field is everything. The Viktor that wakes up at 8am has *zero memory* of this conversation."

The cron Viktor instance gets only:
- The standard system prompt
- That description as its task
- Access to the same `/work` filesystem

**The quality of the cron = the quality of the description.** If you write "summarize Linear" it'll do something generic. If you write exactly what to query, what format to use, and who to DM — it does exactly that.

### Currently Running Crons

```
/heartbeat             Every 6 hours (10am, 1pm, 4pm, 7pm CT)
  Checks Slack for new messages, looks for ways to help,
  reacts to things, follows up on unanswered questions.

/channel_introductions  10am CT weekdays (3 runs then self-deletes)
  Introduces Viktor to one channel per day with a relevant
  offer to help.

/workflow_discovery     9am CT on Mondays and Thursdays
  Studies Slack conversations, identifies pain points,
  proposes automation workflows to team members.
```

These were set up automatically during onboarding.

## Analysis

**Direct application to CareSupport:**

Our care nudge system IS the cron pattern:
```python
# CareSupport equivalent
create_care_cron(
    family_id="kano-family",
    description="""
    Every evening at 8pm:
    1. Read families/kano/family.md Current section
    2. Check: any medications unconfirmed today?
    3. Check: tomorrow's appointments — is coverage confirmed?
    4. Check: last meal/wellness log — how recent?
    5. Send nudge to primary caregiver if anything needs attention
    6. Update family.md with nudge sent timestamp
    """,
    cron="0 20 * * *"
)
```

**Key takeaway:** The description is the complete operating manual for a stateless agent. No memory, no conversation history — just the prompt and the filesystem. This means we need to design our cron descriptions to be self-contained. The agent that runs the 8pm care check knows nothing except what's in the description and the family.md file.

**Design implication:** Our family.md file needs to contain enough context that a fresh agent with only the description + the file can make correct decisions. This validates the "Current section always loaded" architecture.
