# Product Spec: SMS Family Care Coordination

## What It Is

CareSupport is an iMessage/SMS-based family care agent.

The active runtime is a direct thread between CareSupport and one trusted user,
but the product direction is one-to-many coordination around a care situation.
The first thread helps CareSupport learn the care context before it expands into
permissioned multiplayer coordination.

## Who It Is For

The primary user is the person carrying coordination load.

That may be:

- a care recipient coordinating their own care, like Rob
- a family caregiver coordinating for a parent or loved one
- a distributed sibling trying to keep everyone aligned
- eventually a professional caregiver or agency contact participating in a
  bounded coordination event

## Core Promise

The user can text CareSupport to keep care coordination moving:

- remember important care facts
- capture medications, appointments, routines, tasks, and rides
- track unresolved coordination issues
- draft or eventually send permissioned outreach
- push useful status updates
- reduce repeated manual follow-up

## How It Should Feel

CareSupport should feel like one reliable operational thread for care.

It should:

- remember what matters
- make the current state easy to understand
- keep open loops visible
- ask permission before acting outside the current trust boundary
- reduce the number of interactions required to resolve a care need

For Rob, the product should reduce nose-driven status checks and follow-ups.

## Current Runtime Boundary

Today, CareSupport does not yet:

- contact other people
- run a group chat as a coordination workspace
- execute external tool actions
- sync calendars or email
- autonomously resolve coverage gaps

Those are implementation boundaries. They should be treated as future runtime
work, not as evidence that CareSupport is a solo-only product.

## Success

The current phase succeeds when one trusted thread reliably creates value and
captures the care context needed for later coordination.

The next phase succeeds when CareSupport begins closing real coordination loops,
starting with contacts, coordination events, permissioned tools, and coverage-gap
workflows.
