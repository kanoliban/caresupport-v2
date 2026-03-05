# Dashboard Architecture

> How the iMessage agent, context files, Tambo backend, and dashboard connect.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FAMILY MEMBERS                        │
│     Liban   Solan   Yada   Haley   Roman   Kano B.     │
│           (texting via iMessage / SMS)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │   Linq           │
              │   (iMessage)     │
              │                  │
              │   Twilio         │
              │   (SMS backup)   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   CareSupport    │
              │   Agent          │
              │                  │
              │   Personality:   │
              │   soul.md        │
              │                  │
              │   Reads/writes:  │
              │   family.md      │
              │   user.md (×N)   │
              └───┬─────────┬───┘
                  │         │
         ┌────────▼──┐  ┌──▼────────┐
         │  Context   │  │  Context   │
         │  Store     │  │  Events    │
         │            │  │            │
         │ family.md  │  │ Schedule   │
         │ user.md×N  │  │ changes,   │
         │            │  │ journal    │
         │            │  │ entries,   │
         │            │  │ coverage   │
         │            │  │ updates    │
         └────────┬───┘  └──┬────────┘
                  │         │
              ┌───▼─────────▼───┐
              │   Tambo Backend   │
              │   (self-hosted)   │
              │                   │
              │   Decision loop:  │
              │   context →       │
              │   component       │
              │   selection →     │
              │   prop streaming  │
              │                   │
              │   Components:     │
              │   WeekSchedule    │
              │   CareJournal     │
              │   TeamRoster      │
              │   AvailCheck      │
              │   GapAlert        │
              │   DaySummary      │
              │   MemberProfile   │
              └────────┬─────────┘
                       │
              ┌────────▼─────────┐
              │   Dashboard       │
              │   (React / Next)  │
              │   caresupport.com │
              │                   │
              │   Coordinator     │
              │   sees + talks    │
              │   to CareSupport  │
              └──────────────────┘
```

---

## Data Flow: iMessage → Dashboard

### The Write Path (conversation → context → components)

```
1. Family member texts CareSupport via iMessage
   │
2. Linq receives message → routes to CareSupport agent
   │
3. Agent loads user.md (individual) + family.md (network)
   │
4. Agent responds via iMessage AND updates context files:
   │  - user.md: conversation history, preferences, availability
   │  - family.md: schedule changes, care events, network state
   │
5. Context change event published
   │
6. Dashboard receives event (WebSocket / SSE / polling)
   │
7. Tambo's interactable components read updated context
   │
8. Components re-render with new state
```

### The Read Path (coordinator → dashboard → agent → iMessage)

```
1. Coordinator types in dashboard: "ask Haley to cover Friday"
   │
2. Tambo sends message to CareSupport agent
   │
3. Agent reads family.md → understands Haley + Friday context
   │
4. Agent renders <AvailabilityCheck> component in dashboard
   │  AND texts Haley via Linq: "Hey Haley, are you able to
   │  pick up Auntie at 4:30 on Friday?"
   │
5. Haley replies via iMessage: "yep!"
   │
6. Agent updates family.md (Friday = Haley, confirmed)
   │
7. Dashboard components update:
   │  - <WeekSchedule>: Friday turns green
   │  - <CareJournal>: new entry
   │  - <AvailabilityCheck>: shows resolution
```

---

## The Dual-Agent Problem

The most significant architectural challenge: CareSupport has **two conversational surfaces** that share context.

### Surface 1: iMessage Agent
- Receives texts from family members via Linq/Twilio
- Has personality defined in soul.md
- Reads/writes family.md and user.md
- Proactive via crons (heartbeat, reminders)
- **Does NOT render components** — text-only

### Surface 2: Dashboard Agent (Tambo)
- Receives messages from coordinator via dashboard chat
- Same CareSupport personality
- Reads the same family.md and user.md
- **Renders components** via Tambo's generative UI
- Also has tools that trigger iMessage sends

### How They Stay in Sync

**Option A: Shared Context Files (Recommended)**

Both agents read from and write to the same family.md and user.md files. The context files ARE the synchronization layer.

```
                ┌──────────────┐
                │  family.md   │
                │  user.md ×N  │
                │              │
                │  (database   │
                │  or file     │
                │  storage)    │
                └──┬───────┬───┘
                   │       │
          ┌────────▼──┐ ┌──▼────────┐
          │ iMessage   │ │ Dashboard  │
          │ Agent      │ │ Agent      │
          │            │ │ (Tambo)    │
          └────────────┘ └───────────┘
```

- iMessage agent writes an update → dashboard agent reads it on next interaction
- Dashboard agent triggers a text → iMessage agent handles the reply
- No agent-to-agent communication needed — they communicate through context

**Pros:** Simple, uses existing architecture, no new sync infrastructure
**Cons:** Slight delay between write and read (not truly real-time)

**Option B: Event Bus**

Add a lightweight event system (Redis pub/sub, WebSocket server, or SSE endpoint) that both agents publish to and subscribe from.

```
                ┌──────────────┐
                │  Event Bus   │
                │  (Redis /    │
                │   WebSocket) │
                └──┬───────┬───┘
                   │       │
          ┌────────▼──┐ ┌──▼────────┐
          │ iMessage   │ │ Dashboard  │
          │ Agent      │ │ Agent      │
          └────────────┘ └───────────┘
