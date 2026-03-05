import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const familyStatus = v.union(
  v.literal("onboarding"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
);

const memberRole = v.union(
  v.literal("care_recipient"),
  v.literal("family_caregiver"),
  v.literal("professional_caregiver"),
  v.literal("community_supporter"),
);

const accessLevel = v.union(
  v.literal("full"),
  v.literal("standard"),
  v.literal("view_only"),
);

const medicationStatus = v.union(
  v.literal("active"),
  v.literal("held"),
  v.literal("tapering"),
  v.literal("discontinued"),
);

const scheduleItemType = v.union(
  v.literal("shift"),
  v.literal("appointment"),
  v.literal("task"),
  v.literal("ride"),
);

const scheduleItemStatus = v.union(
  v.literal("scheduled"),
  v.literal("completed"),
  v.literal("cancelled"),
);

const messageDirection = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

const deliveryStatus = v.union(
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("read"),
  v.literal("failed"),
);

const approvalStatus = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("expired"),
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

export default defineSchema({
  families: defineTable({
    name: v.string(),
    status: familyStatus,
    timezone: v.string(),
    context: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  members: defineTable({
    familyId: v.id("families"),
    phone: v.string(),
    name: v.string(),
    role: memberRole,
    accessLevel: accessLevel,
    isCoordinator: v.boolean(),
    isEmergencyContact: v.boolean(),
    active: v.boolean(),
    context: v.optional(v.string()),
    relationship: v.optional(v.string()),
  })
    .index("by_family", ["familyId"])
    .index("by_phone", ["phone"])
    .index("by_family_phone", ["familyId", "phone"]),

  chats: defineTable({
    familyId: v.id("families"),
    linqChatId: v.string(),
    isGroup: v.boolean(),
    participants: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_linq_chat_id", ["linqChatId"])
    .index("by_family", ["familyId"]),

  messages: defineTable({
    chatId: v.id("chats"),
    familyId: v.id("families"),
    senderPhone: v.optional(v.string()),
    direction: messageDirection,
    body: v.string(),
    timestamp: v.number(),
    linqMessageId: v.optional(v.string()),
    deliveryStatus: v.optional(deliveryStatus),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_chat", ["chatId"])
    .index("by_family", ["familyId"])
    .index("by_family_timestamp", ["familyId", "timestamp"])
    .index("by_linq_message_id", ["linqMessageId"]),

  medications: defineTable({
    familyId: v.id("families"),
    name: v.string(),
    dose: v.string(),
    schedule: v.string(),
    prescriber: v.optional(v.string()),
    status: medicationStatus,
  })
    .index("by_family", ["familyId"])
    .index("by_family_status", ["familyId", "status"]),

  scheduleItems: defineTable({
    familyId: v.id("families"),
    type: scheduleItemType,
    title: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    endTime: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    assignedTo: v.optional(v.id("members")),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: scheduleItemStatus,
  })
    .index("by_family", ["familyId"])
    .index("by_family_type", ["familyId", "type"])
    .index("by_family_date", ["familyId", "date"]),

  approvals: defineTable({
    familyId: v.id("families"),
    status: approvalStatus,
    requestedBy: v.id("members"),
    description: v.string(),
    changeType: v.string(),
    changePayload: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("members")),
  }).index("by_family_status", ["familyId", "status"]),

  auditLogs: defineTable({
    familyId: v.id("families"),
    event: v.string(),
    phone: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_timestamp", ["familyId", "timestamp"]),

  lessons: defineTable({
    familyId: v.optional(v.id("families")),
    scope: lessonScope,
    category: lessonCategory,
    text: v.string(),
    learnedAt: v.number(),
  })
    .index("by_scope", ["scope"])
    .index("by_family", ["familyId"]),
});
