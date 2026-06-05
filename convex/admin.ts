import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { migrateScheduleRow } from "./lib/scheduleBackfill";
import { normalizePhone } from "./mutations";

const robContactOverrideValidator = v.object({
  key: v.string(),
  phone: v.optional(v.string()),
  linqChatId: v.optional(v.string()),
  canReceiveTexts: v.optional(v.boolean()),
});

const ROB_CONTACTS = [
  {
    key: "luann",
    name: "Luann Wudlick",
    relationship: "mom",
    contactType: "family" as const,
    role: "Family, Nurse, PCA",
    availabilityNotes:
      "Fills empty slots, but has dementia. Treat as sensitive family context and confirm with Rob before relying on her for coverage.",
    notes: "Has dementia; do not make autonomous scheduling assumptions.",
    contactPriority: 90,
    defaultCanReceiveTexts: false,
  },
  {
    key: "marta",
    name: "Marta Snow",
    relationship: "sister",
    contactType: "family" as const,
    role: "Family, Scheduler, General Administration, Backup PCA",
    availabilityNotes: "On-call; also helps care for Luann.",
    contactPriority: 20,
    defaultCanReceiveTexts: true,
  },
  {
    key: "jim",
    name: "Jim Nelson",
    relationship: "primary caregiver",
    contactType: "professional_caregiver" as const,
    role: "Nurse",
    availabilityNotes: "Routine coverage Monday-Friday 9am-5pm.",
    contactPriority: 1,
    defaultCanReceiveTexts: true,
  },
  {
    key: "jennifer",
    name: "Jennifer",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "Routine overnight coverage Monday and Tuesday 8pm-8am.",
    contactPriority: 2,
    defaultCanReceiveTexts: true,
  },
  {
    key: "sarah",
    name: "Sarah",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "Routine overnight coverage Wednesday and Thursday 8pm-8am.",
    contactPriority: 3,
    defaultCanReceiveTexts: true,
  },
  {
    key: "ella",
    name: "Ella",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "Routine overnight coverage Friday, Saturday, Sunday 8pm-9am.",
    contactPriority: 4,
    defaultCanReceiveTexts: true,
  },
  {
    key: "alex",
    name: "Alex",
    relationship: "PCA",
    contactType: "professional_caregiver" as const,
    role: "PCA",
    availabilityNotes: "Random availability; clarify before scheduling.",
    contactPriority: 30,
    defaultCanReceiveTexts: true,
  },
  {
    key: "olena",
    name: "Olena",
    relationship: "PCA",
    contactType: "professional_caregiver" as const,
    role: "PCA",
    availabilityNotes: "Routine weekend daytime coverage Saturday and Sunday 9am-1pm.",
    contactPriority: 5,
    defaultCanReceiveTexts: true,
  },
  {
    key: "isabela",
    name: "Isabela",
    relationship: "family",
    contactType: "family" as const,
    role: "Family, PCA",
    availabilityNotes: "On-call.",
    contactPriority: 40,
    defaultCanReceiveTexts: true,
  },
  {
    key: "lucy",
    name: "Lucy",
    relationship: "family",
    contactType: "family" as const,
    role: "PCA, Family",
    availabilityNotes: "On-call.",
    contactPriority: 41,
    defaultCanReceiveTexts: true,
  },
  {
    key: "grace",
    name: "Grace",
    relationship: "overnight caregiver",
    contactType: "professional_caregiver" as const,
    role: "Overnight PCA",
    availabilityNotes: "On summer break; exclude from routine scheduling until Rob confirms.",
    contactPriority: 80,
    defaultCanReceiveTexts: false,
  },
  {
    key: "kathleen",
    name: "Kathleen",
    relationship: "backup caregiver",
    contactType: "professional_caregiver" as const,
    role: "Backup PCA",
    availabilityNotes: "Random on-call backup.",
    contactPriority: 50,
    defaultCanReceiveTexts: true,
  },
  {
    key: "annie",
    name: "Annie",
    relationship: "backup caregiver",
    contactType: "professional_caregiver" as const,
    role: "Backup PCA",
    availabilityNotes: "Random on-call backup.",
    contactPriority: 51,
    defaultCanReceiveTexts: true,
  },
  {
    key: "uncle-jim",
    name: "Uncle Jim",
    relationship: "family",
    contactType: "family" as const,
    role: "Family, Backup PCA",
    availabilityNotes: "On-call backup.",
    contactPriority: 60,
    defaultCanReceiveTexts: true,
  },
  {
    key: "dan",
    name: "Dan",
    relationship: "brother-in-law",
    contactType: "family" as const,
    role: "Family, Backup PCA",
    availabilityNotes: "On-call backup.",
    contactPriority: 61,
    defaultCanReceiveTexts: true,
  },
] as const;

