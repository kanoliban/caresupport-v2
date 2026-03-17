import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { buildOnboardingContext } from "./lib/promptContent";
import { canAddMember, getEffectiveTier } from "./lib/enforcement/planEnforcement";

const directionValidator = v.union(
  v.literal("inbound"),
  v.literal("outbound"),
);

const eventValidator = v.union(
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

const detailsValidator = v.object({
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

const scopeValidator = v.union(v.literal("global"), v.literal("family"));
const categoryValidator = v.union(
  v.literal("behavioral"),
  v.literal("factual"),
  v.literal("operational"),
);

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("expired"),
);

const updateValidator = v.object({
  section: v.string(),
  operation: v.string(),
  content: v.string(),
  oldContent: v.optional(v.string()),
});

const VALID_ROLES = new Set([
  "care_recipient",
  "family_caregiver",
  "professional_caregiver",
  "community_supporter",
]);

const VALID_ACCESS_LEVELS = new Set([
  "full",
  "schedule+meds",
  "schedule",
  "provider",
  "limited",
]);

export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[^\d+]/g, "");
  const digits = stripped.replace(/\+/g, "");
  if (digits.length < 7) return null;
  if (stripped.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export const createMember = internalMutation({
  args: {
    familyId: v.id("families"),
    phone: v.string(),
    name: v.string(),
    role: v.string(),
    relationship: v.optional(v.string()),
    accessLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    if (!phone) {
      throw new Error(`Cannot normalize phone: ${args.phone}`);
    }

    const existing = await ctx.db
      .query("members")
      .withIndex("by_family_phone", (q) =>
        q.eq("familyId", args.familyId).eq("phone", phone),
      )
      .first();
    if (existing) return existing._id;

    const family = await ctx.db.get(args.familyId);
    if (family) {
      const tier = getEffectiveTier(family.planTier);
      const activeMembers = await ctx.db
        .query("members")
        .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
        .filter((q) => q.eq(q.field("active"), true))
        .collect();
      const check = canAddMember(tier, activeMembers.length);
      if (!check.allowed) {
        throw new Error("PLAN_LIMIT_REACHED");
      }
    }

    const role = VALID_ROLES.has(args.role)
      ? (args.role as "care_recipient" | "family_caregiver" | "professional_caregiver" | "community_supporter")
      : "family_caregiver";
    const accessLevel = args.accessLevel && VALID_ACCESS_LEVELS.has(args.accessLevel)
      ? (args.accessLevel as "full" | "schedule+meds" | "schedule" | "provider" | "limited")
      : "schedule+meds";

    return await ctx.db.insert("members", {
      familyId: args.familyId,
      phone,
      name: args.name,
      role,
      accessLevel,
      isCoordinator: false,
      isEmergencyContact: false,
      active: true,
      relationship: args.relationship,
    });
  },
});

export const logMessage = internalMutation({
  args: {
    familyId: v.id("families"),
    senderPhone: v.optional(v.string()),
    direction: directionValidator,
    memberName: v.optional(v.string()),
    body: v.string(),
    timestamp: v.number(),
    linqMessageId: v.optional(v.string()),
    chatId: v.optional(v.id("chats")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", args);
  },
});

export const logAudit = internalMutation({
  args: {
    familyId: v.optional(v.id("families")),
    event: eventValidator,
    phone: v.string(),
    accessLevel: v.optional(v.string()),
    role: v.optional(v.string()),
    details: detailsValidator,
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", args);
  },
});

export const persistLesson = internalMutation({
  args: {
    familyId: v.optional(v.id("families")),
    scope: scopeValidator,
    category: categoryValidator,
    text: v.string(),
    learnedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("lessons", args);
  },
});

export const createApproval = internalMutation({
  args: {
    familyId: v.id("families"),
    status: statusValidator,
    requesterPhone: v.string(),
    requesterName: v.string(),
    approverPhones: v.array(v.string()),
    description: v.string(),
    update: updateValidator,
    createdAt: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("approvals", args);
  },
});

export const updateMemberChatId = internalMutation({
  args: {
    memberId: v.id("members"),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, { chatId: args.chatId });
  },
});

export const getMemberByPhone = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
  },
});

export const getCoordinators = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();

    return members.flatMap((member) =>
      member.isCoordinator && member.phone ? [member.phone] : [],
    );
  },
});

export const getFamilyContext = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) return null;
    return { context: family.context ?? "[No family context]" };
  },
});

