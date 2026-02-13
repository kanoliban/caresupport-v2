# Round 2: Skill File Contents (Pre-Interview)

## Question (from earlier in conversation)

> Viktor, you mentioned you created company/SKILL.md with everything you learned about CareSupport today. Can you show me the actual contents of that file? I'm curious what you chose to capture vs. what you left out.

## Answer

### company/SKILL.md

```markdown
# CareSupport

## Overview
- Website: caresupport.com
- Founded: 2024
- Stage: Early-stage startup (pre-launch, actively hiring co-founders)
- Industry: Health tech / Family caregiving
- Tagline: "CareSupport makes the invisible; visible"

## What They Do
Family care coordination platform. Voice-powered AI to organize
medications, schedules, appointments, caregiver coordination.

### Key Product Concepts
- Voice-to-Recommend™ — AI voice intake for care recommendations
- Care Intelligence™ — AI engine contextualizing against care profiles
- Care Coaches — Human experts + AI (planned)
- CareGiver OS — Professional agency tools (planned 2026)

### Target Users
- Primary: Family caregivers
- Planned: Professional caregivers, agencies, care coaches

## Key Partnerships
- CAN (Caregiver Action Network) — demo prep and Innovation Council

## Product Priorities (from Linear)
- HIPAA compliance messaging
- Multi-language support
- Caregiver respite tracking
- CAN resource library integration
- Caregiver wellness check-ins
- Burden assessment tools

## Connected Integrations
- Linear ✅ Working
- Google Ads ⚠️ Connected but auth broken
- GitHub (Git & CLI) ⚠️ Connected, GitHub App install erroring

## Slack Channels
- #all-caresupport, #social, #pitchdeck

## Company Culture Notes
- Founded by a caregiver — deeply personal mission
- Small team (solo founder + external collaborator)
- Casual, direct communication style
```

### team/SKILL.md

```markdown
# CareSupport Team

### Liban Kano
- Role: Founder & CEO
- Background: Former U.S. Air Force veteran. Family caregiver.
- Works on: Everything — product, partnerships, pitch deck, strategy
- Communication style: Casual, direct, to-the-point
- Notes: Solo founder wearing all hats. Looking for CTO + Head of Product.

### Koemen Louie
- Role: Unknown (external collaborator or advisor?)
- Email: koemen@koedirect.com — different domain, likely external
- Everything else: TBD

## Open Roles (from website)
- Co-Founder & CTO
- Head of Product
```

Viktor's data sources: web search (caresupport.com), Linear backlog (issue titles/descriptions), Slack workspace (channels, users, messages).

What Viktor left out: full detail of every Linear issue (captured themes only). Little on Koemen (no Slack history to learn from yet).

## Analysis

- Skill files are entity snapshots (what things ARE), not operational state (what's HAPPENING)
- This is the state clock, not the event clock
- Structure is prose + bullets — no YAML blocks, no structured data
- Captured the OLD CareSupport (Voice-to-Recommend, Care Intelligence) — pre-primitive-shift
- Growth model: accretion from observations, no explicit pruning rules
