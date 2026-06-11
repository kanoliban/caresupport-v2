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

const careContactType = v.union(
  v.literal("family"),
  v.literal("professional_caregiver"),
  v.literal("agency"),
  v.literal("clinician"),
  v.literal("other"),
);

const coordinationEventType = v.union(
  v.literal("coverage_gap"),
  v.literal("schedule_change"),
  v.literal("handoff"),
  v.literal("task_followup"),
  v.literal("appointment"),
  v.literal("medication"),
  v.literal("outreach"),
  v.literal("other"),
);

const coordinationEventStatus = v.union(
  v.literal("open"),
  v.literal("waiting"),
  v.literal("resolved"),
  v.literal("cancelled"),
);

const coordinationUrgency = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("urgent"),
);

const outreachAttemptStatus = v.union(
  v.literal("pending_approval"),
  v.literal("approved"),
  v.literal("blocked"),
  v.literal("cancelled"),
  v.literal("sent"),
  v.literal("failed"),
);

const careContactReplyStatus = v.union(
  v.literal("confirmed"),
  v.literal("declined"),
  v.literal("partial"),
  v.literal("deferred"),
  v.literal("wrong_number"),
  v.literal("stop_requested"),
  v.literal("needs_clarification"),
);

const careClaimSubjectType = v.union(
  v.literal("care_recipient"),
  v.literal("care_contact"),
  v.literal("schedule"),
  v.literal("availability"),
  v.literal("relationship"),
  v.literal("role"),
  v.literal("constraint"),
  v.literal("preference"),
  v.literal("coordination_rule"),
  v.literal("other"),
);

const careClaimStatus = v.union(
  v.literal("heard"),
  v.literal("inferred"),
  v.literal("needs_clarification"),
  v.literal("confirmed"),
  v.literal("rejected"),
  v.literal("contradicted"),
  v.literal("superseded"),
  v.literal("archived"),
);

const careClaimConfidence = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

const careClaimSensitivity = v.union(
  v.literal("normal"),
  v.literal("sensitive"),
);