export const getFamilyStructuredContext = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    const [medications, scheduleItems, careTeam, members] = await Promise.all([
      ctx.db
        .query("medications")
        .withIndex("by_family_status", (q) =>
          q.eq("familyId", args.familyId).eq("status", "active"),
        )
        .collect(),
      ctx.db
        .query("scheduleItems")
        .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
        .filter((q) => q.neq(q.field("status"), "cancelled"))
        .collect(),
      ctx.db
        .query("careTeam")
        .withIndex("by_family_active", (q) =>
          q.eq("familyId", args.familyId).eq("active", true),
        )
        .collect(),
      ctx.db
        .query("members")
        .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
        .filter((q) => q.eq(q.field("active"), true))
        .collect(),
    ]);

    const sections: string[] = [];

    if (medications.length > 0) {
      const medLines = medications.map(
        (m) => `- ${m.name} ${m.dose} — ${m.schedule}${m.prescriber ? ` (${m.prescriber})` : ""}`,
      );
      sections.push(`## Medications\n${medLines.join("\n")}`);
    }

    if (scheduleItems.length > 0) {
      const schedLines = scheduleItems.map(
        (s) =>
          `- [${s.type}] ${s.title}${s.date ? ` on ${s.date}` : ""}${s.time ? ` at ${s.time}` : ""}${s.assignedTo ? ` (${s.assignedTo})` : ""}`,
      );
      sections.push(`## Schedule\n${schedLines.join("\n")}`);
    }

    if (careTeam.length > 0) {
      const teamLines = careTeam.map(
        (c) => `- ${c.name} — ${c.role}${c.phone ? ` (${c.phone})` : ""}`,
      );
      sections.push(`## Care Team\n${teamLines.join("\n")}`);
    }

    if (members.length > 0) {
      const memberLines = members.map(
        (m) => `- [${m._id}] ${m.name} (${m.role})${m.phone ? ` — ${m.phone}` : ""}`,
      );
      sections.push(`## Family Members Directory\nUse the ID in brackets for needs_outreach.member_id.\n${memberLines.join("\n")}`);
    }

    return sections.join("\n\n");
  },
});

export const getRecentMessages = internalMutation({
  args: { familyId: v.id("families"), phone: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_family_sender_phone", (q) =>
        q.eq("familyId", args.familyId).eq("senderPhone", args.phone),
      )
      .order("desc")
      .take(args.limit);
  },
});

export const getFamilyRecentMessages = internalMutation({
  args: { familyId: v.id("families"), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_family_timestamp", (q) =>
        q.eq("familyId", args.familyId),
      )
      .order("desc")
      .take(args.limit);
  },
});

export const getFamilyLessons = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lessons")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .collect();
  },
});

export const getPendingApprovals = internalMutation({
  args: { familyId: v.id("families") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("approvals")
      .withIndex("by_family_status", (q) =>
        q.eq("familyId", args.familyId).eq("status", "pending"),
      )
      .collect();
  },
});

export const getMessageByLinqId = internalMutation({
  args: { linqMessageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_linq_message_id", (q) =>
        q.eq("linqMessageId", args.linqMessageId),
      )
      .first();
  },
});

export const updateMessageLinqId = internalMutation({
  args: {
    messageId: v.id("messages"),
    linqMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { linqMessageId: args.linqMessageId });
  },
});

export const getLatestOutboundMessage = internalMutation({
  args: {
    familyId: v.id("families"),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_family_sender_phone", (q) =>
        q.eq("familyId", args.familyId).eq("senderPhone", args.phone),
      )
      .order("desc")
      .first();
  },
});

export const updateMessageStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    deliveryStatus: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { messageId, ...patch } = args;
    await ctx.db.patch(messageId, patch);
  },
});

export const createOnboardingFamily = internalMutation({
  args: {
    phone: v.string(),
    chatId: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    if (!phone) {
      throw new Error(`Cannot normalize phone: ${args.phone}`);
    }

    const existing = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existing) {
      throw new Error(`Phone ${phone} already belongs to a family`);
    }

    const now = Date.now();
    const familyId = await ctx.db.insert("families", {
      name: "New Family",
      status: "onboarding",
      timezone: "America/Chicago",
      context: buildOnboardingContext(phone),
      createdAt: now,
      updatedAt: now,
    });

    const memberId = await ctx.db.insert("members", {
      familyId,
      phone,
      name: "New Member",
      role: "family_caregiver",
      accessLevel: "full",
      isCoordinator: true,
      isEmergencyContact: false,
      active: true,
      chatId: args.chatId,
    });

    return { familyId, memberId };
  },
});

export const updateMemberName = internalMutation({
  args: {
    memberId: v.id("members"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, { name: args.name });
  },
});

export const getMemberById = internalMutation({
  args: { id: v.id("members") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getMemberByName = internalMutation({
  args: { familyId: v.id("families"), name: v.string() },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
    const nameLower = args.name.toLowerCase();
    return members.find((m) => m.name.toLowerCase() === nameLower)
      ?? members.find((m) => m.name.toLowerCase().startsWith(nameLower.split(" ")[0]))
      ?? null;
  },
});


export const createOutreachThread = internalMutation({
  args: {
    familyId: v.id("families"),
    initiatorPhone: v.string(),
    initiatorChatId: v.string(),
    targetPhone: v.string(),
    targetName: v.string(),
    outboundMessageId: v.id("messages"),
    purpose: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("outreachThreads", {
      ...args,
      status: "pending",
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });
  },
});

export const getPendingOutreachForSender = internalMutation({
  args: { targetPhone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("outreachThreads")
      .withIndex("by_target_pending", (q) =>
        q.eq("targetPhone", args.targetPhone).eq("status", "pending"),
      )
      .collect();
  },
});

export const updateOutreachThread = internalMutation({
  args: {
    threadId: v.id("outreachThreads"),
    status: v.union(
      v.literal("pending"),
      v.literal("responded"),
      v.literal("expired"),
      v.literal("closed"),
    ),
    respondedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { threadId, ...patch } = args;
    await ctx.db.patch(threadId, patch);
  },
});

export const getExpiredOutreachThreads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("outreachThreads")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    return pending.filter((t) => t.expiresAt <= now);
  },
});