```

- iMessage agent writes context + publishes "schedule_updated" event
- Dashboard receives event → triggers Tambo component refresh
- Real-time updates (< 1 second latency)

**Pros:** True real-time, dashboard updates immediately when texts arrive
**Cons:** More infrastructure, another service to maintain

**Recommendation:** Start with Option A (shared context files + polling). Move to Option B when real-time updates become a requirement based on user feedback.

---

## Tambo Integration Points

### 1. Context Injection via contextHelpers

```tsx
<TamboProvider
  apiKey={process.env.TAMBO_API_KEY}
  userToken={coordinatorToken}
  components={careComponents}
  tools={careTools}
  contextHelpers={{
    familyContext: () => ({
      key: "family",
      value: familyMdContent,  // The full family.md
    }),
    coordinatorContext: () => ({
      key: "coordinator", 
      value: coordinatorProfile,
    }),
    currentSchedule: () => ({
      key: "schedule",
      value: currentWeekSchedule,
    }),
  }}
>
  <Dashboard />
</TamboProvider>
```

### 2. Tools for Agent Actions

```tsx
const careTools: TamboTool[] = [
  {
    name: "sendTextToMember",
    description: "Send a text message to a family member via CareSupport iMessage",
    tool: async ({ memberId, message }) => {
      return await careSupportAPI.sendMessage(memberId, message);
    },
    inputSchema: z.object({
      memberId: z.string(),
      message: z.string(),
    }),
  },
  {
    name: "getAvailability",
    description: "Check a family member's recent availability patterns",
    tool: async ({ memberId }) => {
      return await careSupportAPI.getMemberAvailability(memberId);
    },
    inputSchema: z.object({
      memberId: z.string(),
    }),
  },
  {
    name: "assignShift",
    description: "Assign a care shift to a family member and notify them",
    tool: async ({ memberId, shiftId }) => {
      return await careSupportAPI.assignShift(memberId, shiftId);
    },
    inputSchema: z.object({
      memberId: z.string(),
      shiftId: z.string(),
    }),
  },
];
```

### 3. Interactable Component Registration

```tsx
const InteractableWeekSchedule = withTamboInteractable(WeekSchedule, {
  componentName: "WeekSchedule",
  description: "The family's weekly care schedule. Shows who is covering each shift. Can be updated when shifts are confirmed, cancelled, or reassigned.",
  propsSchema: weekScheduleSchema,
  stateSchema: weekScheduleStateSchema,
});

// In the dashboard layout:
<InteractableWeekSchedule
  id="family-schedule"
  {...currentScheduleProps}
/>
```

---

## Infrastructure Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js + React | Dashboard app at caresupport.com |
| Generative UI | Tambo (self-hosted) | Decision loop, component rendering, streaming |
| iMessage | Linq API | Primary messaging channel |
| SMS backup | Twilio | For non-iMessage users |
| Agent | TBD (see VISION.md open questions) | CareSupport agent processing |
| Context storage | Markdown files (database-backed) | family.md + user.md per member |
| Database | PostgreSQL | Tambo state + CareSupport operational data |
| Auth | TBD | Coordinator login for dashboard access |
| Hosting | TBD | Vercel (frontend) + Docker (Tambo backend) likely |

---

## Security Considerations

### PHI in the Dashboard

- All component props contain care data → HIPAA implications
- Tambo's PostgreSQL stores conversation history → must be encrypted at rest
- Props stream over WebSocket/SSE → TLS required
- Auth must enforce family-level access (coordinator only sees their family)
- Self-hosting Tambo is critical — no third-party processing of PHI

### Authentication Flow

```
1. Coordinator navigates to caresupport.com
2. Login (phone number + verification code, matching onboarding)
3. Auth token issued → passed to Tambo as userToken
4. Tambo validates token → loads coordinator's family context
5. Dashboard renders with family-scoped components
```

### Data Boundaries

- Each family has isolated context (family.md + user.md files)
- Dashboard components only receive data for the authenticated coordinator's family
- Tambo's conversation threads are per-user (built-in isolation)
- No cross-family data leakage possible at the context injection layer

---

## Mobile Architecture

Rob's use case requires full mobile support.

**Approach:** Responsive web app (not native) — consistent with "no one downloads an app" philosophy.

**Key requirements:**
- Touch-friendly tap targets (minimum 44px)
- `<WeekSchedule>` collapses to day view on mobile
- `<AvailabilityCheck>` buttons are full-width on mobile
- Chat input is fixed at bottom (familiar messaging pattern)
- Components stack vertically instead of side-by-side
- Voice input support (accessibility for Rob's use case)

**Progressive Web App (PWA):**
- Add to home screen capability
- Offline indicator (CareSupport requires connectivity)
- Push notifications for gap alerts and confirmations
