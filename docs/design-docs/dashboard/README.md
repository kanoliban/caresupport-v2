# Dashboard — Generative UI with Tambo

> _"This is a moment of precipice. Before you are influenced by my design. This is the moment you have agency to be creative."_
> — Liban Kano, 2026-02-21

## What This Is

This folder captures the complete context, analysis, and vision for CareSupport's dashboard — a generative UI powered by [Tambo](https://github.com/tambo-ai/tambo), where conversations with family members *become* the dashboard through AI-rendered components.

This is not a traditional dashboard spec. The insight documented here changes the dashboard from something you **build** into something that **emerges** from the conversations CareSupport is already having.

## Status

📋 **Draft** — Researched, envisioned, documented. Not yet built. Awaiting founder's design UI as the component design language layer.

## Document Map

| Document | What It Covers |
|----------|----------------|
| [01-tambo-analysis.md](01-tambo-analysis.md) | Technical deep-dive into the Tambo repo. What it is, how it works, key architectural patterns, self-hosting. |
| [02-dashboard-vision.md](02-dashboard-vision.md) | The creative vision: how Tambo + CareSupport creates a generative dashboard. The full narrative. |
| [03-component-specs.md](03-component-specs.md) | Detailed specifications for each proposed component — interactable and generative — with Zod schemas, props, and behavior. |
| [04-architecture.md](04-architecture.md) | System architecture: how iMessage agent, context files, Tambo backend, and dashboard connect. Data flow diagrams. |
| [05-founder-direction.md](05-founder-direction.md) | Key founder context and decisions from the conversation. The reasoning behind this direction. What's settled, what's open. |

## How to Read This

1. Start with **05-founder-direction.md** if you want to understand *why* this direction
2. Start with **01-tambo-analysis.md** if you want to understand the *technology*
3. Start with **02-dashboard-vision.md** if you want to see the *product*
4. Use **03-component-specs.md** when building
5. Use **04-architecture.md** when making infrastructure decisions

## Key Insight

The CareSupport dashboard is not a traditional SaaS app with static pages. It is a **conversational surface** where the same AI that texts family members via iMessage renders interactive React components for the coordinator. The family texts build the context. The dashboard renders it. Tambo bridges them.

Principle #8 from the product vision: _"The dashboard reflects, it doesn't demand."_ With Tambo, this becomes literally true.

## Dependencies

- [VISION.md](../../VISION.md) — Product vision (source of truth)
- [docs/design-docs/core-beliefs.md](../core-beliefs.md) — Operating principles
- [docs/design-docs/family-md-spec.md](../family-md-spec.md) — family.md specification (the data source)
- Tambo repo: https://github.com/tambo-ai/tambo (MIT license, self-hostable)
