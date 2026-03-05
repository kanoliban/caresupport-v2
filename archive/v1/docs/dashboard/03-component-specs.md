# Component Specifications

> Detailed specs for each CareSupport dashboard component.
> Each component includes: purpose, Tambo type, Zod schema, behavior, data sources, and interaction patterns.

---

## Interactable Components

These persist on the dashboard and update as conversations happen. Wrapped with `withTamboInteractable()`.

---

### `<WeekSchedule>`

**Purpose:** The heart of the dashboard. Shows who's covering each shift across a 7-day view.

**Tambo Type:** Interactable

**Data Source:** `family.md` (schedule section), `user.md` files (availability)

**Props Schema:**
```typescript
const weekScheduleSchema = z.object({
  weekStartDate: z.string().describe("ISO date for Monday of the displayed week"),
  careRecipient: z.object({
    name: z.string(),
    needs: z.array(z.string()).describe("e.g., 'morning pickup', 'evening meal'"),
  }),
  days: z.array(z.object({
    date: z.string(),
    dayOfWeek: z.string(),
    shifts: z.array(z.object({
      id: z.string(),
      timeSlot: z.string().describe("e.g., '7:30 AM - 8:30 AM'"),
      task: z.string().describe("e.g., 'Pickup', 'Meal delivery', 'Evening check-in'"),
      assignee: z.string().nullable().describe("Name of assigned person, null if unassigned"),
      status: z.enum(["confirmed", "pending", "declined", "gap", "completed"]),
      source: z.string().optional().describe("How this was confirmed: 'iMessage', 'dashboard', 'proactive'"),
    })),
  })),
});
```

**State Schema:**
```typescript
const weekScheduleStateSchema = z.object({
  selectedDay: z.string().nullable().describe("Currently focused day"),
  viewMode: z.enum(["week", "day"]).describe("Week overview vs single day detail"),
  showCompleted: z.boolean().describe("Whether to show already-completed shifts"),
});
```

**Behavior:**
- Green cells = confirmed, Amber = pending, Red = gap, Gray = completed
- Tapping a gap cell opens a mini availability check for that slot
- Tapping an assigned cell shows who confirmed and when
- Swipe/arrow to navigate weeks
- Mobile: collapses to day view by default

**Update Triggers:**
- Family member confirms/declines via iMessage → status changes
- Coordinator assigns via dashboard → CareSupport texts the assignee
- Time passes → completed shifts gray out
- Proactive: CareSupport identifies gaps and marks them

---

### `<CareJournal>`

**Purpose:** A living timeline of care events. Built entirely from conversation — no direct data entry.

**Tambo Type:** Interactable

**Data Source:** Conversation history across all `user.md` files, `family.md` events section

**Props Schema:**
```typescript
const careJournalSchema = z.object({
  entries: z.array(z.object({
    id: z.string(),
    timestamp: z.string().describe("ISO datetime"),
    author: z.string().describe("Name of the person who originated this entry"),
    type: z.enum([
      "care_event",      // "dropped her off", "brought dinner"
      "health_note",     // "she seemed tired", "mentioned knee pain"
      "schedule_change", // "Solan confirmed pickup", "Maria cancelled"
      "coordination",    // "Asked brothers for coverage"
      "milestone",       // "First week without missed shift"
    ]),
    summary: z.string().describe("Human-readable summary of the event"),
    source: z.enum(["iMessage", "dashboard", "proactive"]),
    relatedMembers: z.array(z.string()).optional(),
  })),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});
```

**State Schema:**
```typescript
const careJournalStateSchema = z.object({
  filterType: z.enum(["all", "care_event", "health_note", "schedule_change", "coordination", "milestone"]).nullable(),
  filterMember: z.string().nullable(),
  expandedEntryId: z.string().nullable(),
});
```

**Behavior:**
- Reverse chronological by default (newest first)
- Filterable by type and member
- Health notes visually distinguished (subtle highlight — important for coordinator awareness)
- Each entry shows how it was captured (iMessage icon, dashboard icon)
- Tapping an entry shows the original conversation context

**The key principle:** No one writes journal entries. They text CareSupport. CareSupport writes the journal.

---

### `<TeamRoster>`

**Purpose:** The care network at a glance. Who's active, their patterns, their reliability.

**Tambo Type:** Interactable

