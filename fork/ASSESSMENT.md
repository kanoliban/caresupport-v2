# Phase 0: Infrastructure Assessment — Viktor → CareSupport

> Audit of Viktor's production runtime. What can be reused, what needs
> modification, and what's missing for CareSupport Option A.

---

## Executive Summary

Viktor's infrastructure provides ~70% of what CareSupport needs out of the box.
The remaining 30% is SMS plumbing, family isolation, and healthcare-specific
integrations. Nothing requires rearchitecting. The biggest gap is the inbound
message channel (Slack → SMS), which has multiple viable paths.

**Verdict: Option A is viable. Fastest path: 5-7 days to first real SMS
interaction, using Twilio Pipedream integration + Viktor Spaces as the bridge.**

---

## Layer 1: Tool Gateway

### How it works today
- All tool calls route through `https://api.jace.ai/v1/tools`
- Agent scripts call `get_client().call(role, **kwargs)` → HTTP POST → Gateway
- Gateway handles: auth (JWT), credential management, OAuth token refresh,
  API routing, response formatting
- Each tool has a `role` identifier (e.g., "coworker_send_slack_message",
  "coworker_git")
- 124 functions across 12 tool modules
- Gateway URL and token provided via environment variables per-session

### CareSupport assessment
| Aspect | Status | Notes |
|---|---|---|
| API proxy pattern | ✅ Ready | Same pattern for pharmacy/calendar APIs |
| Credential management | ✅ Ready | OAuth, API keys, basic auth all supported |
| Multi-integration | ✅ Ready | 3,139 integrations available (3,114 Pipedream + 26 native) |
| Twilio integration | ✅ Available | `pd:twilio` — Pipedream Twilio integration exists, auth type: keys |
| Google Calendar | ✅ Available | `pd:google_calendar` — OAuth integration exists |
| Healthcare APIs | ⚠️ Partial | Azure FHIR exists. DrChrono (EHR) exists. No Surescripts. |
| Custom API bridge | ✅ Ready | `create_custom_api_integration` for any REST API not in catalog |
| Response latency | ✅ Acceptable | 600s timeout, async HTTP, suitable for SMS response times |

### Gap: Healthcare API integrations
- **Surescripts** (pharmacy): Not in catalog. Would need custom API integration.
  V1 alternative: agent prepares request, human calls pharmacy.
- **Epic/Cerner** (EHR): Not in catalog directly. Azure FHIR exists as bridge.
  V1 alternative: family photos/forwards lab results.
- **Insurance payers**: Not in catalog. V1: manual bridge (agent writes call scripts).

### Recommendation
Use Pipedream Twilio integration for SMS. Use Pipedream Google Calendar for
appointments. Use custom API integration for any healthcare APIs when ready.
V1 uses manual bridges for complex healthcare integrations.

---

## Layer 2: Message Pipeline

### How it works today
```
Slack event (message/mention)
  → Viktor platform detects trigger
  → Spawns new agent session (sandbox + model)
  → Injects: system prompt + conversation history + trigger message
  → Agent reasons + calls tools + writes files
  → Slack responses sent via coworker_send_slack_message tool
  → Session ends
```

Key characteristics:
- **Stateless sessions**: Fresh sandbox per message (no persistent runtime)
- **Context via files**: Agent reads SKILL.md files from /work/ filesystem
- **History via logs**: Past Slack messages synced to /work/slack/{channel}/
- **Identity via Slack**: User ID resolved by platform before session starts
- **Responses via tools**: Agent calls Slack tools; platform delivers messages

### CareSupport needs
```
SMS arrives at Twilio number
  → Webhook fires to a bridge endpoint
  → Bridge resolves: phone → family_id → member → role → access_level
  → Spawns agent session with CareSupport system prompt + family.md
  → Agent reasons + calls tools + writes files
  → SMS responses sent via Twilio API
  → Session ends
```

