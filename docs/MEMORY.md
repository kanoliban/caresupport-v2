# MEMORY.md — CareSupport Project Memory

> **Purpose:** This file captures everything a future agent or human needs to continue
> building CareSupport without re-walking paths we've already walked. Slack threads die.
> Agent instances restart. Context windows reset. This file doesn't.
>
> **Rule:** Updated with every significant commit — during, not after.
>
> **Last updated:** 2026-02-25 evening (Self-aware agent refactor: identity externalized, learning system, memory improvement)

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
| CareSupport | `+16504415695` | The agent's Linq number |

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
- **Agent identity confirmed:** Claw. Daemon (Unix: persistent background process; older: guiding spirit). 🐾 *(NOTE: Identity later renamed to "CareSupport" — see 2026-02-25 evening entry)*

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

### 2026-02-25 (Tuesday Evening) — Self-Aware Agent Refactor
- **Claw → CareSupport rename.** All code, logs, data files, and schema renamed. "Claw" and "daemon" references removed from active runtime. SOUL.md rewritten as 30-line runtime-loadable prompt (no longer philosophical — now operational).
- **Identity externalized.** `build_system_context()` gutted — 80-line hardcoded personality block replaced with `SOUL.md` file loading. Agent identity is now editable without code changes.
- **Learning system built.** `runtime/learning/lessons.md` captures corrections from iMessage conversations. Agent emits `self_corrections` in JSON response → handler persists to disk → loaded into every future prompt. Max 20 entries, auto-trimmed.
- **Capability awareness added.** `runtime/learning/capabilities.md` loaded into every prompt. Explicit CAN/CANNOT list prevents hallucinated actions ("I texted them" when it can't).
- **Memory improved.** Conversation history 20 → 50 lines. Member profiles (`members/liban.md`) now loaded into system prompt. Agent can update member profiles via `member_updates` in JSON response.
- **Review tooling.** `runtime/scripts/review_conversations.py` — print recent conversations, manually add lessons via `--add-lesson`.
- **Response schema extended.** `claw_response` → `caresupport_response`. New fields: `self_corrections` (array of strings), `member_updates` (same format as `family_file_updates`).
- **Token budget.** System prompt now ~2.7K tokens: SOUL.md (~225) + capabilities (~125) + lessons (~200) + member context (~100) + dynamic context (~150) + family.md (~1,287) + conversation history (~625).

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
| SMS handler | ✅ | 13-step pipeline with lock, learning, member updates |
| Poll inbound (Linq) | ✅ | Rewritten for Linq |
| Learning system | ✅ | lessons.md + capabilities.md + self_corrections |
| Member profile loading | ✅ | Loaded into prompt, updated via member_updates |
| Review script | ✅ | review_conversations.py (--hours, --add-lesson) |
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
| SOUL.md (CareSupport identity) | ✅ Done | Externalized, runtime-loaded |
| Cold-start family.md | ✅ Done | Kano family initialized |
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
- **Other family members** — Unknown to the system. Will be discovered as Liban introduces them to CareSupport.

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

### "Claw" Agent Identity (DEAD — 2026-02-25)
- **What:** Agent named "Claw" with "daemon" identity. 🐾 signature. Philosophical SOUL.md (157 lines about Unix daemons and quiet grip).
- **Why killed:** Lee rejected the name. The identity was also hardcoded in a Python f-string (sms_handler.py lines 244-325) — SOUL.md existed but was never loaded at runtime. Personality changes required code deploys.
- **Replaced with:** "CareSupport" identity. SOUL.md rewritten as 30-line operational prompt, loaded from disk every message. Editable without code changes.
- **Lesson:** Agent identity belongs in a config file, not in code. And identity names need user buy-in — don't finalize without explicit approval.

### Hardcoded System Prompt (DEAD — 2026-02-25)
- **What:** `build_system_context()` was an 80-line f-string containing personality, voice rules, guidelines, emoji rules, and emotional moment handling — all inline.
- **Why killed:** Made the agent impossible to iterate on. Every personality tweak required editing Python, restarting the process, and hoping nothing broke. Also prevented loading lessons, capabilities, or member context.
- **Replaced with:** Composable prompt assembly. SOUL.md (identity) + capabilities.md (CAN/CANNOT) + lessons.md (corrections) + member context + family file + conversation history — all loaded from disk.
- **Lesson:** System prompts are configuration, not code. Treat them like config files.

### Cloudflare Code Mode Parallel (ACTIVE THINKING)
- **Insight from Lee:** Cloudflare's "thousands of APIs" = the fragmented healthcare ecosystem. Code Mode (agent writes TypeScript against a fixed API surface) could replace bulk protocol loading.
- **CareSupport application:** Protocols become API functions. `care.updateMedication()` internally enforces what medication-management PROTOCOL.md currently describes in text.
- **Status:** Conceptual. Not in current build plan. Relevant for Phase 5+ optimization.

---

## 6. OPEN THREADS

### Immediate (This Sprint)
- [x] **SOUL.md** — Rewritten as 30-line runtime-loadable prompt. Identity = "CareSupport". Loaded from disk every message.
- [x] **Cold-start family.md** — Kano-Tefera family initialized. All "Claw" references updated to "CareSupport".
- [x] **user.md for Liban** — `families/kano/members/liban.md`. Now loaded into system prompt. Agent can update via `member_updates`.
- [ ] **CI workflow** — `.github/workflows/ci.yml` needs manual push (or Lee adds GitHub App `workflows` permission).
- [ ] **Wire end-to-end** — Connect: Linq webhook → webhook_receiver → sms_handler → linq_gateway → reply.
- [ ] **Answer "Hello World"** — The first message. CareSupport's debut.
- [ ] **Test self_corrections with live model** — Verify OpenRouter `strict: true` accepts the extended schema (self_corrections, member_updates fields).

### Near-Term
- [ ] Webhook public endpoint (Cloudflare Workers? ngrok for testing?)
- [ ] Permanent Linq API key (current one is temporary)
- [x] System prompt engineering — SOUL.md externalized, lessons/capabilities/member context loaded dynamically
- [ ] Protocol loading optimization (informed by arxiv paper findings)

### Parallel (Not Blocking)
- [ ] BAA with Linq
- [ ] Dashboard (Tambo generative UI — PR #1 merged, design docs in place)

---

## Appendix: Architecture Quick Reference

```
Inbound message (iMessage via Linq)
  → webhook_receiver.py (HMAC verify, deduplicate, dispatch)
  → sms_handler.py (13-step pipeline):
      1. Resolve phone → family → member
      2. Log inbound
      3. Check approval response (early return)
      4. Load context: family.md + conversations (50 lines) + member profile
      5. Pre-filter by access level
      6. Log PHI access
      7. Build system prompt: SOUL.md + capabilities + lessons + member context + family + history
      8. Generate AI response (OpenRouter, 3 retries)
      9. Post-check for leakage
     10. Apply family_file_updates (with approval gating)
     11. Persist self_corrections → lessons.md
     12. Persist member_updates → members/{name}.md
     13. Log outbound
    → enforcement/ (role_filter → phi_audit → approval_pipeline → family_editor → message_lock)
  → linq_gateway.py (send reply)

System prompt assembly (loaded every message, ~2.7K tokens):
  SOUL.md              — agent identity (~225 tokens)
  capabilities.md      — CAN/CANNOT list (~125 tokens)
  lessons.md           — corrections from past conversations (~200 tokens)
  member profile       — per-person context (~100 tokens)
  family.md (filtered) — care state (~1,287 tokens)
  conversation history — last 50 lines (~625 tokens)

Files-as-database:
  families/{id}/family.md     — care state (14 sections, ~15K token budget)
  families/{id}/members/*.md  — per-member profiles (loaded into prompt, updated by agent)
  families/{id}/routing.json  — phone → member → role → access level
  runtime/learning/lessons.md — accumulated corrections (max 20)
  runtime/learning/capabilities.md — explicit capability boundaries

Crons:
  heartbeat.py    — 48hr lookahead, surface upcoming issues
  maintenance.py  — prune logs, validate files, GC

Review tooling:
  review_conversations.py --hours 24      — print recent conversations
  review_conversations.py --add-lesson "X" — manually inject a lesson
```

### Repo Structure (Key Directories)
```
caresupport-original/
├── AGENTS.md              ← Navigation document (read first)
├── ARCHITECTURE.md        ← System diagram
├── VISION.md              ← Founder's product vision
├── SOUL.md                ← Agent identity (loaded into every prompt at runtime)
├── docs/
│   ├── MEMORY.md          ← THIS FILE
│   ├── exec-plans/        ← CTO production plan, tech debt tracker
│   ├── design-docs/       ← Core beliefs, primitive shift, family-md spec
│   ├── references/        ← Linq setup, external research
│   └── prd/               ← 7 PRD documents (system, data, skills, safety, integration, ops, validation)
├── runtime/
│   ├── config.py          ← All paths and settings (incl. learning paths)
│   ├── enforcement/       ← 5 safety modules
│   ├── learning/          ← Agent learning system
│   │   ├── lessons.md     ← Corrections from conversations (max 20, auto-trimmed)
│   │   └── capabilities.md ← Explicit CAN/CANNOT list
│   ├── scripts/           ← Handler, gateway, webhook, crons, review
│   │   ├── sms_handler.py ← 13-step pipeline (resolve → enforce → AI → persist → learn)
│   │   ├── poll_inbound.py ← Linq polling loop
│   │   └── review_conversations.py ← Conversation review + manual lesson injection
│   └── tests/             ← 12 test suites
├── protocols/             ← 16 protocol files (1 master + 4 critical + 10 standard + 2 info)
└── families/              ← Family data (one directory per family)
    └── {id}/members/*.md  ← Per-member profiles (loaded into prompt, updated by agent)
```
