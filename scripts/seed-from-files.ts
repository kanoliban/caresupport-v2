import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import type { Id } from "../convex/_generated/dataModel.js";
import fs from "node:fs";
import path from "node:path";

const WORKSPACE = path.resolve(
  import.meta.dirname,
  "../fork/workspace",
);
const FAMILY_DIR_NAME = "kano";
const FAMILY_DIR = path.join(WORKSPACE, "families", FAMILY_DIR_NAME);

function getConvexUrl(): string {
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  const envPath = path.resolve(import.meta.dirname, "../.env.local");
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/^CONVEX_URL=(.+)$/m);
  if (!match) throw new Error("CONVEX_URL not found in .env.local");
  return match[1].trim();
}

const ROLE_MAP: Record<string, "care_recipient" | "family_caregiver" | "professional_caregiver" | "community_supporter"> = {
  primary_caregiver: "family_caregiver",
  care_recipient: "care_recipient",
  family_caregiver: "family_caregiver",
  professional_caregiver: "professional_caregiver",
  community_supporter: "community_supporter",
  provider: "professional_caregiver",
};

const VALID_ACCESS_LEVELS = new Set(["full", "schedule+meds", "schedule", "provider", "limited"]);
type AccessLevel = "full" | "schedule+meds" | "schedule" | "provider" | "limited";

// --- Parsers ---

export function parseMarkdownTableRows(
  content: string,
  startAfter: string,
): string[][] {
  const lines = content.split("\n");
  let started = false;
  let pastSeparator = false;
  const rows: string[][] = [];
  for (const line of lines) {
    if (!started) {
      if (line.includes(startAfter)) started = true;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      if (rows.length > 0) break;
      continue;
    }
    if (trimmed.includes("---|")) {
      pastSeparator = true;
      continue;
    }
    if (!pastSeparator) continue;
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

export function parseTimelineLogLine(
  line: string,
): {
  timestamp: number;
  direction: "inbound" | "outbound";
  memberName: string;
  body: string;
} | null {
  const match = line.match(
    /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC\] \[(INBOUND|OUTBOUND)\] \[(.+?)\] (.+)$/s,
  );
  if (!match) return null;
  return {
    timestamp: new Date(match[1] + "Z").getTime(),
    direction: match[2].toLowerCase() as "inbound" | "outbound",
    memberName: match[3],
    body: match[4],
  };
}

export function parseConversationLogLine(
  line: string,
): {
  timestamp: number;
  direction: "inbound" | "outbound";
  body: string;
} | null {
  const match = line.match(
    /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC\] \[(INBOUND|OUTBOUND)\] (.+)$/s,
  );
  if (!match) return null;
  return {
    timestamp: new Date(match[1] + "Z").getTime(),
    direction: match[2].toLowerCase() as "inbound" | "outbound",
    body: match[3],
  };
}

export function parseLessonLine(
  line: string,
): { date: string; text: string } | null {
  const match = line.match(/^- \[(\d{4}-\d{2}-\d{2})\] (.+)$/);
  if (!match) return null;
  return { date: match[1], text: match[2] };
}

// --- Seed functions ---

async function seedFamily(client: ConvexHttpClient): Promise<{ familyId: Id<"families">; routing: Record<string, unknown> }> {
  const routingPath = path.join(FAMILY_DIR, "routing.json");
  const routing = JSON.parse(fs.readFileSync(routingPath, "utf-8"));
  const now = Date.now();

  const familyMdPath = path.join(FAMILY_DIR, "family.md");
  const context = fs.existsSync(familyMdPath)
    ? fs.readFileSync(familyMdPath, "utf-8")
    : undefined;

  const familyId = await client.mutation(api.families.create, {
    name: routing.family_id.charAt(0).toUpperCase() + routing.family_id.slice(1),
    careRecipient: routing.care_recipient,
    status: routing.status === "active" ? "active" as const : "onboarding" as const,
    timezone: "America/Chicago",
    createdAt: new Date(routing.created).getTime(),
    updatedAt: now,
    familyId: routing.family_id,
    context,
  });

  console.log(`  Family: ${routing.family_id} (id: ${familyId})`);
  return { familyId, routing };
}

