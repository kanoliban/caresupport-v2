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
});
