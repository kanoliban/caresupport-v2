# Agent Routing Layer — Implementation

## Plan
- [x] Step 1: Write `agent_root.md` — master routing entrypoint (~609 tokens)
- [x] Step 2: Write `docs/personality.md` — expanded voice/tone guidance
- [x] Step 3: Write `docs/onboarding.md` — new user flows
- [x] Step 4a: Write `docs/tasks/scheduling.md`
- [x] Step 4b: Write `docs/tasks/checkins.md`
- [x] Step 4c: Write `docs/tasks/escalations.md`
- [x] Step 4d: Write `docs/tasks/medications.md`
- [x] Step 4e: Write `docs/tasks/model_routing.md`
- [x] Step 5a: Add `agent_root` path to `runtime/config.py`
- [x] Step 5b: Load `agent_root.md` in `sms_handler.py` `build_system_context()`
- [x] Step 6: Update `AGENTS.md` routing table + repo map
- [x] Step 7: Verify — syntax OK, config resolves, context loads (~1161 tokens total)

## Notes
- agent_root.md is the only new file loaded into every prompt
- All other docs are referenced by agent_root.md, loaded only when needed
- Code changes: one path property in config.py + 4 lines in sms_handler.py
- No pytest available locally (no venv) — syntax checks + import verification passed
- Total always-loaded context (SOUL + routing + capabilities + lessons): ~1161 tokens
