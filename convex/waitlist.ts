import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { AUTO_WELCOME_DELAY_MS } from "./welcome";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizePhone(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const stripped = raw.replace(/[^\d+]/g, "");
  const digits = stripped.replace(/\+/g, "");
  if (digits.length < 7) return undefined;
  if (stripped.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return undefined;
}

export const submitSignup = mutation({
  args: {
    email: v.string(),
    phone: v.string(),
    userAgent: v.optional(v.string()),
    referrer: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    landingPath: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!EMAIL_RE.test(email)) {
      throw new Error("Please enter a valid email address.");
    }
    const phone = normalizePhone(args.phone);
    if (!phone) {
      throw new Error("Please enter a valid phone number.");
    }

    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        phone,
        userAgent: args.userAgent ?? existing.userAgent,
        submittedAt: now,
        referrer: args.referrer ?? existing.referrer,
        utmSource: args.utmSource ?? existing.utmSource,
        utmMedium: args.utmMedium ?? existing.utmMedium,
        utmCampaign: args.utmCampaign ?? existing.utmCampaign,
        utmContent: args.utmContent ?? existing.utmContent,
        landingPath: args.landingPath ?? existing.landingPath,
      });
    } else {
      await ctx.db.insert("waitlistSignups", {
        email,
        phone,
        source: "landing-2026-05",
        userAgent: args.userAgent,
        submittedAt: now,
        referrer: args.referrer,
        utmSource: args.utmSource,
        utmMedium: args.utmMedium,
        utmCampaign: args.utmCampaign,
        utmContent: args.utmContent,
        landingPath: args.landingPath,
      });
    }

    // If they never send the "Start with a text" message themselves,
    // CareSupport reaches out first. autoWelcome's guards make this a no-op
    // for anyone who converted, was welcomed, or is already texting.
    await ctx.scheduler.runAfter(
      AUTO_WELCOME_DELAY_MS,
      internal.welcome.autoWelcome,
      { email },
    );

    const rows = await ctx.db.query("waitlistSignups").collect();
    return { ok: true, count: rows.length };
  },
});

export const markConvertedByPhone = internalMutation({
  args: {
    phone: v.string(),
    userId: v.id("users"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const signup = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
    if (!signup || signup.convertedUserId) return { matched: false };
    await ctx.db.patch(signup._id, {
      convertedUserId: args.userId,
      convertedAt: args.timestamp,
    });
    return { matched: true };
  },
});

export const getSignupCount = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("waitlistSignups").collect();
    return rows.length;
  },
});

export const importLegacySignup = internalMutation({
  args: {
    email: v.string(),
    fullName: v.optional(v.string()),
    role: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    submittedAt: v.number(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!EMAIL_RE.test(email)) {
      throw new Error(`Invalid email in legacy import: ${args.email}`);
    }
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (existing) return { ok: true, skipped: true };

    await ctx.db.insert("waitlistSignups", {
      email,
      fullName: args.fullName,
      role: args.role,
      source: args.source,
      userAgent: args.userAgent,
      submittedAt: args.submittedAt,
    });
    return { ok: true, skipped: false };
  },
});

export const deleteByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!existing) return { deleted: false };
    await ctx.db.delete(existing._id);
    return { deleted: true };
  },
});