async function seedMembers(
  client: ConvexHttpClient,
  familyId: Id<"families">,
  routing: Record<string, unknown>,
) {
  const members = routing.members as Record<
    string,
    {
      name: string;
      role: string;
      access_level: string;
      active: boolean;
      chat_id?: string;
      relationship?: string;
    }
  >;

  let count = 0;
  for (const [phone, member] of Object.entries(members)) {
    const originalRole = member.role;
    const role = ROLE_MAP[originalRole] ?? "community_supporter";
    const accessLevel: AccessLevel = VALID_ACCESS_LEVELS.has(member.access_level)
      ? (member.access_level as AccessLevel)
      : "limited";

    await client.mutation(api.members.create, {
      familyId,
      phone,
      name: member.name,
      role,
      accessLevel,
      isCoordinator: originalRole === "primary_caregiver",
      isEmergencyContact: role === "family_caregiver",
      active: member.active,
      chatId: member.chat_id,
      relationship: member.relationship,
    });
    count++;
  }

  // Add care recipient as a member (may not have a phone)
  const careRecipientName = routing.care_recipient as string | undefined;
  if (careRecipientName) {
    await client.mutation(api.members.create, {
      familyId,
      name: careRecipientName,
      role: "care_recipient",
      accessLevel: "full",
      isCoordinator: false,
      isEmergencyContact: false,
      active: true,
    });
    count++;
  }

  console.log(`  Members: ${count}`);
}

async function seedMedications(client: ConvexHttpClient, familyId: Id<"families">) {
  const content = fs.readFileSync(
    path.join(FAMILY_DIR, "medications.md"),
    "utf-8",
  );
  const rows = parseMarkdownTableRows(content, "## Active Medications");
  let count = 0;
  for (const row of rows) {
    const [name, dose, schedule, prescriber, pharmacy, lastConfirmed, status, refillDue] = row;
    await client.mutation(api.medications.create, {
      familyId,
      name,
      dose,
      schedule,
      prescriber: prescriber === "—" ? undefined : prescriber,
      pharmacy: pharmacy === "—" ? undefined : pharmacy,
      lastConfirmed: lastConfirmed && lastConfirmed !== "—"
        ? new Date(lastConfirmed).getTime()
        : undefined,
      refillDue: refillDue === "—" ? undefined : refillDue,
      status: (status as "active" | "held" | "tapering" | "discontinued") ?? "active",
    });
    count++;
  }
  console.log(`  Medications: ${count}`);
}

async function seedScheduleItems(client: ConvexHttpClient, familyId: Id<"families">) {
  const content = fs.readFileSync(
    path.join(FAMILY_DIR, "schedule.md"),
    "utf-8",
  );
  let count = 0;

  const rideRows = parseMarkdownTableRows(content, "### Rides");
  for (const row of rideRows) {
    const [day, amDriver, pmDriver, notes] = row;
    if (amDriver && amDriver !== "—") {
      await client.mutation(api.scheduleItems.create, {
        familyId,
        type: "ride",
        title: "AM ride to work",
        day,
        time: "7:30 AM",
        assignedTo: amDriver,
        notes: notes || undefined,
        status: "active",
      });
      count++;
    }
    if (pmDriver && pmDriver !== "—") {
      await client.mutation(api.scheduleItems.create, {
        familyId,
        type: "ride",
        title: "PM ride from work",
        day,
        time: "4:30 PM",
        assignedTo: pmDriver,
        notes: notes || undefined,
        status: "active",
      });
      count++;
    }
  }

  const taskRows = parseMarkdownTableRows(content, "### Care Tasks");
  for (const row of taskRows) {
    const [day, time, task, assigned, notes] = row;
    await client.mutation(api.scheduleItems.create, {
      familyId,
      type: "careTask",
      title: task,
      day,
      time,
      assignedTo: assigned,
      notes: notes || undefined,
      status: "active",
    });
    count++;
  }

  const apptRows = parseMarkdownTableRows(content, "### Appointments");
  for (const row of apptRows) {
    const [date, time, type, provider, location, transport, notes] = row;
    await client.mutation(api.scheduleItems.create, {
      familyId,
      type: "appointment",
      title: type,
      day: date,
      time,
      provider,
      location,
      transport,
      notes: notes || undefined,
      status: "active",
    });
    count++;
  }

  console.log(`  Schedule items: ${count}`);
}

