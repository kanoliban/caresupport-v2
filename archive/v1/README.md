# CareSupport Agent — Forked from Viktor

A care coordination agent built by translating every component of Viktor's
architecture into the family care domain. Same primitive (reasoning model +
flat files + conversation interface), different context.

**Source:** `../clone/` (Viktor factory default, pre-onboarding)
**Output:** This directory — a complete, production-designed care agent skeleton

---

## The Translation

### One Sentence

Viktor coordinates *work* for a *company* via *Slack*.
CareSupport coordinates *care* for a *family* via *iMessage/SMS*.

### The Primitives Are Identical

```
Viktor:       Model + Skills (markdown) + Slack (conversation) + SDK (tools)
CareSupport:  Model + Protocols (markdown) + SMS (conversation) + SDK (tools)
```

The model is the same (Claude). The file format is the same (markdown with YAML
frontmatter). The conversation interface is different (Slack → SMS). The tools
are different (Linear → pharmacy). But the *architecture* is identical.

---

## Complete File-by-File Translation

### Workspace Root

| Viktor (`/work/`) | CareSupport (`/care/`) | What Changed |
|---|---|---|
| `skills/` | `protocols/` | "Skills" → "Protocols." Added safety_level field. |
| `company/SKILL.md` | *(rolled into family.md)* | One company per workspace → one family per file. |
| `team/SKILL.md` | *(rolled into family.md)* | Team members = Care Team section in family.md. |
| `sdk/` | `sdk/` | Same structure, different modules. |
| `slack/` | `conversations/` | Channel logs → phone number logs. |
| `crons/` | `schedules/` | "Crons" → "Schedules." Same underlying mechanism. |
| `logs/` | `logs/` | Added `phi_access.log` for HIPAA. |
| `emails/` | `emails/` | Kept for provider communication. |
| `agent_runs/` | `care_sessions/` | Renamed for clarity. |
| `viktor-spaces/` | *(removed)* | No web app building needed. |
| `temp/` | `temp/` | Unchanged. |
| *(none)* | `families/` | NEW. Where family.md files live. |

### System Prompt Sections

| Viktor Section | CareSupport Section | Key Change |
|---|---|---|
| `<general_information>` | `<general_information>` | Added: family_id, active member phone/role |
| `<core_philosophy>` | `<core_philosophy>` | "Skills = memory" → "Family file = truth" |
| | | "Scripts = hands" → "Messages = hands" |
| | | "Quality is non-negotiable" → "Safety is non-negotiable" |
| `<skills_system>` | `<protocol_system>` | Added: safety_level (critical/standard/informational) |
| `<work_approach>` | `<care_approach>` | "Investigate deeply" → "Read family file first" |
| | | "Work by scripting" → "Respond concisely" |
| | | Added: escalation rules |
| `<slack_history>` | `<conversation_history>` | Channels → phone numbers |
| `<communicating_with_humans>` | `<messaging_rules>` | Slack markdown → plain text |
| | | Added: character limits, message templates |
| `<operating_rules>` | `<operating_rules>` | Added: hard rules vs soft rules distinction |
| `<available_skills>` | `<available_protocols>` | Same auto-generation, added safety level |

### Skills → Protocols (14 protocols, from 20 skills)

| Viktor Skill | CareSupport Protocol | Translation |
|---|---|---|
| `browser/` | *(removed)* | SMS agent doesn't browse websites |
| `codebase-engineering/` | *(removed)* | Not applicable to care |
| `docx-editing/` | *(removed for v1)* | Could add for care document generation |
| `excel-editing/` | *(removed)* | Not applicable to care |
| `general-tools/` | `general-tools/` | Adapted: health search, email, file conversion |
| `integrations/` | *(handled by platform)* | Fewer, more focused integrations |
| `pdf-creation/` | *(removed for v1)* | Could add for care report generation |
| `pdf-form-filling/` | *(removed for v1)* | Could add for insurance form filling |
| `pdf-signing/` | *(removed for v1)* | Could add for consent forms |
| `pptx-editing/` | *(removed)* | Not applicable to care |
| `remotion-video/` | *(removed)* | Not applicable to care |
| `scheduled-crons/` | `care-schedules/` | Adapted: medication reminders, check-ins |
| `skill-creation/` | `protocol-creation/` | Added: safety_level, requires_approval fields |
| `slack-admin/` | `family-admin/` | Channels → family members, invites → onboarding |
| `thread-orchestration/` | *(removed)* | Single-family focus, simpler orchestration |
| `viktor-spaces-dev/` | *(removed)* | No web app building needed |
| `workflow-discovery/` | *(removed — built into onboarding)* | Needs assessment is part of the onboarding flow |
| *(none)* | `medication-management/` | NEW. Critical safety level. |
| *(none)* | `emergency-response/` | NEW. Critical safety level. Zero-latency. |
| *(none)* | `care-plan-updates/` | NEW. Draft/approval pattern for family.md changes. |
| *(none)* | `daily-check-in/` | NEW. Morning/evening wellness checks. |
| *(none)* | `caregiver-handoff/` | NEW. Shift transitions. |
| *(none)* | `wellness-monitoring/` | NEW. Pattern tracking over time. |
| *(none)* | `family-onboarding/` | NEW. Family setup flow. |
| *(none)* | `appointment-coordination/` | NEW. Schedule, remind, prep. |
| *(none)* | `provider-communication/` | NEW. Doctor/specialist interface. |
| *(none)* | `insurance-benefits/` | NEW. Coverage, claims, authorizations. |

