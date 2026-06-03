import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { normalizeHandle } from "./lib/handles";

const contactTypeValidator = v.union(
  v.literal("family"),
  v.literal("professional_caregiver"),
  v.literal("agency"),
  v.literal("clinician"),
  v.literal("other"),
);

type ContactType =
  | "family"
  | "professional_caregiver"
  | "agency"
  | "clinician"
  | "other";

interface CareContactPatch {
  name?: string;
  phone?: string;
  relationship?: string;
  contactType?: ContactType;
  agencyName?: string;
  role?: string;
  availabilityNotes?: string;
  contactPriority?: number;
  canReceiveTexts?: boolean;
  consentToContact?: boolean;
  active?: boolean;
  notes?: string;
  updatedAt: number;
}

function normalizeOptionalPhone(raw: string | undefined): string | undefined {
  return normalizeHandle(raw) ?? undefined;
}

export const listByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careContacts")
      .withIndex("by_care_case", (q) => q.eq("careCaseId", args.careCaseId))
      .collect();
  },
});

export const listActiveByCareCase = query({
  args: { careCaseId: v.id("careCases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("careContacts")
      .withIndex("by_care_case_active", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("active", true),
      )
      .collect();
  },
});

export const get = query({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careContacts"),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact || contact.careCaseId !== args.careCaseId) return null;
    return contact;
  },
});

export const getByPhone = query({
  args: {
    careCaseId: v.id("careCases"),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizeOptionalPhone(args.phone) ?? args.phone;
    return await ctx.db
      .query("careContacts")
      .withIndex("by_care_case_phone", (q) =>
        q.eq("careCaseId", args.careCaseId).eq("phone", phone),
      )
      .first();
  },
});

export const create = mutation({
  args: {
    careCaseId: v.id("careCases"),
    name: v.string(),
    phone: v.optional(v.string()),
    relationship: v.optional(v.string()),
    contactType: contactTypeValidator,
    agencyName: v.optional(v.string()),
    role: v.optional(v.string()),
    availabilityNotes: v.optional(v.string()),
    contactPriority: v.optional(v.number()),
    canReceiveTexts: v.optional(v.boolean()),
    consentToContact: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const phone = normalizeOptionalPhone(args.phone);
    const now = Date.now();

    return await ctx.db.insert("careContacts", {
      careCaseId: args.careCaseId,
      name: args.name,
      phone,
      relationship: args.relationship,
      contactType: args.contactType,
      agencyName: args.agencyName,
      role: args.role,
      availabilityNotes: args.availabilityNotes,
      contactPriority: args.contactPriority,
      canReceiveTexts: args.canReceiveTexts ?? Boolean(phone),
      consentToContact: args.consentToContact,
      active: args.active ?? true,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    careCaseId: v.id("careCases"),
    id: v.id("careContacts"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    relationship: v.optional(v.string()),
    contactType: v.optional(contactTypeValidator),
    agencyName: v.optional(v.string()),
    role: v.optional(v.string()),
    availabilityNotes: v.optional(v.string()),
    contactPriority: v.optional(v.number()),
    canReceiveTexts: v.optional(v.boolean()),
    consentToContact: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact || contact.careCaseId !== args.careCaseId) {
      throw new Error("Care contact not found for care case");
    }

    const patch: CareContactPatch = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.phone !== undefined) patch.phone = normalizeOptionalPhone(args.phone);
    if (args.relationship !== undefined) patch.relationship = args.relationship;
    if (args.contactType !== undefined) patch.contactType = args.contactType;
    if (args.agencyName !== undefined) patch.agencyName = args.agencyName;
    if (args.role !== undefined) patch.role = args.role;
    if (args.availabilityNotes !== undefined) {
      patch.availabilityNotes = args.availabilityNotes;
    }
    if (args.contactPriority !== undefined) {
      patch.contactPriority = args.contactPriority;
    }
    if (args.canReceiveTexts !== undefined) {
      patch.canReceiveTexts = args.canReceiveTexts;
    }
    if (args.consentToContact !== undefined) {
      patch.consentToContact = args.consentToContact;
    }
    if (args.active !== undefined) patch.active = args.active;
    if (args.notes !== undefined) patch.notes = args.notes;

    await ctx.db.patch(args.id, patch);
  },
});
