import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const entityStatus = v.union(
  v.literal("onboarding"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
);

const medicationStatus = v.union(
  v.literal("active"),
  v.literal("held"),
  v.literal("tapering"),
  v.literal("discontinued"),
);

const scheduleItemType = v.union(
  v.literal("appointment"),
  v.literal("task"),
  v.literal("reminder"),
);

const scheduleItemStatus = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("active"),
);

const messageDirection = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

const messageActorType = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);

const deliveryStatus = v.union(
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
);

const memoryScope = v.union(
  v.literal("user"),
  v.literal("care_case"),
);

const memoryCategory = v.union(
  v.literal("profile"),
  v.literal("communication_preference"),
  v.literal("care_preference"),
  v.literal("care_note"),
  v.literal("lesson"),
);

const auditEvent = v.union(
  v.literal("context_load"),
  v.literal("response_sent"),
  v.literal("response_blocked"),
  v.literal("unknown_user"),
  v.literal("message_failed"),
  v.literal("message_status_update"),
  v.literal("reaction_received"),
  v.literal("participant_changed"),
  v.literal("user_created"),
  v.literal("care_case_created"),
  v.literal("user_profile_updated"),
  v.literal("care_case_updated"),
  v.literal("memory_saved"),
  v.literal("memory_archived"),
  v.literal("care_contact_upserted"),
  v.literal("care_contact_archived"),
  v.literal("coordination_event_created"),
  v.literal("coordination_event_updated"),
  v.literal("coordination_event_resolved"),
);

const careContactType = v.union(
  v.literal("family"),
  v.literal("professional_caregiver"),
  v.literal("agency"),
  v.literal("clinician"),
  v.literal("other"),
);

const coordinationEventType = v.union(
  v.literal("coverage_gap"),
  v.literal("confirmation"),
  v.literal("refill"),
  v.literal("followup"),
  v.literal("other"),
);

const coordinationEventStatus = v.union(
  v.literal("drafted"),
  v.literal("awaiting_reply"),
  v.literal("resolved"),
  v.literal("abandoned"),
);

const auditDetails = v.object({
  sectionsLoaded: v.optional(v.array(v.string())),
  triggerMessage: v.optional(v.string()),
  responseLength: v.optional(v.number()),
  leakageCheckPassed: v.optional(v.boolean()),
  leakedCategories: v.optional(v.array(v.string())),
  leakedTerms: v.optional(v.array(v.string())),
  severity: v.optional(v.string()),
  recipientPhone: v.optional(v.string()),
  sourceMessageId: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  deliveryStatus: v.optional(v.string()),
  reactionType: v.optional(v.string()),
  participantAction: v.optional(v.string()),
  participantPhone: v.optional(v.string()),
  savedCategories: v.optional(v.array(v.string())),
  archivedScopes: v.optional(v.array(v.string())),
  careContactName: v.optional(v.string()),
  coordinationEventTitle: v.optional(v.string()),
  coordinationEventStatus: v.optional(v.string()),
  coordinationEventType: v.optional(v.string()),
});

export default defineSchema({
  users: defineTable({
    phone: v.string(),
    name: v.string(),
    careCaseId: v.id("careCases"),
    status: entityStatus,
    relationshipToRecipient: v.optional(v.string()),
    chatId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_care_case", ["careCaseId"]),

  careCases: defineTable({
    title: v.string(),
    status: entityStatus,
    timezone: v.string(),
    careRecipientName: v.optional(v.string()),
    relationshipToRecipient: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  messages: defineTable({
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    senderPhone: v.optional(v.string()),
    actorType: messageActorType,
    direction: messageDirection,
    body: v.string(),
    timestamp: v.number(),
    linqMessageId: v.optional(v.string()),
    deliveryStatus: v.optional(deliveryStatus),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    displayName: v.optional(v.string()),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_timestamp", ["careCaseId", "timestamp"])
    .index("by_linq_message_id", ["linqMessageId"])
    .index("by_user", ["userId"])
    .index("by_sender_phone", ["senderPhone"]),

  medications: defineTable({
    careCaseId: v.id("careCases"),
    name: v.string(),
    dose: v.string(),
    schedule: v.string(),
    prescriber: v.optional(v.string()),
    pharmacy: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: medicationStatus,
    lastConfirmed: v.optional(v.number()),
    refillDue: v.optional(v.string()),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_status", ["careCaseId", "status"]),

  scheduleItems: defineTable({
    careCaseId: v.id("careCases"),
    type: scheduleItemType,
    title: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    endTime: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: scheduleItemStatus,
    provider: v.optional(v.string()),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_type", ["careCaseId", "type"])
    .index("by_care_case_date", ["careCaseId", "date"]),

  memoryEntries: defineTable({
    careCaseId: v.id("careCases"),
    userId: v.id("users"),
    scope: memoryScope,
    category: memoryCategory,
    content: v.string(),
    source: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_scope", ["careCaseId", "scope"])
    .index("by_care_case_scope_category", ["careCaseId", "scope", "category"])
    .index("by_user_scope", ["userId", "scope"]),

  auditLogs: defineTable({
    careCaseId: v.optional(v.id("careCases")),
    userId: v.optional(v.id("users")),
    event: auditEvent,
    phone: v.optional(v.string()),
    details: auditDetails,
    timestamp: v.number(),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_timestamp", ["careCaseId", "timestamp"])
    .index("by_event", ["event"]),

  // V1 multiplayer primitive (M4). Minimal field set — name, phone, role,
  // agency, plus contactType for routing and active for soft-delete. Do not
  // pre-build availability windows or permission state; grow with evidence.
  careContacts: defineTable({
    careCaseId: v.id("careCases"),
    name: v.string(),
    phone: v.optional(v.string()),
    contactType: careContactType,
    role: v.optional(v.string()),
    agencyName: v.optional(v.string()),
    notes: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_active", ["careCaseId", "active"]),

  // V1 coordination primitive (M4). Status set is intentionally narrow
  // (drafted → awaiting_reply → resolved / abandoned). The richer state
  // machine in docs/rob-care-operations-model.md (pending/confirmed/declined
  // contact arrays, escalation timing) is deferred until the first relief
  // loop ships and produces evidence.
  coordinationEvents: defineTable({
    careCaseId: v.id("careCases"),
    createdByUserId: v.id("users"),
    type: coordinationEventType,
    status: coordinationEventStatus,
    title: v.string(),
    description: v.optional(v.string()),
    waitingOnContactId: v.optional(v.id("careContacts")),
    waitingOnName: v.optional(v.string()),
    draftMessage: v.optional(v.string()),
    relatedScheduleItemId: v.optional(v.id("scheduleItems")),
    sourceMessageId: v.optional(v.id("messages")),
    dueAt: v.optional(v.number()),
    resolutionNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_status", ["careCaseId", "status"]),
});
