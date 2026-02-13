---
name: protocol-creation
description: Create new care protocols with proper structure and safety classification. Use when creating or editing a PROTOCOL.md file.
safety_level: informational
requires_approval: false
---

# Protocol Creation

> **Viktor equivalent:** The skill-creation meta-skill. Same purpose: how to
> create new capabilities with proper structure. Adapted for care context
> with safety classifications.

## Protocol Directory Structure

```
protocols/{protocol-name}/
├── PROTOCOL.md        # Required: what it handles, steps, safety rules
├── scripts/           # Optional: automation scripts
└── references/        # Optional: medical references, guidelines
```

## PROTOCOL.md Format

```markdown
---
name: protocol-name
description: [What it handles]. Use when [trigger conditions].
safety_level: critical | standard | informational
requires_approval: true | false
---

# Protocol Name

## HARD RULES (if safety_level: critical)
- Rules the agent must NEVER override

## Triggers
- What words/situations activate this protocol

## Workflows
- Step-by-step procedures

## Message Templates
- Standard message formats
```

### Safety Level Definitions

| Level | Meaning | Agent Behavior |
|---|---|---|
| `critical` | Health/safety impact | Hard rules enforced. Draft/approve required. Cannot be overridden by reasoning. |
| `standard` | Important but adaptable | Guidelines followed by default. Agent can adapt based on family context. |
| `informational` | Reference material | Loaded on demand. No behavioral constraints. |

### Frontmatter Fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Lowercase, hyphens, matches folder name |
| `description` | Yes | What it does + when to activate |
| `safety_level` | Yes | critical, standard, or informational |
| `requires_approval` | Yes | Whether changes need caregiver confirmation |

## When to Create New Protocols

- A care pattern emerges that isn't covered (e.g., family starts tracking vitals daily)
- Family has unique needs (e.g., bilingual communication protocol)
- Provider requests specific monitoring (e.g., post-surgery wound care)
