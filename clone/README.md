# Viktor Factory Default — Clean Clone

**What this is:** The bare-metal skeleton of a Viktor workspace before it knows anything
about any company. Everything universal, nothing workspace-specific.

**Source:** Extracted from a live Viktor instance (February 2026) by Viktor itself, as part
of CareSupport's architecture research. See `/research/viktor-interview/` for the full
interview series.

**Why it matters:** Viktor and CareSupport's care agent share the same primitive — a
reasoning model + flat files + conversation interface. This clone lets us study the
production implementation of that primitive without workspace-specific noise.

---

## What a Fresh Viktor Looks Like

```
workspace/                         The /work directory
├── skills/                        20 pre-built skill files (the instruction manuals)
│   ├── browser/SKILL.md           Web browsing & scraping with Playwright
│   ├── codebase-engineering/      Working on user codebases via GitHub
│   ├── docx-editing/              Word document editing
│   ├── excel-editing/             Excel editing with validation scripts
│   │   └── scripts/validate_excel.py
│   ├── general-tools/             Web search, email, image gen, file conversion, docs
│   ├── integrations/              Integration connection management
│   │   ├── SKILL.md               How to connect new services
│   │   ├── references/custom-api-integration.md
│   │   ├── coworker-github/       [empty shell, filled per-workspace]
│   │   ├── google-ads/            [empty shell, filled per-workspace]
│   │   └── linear/                [empty shell, filled per-workspace]
│   ├── pdf-creation/              HTML/CSS → PDF with WeasyPrint
│   │   └── scripts/extract_site_styles.py
│   ├── pdf-form-filling/          Fill PDF forms programmatically
│   ├── pdf-signing/               Digital signatures on PDFs
│   ├── pptx-editing/              PowerPoint editing
│   ├── remotion-video/            React-based video creation
│   │   └── references/            30+ reference docs (animations, audio, charts, etc.)
│   ├── scheduled-crons/           Create/manage scheduled tasks
│   ├── skill-creation/            Meta-skill: how to create new skills
│   │   └── references/integration-exploration.md
│   ├── slack-admin/               Workspace management (channels, users, invites)
│   ├── thread-orchestration/      Monitor parallel agent threads
│   ├── viktor-spaces-dev/         Build & deploy full-stack web apps
│   └── workflow-discovery/        Discover team pain points, propose automation
│       └── references/example_workflows.md
│
├── sdk/                           The tool SDK (Python modules)
│   ├── docs/
│   │   ├── tools.md               Source of truth for available tool functions
│   │   └── available_integrations.json   3000+ connectable services catalog
│   ├── tools/                     Auto-generated tool modules
│   │   ├── default_tools.py       Slack, filesystem, threads (16 functions)
│   │   ├── browser_tools.py       Chrome browser sessions (3 functions)
│   │   ├── email_tools.py         Send email, get attachments (2 functions)
│   │   ├── utils_tools.py         Search, image gen, file conversion (5 functions)
│   │   ├── docs_tools.py          Library documentation lookup (2 functions)
│   │   ├── slack_admin_tools.py   Channels, users, invites (5 functions)
│   │   ├── scheduled_crons.py     Cron CRUD (4 functions)
│   │   ├── thread_orchestration_tools.py  Monitor threads (2 functions)
│   │   └── viktor_spaces_tools.py Full-stack app lifecycle (6 functions)
│   ├── internal/
│   │   └── client.py              HTTP client to Tool Gateway (the trust boundary)
│   └── utils/
│       ├── browser.py             Playwright browser helper
│       ├── heartbeat_logging.py   Cron heartbeat logging
│       ├── slack_reader.py        Read new Slack messages since timestamp
│       └── workspace_tree.py      Generate workspace directory tree
│
├── slack/           .gitkeep      [empty — populated by platform as messages arrive]
├── logs/            .gitkeep      [empty — populated by agent activity]
├── crons/           .gitkeep      [empty — first crons created during onboarding]
├── emails/
│   ├── inbox/       .gitkeep      [empty — populated when emails arrive]
│   └── sent/        .gitkeep      [empty — populated when Viktor sends email]
├── agent_runs/      .gitkeep      [empty — populated per conversation]
├── viktor-spaces/   .gitkeep      [empty — populated when apps are built]
└── temp/            .gitkeep      [scratch space]
```

## What's NOT Here (Workspace-Specific)

These are created during or after onboarding:

| File/Directory | Created When | Purpose |
|---|---|---|
| `company/SKILL.md` | Onboarding | Company knowledge from web research |
| `team/SKILL.md` | Onboarding | Team members, roles, communication styles |
| `crons/heartbeat/` | Onboarding | Periodic check-in cron |
| `crons/channel_introductions/` | Onboarding | Self-deleting intro cron |
| `crons/workflow_discovery/` | Onboarding | Team pain point discovery |
| `slack/{user}/*.log` | Ongoing | Slack message history |
| `sdk/tools/mcp_*.py` | When connected | Integration-specific tool modules |
| `sdk/tools/github_tools.py` | When connected | GitHub integration |
| Any cloned repos | When user asks | User codebases |
| Domain skill files | As Viktor learns | `paid_ads/`, `finance/`, etc. |

## System Prompt

See `system-prompt.md` — a reconstructed version of the prompt injected by the platform
into every Viktor conversation. It's not a file on disk; it's assembled at runtime.

## Onboarding Flow

See `onboarding/` — documents what gets created during the first conversation, including
the three default cron templates with their full task descriptions.

## Integration Architecture

```
Agent (Claude)  ─── HTTP POST ───>  Tool Gateway  ─── OAuth ───>  Third Party API
  (sandbox)          bearer token    (api.jace.ai)     tokens       (Linear, etc.)
                                     holds creds,
                                     proxies calls
```

- Agent calls Python functions → gateway handles auth → JSON response
- Agent never sees OAuth tokens (credential isolation)
- MCP (Model Context Protocol) is the gateway standard
- New integrations appear as new `mcp_*.py` or `pd_*.py` modules in `sdk/tools/`

## For CareSupport

To map this to our architecture:

| Viktor Component | CareSupport Equivalent |
|---|---|
| `/work/skills/*.md` | `/protocols/*.md` (care protocols) |
| `/work/company/SKILL.md` | Not needed (single product) |
| `/work/team/SKILL.md` | `/families/{id}/family.md` |
| `/work/slack/*.log` | `/families/{id}/conversations/*.log` |
| `/work/sdk/tools/` | Our tool modules (Twilio, pharmacy API, etc.) |
| `/work/crons/heartbeat/` | Care nudge scheduler |
| System prompt | Agent system prompt with care-specific rules |
| Tool Gateway | Our integration layer (HIPAA-compliant) |
