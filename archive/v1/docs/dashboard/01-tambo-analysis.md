# Tambo — Technical Analysis

> Deep review of [tambo-ai/tambo](https://github.com/tambo-ai/tambo), conducted 2026-02-21.
> Source: full repo clone, source code read, documentation review, video analysis.

---

## What Tambo Is

Tambo is an open-source generative UI toolkit for React. It lets you register your own React components with Zod schemas, and an AI agent decides which components to render in response to user messages — streaming the props as the LLM generates them.

**It is not** a code generator. It does not create new components at runtime. It selects from your pre-built, registered components and fills in the props based on conversation context.

**License:** MIT (SDK + backend). The API server component is Apache-2.0.

**Founded by:** Michael Magán (ex-PM at TaxBit, Convoy, Indeed) and Michael Milstead (ex-Microsoft engineer).

---

## Core Concepts

### 1. Component Registry

You define components with:
- A **name** and **description** (tells the AI when to use it)
- A **Zod schema** for props (tells the AI what data to provide)
- The actual **React component**

```tsx
const components: TamboComponent[] = [
  {
    name: "WeekSchedule",
    description: "Displays a 7-day care schedule showing who covers each shift",
    component: WeekSchedule,
    propsSchema: z.object({
      days: z.array(z.object({
        date: z.string(),
        shifts: z.array(z.object({
          time: z.string(),
          assignee: z.string(),
          status: z.enum(["confirmed", "pending", "gap"])
        }))
      }))
    }),
  },
];
```

These schemas become **LLM tool definitions** internally. The AI "calls" a component like it would call a function — the tool name is `show_component_{ComponentName}`.

### 2. Two Component Types

**Generative Components** — Rendered once in response to a message.
- Charts, summaries, status cards, data visualizations
- Created fresh each time
- Appear inline in the conversation thread

**Interactable Components** — Persist on screen and update across conversations.
- Task boards, schedules, rosters, dashboards
- Wrapped with `withTamboInteractable()` HOC
- The AI can read their current state and modify their props/state through conversation
- Each has an `id`, `componentName`, `description`, current `props`, current `state`, and `isSelected` flag

```tsx
const InteractableSchedule = withTamboInteractable(WeekSchedule, {
  componentName: "WeekSchedule",
  description: "The family's weekly care schedule",
  propsSchema: z.object({ ... }),
  stateSchema: z.object({ ... }),
});
```

### 3. The Decision Loop

When a user sends a message:

1. System prompt is constructed with available components + tools
2. User message + conversation history + context attachments sent to LLM
3. LLM decides: respond with text, call a tool, or render a component
4. If rendering: LLM calls `show_component_X` with generated props
5. Props stream to the component as they generate
6. If interactable: LLM can also call `update_props_X` or `update_state_X` on existing components

The decision loop prompt (from source):
```
You are a friendly assistant that helps the user interact with an application.

Tools are divided into two categories:
- UI tools: display UI components on the user's screen (begin with 'show_component_')
- Informational tools: request data or perform an action

You may call any number of informational tools in sequence to gather data
before calling a UI tool.
```

### 4. Context System

Tambo supports multiple context sources:

**Additional Context** — App state passed to the AI:
```tsx
contextHelpers={{
  familyState: () => ({
    key: "familyContext",
    value: familyMdContent  // The family.md file!
  }),
  currentUser: () => ({
    key: "coordinator",
    value: coordinatorProfile
  }),
}}
```

**Context Attachments** — Per-message context added on behalf of the user.

**Interactable State** — Current state of all interactable components on screen.

### 5. Tools (Local + MCP)

**Local tools** — Functions that run in the browser:
```tsx
const tools: TamboTool[] = [
  {
    name: "sendTextToMember",
    description: "Send a text message to a family member via CareSupport",
    tool: async (params) => await careSupport.sendMessage(params),
    inputSchema: z.object({
      memberId: z.string(),
      message: z.string(),
    }),
  },
];
```

**MCP servers** — Connect to external systems (databases, APIs, etc.) via Model Context Protocol:
```tsx
<TamboProvider
  mcpServers={[{
    name: "caresupport-api",
    url: "http://localhost:8261/mcp",
    transport: MCPTransport.HTTP,
  }]}
/>
```

### 6. Streaming Infrastructure

Props stream to components as the LLM generates them. Tambo handles:
- Progressive prop updates (components render partially as data arrives)
- Cancellation and error recovery
- Reconnection
- Status tracking per-prop:
```tsx
const { streamStatus, propStatus } = useTamboStreamStatus();
if (propStatus["schedule"]?.isSuccess) { ... }
```

---

## Architecture

### Packages (from repo)

| Package | Purpose |
|---------|---------|
| `react-sdk/` | Client-side React hooks, providers, component renderer, interactable HOC |
| `packages/backend/` | Decision loop, LLM client, prompt system, streaming, tool execution |
| `packages/core/` | Shared types, component decisions, LLM configs, encryption |
| `packages/db/` | PostgreSQL schema (Drizzle ORM) |
| `packages/react-ui-base/` | Pre-built UI primitives (messages, inputs, thread views) |
| `packages/ui-registry/` | Component library (Graph, Form, Map, etc.) |
| `apps/api/` | NestJS REST API (conversation state, agent orchestration) |
| `apps/web/` | Next.js dashboard |
| `cli/` | CLI for project setup, component installation |

### Self-Hosting

Three services via Docker:

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| Web | Next.js | 8260 | Dashboard / admin UI |
| API | NestJS | 8261 | REST API for client requests |
| PostgreSQL | PG 17 | 5433 | Conversation state storage |

Setup:
```bash
git clone https://github.com/tambo-ai/tambo.git
cd tambo
./scripts/cloud/tambo-setup.sh    # Creates docker.env
# Edit docker.env with secrets + OpenAI key
./scripts/cloud/tambo-start.sh    # Starts all services
./scripts/cloud/init-database.sh  # Initializes DB
```

### LLM Providers Supported

OpenAI, Anthropic, Google Gemini, Cerebras, Groq, Mistral, and any OpenAI-compatible provider.

---

## Pre-Built Component Library

Available in `packages/ui-registry/`:

| Component | Type | Description |
|-----------|------|-------------|
| `Graph` | Generative | Recharts-based charts (line, bar, pie) |
| `Form` | Generative | Dynamic forms with field types (text, select, slider, etc.) |
| `Map` | Generative | Location-based visualizations |
| `MessageThread` | UI | Conversation thread display |
| `MessageInput` | UI | User input with file attachments |
| `EditWithTamboButton` | UI | Trigger AI editing on interactable components |
| `CanvasSpace` | UI | Drag-and-drop area for generated components |
| `ThreadHistory` | UI | Past conversation navigation |

CareSupport would build its own domain-specific components (schedule, journal, roster) and register them alongside or instead of these.

---

## Comparison Matrix (from Tambo docs)

| Feature | Tambo | Vercel AI SDK | CopilotKit | Assistant UI |
|---------|-------|---------------|------------|--------------|
| Component selection | AI decides | Manual tool mapping | Via LangGraph | Chat-focused |
| MCP integration | Built-in | Experimental | Recently added | Requires AI SDK v5 |
| Persistent stateful components | Yes | No | Shared state patterns | No |
| Client-side tool execution | Declarative, automatic | Manual via onToolCall | Agent-side only | No |
| Self-hostable | MIT (SDK + backend) | Apache 2.0 (SDK only) | MIT | MIT |

---

## Assessment for CareSupport

### Strengths

1. **Interactable components are the killer feature.** A `<WeekSchedule>` that persists and updates as conversations resolve — this is the exact pattern CareSupport needs.
2. **Context helpers = family.md injection.** The `contextHelpers` API is designed for exactly this: passing domain context (family.md, user.md) to the AI so it renders components with full awareness.
3. **Self-hostable.** Critical for a healthcare product handling PHI. Full Docker stack, MIT license. No vendor lock-in.
4. **The AI selects components.** The coordinator doesn't navigate pages. They describe what they need. CareSupport renders it.
5. **MCP support.** Future-proofs integration with external systems.
6. **Streaming props.** Large schedules, journals with many entries — they render progressively.

### Risks / Open Questions

1. **Maturity.** Tambo 1.0 launched recently. Production hardening for healthcare use cases is unproven.
2. **Dual-surface architecture.** CareSupport's agent lives in iMessage. Tambo's agent lives in the dashboard. These need to share the same context (family.md) but are potentially different agent instances. Synchronization complexity.
3. **Real-time updates.** When a family member texts via iMessage and family.md updates, the dashboard's interactable components need to reflect this. Tambo doesn't inherently handle external state changes — a push mechanism (WebSocket, polling) would be needed.
4. **Mobile experience.** Rob uses his iPhone (controlled with his nose). Tambo's React UI needs to be fully responsive. The pre-built components are desktop-oriented.
5. **PHI in component props.** Props streamed to the browser contain care data. Encryption at rest and in transit must be validated against HIPAA requirements.
6. **Component design quality.** Tambo handles rendering logic. The visual design, accessibility, and emotional feel of components is entirely our responsibility. This is where the founder's existing designs become critical.

### Verdict

Tambo is architecturally aligned with CareSupport's vision. The technology holds up. The risk is in execution — specifically the dual-surface sync problem (iMessage agent ↔ dashboard agent sharing family.md) and the mobile-first requirement for Rob's use case.

Recommendation: **Adopt Tambo for the dashboard layer.** Self-host from day one. Build CareSupport-specific components. Design them with the founder's UI sensibility. Wire them to the same family.md context the iMessage agent uses.
