# Round 7: Full Tool & Capability Inventory

## Question

> What can you actually DO? Like, if I asked you to list every tool and capability you have access to right now — integrations, commands, filesystem stuff, scheduling, everything — what's the full list?

## Answer

**124 tool functions** across 12 modules, plus a bash shell that gives access to any programming language or CLI tool.

### Tool Inventory by Category

| Category | Tools | Count |
|---|---|---|
| Sandbox & Filesystem | bash, file_read, file_write, file_edit, glob, grep, view_image, create_thread, send_message_to_thread, wait_for_paths | 16 |
| Slack | send_message, react, delete_message, upload, download, list_channels, join_channels, list_users, invite_user, get_reactions | 10 |
| Linear | Full CRUD: issues, projects, comments, documents, initiatives, milestones, cycles, labels, statuses, teams, users, attachments, status updates | 40 |
| Google Ads | Accounts, campaigns, ad groups, ads, keywords, budgets, assets (image/text/video/sitelink/callout/call/structured_snippet), custom GAQL queries | 37 |
| GitHub | coworker_git (clone, commit, push, pull), coworker_github_cli (gh commands) | 2 |
| Email | send_email, get_attachment | 2 |
| Browser | create_session (real Chrome), download_files, close_session | 3 |
| Scheduling | create_agent_cron, create_script_cron, delete_cron, trigger_cron | 4 |
| Viktor Spaces | init_app_project, deploy_app, list_apps, get_app_status, query_app_database, delete_app_project | 6 |
| Utilities | quick_ai_search, ai_structured_output, file_to_markdown, text2im, create_custom_api_integration, resolve_library_id, query_library_docs | 7 |

### The Bash Escape Hatch

Viktor emphasized that `bash` is the most powerful tool — a full Linux environment with Python, Node.js, and any installable package. If a structured tool doesn't exist, Viktor writes a script.

> "The 124 tools are the structured stuff. Bash is the escape hatch that makes me general-purpose. If you can describe it, I can probably build it."

## Follow-Up: How Composability Works

> Talk more about "if you can describe it, I can probably build it." How do you do that?

### Viktor's Problem-Solving Process

**Step 1: Break down what you need**
"Build me a tracker for CAN stakeholder outreach" → list of people, contact info, status, last touchpoint, next action, notes. Needs to be shareable, updatable.

**Step 2: Pick the right approach**
- Quick and simple → Python script that generates Excel/PDF, posts to Slack
- Needs a UI → Viktor Spaces: scaffold React app with database, deploy, give URL
- One-time research → search web, read docs, synthesize findings
- Recurring → build it, then wrap in a cron

**Step 3: Write and run the code**
Full Linux environment. `uv run python script.py`, `npx create-next-app`, `curl` an API. Write, run, check output, fix errors, iterate.

**Step 4: Deliver**
Upload to Slack, post summary, deploy app, create Linear issues — whatever the output should be.

### Concrete Example (CareSupport-specific)

If asked to research every CAN Innovation Council member:
1. Read Linear issues (CAR-20 already has the research framework)
2. `quick_ai_search` per member — LinkedIn, articles, speaking engagements
3. Cross-reference with CareSupport features from `company/SKILL.md`
4. Write Python script using PDF creation skill for branded one-pagers
5. Upload PDFs to Slack

> "No pre-built tool for 'CAN stakeholder research.' I just composed the tools I have — search, read, reason, write code, generate PDFs, deliver."

### Key Insight

> "Most AI tools give you a menu — pick from these 10 things I can do. I don't work like that. The 124 tools are *primitives*. Bash is the universal adapter. And I'm the reasoning layer that figures out how to compose them for whatever you actually need."

## Analysis

**For CareSupport:**
The composability model is directly applicable. Our agent doesn't need a tool for every care scenario — it needs primitives (read file, update section, send message, check schedule) and the reasoning to compose them.

**Key pattern:** Tool manifest as primitives + escape hatch (bash/code execution) + LLM reasoning as the composition layer. This is the architecture we should adopt — not a fixed feature set, but composable primitives.
