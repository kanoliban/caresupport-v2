# Private Beta Coordination Activation Checklist

Status: Phase 2G preparation.

This checklist proves the first multiplayer loop through the normal CareSupport
runtime. It does not seed a Rob-specific fixture. A private-beta coordinator can
use any approved phone number once normal onboarding has created their active
care case.

Architecture reference: `docs/multiplayer-runtime-architecture.md`.

Activation order:

1. Complete normal coordinator onboarding through CareSupport.
2. Have the coordinator add at least one contact and one coordination need in
   conversation.
3. Run read-only preflight against the selected deployment.
4. Ask CareSupport from the coordinator thread to contact the controlled test
   contact.
5. Have the contact reply over text.
6. Run the live verifier.

Do not use real caregiver numbers until controlled test-number outreach passes.
Do not seed production to create a subset user for activation.
Deploy the latest Convex functions before running production preflight; a
running production deployment can still be behind the current code contract.

## Operator Preflight

The preflight reads existing Convex state only. It does not create users,
contacts, schedules, coordination events, dry-run rows, or fixture data.

```bash
COORDINATOR_PHONE="+1REPLACE_WITH_COORDINATOR_PHONE" \
CONTROLLED_CONTACT_NAMES="Angela,Maya" \
COORDINATION_EVENT_TITLE="Wednesday coverage check" \
npm run coordination:preflight
```

Optional:

```bash
COORDINATOR_CHAT_ID="REPLACE_WITH_COORDINATOR_LINQ_CHAT_ID"
CONVEX_DEPLOYMENT_NAME="dev:REPLACE_WITH_DEPLOYMENT"
CONVEX_ENV_FILE=".env.local"
```

For production, use `--prod` or `CONVEX_PROD=true` instead of
`CONVEX_DEPLOYMENT_NAME`:

```bash
COORDINATOR_PHONE="+1REPLACE_WITH_COORDINATOR_PHONE" \
CONTROLLED_CONTACT_NAMES="Angela,Maya" \
COORDINATION_EVENT_TITLE="Wednesday coverage check" \
npm run coordination:preflight -- --prod
```

Preflight passes only when:

- the coordinator user already exists
- the coordinator care case is active
- the coordinator thread has a Linq chat id
- the controlled contact rows already exist
- the controlled contacts are textable and consent is not denied
- an open/waiting coordination event exists
- the controlled contacts are pending on that coordination event

If the coordinator or care graph is missing, complete normal onboarding and
conversation setup first. Do not seed.

## Live Controlled Outreach

Start the test from the coordinator thread, for example:

```text
CareSupport, confirm Angela's Wednesday availability for this care coordination test.
```

Expected behavior:

- CareSupport proposes exact outreach and asks the coordinator for approval.
- The coordinator approves one exact outreach.
- CareSupport texts the selected contact one-on-one.
- The contact replies by text.
- The reply maps to the existing coordinator care case, contact, coordination
  event, and outreach attempt.
- The event's confirmed/pending/declined state updates in Convex.
- The coordinator receives a concise status update.
- No extra primary care case is created for the contact reply.

## Live Verifier

After controlled contact replies arrive, run:

```bash
COORDINATOR_PHONE="+1REPLACE_WITH_COORDINATOR_PHONE" \
CONTROLLED_CONTACT_NAMES="Angela,Maya" \
COORDINATION_EVENT_TITLE="Wednesday coverage check" \
npm run coordination:verify -- --prod
```

The verifier uses `admin:getCoordinationLoopReport` and requires:

- sent outreach evidence
- outbound message evidence
- inbound reply evidence
- event reply-state evidence
- no extra primary care case for the controlled contact phone
- cleared or deferred follow-up clock
- fresh coordinator status message after the latest controlled reply
- request, approval, sent, live reply, and status audit evidence

## Rob Scenario Boundary

Rob remains the launch stress test and simulator case. Rob's network can be used
for regression tests because it exposes real complexity: dementia context,
on-call helpers, overnight coverage, family/professional overlap, and ambiguous
schedule fragments.

Rob is not the activation architecture. Production activation must work for any
private-beta primary coordinator who onboards and builds a care graph through
conversation.
