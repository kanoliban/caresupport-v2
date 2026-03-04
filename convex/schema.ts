import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const familyStatus = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
);

const memberRole = v.union(
  v.literal("primary_caregiver"),
  v.literal("family_caregiver"),
  v.literal("community_supporter"),
  v.literal("provider"),
);

const accessLevel = v.union(
  v.literal("full"),
  v.literal("schedule+meds"),
  v.literal("schedule"),
  v.literal("provider"),
  v.literal("limited"),
);

const medicationStatus = v.union(
  v.literal("active"),
  v.literal("held"),
  v.literal("tapering"),
  v.literal("discontinued"),
);

const scheduleItemType = v.union(
  v.literal("ride"),
  v.literal("careTask"),
  v.literal("appointment"),
);

const scheduleItemStatus = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled"),
);

const messageDirection = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

const lessonScope = v.union(
  v.literal("global"),
  v.literal("family"),
);

const lessonCategory = v.union(
  v.literal("behavioral"),
  v.literal("factual"),
  v.literal("operational"),
);

const approvalStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("expired"),
);

const approvalUpdate = v.object({
  section: v.string(),
  operation: v.string(),
  content: v.string(),
  oldContent: v.string(),
});

const deliveryStatus = v.union(
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
);

const auditEventType = v.union(
  v.literal("context_load"),
  v.literal("response_sent"),
  v.literal("response_blocked"),
  v.literal("outreach_sent"),
  v.literal("unknown_number"),
  v.literal("message_failed"),
  v.literal("message_status_update"),
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
  initiatedBy: v.optional(v.string()),
  sentTo: v.optional(
    v.object({
      phone: v.string(),
      name: v.string(),
    }),
  ),
  purpose: v.optional(v.string()),
  phiDisclosed: v.optional(v.boolean()),
  sourceMessageId: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  deliveryStatus: v.optional(v.string()),
});

export default defineSchema({
  families: defineTable({
    familyId: v.string(),
    familyName: v.string(),
    careRecipient: v.string(),
    status: familyStatus,
    timezone: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_family_id", ["familyId"])
    .index("by_status", ["status"]),

  members: defineTable({
    familyId: v.string(),
    phone: v.string(),
    name: v.string(),
    role: memberRole,
    accessLevel: accessLevel,
    active: v.boolean(),
    chatId: v.optional(v.string()),
    relationship: v.optional(v.string()),
  })
    .index("by_family", ["familyId"])
    .index("by_phone", ["phone"])
    .index("by_chat_id", ["chatId"])
    .index("by_family_member", ["familyId", "phone"]),

  medications: defineTable({
    familyId: v.string(),
    name: v.string(),
    dose: v.string(),
    schedule: v.string(),
    prescriber: v.optional(v.string()),
    pharmacy: v.optional(v.string()),
    lastConfirmed: v.optional(v.string()),
    refillDue: v.optional(v.string()),
    status: medicationStatus,
  })
    .index("by_family", ["familyId"])
    .index("by_family_active", ["familyId", "status"]),

  scheduleItems: defineTable({
    familyId: v.string(),
    type: scheduleItemType,
    title: v.string(),
    day: v.optional(v.string()),
    time: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    provider: v.optional(v.string()),
    location: v.optional(v.string()),
    transport: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: scheduleItemStatus,
  })
    .index("by_family", ["familyId"])
    .index("by_family_type", ["familyId", "type"]),

  conversations: defineTable({
    familyId: v.string(),
    phone: v.string(),
    direction: messageDirection,
    memberName: v.optional(v.string()),
    body: v.string(),
    timestamp: v.number(),
    sourceMessageId: v.optional(v.string()),
    deliveryStatus: v.optional(deliveryStatus),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_family", ["familyId"])
    .index("by_phone", ["phone"])
    .index("by_timestamp", ["timestamp"])
    .index("by_source_message_id", ["sourceMessageId"]),

  timelineEvents: defineTable({
    familyId: v.string(),
    timestamp: v.number(),
    direction: messageDirection,
    memberName: v.string(),
    body: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_timestamp", ["familyId", "timestamp"]),

  lessons: defineTable({
    familyId: v.optional(v.string()),
    scope: lessonScope,
    category: lessonCategory,
    text: v.string(),
    learnedAt: v.number(),
  })
    .index("by_scope", ["scope"])
    .index("by_family", ["familyId"]),

  approvals: defineTable({
    familyId: v.string(),
    status: approvalStatus,
    requesterPhone: v.string(),
    requesterName: v.string(),
    approverPhones: v.array(v.string()),
    description: v.string(),
    update: approvalUpdate,
    createdAt: v.number(),
    expiresAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
  }).index("by_family_status", ["familyId", "status"]),

  auditLogs: defineTable({
    familyId: v.string(),
    event: auditEventType,
    phone: v.string(),
    accessLevel: v.optional(v.string()),
    role: v.optional(v.string()),
    details: auditDetails,
    timestamp: v.number(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_timestamp", ["familyId", "timestamp"]),

  familyContext: defineTable({
    familyId: v.string(),
    contextMarkdown: v.string(),
    updatedAt: v.number(),
  }).index("by_family", ["familyId"]),
});