**Removed:** 9 skills (not applicable to care over SMS)
**Adapted:** 5 skills → 5 protocols
**Created:** 9 new protocols specific to care coordination

### SDK Tool Modules

| Viktor Module | Functions | CareSupport Module | Functions | Translation |
|---|---|---|---|---|
| `default_tools.py` | 16 | `messaging.py` | 4 | Slack channels/threads → phone numbers |
| `browser_tools.py` | 3 | *(removed)* | — | |
| `email_tools.py` | 2 | `email.py` | 1 | Kept for provider communication |
| `utils_tools.py` | 5 | `utils.py` | 3 | Health search, no image gen |
| `docs_tools.py` | 2 | *(removed)* | — | |
| `slack_admin_tools.py` | 5 | `family_admin.py` | 5 | Workspace → care team management |
| `scheduled_crons.py` | 4 | `care_schedules.py` | 5 | Added: medication reminder type |
| `thread_orchestration_tools.py` | 2 | *(removed)* | — | |
| `viktor_spaces_tools.py` | 6 | *(removed)* | — | |
| *(none)* | — | `emergency.py` | 2 | NEW: urgent alerts |
| *(none)* | — | `pharmacy.py` | 4 | NEW: medication management |
| *(none)* | — | `calendar.py` | 3 | NEW: appointment scheduling |
| *(none)* | — | `insurance.py` | 2 | NEW: coverage verification |
| *(none)* | — | `health_records.py` | 2 | NEW: EHR integration |

### SDK Utilities

| Viktor Utility | CareSupport Utility | Translation |
|---|---|---|
| `browser.py` | *(removed)* | No browser automation needed |
| `heartbeat_logging.py` | *(rolled into phi_audit.py)* | Activity logging + PHI audit |
| `slack_reader.py` | `conversation_reader.py` | Slack logs → SMS logs |
| `workspace_tree.py` | `family_reader.py` | Directory tree → family.md parser |
| *(none)* | `message_router.py` | NEW: phone → family context resolution |
| *(none)* | `role_filter.py` | NEW: HIPAA content filtering |
| *(none)* | `phi_audit.py` | NEW: PHI access logging |

### Onboarding / Schedule Templates

| Viktor Cron | CareSupport Schedule | Translation |
|---|---|---|
| `heartbeat` | `morning-checkin` + `evening-checkin` | One generic check → two care-specific times |
| `channel_introductions` | *(part of family-onboarding)* | Intro messages to each care team member |
| `workflow_discovery` | `weekly-summary` | Discover opportunities → review care quality |
| *(none)* | `medication-reminder` | NEW: per-med, per-time, with escalation |

---

## What's New (No Viktor Equivalent)

These components don't exist in Viktor because Viktor coordinates work, not care:

### 1. Safety Levels
Viktor's protocols are all reasoning-level guidelines. Care protocols have hard rules
the model CANNOT rationalize around. `safety_level: critical` means: medication changes
always need confirmation, emergency keywords always trigger immediate response,
PHI is always filtered by access level. No exceptions, no override.

### 2. Role-Based Access Control
Viktor shows the same information to everyone in the workspace. CareSupport filters
every response through an access matrix. A home aide sees medications and schedule.
The primary caregiver sees everything. A provider sees medical info. The filter
runs before the response is sent — it's a safety net, not just a prompt instruction.

### 3. PHI Audit Logging
Viktor logs actions for debugging. CareSupport logs every access to patient data for
HIPAA compliance. WHO accessed WHAT, WHEN, and WHY — in a structured JSON format
that can be audited.

### 4. Message Router
Viktor doesn't need routing — Slack resolves identity through workspace membership and
@mentions. Over SMS, a phone number is the only signal. The message router maps
phone → family → member → role → context before the agent sees anything.

### 5. Confirmation via SMS
Viktor uses Slack buttons (Approve / Reject). SMS doesn't have buttons. The care agent
uses "Reply YES to confirm" with natural language parsing. Same pattern, different
transport. YES/Y/yeah/confirm → approve. NO/N/cancel → reject.

### 6. Emergency Protocol
Zero-latency path. Emergency keywords bypass all normal processing. The agent
responds immediately, notifies all full-access members simultaneously, and provides
the home address. False positives are acceptable. False negatives are not.

---

## Architecture Comparison

```
VIKTOR:
  Slack message → Platform → Agent (with workspace context)
                             ↓
                    Read skills, query tools, draft response
                             ↓
                    Send Slack message (with optional approval buttons)

CARESUPPORT:
  SMS/iMessage → Message Router → Agent (with family context + role filter)
                                  ↓
                    Read family.md + protocols, query tools, draft response
                                  ↓
                    Role Filter → Send SMS (with YES/NO confirmation if needed)
                                  ↓
                    PHI Audit Log
```

The CareSupport pipeline has two layers Viktor doesn't need:
1. **Message Router** (before agent) — identity resolution
2. **Role Filter** (after agent) — information filtering

Both exist because of the trust model difference: Viktor trusts everyone in the
Slack workspace equally. CareSupport does not — a home aide and a primary caregiver
have very different information rights.

---

## File Counts

```
Viktor clone:     96 files  (20 skills, 9 SDK modules, 4 utils, 41 references)
CareSupport fork: 43 files  (14 protocols, 10 SDK modules, 5 utils, 0 references*)

*References will be added as the system grows (drug interaction databases,
 insurance plan templates, care guideline documents, etc.)
```

Smaller. Tighter. Every file maps to a care action. Nothing is there for
general-purpose capability — everything is there because a family needs it.