const careClaimPromotionTarget = v.union(
  v.literal("care_contact"),
  v.literal("coordination_event"),
  v.literal("memory_entry"),
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
  v.literal("outreach_requested"),
  v.literal("outreach_approved"),
  v.literal("outreach_blocked"),
  v.literal("outreach_sent"),
  v.literal("outreach_failed"),
  v.literal("care_contact_reply_received"),
  v.literal("calendar_connected"),
  v.literal("calendar_event_created"),
  v.literal("calendar_event_updated"),
  v.literal("calendar_event_deleted"),
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
  outreachAttemptId: v.optional(v.string()),
  coordinationEventId: v.optional(v.string()),
  careContactId: v.optional(v.string()),
  messageBody: v.optional(v.string()),
  status: v.optional(v.string()),
  reason: v.optional(v.string()),
  matchedCount: v.optional(v.number()),
  linqChatId: v.optional(v.string()),
  linqMessageId: v.optional(v.string()),
  calendarEventId: v.optional(v.string()),
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
    // True once the timezone has been established from the user (their stated
    // location, or a client-detected zone) rather than the creation default.
    // While false, the agent asks for location on the first scheduling attempt.
    timezoneConfirmed: v.optional(v.boolean()),
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
    careContactId: v.optional(v.id("careContacts")),
    coordinationEventId: v.optional(v.id("coordinationEvents")),
    outreachAttemptId: v.optional(v.id("outreachAttempts")),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_timestamp", ["careCaseId", "timestamp"])
    .index("by_linq_message_id", ["linqMessageId"])
    .index("by_user", ["userId"])
    .index("by_sender_phone", ["senderPhone"])
    .index("by_care_contact", ["careContactId"])
    .index("by_coordination_event", ["coordinationEventId"])
    .index("by_outreach_attempt", ["outreachAttemptId"]),

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

  careClaims: defineTable({
    careCaseId: v.id("careCases"),
    sourceMessageId: v.id("messages"),
    sourceActorType: messageActorType,
    sourceCareContactId: v.optional(v.id("careContacts")),
    subjectType: careClaimSubjectType,
    subjectLabel: v.string(),
    subjectContactId: v.optional(v.id("careContacts")),
    predicate: v.string(),
    valueText: v.string(),
    normalizedValue: v.optional(v.string()),
    status: careClaimStatus,
    confidence: careClaimConfidence,
    sensitivity: careClaimSensitivity,
    clarificationQuestion: v.optional(v.string()),
    clarifiedByMessageId: v.optional(v.id("messages")),
    confirmedAt: v.optional(v.number()),
    supersededByClaimId: v.optional(v.id("careClaims")),
    promotedToType: v.optional(careClaimPromotionTarget),
    promotedToCareContactId: v.optional(v.id("careContacts")),
    promotedToCoordinationEventId: v.optional(v.id("coordinationEvents")),
    promotedToMemoryEntryId: v.optional(v.id("memoryEntries")),
    promotedAt: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_status", ["careCaseId", "status"])
    .index("by_care_case_subject", ["careCaseId", "subjectType", "subjectLabel"])
    .index("by_source_message", ["sourceMessageId"])
    .index("by_subject_contact", ["subjectContactId"]),

  careContacts: defineTable({
    careCaseId: v.id("careCases"),
    name: v.string(),
    phone: v.optional(v.string()),
    relationship: v.optional(v.string()),
    contactType: careContactType,
    agencyName: v.optional(v.string()),
    role: v.optional(v.string()),
    availabilityNotes: v.optional(v.string()),
    contactPriority: v.optional(v.number()),
    canReceiveTexts: v.boolean(),
    consentToContact: v.optional(v.boolean()),
    linqChatId: v.optional(v.string()),
    active: v.boolean(),
    notes: v.optional(v.string()),
    availabilitySourceMessageId: v.optional(v.id("messages")),
    availabilityUpdatedAt: v.optional(v.number()),
    lastReplyStatus: v.optional(careContactReplyStatus),
    lastReplyMessageId: v.optional(v.id("messages")),
    lastReplyAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_active", ["careCaseId", "active"])
    .index("by_care_case_type", ["careCaseId", "contactType"])
    .index("by_care_case_phone", ["careCaseId", "phone"])
    .index("by_phone", ["phone"])
    .index("by_linq_chat_id", ["linqChatId"]),

  coordinationEvents: defineTable({
    careCaseId: v.id("careCases"),
    type: coordinationEventType,
    title: v.string(),
    status: coordinationEventStatus,
    urgency: coordinationUrgency,
    description: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    scheduleItemId: v.optional(v.id("scheduleItems")),
    originalAssigneeContactId: v.optional(v.id("careContacts")),
    confirmedContactIds: v.optional(v.array(v.id("careContacts"))),
    pendingContactIds: v.optional(v.array(v.id("careContacts"))),
    declinedContactIds: v.optional(v.array(v.id("careContacts"))),
    fallbackOrderContactIds: v.optional(v.array(v.id("careContacts"))),
    nextActionAt: v.optional(v.number()),
    escalationAt: v.optional(v.number()),
    resolution: v.optional(v.string()),
    createdByUserId: v.optional(v.id("users")),
    lastReplyContactId: v.optional(v.id("careContacts")),
    lastReplyMessageId: v.optional(v.id("messages")),
    lastReplyStatus: v.optional(careContactReplyStatus),
    lastReplyAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    closedAt: v.optional(v.number()),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_status", ["careCaseId", "status"])
    .index("by_care_case_type", ["careCaseId", "type"])
    .index("by_care_case_next_action", ["careCaseId", "status", "nextActionAt"]),

  outreachAttempts: defineTable({
    careCaseId: v.id("careCases"),
    coordinationEventId: v.id("coordinationEvents"),
    careContactId: v.id("careContacts"),
    requestedByUserId: v.id("users"),
    approvedByUserId: v.optional(v.id("users")),
    status: outreachAttemptStatus,
    purpose: v.string(),
    messageBody: v.string(),
    approvalPrompt: v.optional(v.string()),
    linqChatId: v.optional(v.string()),
    linqMessageId: v.optional(v.string()),
    nextActionAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    approvedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
  })
    .index("by_care_case", ["careCaseId"])
    .index("by_care_case_status", ["careCaseId", "status"])
    .index("by_linq_chat_id", ["linqChatId"])
    .index("by_care_case_event_status", [
      "careCaseId",
      "coordinationEventId",
      "status",
    ])
    .index("by_care_case_contact_status", [
      "careCaseId",
      "careContactId",
      "status",
    ])
    .index("by_care_case_next_action", ["careCaseId", "status", "nextActionAt"]),

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

  connectedAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scope: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_provider", ["userId", "provider"]),

  waitlistSignups: defineTable({
    email: v.string(),
    phone: v.optional(v.string()),
    fullName: v.optional(v.string()),
    role: v.optional(v.string()),
    source: v.string(),
    userAgent: v.optional(v.string()),
    submittedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_source", ["source"])
    .index("by_submitted_at", ["submittedAt"]),
});
