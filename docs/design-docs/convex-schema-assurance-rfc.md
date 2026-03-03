# Convex Schema Assurance RFC (V2 Big-Bang Rebuild)

Date: 2026-03-03  
Status: accepted for implementation

## Objective
Define a CareSupport-native Convex schema that replaces file-backed runtime state with normalized operational tables while preserving human-readable `family.md` projections.

## Design Principles
1. Runtime source of truth is Convex tables.
2. `family.md` remains a projection artifact, persisted with version history.
3. Runtime Node orchestration contract stays stable while Convex contracts version.
4. Compatibility wrappers are temporary and limited to one release window.
5. Migration integrity checks remain first-class release gates.

## Table Mapping From Family Context
1. Family profile and global notes: `families`
2. Member directory and access levels: `members`
3. Medications: `medications`
4. Scheduling: `scheduleItems`
5. Timeline/history: `timelineEvents`
6. Lessons/corrections: `lessons`
7. Protocol content/versioning: `protocolVersions`
8. Approval pipeline state: `approvals`
9. Audit records: `auditLogs`
10. Inbound/outbound messages: `conversations`
11. Outreach queue: `outreachJobs`
12. Markdown projections: `familyProjections`
13. Prompt-ready materialized context: `familyContextMaterialized`
14. Import run bookkeeping: `importRuns`

## Invariants
1. `families.familyId` is unique.
2. `members` lookups are supported by `by_family_member`, `by_phone`, and `by_chat_id`.
3. `conversations.messageId` de-duplication semantics are preserved.
4. `auditLogs` rows are append-only (no edit/delete behavior in app contracts).
5. Every projection render increments `families.currentProjectionVersion`.
6. `familyContextMaterialized` is updated by projection and conversation writes.
7. Import replay is idempotent for conversation archives by event id.

## API Versioning Policy
1. New contracts are exposed as `*_v2` Convex files.
2. Existing files (`families.ts`, `members.ts`, etc.) stay as wrappers to `*_v2`.
3. Node runtime moves to direct `*_v2.js:*` function identifiers.
4. Wrapper removal is deferred until the next release window.

## Migration Gate Requirements
1. Import integrity pass remains required.
2. Replay parity threshold remains required.
3. Perf and rollback checks remain required.
4. Rollback signoff requires distinct V1 and V2 health endpoints.