**Data Source:** `user.md` files for each member, conversation history

**Props Schema:**
```typescript
const teamRosterSchema = z.object({
  careRecipient: z.string(),
  members: z.array(z.object({
    id: z.string(),
    name: z.string(),
    relationship: z.string().describe("e.g., 'Nephew', 'Home Health Aide'"),
    role: z.enum(["coordinator", "family_caregiver", "professional", "care_recipient"]),
    agency: z.string().optional().describe("For professionals: which agency"),
    phone: z.string(),
    availability: z.object({
      general: z.string().describe("e.g., 'Weekday evenings, weekends'"),
      lastConfirmed: z.string().optional(),
    }),
    recentActivity: z.object({
      lastText: z.string().optional().describe("When they last texted CareSupport"),
      lastShift: z.string().optional().describe("When they last completed a care task"),
      responseRate: z.string().optional().describe("e.g., 'Usually responds within 1 hour'"),
    }),
    status: z.enum(["active", "inactive", "new"]),
  })),
});
```

**State Schema:**
```typescript
const teamRosterStateSchema = z.object({
  sortBy: z.enum(["name", "lastActivity", "role"]),
  filterRole: z.enum(["all", "family_caregiver", "professional"]).nullable(),
  selectedMemberId: z.string().nullable(),
});
```

**Behavior:**
- Shows avatar/initials, name, role, last activity
- Visual indicator for response patterns (responsive, sometimes slow, etc.)
- Tapping a member opens their `<MemberProfile>` (generative component)
- For Rob's case: members grouped by agency with agency headers
- New members highlighted until first interaction

---

## Generative Components

These are rendered on-demand in response to coordinator questions or proactive CareSupport behavior. They appear in the conversation area and can be pinned or dismissed.

---

### `<AvailabilityCheck>`

**Purpose:** When coverage is needed, shows who's available and lets the coordinator take action.

**Tambo Type:** Generative

**Trigger:** Coordinator asks "who can cover X?" or CareSupport detects a gap

**Props Schema:**
```typescript
const availabilityCheckSchema = z.object({
  need: z.object({
    date: z.string(),
    timeSlot: z.string(),
    task: z.string(),
    careRecipient: z.string(),
  }),
  candidates: z.array(z.object({
    name: z.string(),
    memberId: z.string(),
    status: z.enum([
      "likely_available",  // Pattern suggests availability
      "asked_waiting",     // CareSupport texted, awaiting reply
      "confirmed",         // Said yes
      "declined",          // Said no or unavailable
      "not_contacted",     // Haven't asked yet
      "recently_covered",  // Covered a recent shift (context for fairness)
    ]),
    note: z.string().optional().describe("e.g., 'Covered Thursday', 'Usually free Fridays'"),
    askedAt: z.string().optional(),
  })),
  actions: z.array(z.object({
    label: z.string().describe("Button text, e.g., 'Ask Haley'"),
    memberId: z.string(),
    actionType: z.enum(["ask_individual", "ask_all", "skip", "assign"]),
  })),
});
```

**Behavior:**
- Members sorted by likelihood of availability (AI infers from patterns)
- Action buttons trigger real texts via iMessage
- Component updates live as responses come in
- When someone confirms: shows resolution, updates `<WeekSchedule>`
- If coordinator is on mobile: large tap targets, minimal scrolling

---

### `<DaySummary>`

**Purpose:** End-of-day overview: what happened, who contributed, what's coming tomorrow.

**Tambo Type:** Generative

**Trigger:** Proactive (CareSupport generates at end of day) or coordinator asks "how was today?"

**Props Schema:**
```typescript
const daySummarySchema = z.object({
  date: z.string(),
  careRecipient: z.string(),
  completedTasks: z.array(z.object({
    task: z.string(),
    completedBy: z.string(),
    time: z.string(),
    note: z.string().optional(),
  })),
  healthNotes: z.array(z.object({
    note: z.string(),
    reportedBy: z.string(),
    time: z.string(),
  })),
  tomorrow: z.object({
    shifts: z.array(z.object({
      time: z.string(),
      task: z.string(),
      assignee: z.string().nullable(),
      status: z.enum(["confirmed", "pending", "gap"]),
    })),
    alerts: z.array(z.string()).optional().describe("e.g., 'Friday afternoon pickup not yet covered'"),
  }),
  familyActivity: z.object({
    messagesExchanged: z.number(),
    activeMembersToday: z.array(z.string()),
  }),
});
```

