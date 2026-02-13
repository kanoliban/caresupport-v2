# Onboarding — What Happens on First Conversation

These files are NOT part of the factory default. They're created during the onboarding
process when Viktor is installed in a new Slack workspace. Documenting them here so
the full lifecycle is visible.

## Onboarding Sequence

1. **User installs Viktor** → Platform creates the workspace skeleton (see `../workspace/`)
2. **Welcome DM sent** to the installer with "Join only public channels" / "Join all channels" buttons
3. **Background research** — Viktor searches the web for the company (based on email domain, channel names)
4. **User clicks button** → Viktor joins channels
5. **Getting Started Guide** sent via DM — how to interact, example workflows
6. **Knowledge base created:**
   - `company/SKILL.md` — Company overview from web research
   - `team/SKILL.md` — Known team members (initially sparse, grows over time)
7. **Default crons created** — See `cron-templates/` below
8. **Ongoing** — Heartbeat checks Slack, workflow discovery studies team patterns

## Created Files

After onboarding, the workspace gains:

```
/work/
├── company/SKILL.md          ← NEW (company knowledge)
├── team/SKILL.md             ← NEW (team members)
├── crons/
│   ├── heartbeat/task.json         ← NEW (scheduled)
│   ├── channel_introductions/task.json  ← NEW (self-deleting after 3 runs)
│   └── workflow_discovery/task.json     ← NEW (scheduled)
├── slack/
│   ├── {user}/2026-02.log          ← NEW (DM history)
│   └── {channel}/2026-02.log       ← NEW (channel history)
└── agent_runs/
    └── misc/onboarding/...         ← NEW (this conversation's execution log)
```

## Cron Templates

The three default crons are in `cron-templates/`. Each `task.json` contains:
- `path` — unique identifier
- `cron` — schedule expression
- `title` — human-readable name
- `description` — **complete operating manual** for the stateless agent that executes it

The description is the critical field. The cron agent has no context from the onboarding
conversation — only the system prompt + the description + the filesystem.
