# Round 1: Workspace Layout

## Question

> Hey Viktor — I'm curious what your workspace looks like. Can you show me the full directory structure of /work? Like, what files and folders exist right now?

## Answer

```
/work/

# === MY KNOWLEDGE ===
company/SKILL.md              # What I know about CareSupport
team/SKILL.md                 # What I know about you & Koemen

# === SKILLS (pre-loaded capabilities) ===
skills/
  browser/SKILL.md            # Web browsing/scraping
  codebase-engineering/SKILL.md
  docx-editing/SKILL.md
  excel-editing/SKILL.md + scripts/
  general-tools/SKILL.md      # Search, email, image gen
  pdf-creation/SKILL.md + scripts/
  pdf-form-filling/SKILL.md
  pdf-signing/SKILL.md
  pptx-editing/SKILL.md
  remotion-video/SKILL.md + references/  # Video creation
  scheduled-crons/SKILL.md
  skill-creation/SKILL.md
  slack-admin/SKILL.md
  thread-orchestration/SKILL.md
  viktor-spaces-dev/SKILL.md  # Full-stack app deployment
  workflow-discovery/SKILL.md + references/
  integrations/
    SKILL.md
    coworker-github/SKILL.md
    google-ads/SKILL.md
    linear/SKILL.md
    references/custom-api-integration.md

# === SDK (my tools) ===
sdk/
  docs/tools.md               # All available tool functions
  docs/available_integrations.json
  tools/                      # Python modules I call
    mcp_linear.py
    mcp_google_ads.py
    github_tools.py
    browser_tools.py
    slack_admin_tools.py
    email_tools.py
    utils_tools.py
    viktor_spaces_tools.py
    ...

# === SLACK HISTORY (my eyes) ===
slack/
  Liban Kano/2026-02.log      # Your DMs
  Liban Kano/threads/...      # This conversation
  all-caresupport/2026-02.log
  pitchdeck/2026-02.log
  product/2026-02.log
  social/2026-02.log
  all_your_sent_slack_messages.log
  at_mentioned_by_users.log

# === CLONED REPO ===
caresupport-family/           # Your repo!
  CLAUDE.md
  README.md
  agent/system-prompt.md
  docs/family-md-spec.md
  docs/primitive-shift.md
  docs/the-machine-that-builds-the-machine.md
  examples/rob-family.md
  src/index.ts
  package.json, tsconfig.json

# === AUTONOMOUS TASKS ===
crons/
  heartbeat/task.json          # Health check
  channel_introductions/task.json
  workflow_discovery/task.json # Scheduled to learn your team

# === EXECUTION LOGS ===
agent_runs/                    # Every conversation I've had
  misc/onboarding/...
  misc/integration_exploration/
    google-ads/...
    linear/...
  slack/Liban Kano/threads/...
  slack/product/threads/...

logs/
  2026-02-12/global.log
  2026-02-13/global.log

emails/                        # Inbox/sent (empty so far)
viktor-spaces/                 # Deployed apps (empty)
temp/, tmp/                    # Scratch space
```

Viktor also noted:
- The caresupport-family repo was cloned during an earlier integration exploration run
- Viktor discovered a #product channel with thread history it wasn't previously aware of
- "This is everything. No hidden folders, no secrets. What you see is what I work with."

## Analysis

**Architecture: three layers**
- KNOWLEDGE (company/, team/) → what Viktor knows about THIS workspace
- SKILLS (skills/*/SKILL.md) → how to do things, as markdown instructions
- TOOLS (sdk/tools/*.py) → executable capabilities as Python modules

**Key findings:**
1. Skills are markdown, tools are Python. Clean separation: natural language instructions + executable code.
2. YAML frontmatter on each SKILL.md gets loaded into system prompt as an index. Full file read on demand.
3. Slack history stored as flat monthly log files per channel. Thread-level logs separate.
4. Cron tasks defined as JSON files in crons/ directory.
5. Every conversation logged in agent_runs/ — implicit audit trail.
6. skill-creation skill exists — Viktor can create new skills (self-improvement loop).
7. Viktor has already cloned our repo and has access to all our docs.

**CareSupport mapping:**

| OpenClaw Layer | CareSupport Equivalent |
|---|---|
| company/SKILL.md + team/SKILL.md | family.md (one file vs. two) |
| skills/*/SKILL.md (16+ skills) | agent/system-prompt.md (one prompt) |
| sdk/tools/*.py (10+ modules) | Read + Edit (two tools) |
| slack/*/logs | Recent Events section in family.md |
| crons/*/task.json | Heartbeat cron |
| agent_runs/ | Not yet designed — we need this |