const ROB_SCHEDULE_ITEMS = [
  {
    title: "Jim Nelson coverage",
    time: "09:00",
    endTime: "17:00",
    recurrence: "weekly:mon,tue,wed,thu,fri",
    provider: "Jim Nelson",
    notes: "Routine weekday nurse coverage.",
  },
  {
    title: "Jennifer overnight coverage",
    time: "20:00",
    endTime: "08:00",
    recurrence: "weekly:mon,tue",
    provider: "Jennifer",
    notes: "Routine overnight PCA coverage.",
  },
  {
    title: "Sarah overnight coverage",
    time: "20:00",
    endTime: "08:00",
    recurrence: "weekly:wed,thu",
    provider: "Sarah",
    notes: "Routine overnight PCA coverage.",
  },
  {
    title: "Ella weekend overnight coverage",
    time: "20:00",
    endTime: "09:00",
    recurrence: "weekly:fri,sat,sun",
    provider: "Ella",
    notes: "Routine weekend overnight PCA coverage.",
  },
  {
    title: "Olena weekend daytime coverage",
    time: "09:00",
    endTime: "13:00",
    recurrence: "weekly:sat,sun",
    provider: "Olena",
    notes: "Routine weekend daytime PCA coverage.",
  },
] as const;

function testPhoneForIndex(index: number): string {
  return `+16515558${String(index + 1).padStart(2, "0")}`;
}

function overrideByKey(
  overrides: Array<{
    key: string;
    phone?: string;
    linqChatId?: string;
    canReceiveTexts?: boolean;
  }> | undefined,
  key: string,
) {
  return overrides?.find((override) => override.key === key);
}

function normalizeOptionalFixturePhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return normalizePhone(value) ?? undefined;
}

function contactByName(
  contacts: Array<Doc<"careContacts">>,
  name: string,
): Doc<"careContacts"> | undefined {
  return contacts.find((contact) => contact.name.toLowerCase() === name.toLowerCase());
}

export const listCareCases = internalQuery({
  args: {},
  handler: async (ctx) => {
    const careCases = await ctx.db.query("careCases").collect();

    return Promise.all(
      careCases.map(async (careCase) => {
        const [user, lastMessage] = await Promise.all([
          ctx.db
            .query("users")
            .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
            .first(),
          ctx.db
            .query("messages")
            .withIndex("by_care_case_timestamp", (q) => q.eq("careCaseId", careCase._id))
            .order("desc")
            .first(),
        ]);

        return {
          id: careCase._id,
          title: careCase.title,
          status: careCase.status,
          userName: user?.name ?? null,
          lastMessageAt: lastMessage?.timestamp ?? null,
          createdAt: careCase.createdAt,
        };
      }),
    );
  },
});

export const getCareCaseDetail = internalQuery({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    const careCase = await ctx.db.get(args.careCaseId);
    if (!careCase) return null;

    const [
      user,
      messages,
      memoryEntries,
      careContacts,
      coordinationEvents,
      outreachAttempts,
    ] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .first(),
      ctx.db
        .query("messages")
        .withIndex("by_care_case_timestamp", (q) => q.eq("careCaseId", args.careCaseId))
        .order("desc")
        .take(50),
      ctx.db
        .query("memoryEntries")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("careContacts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("coordinationEvents")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
      ctx.db
        .query("outreachAttempts")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .collect(),
    ]);

    return {
      careCase,
      user,
      recentMessages: messages.reverse(),
      memoryEntries,
      careContacts,
      coordinationEvents,
      outreachAttempts,
    };
  },
});

