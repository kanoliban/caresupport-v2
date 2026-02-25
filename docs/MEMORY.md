# MEMORY.md — CareSupport Project Memory

> **Purpose:** This file captures everything a future agent or human needs to continue
> building CareSupport without re-walking paths we've already walked. Slack threads die.
> Agent instances restart. Context windows reset. This file doesn't.
>
> **Rule:** Updated with every significant commit — during, not after.
>
> **Last updated:** 2026-02-25 (Viktor, after merging all PRs to main)

---

## 1. ACCOUNTS & ACCESS

### Linq (Messaging Provider — LIVE)
| Key | Value |
|-----|-------|
| API base URL | `https://api.linqapp.com/api/partner/v3` |
| API key | `ce59c24c-d002-463c-8a89-8cfe4f82bf86` |
| Phone number | `+16504415695` (Linq Blue — CareSupport's production number) |
| Status | Sandbox — live, tested, API returns 200 |
| Config location | `runtime/scripts/linq_config.json` (gitignored, see `.example`) |

**IMPORTANT:** The API key above is temporary (Lee confirmed it will be deleted after testing). A
permanent key will need to be provisioned before production. Update this section when that happens.

### Linq — Active Resources
| Resource | ID | Notes |
|----------|----|-------|
| Chat (Lee ↔ CareSupport) | `1965f2b5-c5e6-4a08-80e9-9224b8a20d88` | iMessage, created 2026-02-24 11:53am CT |
| Webhook subscription | 1 active | `chat.created → webhook.linqapp.com/welcome` |
| Unread message | "Hello World" from Lee | Sent 2026-02-24, STILL UNANSWERED |

### GitHub
| Key | Value |
|-----|-------|
| Repo | `kanoliban/caresupport-original` |
| Primary branch | `main` |
| Local clone | `/work/repos/caresupport-original/` |
| CI | `.github/workflows/ci.yml` (needs manual push — GitHub App lacks `workflows` permission) |

### People — Phone Numbers
| Person | Phone | Role |
|--------|-------|------|
| Liban Kano (Lee) | `+16517037981` | Founder & CEO, primary caregiver for Degitu |
| CareSupport (Claw) | `+16504415695` | The agent's Linq number |

### What's NOT Set Up Yet
- Webhook receiver endpoint (needs public URL — Cloudflare Workers, ngrok, or similar)
- Permanent Linq API key
- BAA (in parallel — does NOT block launch)
- Production deployment server (macOS single-server per architecture spec)

---

## 2. CHRONOLOGICAL LOG

### 2026-02-22 (Saturday)
- **Repo cloned, architecture reviewed.** 7 PRD docs (system architecture, data format, skill pack, enforcement & safety, integration spec, operations spec, validation & testing). 52 simulations, 5 test families, 117 tests passing.
- **Linq branch created** (`feat/linq-imessage-migration`). Built proactively before Lee confirmed the Twilio kill. 2,079 lines: linq_gateway.py, webhook_receiver.py, reaction_handler.py, tests.
- **Dashboard vision PR** (#1). Tambo generative UI analysis. 5 docs, 1,341 lines.

### 2026-02-23 (Sunday)
- **CTO Production Plan created** (PR #3). Built by Munger inversion — "7 ways CareSupport dies" sequenced into a 5-phase build plan. 4 files, 355 lines.
- **Harness engineering reviewed.** Wave 1-2 verified complete (466 tests at that time). Tech debt tracker updated.

### 2026-02-24 (Monday) — The Pivot Day
- **Lee killed Twilio.** "We are not going to use Twilio. We are going to move forward with Linq." Decision: iMessage-first via Linq Partner API. A2P registration irrelevant.
- **Family data is LEARNED, not pre-loaded.** "We must treat my own family like a user that I may not have the chance to onboard." CareSupport earns data through conversation — schedule, medications, relationships all elicited, not given.
- **BAA does not block launch.** Parallel process, not sequential gate.
- **user.md placement confirmed:** `families/kano/members/liban.md` (alongside family.md).
- **Linq API tested live.** Key works (200 on /phonenumbers). Found Lee's "Hello World" message sitting unanswered.
- **Agent identity confirmed:** Claw. Daemon (Unix: persistent background process; older: guiding spirit). 🐾

### 2026-02-25 (Tuesday) — Merge Day
- **All 4 PRs merged to main:**
  - PR #1: Dashboard vision (docs)
  - PR #3: CTO production plan (docs)
  - PR #2: Linq integration (feat/linq-imessage-migration — 2,079 lines)
  - PR #4: Ship-ready (message lock + Twilio removal + Linq consolidation — 828 insertions, 642 deletions)
- **Twilio fully removed.** twilio_proxy.py and sms_gateway.py deleted. poll_inbound.py rewritten for Linq.
- **Message lock added.** Per-family file-based serialization. 13 tests.
- **CI pipeline created.** .github/workflows/ci.yml (needs manual push due to GitHub App permissions).
- **MEMORY.md created.** This file.
- **Test count:** 148 tests, 12 suites, 0 failures.
- **Cold-start family.md and SOUL.md built.** Kano-Tefera family initialized. Claw's identity finalized.

---

## 3. CURRENT STATE

### What's Built (on main)
| Component | Status | Tests |
|-----------|--------|-------|
| Enforcement layer (5 modules) | ✅ On main | 80+ tests |
| role_filter.py | ✅ | Pre-filter + post-check |
| phi_audit.py | ✅ | HIPAA-compliant event logging |
| family_editor.py | ✅ | Backup → edit → validate |
| approval_pipeline.py | ✅ | YES/NO + tapback confirmation |
| message_lock.py | ✅ | Per-family serialization, 13 tests |
| Linq gateway | ✅ | Full V3 client, 6 tests |
| Webhook receiver | ✅ | HMAC verification, 6 tests |
| Reaction handler | ✅ | Tapback → approval, 6 tests |
| SMS handler | ✅ | 9-step pipeline with lock |
| Poll inbound (Linq) | ✅ | Rewritten for Linq |
| Heartbeat cron | ✅ | 48hr lookahead |
| Maintenance cron | ✅ | GC + validation |
| Structural tests | ✅ | Verify enforcement wiring |
| CI pipeline | ⚠️ File exists, needs manual push | 12 suites |

### What's NOT Built Yet
| Component | Status | Blocker |
|-----------|--------|---------|
| Deployment | ❌ | Needs server + webhook URL |
| Webhook public endpoint | ❌ | Needs Cloudflare Workers or similar |
| Production Linq API key | ❌ | Current key is temporary |
| SOUL.md (Claw identity) | 🔨 Building now | None |
| Cold-start family.md | 🔨 Building now | None |
| First reply to "Hello World" | ❌ | Needs deployment |

### Test Summary
```
148 tests, 12 suites, 0 failures (8.00s)

Suites:
  test_approval_pipeline    test_linq_gateway
  test_family_editor        test_maintenance
  test_handler_enforcement  test_message_lock
  test_heartbeat            test_phi_audit
  test_reaction_handler     test_role_filter
  test_structural           test_webhook_receiver
```

---

## 4. PEOPLE & RELATIONSHIPS

### The Kano-Tefera Family (First Users)
- **Liban Kano** (Lee) — Founder & CEO of CareSupport. Primary caregiver for his grandmother Degitu. Phone: +16517037981. Slack: @leekane31.
- **Degitu Tefera** — Care recipient. Lee's grandmother. Everything else about her care situation must be LEARNED through conversation, not pre-loaded. This is a deliberate design decision.
- **Other family members** — Unknown to the system. Will be discovered as Liban introduces them to Claw.

### Key Context About Lee
- First-generation Oromo-Ethiopian American. The care coordination challenge is personal — he built CareSupport because he lives it.
- Communication style: Direct, fast-moving, vision-driven. Sends voice memos. Makes decisions quickly and expects execution.
- Technical decisions: Lee makes product and strategic calls. Viktor executes as CTO.
- VISION.md (his words): "Families are operators, not consumers. They run invisible home care agencies."

### Viktor's Role
- Autonomous AI CTO. Writes code, creates PRs, makes architectural decisions within Lee's strategic direction.
- Has been operating since 2026-02-22. All code in the repo was written or reviewed by Viktor.

---

## 5. DEAD ENDS & LESSONS

### Twilio (DEAD — 2026-02-24)
- **What:** Original messaging transport. Two separate gateway files (twilio_proxy.py, sms_gateway.py). Pipedream integration.
- **Why killed:** Linq gives iMessage-first messaging (Lee's family uses iMessage). A2P 10DLC registration is irrelevant with Linq. Twilio is SMS-only, which is the wrong starting point.
- **Files deleted:** twilio_proxy.py, sms_gateway.py
- **Lesson:** Build for the transport the user actually uses, not the one that's easiest to set up.

### Pre-loaded Family Data (DEAD — 2026-02-24)
- **What:** Early plan to populate family.md with known information about the Kano-Tefera family before launch.
- **Why killed:** Lee's directive: "We must treat my own family like a user that I may not have the chance to onboard." CareSupport must earn data through conversation. Every family.md starts near-empty.
- **Lesson:** Pre-loading creates a false sense of readiness. The cold-start conversation IS the product — it's how Claw builds trust and gathers accurate, current information.

### BAA as Sequential Gate (DEAD — 2026-02-24)
- **What:** Treating the BAA (Business Associate Agreement) with Linq as a prerequisite before any launch.
- **Why killed:** "That can be done later. That does not whatsoever should stop us from launching."
- **Lesson:** Legal compliance is a parallel workstream, not a sequential gate. You can test, build, and validate while the paperwork processes.

### Two Twilio Gateways (DEAD — 2026-02-25)
- **What:** Both twilio_proxy.py (Pipedream-based) and sms_gateway.py (direct API) existed simultaneously. Tech debt from iterative development.
- **Why resolved:** Entire Twilio stack killed. But the lesson applies: don't let two implementations of the same thing coexist.

### Arxiv Paper — Context File Findings (ACTIVE LEARNING)
- **What:** Research paper showing Claude Code performs WORSE with developer-written context files. Context files increase cost 20%+ in every setting.
- **Impact on CareSupport:** Led to deep rethink of protocol loading strategy. 16 protocols × ~3.4K chars = ~54K chars loaded per message. The paper suggests this hurts more than it helps.
- **Current direction:** Move toward on-demand protocol loading (search, not bulk load). Hard safety rules stay in system prompt. Soft guidance becomes searchable. Cloudflare's Code Mode pattern is the architectural model for this evolution.
- **Not implemented yet** — current architecture still loads protocols. Phase 5 optimization.

### Cloudflare Code Mode Parallel (ACTIVE THINKING)
- **Insight from Lee:** Cloudflare's "thousands of APIs" = the fragmented healthcare ecosystem. Code Mode (agent writes TypeScript against a fixed API surface) could replace bulk protocol loading.
- **CareSupport application:** Protocols become API functions. `care.updateMedication()` internally enforces what medication-management PROTOCOL.md currently describes in text.
- **Status:** Conceptual. Not in current build plan. Relevant for Phase 5+ optimization.

---

## 6. OPEN THREADS

### Immediate (This Sprint)
- [ ] **SOUL.md** — Finalize Claw's identity document. Name, voice, boundaries, opening line. Drives system prompt.
- [ ] **Cold-start family.md** — Minimal Kano-Tefera family file. Name, care recipient flag, Liban's phone. Everything else empty — protocols trigger intake.
- [ ] **user.md for Liban** — `families/kano/members/liban.md`. Phone, role (primary_caregiver, coordinator), access_level (full).
- [ ] **CI workflow** — `.github/workflows/ci.yml` needs manual push (or Lee adds GitHub App `workflows` permission).
- [ ] **Wire end-to-end** — Connect: Linq webhook → webhook_receiver → sms_handler → linq_gateway → reply.
- [ ] **Answer "Hello World"** — The first message. Claw's debut.

### Near-Term
- [ ] Webhook public endpoint (Cloudflare Workers? ngrok for testing?)
- [ ] Permanent Linq API key (current one is temporary)
- [ ] System prompt engineering (informed by SOUL.md)
- [ ] Protocol loading optimization (informed by arxiv paper findings)

### Parallel (Not Blocking)
- [ ] BAA with Linq
- [ ] Dashboard (Tambo generative UI — PR #1 merged, design docs in place)

---

## Appendix: Architecture Quick Reference

```
Inbound message (iMessage via Linq)
  → webhook_receiver.py (HMAC verify, deduplicate, dispatch)
  → sms_handler.py (resolve phone → family → lock → enforce → AI → respond)
    → enforcement/ (role_filter → phi_audit → approval_pipeline → family_editor → message_lock)
  → linq_gateway.py (send reply)

Files-as-database:
  families/{id}/family.md     — care state (14 sections, ~15K token budget)
  families/{id}/members/*.md  — per-member preferences and context
  families/{id}/routing.json  — phone → member → role → access level

Crons:
  heartbeat.py    — 48hr lookahead, surface upcoming issues
  maintenance.py  — prune logs, validate files, GC
```

### Repo Structure (Key Directories)
```
caresupport-original/
├── AGENTS.md              ← Navigation document (read first)
├── ARCHITECTURE.md        ← System diagram
├── VISION.md              ← Founder's product vision
├── docs/
│   ├── MEMORY.md          ← THIS FILE
│   ├── exec-plans/        ← CTO production plan, tech debt tracker
│   ├── design-docs/       ← Core beliefs, primitive shift, family-md spec
│   ├── references/        ← Linq setup, external research
│   └── prd/               ← 7 PRD documents (system, data, skills, safety, integration, ops, validation)
├── runtime/
│   ├── config.py          ← All paths and settings
│   ├── enforcement/       ← 5 safety modules
│   ├── scripts/           ← Handler, gateway, webhook, crons
│   └── tests/             ← 12 test suites
├── protocols/             ← 16 protocol files (1 master + 4 critical + 10 standard + 2 info)
└── families/              ← Family data (one directory per family)
```
