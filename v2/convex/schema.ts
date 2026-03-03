import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const actorSchema = v.object({
  memberId: v.string(),
  memberName: v.string(),
  role: v.string(),
});

export default defineSchema({
  families: defineTable({
    familyId: v.string(),
    familyName: v.string(),
    careRecipient: v.string(),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("archived")),
    timezone: v.string(),
    notes: v.optional(v.string()),
    currentProjectionVersion: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_family_id", ["familyId"]),

  members: defineTable({
    familyId: v.string(),
    memberId: v.string(),
    name: v.string(),
    role: v.string(),
    relationship: v.string(),
    accessLevel: v.union(v.literal("full"), v.literal("limited")),
    phone: v.string(),
    chatId: v.optional(v.string()),
    memberMarkdown: v.optional(v.string()),
    notes: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_phone", ["phone"])
    .index("by_chat_id", ["chatId"])
    .index("by_family_member", ["familyId", "memberId"]),

  medications: defineTable({
    familyId: v.string(),
    medicationId: v.string(),
    name: v.string(),
    dosage: v.string(),
    instructions: v.string(),
    scheduleRule: v.string(),
    lastTakenAt: v.optional(v.string()),
    nextDueAt: v.optional(v.string()),
    active: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_active", ["familyId", "active"])
    .index("by_family_next_due", ["familyId", "nextDueAt"])
    .index("by_family_medication", ["familyId", "medicationId"]),

  scheduleItems: defineTable({
    familyId: v.string(),
    itemId: v.string(),
    title: v.string(),
    startsAt: v.string(),
    endsAt: v.optional(v.string()),
    recurrence: v.optional(v.string()),
    assignedMemberId: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("cancelled")),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_starts_at", ["familyId", "startsAt"])
    .index("by_family_status", ["familyId", "status"])
    .index("by_family_item", ["familyId", "itemId"]),

  timelineEvents: defineTable({
    familyId: v.string(),
    eventId: v.string(),
    occurredAt: v.string(),
    type: v.string(),
    actor: v.optional(actorSchema),
    sourceMessageId: v.optional(v.string()),
    content: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_family", ["familyId"])
    .index("by_family_occurred_at", ["familyId", "occurredAt"])
    .index("by_event_id", ["eventId"]),

  lessons: defineTable({
    familyId: v.optional(v.string()),
    scope: v.union(v.literal("global"), v.literal("family")),
    category: v.union(v.literal("behavioral"), v.literal("factual"), v.literal("operational")),
    text: v.string(),
    embedding: v.optional(v.array(v.number())),
    embeddingModel: v.optional(v.string()),
    source: v.string(),
    createdAt: v.string(),
  })
    .index("by_scope", ["scope"])
    .index("by_family", ["familyId"])
    .index("by_scope_created_at", ["scope", "createdAt"]),

  protocolVersions: defineTable({
    protocolName: v.string(),
    version: v.string(),
    content: v.string(),
    active: v.boolean(),
    createdAt: v.string(),
  }).index("by_name_version", ["protocolName", "version"]),

  approvals: defineTable({
    familyId: v.string(),
    requestId: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"), v.literal("expired")),
    requestType: v.string(),
    requestedBy: actorSchema,
    payload: v.any(),
    createdAt: v.string(),
    resolvedAt: v.optional(v.string()),
  })
    .index("by_family_status", ["familyId", "status"])
    .index("by_request_id", ["requestId"]),

  auditLogs: defineTable({
    familyId: v.string(),
    sourceMessageId: v.string(),
    actor: actorSchema,
    action: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    reason: v.string(),
    createdAt: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_family_created_at", ["familyId", "createdAt"]),

  conversations: defineTable({
    familyId: v.string(),
    memberId: v.string(),
    direction: v.union(v.literal("INBOUND"), v.literal("OUTBOUND")),
    messageId: v.string(),
    sourceMessageId: v.optional(v.string()),
    chatId: v.optional(v.string()),
    phone: v.string(),
    service: v.string(),
    text: v.string(),
    createdAt: v.string(),
  })
    .index("by_family", ["familyId"])
    .index("by_member", ["memberId"])
    .index("by_phone", ["phone"])
    .index("by_message_id", ["messageId"]),

  outreachJobs: defineTable({
    familyId: v.string(),
    sourceMessageId: v.string(),
    phone: v.string(),
    name: v.string(),
    message: v.string(),
    status: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    attemptCount: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_family", ["familyId"]),

  familyProjections: defineTable({
    familyId: v.string(),
    version: v.number(),
    markdown: v.string(),
    sectionsChecksum: v.string(),
    renderedAt: v.string(),
    renderSource: v.string(),
  })
    .index("by_family_version", ["familyId", "version"])
    .index("by_family_latest", ["familyId", "renderedAt"]),

  familyContextMaterialized: defineTable({
    familyId: v.string(),
    contextText: v.string(),
    recentConversationText: v.string(),
    updatedAt: v.string(),
  }).index("by_family", ["familyId"]),

  importRuns: defineTable({
    importedAt: v.string(),
    counts: v.object({
      family: v.number(),
      member: v.number(),
      conversation: v.number(),
    }),
  }),
});