### Gap analysis
| Component | Viktor | CareSupport Need | Gap |
|---|---|---|---|
| Trigger source | Slack event | Twilio SMS webhook | NEW: bridge needed |
| Identity resolution | Slack user ID | Phone → family → member | NEW: router needed |
| System prompt | Viktor prompt | CareSupport prompt | SWAP: already written |
| Context files | /work/skills/*.md | /work/families/{id}/family.md | SWAP: already designed |
| Response channel | Slack API | Twilio SMS API | SWAP: different tool |
| Conversation history | /work/slack/{channel}/ | /work/conversations/{phone}/ | SWAP: different path |

### Critical question: How does the bridge work?

**Three architectural options:**

#### Option 2A: Viktor Spaces as SMS Bridge (Recommended for V1)
Build a Viktor Spaces app that:
1. Receives Twilio webhooks (SMS inbound)
2. Stores phone → family mapping in Convex database
3. Uses `viktorTools.callTool()` to invoke the agent
4. Sends response back via Twilio API

**Why this works:** Viktor Spaces already has:
- Web hosting (Vercel) → can receive Twilio webhooks
- Database (Convex) → can store phone-to-family mappings
- Tool Gateway access → can invoke any SDK tool from Convex
- Auth → can secure the webhook endpoint

**Why this is best for V1:**
- Built entirely within Viktor's existing infrastructure
- No external services beyond Twilio
- Database for phone routing
- Real-time updates possible
- We can prototype in days, not weeks

#### Option 2B: Cron-Based Polling (Simpler, higher latency)
1. A script cron polls Twilio for new messages every N seconds
2. Processes each message through the agent
3. Responds via Twilio API

**Pros:** Simpler, no webhook setup needed
**Cons:** Latency (polling interval), not real-time

#### Option 2C: Custom API Integration (Manual bridge)
1. Set up Twilio as a custom API integration
2. Agent can send SMS via `custom_api_twilio_post`
3. Inbound messages forwarded to email or Slack, then agent processes

**Pros:** Minimal infrastructure
**Cons:** Not automated; requires human-in-the-loop for inbound

### Recommendation
**Start with Option 2A (Viktor Spaces bridge).** It's the cleanest architecture
and uses only existing infrastructure. Can be built in 3-5 days. Falls back to
2C if Spaces webhooks prove problematic.

---

## Layer 3: Cron System

### How it works today
- Agent crons: spawn a full agent session with a description (prompt)
- Script crons: execute a Python script directly
- Crons live at `/work/crons/{name}/task.json`
- Standard cron expressions (minute hour day month weekday)
- Dependent paths: can wait for other crons/threads to finish
- `trigger_cron` for manual/on-demand execution

### CareSupport needs
- **Medication reminders**: "At 8am, remind the on-duty caregiver about Maria's
  Lisinopril 10mg"
- **Daily check-ins**: "At 8am, ask the current caregiver how Mom slept"
- **Evening summaries**: "At 8pm, compile the day's events and send to primary
  caregiver"
- **Appointment reminders**: "Day before and morning of each appointment"
- **Refill alerts**: "7 days before medication depletion"

### Assessment
| Aspect | Status | Notes |
|---|---|---|
| Cron expressions | ✅ Ready | Standard crontab, supports any schedule |
| Agent crons | ✅ Ready | Perfect for medication reminders (need reasoning) |
| Script crons | ✅ Ready | Good for refill countdown checks |
| Filesystem access | ✅ Ready | Crons can read/write family.md |
| Per-family scoping | ⚠️ Needs work | Current crons are workspace-level, not family-scoped |
| Dynamic scheduling | ⚠️ Needs work | Crons are static; med schedules change. Need create/delete flow. |

### Gap: Per-family dynamic crons
Current crons are workspace-level. CareSupport needs per-family crons that can
be created and deleted as medication schedules change.

**Solution:** Use path namespacing:
```
/caresupport/{family_id}/medication/morning
/caresupport/{family_id}/medication/evening
/caresupport/{family_id}/checkin/morning
/caresupport/{family_id}/checkin/evening
/caresupport/{family_id}/appointment/{appointment_id}
```

The agent creates crons when medications are added and deletes them when
medications are discontinued. The medication-management protocol already
defines this workflow — it just needs to call `create_agent_cron` and
`delete_cron` as part of its execution.

### Recommendation
Cron system works as-is for V1. Use path namespacing for per-family scoping.
Medication schedule crons are created/deleted dynamically by the agent.

---

## Layer 4: Filesystem & State

### How it works today
- `/work/` is a persistent filesystem across sessions
- Skills: `/work/skills/{name}/SKILL.md`
- Slack history: `/work/slack/{channel}/{YYYY-MM}.log`
- Emails: `/work/emails/inbox/`, `/work/emails/sent/`
- Agent run logs: `/work/agent_runs/`
- Temp: `/work/temp/`
- Tools: `/work/sdk/tools/`

### CareSupport mapping
```
/work/families/{family_id}/family.md          ← Single source of truth
/work/families/{family_id}/timeline.log       ← All events, timestamped
/work/conversations/{phone}/{YYYY-MM}.log     ← Per-member message history
/work/protocols/{name}/PROTOCOL.md            ← Care protocols (= skills)
/work/logs/{date}/phi_access.log              ← HIPAA audit trail
/work/crons/caresupport/{family_id}/          ← Per-family scheduled tasks
```

### Assessment
| Aspect | Status | Notes |
|---|---|---|
| Persistent filesystem | ✅ Ready | Same mechanism as SKILL.md |
| File read/write/edit | ✅ Ready | Standard tools, already tested |
| Grep/search | ✅ Ready | For searching conversation history |
| Family isolation | ⚠️ Needs enforcement | No OS-level isolation; relies on agent discipline |
| File versioning | ⚠️ Not built-in | family.md changes need audit trail; git or custom |
| Backup | ❓ Unknown | What's the backup strategy for /work/? |

### Gap: Family isolation
Viktor's filesystem is flat — any agent session can read any file. For
CareSupport, Family A's agent should never read Family B's family.md.

**V1 Solution:** Soft isolation via system prompt rules (already implemented:
"Before sending ANY medication information, verify it matches the CURRENT
conversation's family file. Cross-family contamination is a safety-class error.")

**V2 Solution:** Infrastructure-level isolation — the platform restricts
file access to `/work/families/{family_id}/` based on the resolved family
from phone routing.

### Gap: File versioning / audit trail
HIPAA requires an audit trail for PHI changes. Currently, family.md changes
are just file edits. No version history.

**V1 Solution:** The agent logs every change to `timeline.log` with timestamp
and description (already in the protocol). Git commits for family.md changes
provide version history.

**V2 Solution:** Formal audit logging — every `file_edit` to family.md triggers
an audit entry with: before/after, who requested, why, timestamp.

### Recommendation
Filesystem works as-is for V1 with soft isolation. Git-based versioning for
family.md provides an adequate audit trail. Infrastructure-level isolation
is a V2 requirement.

---

## Layer 5: Multi-Tenancy

### Current state
Viktor serves one Slack workspace. One system prompt. One set of skills.
All sessions operate in the same context.

### CareSupport needs
Multiple families, each with:
- Their own family.md (context)
- Their own conversation history
- Their own cron schedules
- Their own access levels
- Strict PHI isolation between families

### Assessment
| Aspect | Status | Notes |
|---|---|---|
| Multiple context files | ✅ Works | Each family has its own family.md |
| Per-family crons | ✅ Works | Path namespacing enables this |
| Session scoping | ⚠️ Needs bridge | Bridge must inject correct family_id per session |
| PHI isolation | ⚠️ Soft only | Prompt-level, not infrastructure-level |
| Concurrent sessions | ❓ Unknown | Can multiple agent sessions run simultaneously? |

### Critical question: Concurrent sessions
If Family A and Family B text at the same time, can the platform handle two
simultaneous agent sessions? Based on the cron system (multiple crons can
run in parallel) and the thread system (`create_thread` spawns independent
agents), the answer appears to be YES. But this needs verification.

### Recommendation
Multi-tenancy works at the application level (different files, different
crons, different paths). Infrastructure-level isolation is a V2 requirement.
Concurrent sessions should work based on existing parallelism patterns.

---

## Integration Inventory for CareSupport V1

### Available now (Pipedream)
| Integration | Slug | Auth | CareSupport Use |
|---|---|---|---|
| Twilio | pd:twilio | keys | SMS send/receive |
| Google Calendar | pd:google_calendar | OAuth | Appointment management |
| Hathr AI | pd:hathr_ai | OAuth | HIPAA-compliant AI calls |
| Azure FHIR | pd:azure_api_for_fhir | OAuth | Health records (if provider uses Azure) |
| DrChrono | pd:drchrono | OAuth | EHR integration |
| Cliniko | pd:cliniko | keys | Health practice management |
| Withings | pd:withings | OAuth | Smart health device data |
| Google Fit | pd:google_fit | OAuth | Fitness/health tracking |

### Available now (Custom API)
Any REST API can be added via `create_custom_api_integration`:
- Pharmacy APIs (Surescripts, individual pharmacy chains)
- Insurance payer APIs (when available)
- Health information APIs (NIH, FDA drug database)

### Available now (Built-in)
| Tool | CareSupport Use |
|---|---|
| Email (send/receive) | Provider communication |
| Web search (quick_ai_search) | Health information lookup, resource finding |
| Browser | Form filling, portal access |
| File conversion | Lab results, medical documents |
| AI structured output | Parse unstructured health data |
| Viktor Spaces | SMS bridge app, family portal |
| Thread orchestration | Multi-family coordination |

---

## The Fastest Path: Day-by-Day Plan

### Day 1-2: Twilio Setup + SMS Bridge
1. Connect Twilio Pipedream integration (Liban provides account credentials)
2. Build Viktor Spaces app for SMS webhook bridge:
   - Receive Twilio webhook → extract phone + message
   - Phone lookup table (Convex) → family_id + member + access_level
   - Invoke agent (via Tool Gateway) with CareSupport system prompt + family.md
   - Return response via Twilio SMS

### Day 3: Family Setup
3. Create test family in `/work/families/{id}/family.md`
4. Populate with real data (medications, schedule, care team)
5. Register all family phone numbers in the bridge lookup table

### Day 4: Cron Setup
6. Create per-family crons:
   - Medication reminders (from Active Medications schedule)
   - Morning/evening check-ins
   - Appointment reminders
7. Test cron → SMS delivery pipeline

### Day 5: Integration Test
8. End-to-end test: family member texts → agent responds correctly
9. Test medication reminder → confirmation → file update
10. Test emergency keywords → correct response
11. Test access level filtering

### Day 6-7: Iteration
12. Fix issues from Day 5 testing
13. Iterate on response formatting for SMS
14. Add conversation logging
15. Ready for first real family interaction

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Viktor Spaces can't receive webhooks | Low | High | Fall back to cron polling (Option 2B) |
| Twilio Pipedream integration limited | Low | Medium | Custom API integration as backup |
| SMS response too slow (>10s) | Medium | Medium | Optimize prompt, pre-load context |
| Concurrent families cause race conditions | Medium | High | Test explicitly in Day 5 |
| family.md grows too large for context | Low (V1) | Medium | Current/Reference split already designed |
| PHI leaks between families | Low | Critical | Prompt rules + testing + V2 infrastructure |

---

## Decision Required

To proceed to Phase 1 (Single-Family Pilot), I need:

1. **Twilio account access** — Do you have a Twilio account? If not, we need
   to set one up and get a phone number.
2. **Test family selection** — Who will be the first family? (Can be the Kano
   family with simulated data, or a real care scenario.)
3. **Confirmation: Viktor Spaces bridge approach** — Is building the SMS bridge
   as a Viktor Spaces app acceptable, or is there a preferred alternative?