async function seedMessages(client: ConvexHttpClient, familyId: Id<"families">) {
  const convDir = path.join(WORKSPACE, "conversations");
  if (!fs.existsSync(convDir)) {
    console.log("  Messages: 0 (no directory)");
    return;
  }
  const phoneDirs = fs
    .readdirSync(convDir)
    .filter((d) => d.startsWith("+"));
  let count = 0;

  for (const phoneDir of phoneDirs) {
    const phone = phoneDir;
    const logFiles = fs
      .readdirSync(path.join(convDir, phoneDir))
      .filter((f) => f.endsWith(".log"));

    for (const logFile of logFiles) {
      const content = fs.readFileSync(
        path.join(convDir, phoneDir, logFile),
        "utf-8",
      );
      for (const line of content.split("\n")) {
        if (!line.trim()) continue;
        const parsed = parseConversationLogLine(line);
        if (!parsed) continue;
        await client.mutation(api.messages.create, {
          familyId,
          senderPhone: phone,
          direction: parsed.direction,
          body: parsed.body,
          timestamp: parsed.timestamp,
        });
        count++;
      }
    }
  }
  console.log(`  Messages: ${count}`);
}

async function seedLessons(client: ConvexHttpClient, familyId: Id<"families">) {
  const lessonsPath = path.resolve(
    import.meta.dirname,
    "../runtime/learning/lessons.md",
  );
  if (!fs.existsSync(lessonsPath)) {
    console.log("  Lessons: 0 (no file)");
    return;
  }
  const content = fs.readFileSync(lessonsPath, "utf-8");
  let count = 0;

  for (const line of content.split("\n")) {
    const parsed = parseLessonLine(line);
    if (!parsed) continue;
    await client.mutation(api.lessons.create, {
      familyId,
      scope: "family",
      category: "behavioral",
      text: parsed.text,
      learnedAt: new Date(parsed.date).getTime(),
    });
    count++;
  }
  console.log(`  Lessons: ${count}`);
}

async function seedApprovals(client: ConvexHttpClient, familyId: Id<"families">) {
  const approvalsPath = path.join(FAMILY_DIR, "pending_approvals.json");
  if (!fs.existsSync(approvalsPath)) {
    console.log("  Approvals: 0 (no file)");
    return;
  }
  const data = JSON.parse(fs.readFileSync(approvalsPath, "utf-8"));
  const pending = data.pending || [];
  let count = 0;

  for (const approval of pending) {
    await client.mutation(api.approvals.create, {
      familyId,
      status: approval.status as "pending" | "approved" | "rejected" | "expired",
      requesterPhone: approval.requester_phone,
      requesterName: approval.requester_name,
      approverPhones: approval.approver_phones,
      description: approval.description,
      update: {
        section: approval.update.section,
        operation: approval.update.operation,
        content: approval.update.content,
        oldContent: approval.update.old_content,
      },
      createdAt: new Date(approval.created_at).getTime(),
      expiresAt: new Date(approval.expires_at).getTime(),
      resolvedAt: approval.resolved_at
        ? new Date(approval.resolved_at).getTime()
        : undefined,
      resolvedBy: approval.resolved_by || undefined,
    });
    count++;
  }
  console.log(`  Approvals: ${count}`);
}

// --- Main ---

async function main() {
  const url = getConvexUrl();
  const client = new ConvexHttpClient(url);

  console.log(`Seeding Convex at ${url}...`);
  console.log(`Family: ${FAMILY_DIR_NAME}`);
  console.log(`Source: ${WORKSPACE}\n`);

  const { familyId, routing } = await seedFamily(client);
  await seedMembers(client, familyId, routing);
  await seedMedications(client, familyId);
  await seedScheduleItems(client, familyId);
  await seedMessages(client, familyId);
  await seedLessons(client, familyId);
  await seedApprovals(client, familyId);

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