export const seedRobMultiplayerFixture = internalMutation({
  args: {
    robPhone: v.string(),
    robChatId: v.optional(v.string()),
    useTestContactPhones: v.optional(v.boolean()),
    contactOverrides: v.optional(v.array(robContactOverrideValidator)),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const robPhone = normalizePhone(args.robPhone);
    if (!robPhone) throw new Error("Valid Rob phone is required");

    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", robPhone))
      .first();
    let careCase: Doc<"careCases"> | null = user
      ? await ctx.db.get(user.careCaseId)
      : null;

    if (!user || !careCase) {
      const careCaseId = await ctx.db.insert("careCases", {
        title: "Rob Wudlick care coordination",
        status: "active",
        timezone: "America/Chicago",
        careRecipientName: "Rob Wudlick",
        relationshipToRecipient: "self",
        createdAt: now,
        updatedAt: now,
      });
      const userId = await ctx.db.insert("users", {
        phone: robPhone,
        name: "Rob Wudlick",
        careCaseId,
        status: "active",
        relationshipToRecipient: "self",
        chatId: args.robChatId,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
      careCase = await ctx.db.get(careCaseId);
    } else {
      await ctx.db.patch(user._id, {
        name: "Rob Wudlick",
        relationshipToRecipient: "self",
        status: "active",
        chatId: args.robChatId ?? user.chatId,
        updatedAt: now,
      });
      await ctx.db.patch(careCase._id, {
        title: "Rob Wudlick care coordination",
        status: "active",
        timezone: "America/Chicago",
        careRecipientName: "Rob Wudlick",
        relationshipToRecipient: "self",
        updatedAt: now,
      });
      user = await ctx.db.get(user._id);
      careCase = await ctx.db.get(careCase._id);
    }

    if (!user || !careCase) {
      throw new Error("Unable to create Rob activation fixture");
    }

    const useTestContactPhones = args.useTestContactPhones ?? true;
    const existingContacts = await ctx.db
      .query("careContacts")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .collect();
    const contactIdsByKey = new Map<string, Id<"careContacts">>();

    for (const [index, fixture] of ROB_CONTACTS.entries()) {
      const override = overrideByKey(args.contactOverrides, fixture.key);
      const phone = normalizeOptionalFixturePhone(
        override?.phone ?? (useTestContactPhones ? testPhoneForIndex(index) : undefined),
      );
      const canReceiveTexts =
        override?.canReceiveTexts ?? (fixture.defaultCanReceiveTexts && Boolean(phone));
      const existing = contactByName(existingContacts, fixture.name);
      const patch = {
        phone,
        relationship: fixture.relationship,
        contactType: fixture.contactType,
        role: fixture.role,
        availabilityNotes: fixture.availabilityNotes,
        contactPriority: fixture.contactPriority,
        canReceiveTexts,
        consentToContact: canReceiveTexts,
        linqChatId: override?.linqChatId,
        active: true,
        notes: "notes" in fixture ? fixture.notes : undefined,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, patch);
        contactIdsByKey.set(fixture.key, existing._id);
      } else {
        const contactId = await ctx.db.insert("careContacts", {
          careCaseId: careCase._id,
          name: fixture.name,
          ...patch,
          createdAt: now,
        });
        contactIdsByKey.set(fixture.key, contactId);
      }
    }

    const existingScheduleItems = await ctx.db
      .query("scheduleItems")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .collect();
    let scheduleItemCount = 0;
    for (const item of ROB_SCHEDULE_ITEMS) {
      const existing = existingScheduleItems.find(
        (candidate) => candidate.title === item.title,
      );
      const patch = {
        type: "task" as const,
        time: item.time,
        endTime: item.endTime,
        recurrence: item.recurrence,
        notes: item.notes,
        status: "scheduled" as const,
        provider: item.provider,
      };
      if (existing) {
        await ctx.db.patch(existing._id, patch);
      } else {
        await ctx.db.insert("scheduleItems", {
          careCaseId: careCase._id,
          title: item.title,
          ...patch,
        });
      }
      scheduleItemCount += 1;
    }

    const controlledPendingContactIds = [
      contactIdsByKey.get("jim"),
      contactIdsByKey.get("jennifer"),
    ].filter((id): id is Id<"careContacts"> => Boolean(id));
    const eventTitle = "Rob schedule confirmation controlled test";
    const existingEvents = await ctx.db
      .query("coordinationEvents")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .collect();
    const existingEvent = existingEvents.find((event) => event.title === eventTitle);
    const eventPatch = {
      type: "coverage_gap" as const,
      status: "waiting" as const,
      urgency: "normal" as const,
      description:
        "Controlled multiplayer test: ask known test contacts to confirm schedule availability before using real caregiver numbers.",
      pendingContactIds: controlledPendingContactIds,
      createdByUserId: user._id,
      updatedAt: now,
    };
    const coordinationEventId = existingEvent
      ? existingEvent._id
      : await ctx.db.insert("coordinationEvents", {
          careCaseId: careCase._id,
          title: eventTitle,
          ...eventPatch,
          createdAt: now,
        });
    if (existingEvent) {
      await ctx.db.patch(existingEvent._id, eventPatch);
    }

    const memoryContent =
      "Rob's activation fixture focuses on schedule coordination through CareSupport texting caregivers one-on-one, storing replies in the care graph, and updating Rob conversationally.";
    const existingMemory = await ctx.db
      .query("memoryEntries")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
      .filter((q) => q.eq(q.field("content"), memoryContent))
      .first();
    if (!existingMemory) {
      await ctx.db.insert("memoryEntries", {
        careCaseId: careCase._id,
        userId: user._id,
        scope: "care_case",
        category: "care_note",
        content: memoryContent,
        source: "rob_multiplayer_fixture",
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      careCaseId: careCase._id,
      userId: user._id,
      contactCount: ROB_CONTACTS.length,
      scheduleItemCount,
      coordinationEventId,
      controlledPendingContactIds,
      controlledPendingContactNames: ROB_CONTACTS
        .filter((contact) => contact.key === "jim" || contact.key === "jennifer")
        .map((contact) => contact.name),
    };
  },
});

export const clearAppData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "messages",
      "medications",
      "scheduleItems",
      "memoryEntries",
      "outreachAttempts",
      "coordinationEvents",
      "careContacts",
      "auditLogs",
      "users",
      "careCases",
    ] as const;

    const deleted: Record<string, number> = {};

    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      deleted[table] = rows.length;
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    return deleted;
  },
});

