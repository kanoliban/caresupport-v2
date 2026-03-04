import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getByFamily = query({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("familyContext")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .first();
  },
});

export const materialize = internalMutation({
  args: { familyId: v.string() },
  handler: async (ctx, args) => {
    const { familyId } = args;

    const family = await ctx.db
      .query("families")
      .withIndex("by_family_id", (q) => q.eq("familyId", familyId))
      .first();

    const members = await ctx.db
      .query("members")
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .collect();

    const medications = await ctx.db
      .query("medications")
      .withIndex("by_family_active", (q) =>
        q.eq("familyId", familyId).eq("status", "active"),
      )
      .collect();

    const scheduleItems = await ctx.db
      .query("scheduleItems")
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .collect();

    const parts: string[] = [];

    if (family) {
      parts.push(`# ${family.familyName}`);
      parts.push(`Care Recipient: ${family.careRecipient}`);
      parts.push(`Status: ${family.status}`);
      if (family.notes) parts.push(`Notes: ${family.notes}`);
      parts.push("");
    }

    if (members.length > 0) {
      parts.push("## Care Team\n");
      parts.push("| Role | Name | Phone | Access Level | Active |");
      parts.push("|---|---|---|---|---|");
      for (const m of members) {
        parts.push(
          `| ${m.role} | ${m.name} | ${m.phone} | ${m.accessLevel} | ${m.active ? "yes" : "no"} |`,
        );
      }
      parts.push("");
    }

    if (medications.length > 0) {
      parts.push("## Active Medications\n");
      parts.push(
        "| Medication | Dose | Schedule | Prescriber | Pharmacy | Status | Refill Due |",
      );
      parts.push("|---|---|---|---|---|---|---|");
      for (const med of medications) {
        parts.push(
          `| ${med.name} | ${med.dose} | ${med.schedule} | ${med.prescriber ?? "—"} | ${med.pharmacy ?? "—"} | ${med.status} | ${med.refillDue ?? "—"} |`,
        );
      }
      parts.push("");
    }

    const rides = scheduleItems.filter((s) => s.type === "ride");
    const careTasks = scheduleItems.filter((s) => s.type === "careTask");
    const appointments = scheduleItems.filter((s) => s.type === "appointment");

    if (rides.length > 0) {
      parts.push("## Rides\n");
      parts.push("| Day | Time | Assigned | Notes |");
      parts.push("|---|---|---|---|");
      for (const r of rides) {
        parts.push(
          `| ${r.day ?? "—"} | ${r.time ?? "—"} | ${r.assignedTo ?? "—"} | ${r.notes ?? ""} |`,
        );
      }
      parts.push("");
    }

    if (careTasks.length > 0) {
      parts.push("## Care Tasks\n");
      parts.push("| Day | Time | Task | Assigned | Notes |");
      parts.push("|---|---|---|---|---|");
      for (const t of careTasks) {
        parts.push(
          `| ${t.day ?? "—"} | ${t.time ?? "—"} | ${t.title} | ${t.assignedTo ?? "—"} | ${t.notes ?? ""} |`,
        );
      }
      parts.push("");
    }

    if (appointments.length > 0) {
      parts.push("## Appointments\n");
      parts.push(
        "| Date | Time | Type | Provider | Location | Transport | Notes |",
      );
      parts.push("|---|---|---|---|---|---|---|");
      for (const a of appointments) {
        parts.push(
          `| ${a.day ?? "—"} | ${a.time ?? "—"} | ${a.title} | ${a.provider ?? "—"} | ${a.location ?? "—"} | ${a.transport ?? "—"} | ${a.notes ?? ""} |`,
        );
      }
      parts.push("");
    }

    const contextMarkdown = parts.join("\n");
    const now = Date.now();

    const existing = await ctx.db
      .query("familyContext")
      .withIndex("by_family", (q) => q.eq("familyId", familyId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { contextMarkdown, updatedAt: now });
    } else {
      await ctx.db.insert("familyContext", {
        familyId,
        contextMarkdown,
        updatedAt: now,
      });
    }
  },
});
