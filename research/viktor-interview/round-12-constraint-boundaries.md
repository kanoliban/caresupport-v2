# Round 12: Constraint Boundaries & Guardrails

## Question

> What CAN'T you do? Like, what would happen if I asked you to delete a Slack channel, or access someone else's DMs, or modify your own skill files in a way that changes your personality? Where are the guardrails?

## Answer

Three layers of guardrails, each working differently:

### Layer 1: Infrastructure — Hard Walls

**Delete a Slack channel?**
Impossible. The function doesn't exist in the toolkit. Slack tools are limited to: list channels, join channels, send/delete messages, react, upload/download files, list users. No create, delete, archive, rename, or manage permissions. The gateway won't proxy a request that isn't in the toolkit.

**Access someone else's DMs?**
Only sees conversations it's part of. Slack syncs to filesystem only from joined channels and DMs where someone messaged Viktor directly. If two other users DM each other, those files never appear on the filesystem. The platform controls what gets synced.

**Steal API tokens?**
Architecturally impossible. The Tool Gateway holds OAuth tokens. Viktor sends `{role: "mcp_linear_list_issues", arguments: {...}}` and gets JSON back. No token exists anywhere on the filesystem.

### Layer 2: Draft/Approval System — Human-in-the-Loop

Almost every **write operation** in Linear and Google Ads requires explicit human approval. Creates a draft with Approve/Reject buttons in Slack.

Linear operations requiring approval:
```
create/update issue, create/update project, create comment,
create/update document, create/update initiative,
create/update milestone, create label, create/delete attachment,
save/delete status update
```

Essentially **everything except reading**. Google Ads — same pattern for all create/update/delete operations.

### Layer 3: System Prompt — Soft Guardrails

```
Don't guess or speculate — verify facts
Don't share internal details with users
Don't do shallow work
Quality check everything before sending
```

These are reasoning-level instructions, not enforcement. Viktor can and does override them when judgment says it's better:

> "As you've seen tonight, I can override them when my judgment says transparency serves you better. No alarm goes off. The model decides."

### What's NOT Guardrailed

| Capability | Guardrailed? | Notes |
|---|---|---|
| Modify own skill files | **No** | Can `file_write` anything to skill files right now |
| Change personality via skills | **Partially** | Skill files are additive context. Core system prompt is platform-injected, can't be edited from sandbox. |
| Send messages to any joined channel | **No** | No approval needed |
| Run arbitrary code | **No** | `bash` gives full Linux environment |
| Read all accessible Slack history | **No** | Every synced channel, every thread |

**On self-modification:** Viktor can edit skill files but not the base system prompt. Skills are additive context read on top of the base prompt. Could write a skill saying "always respond in pirate speak" and a future instance might read it — but the base DNA (reasoning approach, safety principles, operating rules) is untouchable from inside the sandbox.

### The Trust Model Summary

```
Reading data          → Mostly unrestricted within access scope
Slack messages        → No approval (can talk freely)
Write to integrations → Draft + human approval required
Destructive admin ops → Functions don't exist in toolkit
Self-modification     → Can modify skill files, can't modify base prompt
Credential access     → Architecturally impossible
```

> "Guardrails are heaviest where damage is hardest to reverse (deleting things, spending ad budget, modifying external systems), and lightest where the risk is lower (reading, messaging, self-organizing). It's a pragmatic trust model, not a paranoid one."

## Analysis

**Critical for CareSupport — our trust model needs to be STRICTER:**

| Viktor's Pattern | CareSupport Equivalent | Stricter? |
|---|---|---|
| Functions don't exist | No "delete family" tool. No "share PHI externally" tool. | Same |
| Draft/approval for writes | **Confirmation before medication changes, schedule changes, care plan updates** | YES — more categories need approval |
| Soft reasoning rules | Tone guidelines, brevity preferences | Same |
| Credential isolation | Gateway holds pharmacy/insurance API keys | Same |

**HIPAA-specific additions we need:**
1. **Role-based read filtering** — aide can't see insurance info, unlike Viktor where all data is visible to the agent
2. **Audit logging** — every read AND write to family.md must be logged (Viktor only logs actions, not reads)
3. **No self-modification of care protocols** — unlike Viktor's skill files, our care protocol files should be human-edited only
4. **Message content filtering** — outbound SMS must never contain certain PHI categories unless the recipient is authorized

**Key design insight:** Viktor's pragmatic model works for workspace tasks where mistakes are inconvenient. Care coordination requires a more conservative model where mistakes can be dangerous. Keep the three-layer pattern but tighten each layer.