export const tableCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "careCases",
      "users",
      "messages",
      "medications",
      "scheduleItems",
      "memoryEntries",
      "careContacts",
      "coordinationEvents",
      "outreachAttempts",
      "auditLogs",
    ] as const;

    const counts: Record<string, number> = {};
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect();
      counts[table] = rows.length;
    }
    return counts;
  },
});

export const backfillScheduleDates = internalMutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const rows = await ctx.db.query("scheduleItems").collect();

    const report = {
      total: rows.length,
      updated: 0,
      skipped: 0,
      warnings: [] as Array<{ id: string; oldValue: string; reason: string }>,
    };

    for (const row of rows) {
      const result = migrateScheduleRow({
        date: row.date,
        recurrence: row.recurrence,
        notes: row.notes,
        title: row.title,
        _creationTime: row._creationTime,
      });

      if (result.action === "skip") {
        report.skipped += 1;
        continue;
      }

      if (result.action === "warn") {
        report.warnings.push({
          id: row._id,
          oldValue: row.date ?? "",
          reason: result.reason,
        });
        continue;
      }

      report.updated += 1;
      if (!dryRun) {
        await ctx.db.patch(row._id, result.patch);
      }
    }

    return report;
  },
});

export const listActiveCareCasesForDigest = internalQuery({
  args: {},
  handler: async (ctx) => {
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const careCases = await ctx.db.query("careCases").collect();

    const results: Array<{
      careCaseId: Id<"careCases">;
      timezone: string;
      userId: Id<"users">;
      userName: string;
      chatId: string | null;
    }> = [];

    for (const careCase of careCases) {
      if (careCase.status === "archived") continue;

      const user = await ctx.db
        .query("users")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", careCase._id))
        .first();
      if (!user) continue;
      if (!user.chatId) continue;

      const lastInbound = await ctx.db
        .query("messages")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", careCase._id),
        )
        .order("desc")
        .filter((q) => q.eq(q.field("direction"), "inbound"))
        .first();

      if (!lastInbound || lastInbound.timestamp < fourteenDaysAgo) continue;

      results.push({
        careCaseId: careCase._id,
        timezone: careCase.timezone || "UTC",
        userId: user._id,
        userName: user.name,
        chatId: user.chatId,
      });
    }

    return results;
  },
});

export const getCareCaseDigestData = internalQuery({
  args: {
    careCaseId: v.id("careCases"),
    todayLocalIso: v.string(),
    sinceMs: v.number(),
  },
  handler: async (ctx, args) => {
    const [scheduleItems, recentDigestAudits] = await Promise.all([
      ctx.db
        .query("scheduleItems")
        .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
        .filter((q) => q.eq(q.field("status"), "scheduled"))
        .collect(),
      ctx.db
        .query("auditLogs")
        .withIndex("by_care_case_timestamp", (q) =>
          q.eq("careCaseId", args.careCaseId),
        )
        .filter((q) =>
          q.and(
            q.gte(q.field("timestamp"), args.sinceMs),
            q.eq(q.field("event"), "response_sent"),
          ),
        )
        .collect(),
    ]);

    return {
      scheduleItems,
      recentDigestAudits: recentDigestAudits.filter(
        (audit) => audit.details.triggerMessage === "scheduled_digest",
      ),
    };
  },
});

export const getSystemHealth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const recentMessages = await ctx.db
      .query("messages")
      .filter((q) => q.gte(q.field("timestamp"), dayAgo))
      .collect();

    const failures = await ctx.db
      .query("auditLogs")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), dayAgo),
          q.or(
            q.eq(q.field("event"), "message_failed"),
            q.eq(q.field("event"), "response_blocked"),
          ),
        ),
      )
      .collect();

    return {
      messages24h: recentMessages.length,
      inbound24h: recentMessages.filter((m) => m.direction === "inbound").length,
      outbound24h: recentMessages.filter((m) => m.direction === "outbound").length,
      failures24h: failures.length,
    };
  },
});