export const applyContextUpdates = internalMutation({
  args: {
    familyId: v.id("families"),
    updates: v.array(updateValidator),
  },
  handler: async (ctx, args) => {
    const family = await ctx.db.get(args.familyId);
    if (!family) return;

    let context = family.context ?? "";
    for (const upd of args.updates) {
      if (upd.operation === "append") {
        const sectionHeader = `## ${upd.section}`;
        const idx = context.indexOf(sectionHeader);
        if (idx >= 0) {
          const nextSection = context.indexOf("\n## ", idx + 1);
          const insertAt = nextSection >= 0 ? nextSection : context.length;
          context = context.slice(0, insertAt) + "\n" + upd.content + context.slice(insertAt);
        }
      } else if (upd.operation === "prepend") {
        const sectionHeader = `## ${upd.section}`;
        const idx = context.indexOf(sectionHeader);
        if (idx >= 0) {
          const afterHeader = context.indexOf("\n", idx) + 1;
          context = context.slice(0, afterHeader) + upd.content + "\n" + context.slice(afterHeader);
        }
      } else if (upd.operation === "replace" && upd.oldContent) {
        context = context.replace(upd.oldContent, upd.content);
      } else if (upd.operation === "resolve_issue" && upd.oldContent) {
        context = context.replace(upd.oldContent, "");
      }
    }
    await ctx.db.patch(args.familyId, { context: context.trim() });
  },
});

export const upsertMedication = internalMutation({
  args: {
    familyId: v.id("families"),
    action: v.union(v.literal("add"), v.literal("update"), v.literal("remove")),
    name: v.string(),
    dose: v.optional(v.string()),
    schedule: v.optional(v.string()),
    prescriber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("medications")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (args.action === "remove" && existing) {
      await ctx.db.patch(existing._id, { status: "discontinued" });
      return;
    }

    if (existing) {
      const patch: Record<string, string> = {};
      if (args.dose) patch.dose = args.dose;
      if (args.schedule) patch.schedule = args.schedule;
      if (args.prescriber) patch.prescriber = args.prescriber;
      await ctx.db.patch(existing._id, patch);
    } else if (args.action === "add") {
      await ctx.db.insert("medications", {
        familyId: args.familyId,
        name: args.name,
        dose: args.dose ?? "",
        schedule: args.schedule ?? "",
        prescriber: args.prescriber,
        status: "active",
      });
    }
  },
});

export const upsertScheduleItem = internalMutation({
  args: {
    familyId: v.id("families"),
    action: v.union(v.literal("add"), v.literal("update"), v.literal("remove")),
    type: v.union(
      v.literal("shift"),
      v.literal("appointment"),
      v.literal("task"),
      v.literal("ride"),
      v.literal("careTask"),
    ),
    title: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("scheduleItems")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();

    if (args.action === "remove" && existing) {
      await ctx.db.patch(existing._id, { status: "cancelled" });
      return;
    }

    if (existing) {
      const patch: Record<string, string> = {};
      if (args.date) patch.date = args.date;
      if (args.time) patch.time = args.time;
      if (args.assignedTo) patch.assignedTo = args.assignedTo;
      await ctx.db.patch(existing._id, patch);
    } else if (args.action === "add") {
      await ctx.db.insert("scheduleItems", {
        familyId: args.familyId,
        type: args.type,
        title: args.title,
        date: args.date,
        time: args.time,
        assignedTo: args.assignedTo,
        status: "scheduled",
      });
    }
  },
});

export const upsertCareTeamMember = internalMutation({
  args: {
    familyId: v.id("families"),
    action: v.union(v.literal("add"), v.literal("update"), v.literal("remove")),
    name: v.string(),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("careTeam")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (args.action === "remove" && existing) {
      await ctx.db.patch(existing._id, { active: false });
      return;
    }

    if (existing) {
      const patch: Record<string, string> = {};
      if (args.role) patch.role = args.role;
      if (args.phone) patch.phone = args.phone;
      await ctx.db.patch(existing._id, patch);
    } else if (args.action === "add") {
      await ctx.db.insert("careTeam", {
        familyId: args.familyId,
        name: args.name,
        role: args.role ?? "other",
        phone: args.phone,
        active: true,
      });
    }
  },
});
