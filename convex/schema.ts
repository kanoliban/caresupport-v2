import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const familyStatus = v.union(
  v.literal("onboarding"),
  v.literal("active"),
  v.literal("paused"),
  v.literal("archived"),
);

const planTier = v.union(v.literal("free"), v.literal("family"));

const memberRole = v.union(
  v.literal("care_recipient"),
  v.literal("family_caregiver"),
  v.literal("professional_caregiver"),
  v.literal("community_supporter"),
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
  v.literal("shift"),
  v.literal("appointment"),
  v.literal("task"),
  v.literal("ride"),
  v.literal("careTask"),
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

const auditEvent = v.union(
  v.literal("context_load"),
  v.literal("context_updated"),
  v.literal("response_sent"),
  v.literal("response_blocked"),
  v.literal("outreach_sent"),
  v.literal("unknown_number"),
  v.literal("message_failed"),
  v.literal("message_status_update"),
  v.literal("reaction_received"),
  v.literal("participant_changed"),
  v.literal("member_added"),
  v.literal("family_created"),
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
  sentTo: v.optional(v.object({ phone: v.string(), name: v.string() })),
  purpose: v.optional(v.string()),
  phiDisclosed: v.optional(v.boolean()),
  sourceMessageId: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  deliveryStatus: v.optional(v.string()),
  reactionType: v.optional(v.string()),
  participantAction: v.optional(v.string()),
  participantPhone: v.optional(v.string()),
});

const approvalUpdate = v.object({
  section: v.string(),
  operation: v.string(),
  content: v.string(),
  oldContent: v.optional(v.string()),
});

export default defineSchema({
  families: defineTable({
    name: v.string(),
    status: familyStatus,
    timezone: v.string(),
    context: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    familyId: v.optional(v.string()),
    careRecipient: v.optional(v.string()),
    planTier: v.optional(planTier),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  }).index("by_status", ["status"]),

  members: defineTable({
    familyId: v.id("families"),
    phone: v.optional(v.string()),
    name: v.string(),
    role: memberRole,
    accessLevel: accessLevel,
    isCoordinator: v.boolean(),
    isEmergencyContact: v.boolean(),
    active: v.boolean(),
    context: v.optional(v.string()),
    relationship: v.optional(v.string()),
    chatId: v.optional(v.string()),
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
    chatId: v.optional(v.id("chats")),
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
    memberName: v.optional(v.string()),
  })
    .index("by_chat", ["chatId"])
    .index("by_family", ["familyId"])
    .index("by_family_timestamp", ["familyId", "timestamp"])
    .index("by_linq_message_id", ["linqMessageId"])
    .index("by_family_sender_phone", ["familyId", "senderPhone"])
    .index("by_sender_phone", ["senderPhone"]),

  medications: defineTable({
    familyId: v.id("families"),
    name: v.string(),
    dose: v.string(),
    schedule: v.string(),
    prescriber: v.optional(v.string()),
    status: medicationStatus,
    pharmacy: v.optional(v.string()),
    lastConfirmed: v.optional(v.number()),
    refillDue: v.optional(v.string()),
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
    assignedTo: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: scheduleItemStatus,
    day: v.optional(v.string()),
    provider: v.optional(v.string()),
    transport: v.optional(v.string()),
  })
    .index("by_family", ["familyId"])
    .index("by_family_type", ["familyId", "type"])
    .index("by_family_date", ["familyId", "date"]),

  approvals: defineTable({
    familyId: v.id("families"),
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
    familyId: v.optional(v.id("families")),
    event: auditEvent,
    phone: v.optional(v.string()),
    accessLevel: v.optional(v.string()),
    role: v.optional(v.string()),
    details: v.optional(auditDetails),
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