**Behavior:**
- Warm, readable format — not a clinical report
- Health notes highlighted for coordinator attention
- Tomorrow preview shows any gaps that need action
- Can be shared (coordinator forwards to family group text)

---

### `<GapAlert>`

**Purpose:** Proactive notification when CareSupport detects uncovered care needs.

**Tambo Type:** Generative

**Trigger:** Proactive — CareSupport detects a gap through schedule analysis or cancellation

**Props Schema:**
```typescript
const gapAlertSchema = z.object({
  severity: z.enum(["urgent", "upcoming", "fyi"]),
  gap: z.object({
    date: z.string(),
    timeSlot: z.string(),
    task: z.string(),
    careRecipient: z.string(),
    reason: z.string().optional().describe("e.g., 'Liban cancelled', 'No one assigned'"),
  }),
  outreach: z.array(z.object({
    name: z.string(),
    memberId: z.string(),
    status: z.enum(["asked_waiting", "confirmed", "declined", "not_contacted"]),
    askedAt: z.string().optional(),
  })),
  suggestedActions: z.array(z.object({
    label: z.string(),
    actionType: z.string(),
  })),
});
```

**Behavior:**
- Urgent gaps (within 24 hours) have stronger visual treatment
- Shows outreach status: who's been asked, who responded
- Action buttons: ask specific people, ask all, escalate
- Resolves and collapses when coverage is confirmed

---

### `<MemberProfile>`

**Purpose:** Deep view of a single team member — patterns, history, conversation context.

**Tambo Type:** Generative

**Trigger:** Coordinator asks about a specific person, or taps a member in `<TeamRoster>`

**Props Schema:**
```typescript
const memberProfileSchema = z.object({
  name: z.string(),
  relationship: z.string(),
  role: z.string(),
  phone: z.string(),
  agency: z.string().optional(),
  joinedDate: z.string().optional(),
  availability: z.object({
    patterns: z.array(z.string()).describe("e.g., 'Usually available weekday evenings'"),
    restrictions: z.array(z.string()).optional().describe("e.g., 'Not available before 9 AM'"),
  }),
  activitySummary: z.object({
    totalShifts: z.number(),
    lastShift: z.string().optional(),
    lastMessage: z.string().optional(),
    averageResponseTime: z.string().optional(),
    reliability: z.string().optional().describe("e.g., 'Confirmed 12 of 14 requests'"),
  }),
  recentJournalEntries: z.array(z.object({
    date: z.string(),
    summary: z.string(),
  })),
  recentConversationContext: z.string().optional().describe("Brief summary of recent text exchanges"),
});
```

**Behavior:**
- Shows the person, not the data — warm, respectful presentation
- Reliability shown as encouragement, not judgment ("Confirmed 12 of 14" not "86% rate")
- Recent conversation context helps coordinator understand member's current situation
- Action: "Text [Name]" button sends iMessage via CareSupport

---

## Future Components (Post-MVP)

| Component | Type | Description |
|-----------|------|-------------|
| `<MedicationTracker>` | Interactable | Track medications, reminders, confirmations |
| `<WeeklyReport>` | Generative | Week-in-review for family updates |
| `<OnboardingWizard>` | Generative | Guide new family members through setup via dashboard |
| `<AgencyView>` | Generative | For Rob's case: view by agency with shift assignments |
| `<EmergencyEscalation>` | Generative | When something urgent needs immediate multi-person coordination |

---

## Design Principles for All Components

1. **Warm, not clinical.** These are families, not hospitals. Colors, language, and layout should feel like family software.
2. **Mobile-first.** Rob uses his phone with his nose. Large tap targets, minimal scrolling, clear hierarchy.
3. **No empty states.** If a component has no data yet, it should explain what will appear and how ("When family members text CareSupport, their updates will appear here").
4. **Source attribution.** Show how information entered the system (iMessage icon, dashboard icon) — builds trust.
5. **Action-oriented.** Components that surface problems should also surface solutions. Every gap alert should have action buttons.
6. **Progressive disclosure.** Show the essential information first. Details on tap/click. Don't overwhelm.
7. **Accessible.** Screen reader support, keyboard navigation, sufficient contrast. Care coordination is for everyone.
