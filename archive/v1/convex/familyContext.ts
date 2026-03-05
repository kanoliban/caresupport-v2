import { query, mutation, internalMutation } from "./_generated/server";
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function applySectionUpdate(
  markdown: string,
  section: string,
  operation: string,
  content: string,
  oldContent: string,
): string {
  const sectionPattern = new RegExp(`^## ${escapeRegex(section)}\\b`, "m");
  const match = sectionPattern.exec(markdown);

  if (!match) {
    if (operation === "append" || operation === "prepend") {
      return markdown.trimEnd() + `\n\n## ${section}\n\n${content}\n`;
    }
    return markdown;
  }

  const sectionStart = match.index;
  const headerEnd = markdown.indexOf("\n", sectionStart);
  const nextSection = markdown.indexOf("\n## ", headerEnd);
  const sectionEnd = nextSection >= 0 ? nextSection : markdown.length;
  const sectionBody = markdown.slice(headerEnd, sectionEnd);

  let newBody: string;
  switch (operation) {
    case "append":
      newBody = sectionBody.trimEnd() + "\n" + content + "\n";
      break;
    case "prepend":
      newBody = "\n" + content + sectionBody;
      break;
    case "replace":
      if (oldContent && sectionBody.includes(oldContent)) {
        newBody = sectionBody.replace(oldContent, content);
      } else {
        newBody = sectionBody;
      }
      break;
    default:
      newBody = sectionBody;
  }

  return markdown.slice(0, headerEnd) + newBody + markdown.slice(sectionEnd);
}

export const applyContextUpdates = internalMutation({
  args: {
    familyId: v.string(),
    updates: v.array(
      v.object({
        section: v.string(),
        operation: v.string(),
        content: v.string(),
        oldContent: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("familyContext")
      .withIndex("by_family", (q) => q.eq("familyId", args.familyId))
      .first();

    if (!existing) return { applied: 0 };

    let md = existing.contextMarkdown;
    let applied = 0;
    for (const u of args.updates) {
      const before = md;
      md = applySectionUpdate(md, u.section, u.operation, u.content, u.oldContent);
      if (md !== before) applied++;
    }

    if (applied > 0) {
      await ctx.db.patch(existing._id, {
        contextMarkdown: md,
        updatedAt: Date.now(),
      });
    }

    return { applied };
  },
});

export const seedContext = mutation({
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
