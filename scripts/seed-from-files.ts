import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import fs from "node:fs";
import path from "node:path";

const WORKSPACE = path.resolve(
  import.meta.dirname,
  "../fork/workspace",
);
const FAMILY_ID = "kano";
const FAMILY_DIR = path.join(WORKSPACE, "families", FAMILY_ID);

function getConvexUrl(): string {
  const envPath = path.resolve(import.meta.dirname, "../.env.local");
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/^CONVEX_URL=(.+)$/m);
  if (!match) throw new Error("CONVEX_URL not found in .env.local");
  return match[1].trim();
}

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

async function seedFamily(client: ConvexHttpClient) {
  const routingPath = path.join(FAMILY_DIR, "routing.json");
  const routing = JSON.parse(fs.readFileSync(routingPath, "utf-8"));
  const now = Date.now();

  await client.mutation(api.families.create, {
    familyId: routing.family_id,
    familyName: routing.family_id.charAt(0).toUpperCase() + routing.family_id.slice(1),
    careRecipient: routing.care_recipient,
    status: routing.status as "active" | "paused" | "archived",
    timezone: "America/Chicago",
    notes: routing.notes || undefined,
    createdAt: new Date(routing.created).getTime(),
    updatedAt: now,
  });

  console.log(`  Family: ${routing.family_id}`);
  return routing;
}

async function seedMembers(
  client: ConvexHttpClient,
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
    await client.mutation(api.members.create, {
      familyId: FAMILY_ID,
      phone,
      name: member.name,
      role: member.role as
        | "primary_caregiver"
        | "family_caregiver"
        | "community_supporter"
        | "provider",
      accessLevel: member.access_level as
        | "full"
        | "schedule+meds"
        | "schedule"
        | "provider"
        | "limited",
      active: member.active,
      chatId: member.chat_id,
      relationship: member.relationship,
    });
    count++;
  }
  console.log(`  Members: ${count}`);
}

async function seedMedications(client: ConvexHttpClient) {
  const content = fs.readFileSync(
    path.join(FAMILY_DIR, "medications.md"),
    "utf-8",
  );
  const rows = parseMarkdownTableRows(content, "## Active Medications");
  let count = 0;
  for (const row of rows) {
    const [name, dose, schedule, prescriber, pharmacy, lastConfirmed, status, refillDue] = row;
    await client.mutation(api.medications.create, {
      familyId: FAMILY_ID,
      name,
      dose,
      schedule,
      prescriber: prescriber === "—" ? undefined : prescriber,
      pharmacy: pharmacy === "—" ? undefined : pharmacy,
      lastConfirmed: lastConfirmed === "—" ? undefined : lastConfirmed,
      refillDue: refillDue === "—" ? undefined : refillDue,
      status: status as "active" | "held" | "tapering" | "discontinued",
    });
    count++;
  }
  console.log(`  Medications: ${count}`);
}

async function seedScheduleItems(client: ConvexHttpClient) {
  const content = fs.readFileSync(
    path.join(FAMILY_DIR, "schedule.md"),
    "utf-8",
  );
  let count = 0;

  // Rides
  const rideRows = parseMarkdownTableRows(content, "### Rides");
  for (const row of rideRows) {
    const [day, amDriver, pmDriver, notes] = row;
    if (amDriver && amDriver !== "—") {
      await client.mutation(api.scheduleItems.create, {
        familyId: FAMILY_ID,
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
        familyId: FAMILY_ID,
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

  // Care Tasks
  const taskRows = parseMarkdownTableRows(content, "### Care Tasks");
  for (const row of taskRows) {
    const [day, time, task, assigned, notes] = row;
    await client.mutation(api.scheduleItems.create, {
      familyId: FAMILY_ID,
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

  // Appointments
  const apptRows = parseMarkdownTableRows(content, "### Appointments");
  for (const row of apptRows) {
    const [date, time, type, provider, location, transport, notes] = row;
    await client.mutation(api.scheduleItems.create, {
      familyId: FAMILY_ID,
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

async function seedConversations(client: ConvexHttpClient) {
  const convDir = path.join(WORKSPACE, "conversations");
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
        await client.mutation(api.conversations.create, {
          familyId: FAMILY_ID,
          phone,
          direction: parsed.direction,
          body: parsed.body,
          timestamp: parsed.timestamp,
        });
        count++;
      }
    }
  }
  console.log(`  Conversations: ${count}`);
}

async function seedTimelineEvents(client: ConvexHttpClient) {
  const timelineDir = path.join(FAMILY_DIR, "timeline");
  if (!fs.existsSync(timelineDir)) {
    console.log("  Timeline: 0 (no directory)");
    return;
  }
  const logFiles = fs
    .readdirSync(timelineDir)
    .filter((f) => f.endsWith(".log"));
  let count = 0;

  for (const logFile of logFiles) {
    const content = fs.readFileSync(
      path.join(timelineDir, logFile),
      "utf-8",
    );
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      const parsed = parseTimelineLogLine(line);
      if (!parsed) continue;
      await client.mutation(api.timelineEvents.create, {
        familyId: FAMILY_ID,
        timestamp: parsed.timestamp,
        direction: parsed.direction,
        memberName: parsed.memberName,
        body: parsed.body,
      });
      count++;
    }
  }
  console.log(`  Timeline events: ${count}`);
}

async function seedLessons(client: ConvexHttpClient) {
  const lessonsPath = path.resolve(
    import.meta.dirname,
    "../runtime/learning/lessons.md",
  );
  const content = fs.readFileSync(lessonsPath, "utf-8");
  let count = 0;

  for (const line of content.split("\n")) {
    const parsed = parseLessonLine(line);
    if (!parsed) continue;
    await client.mutation(api.lessons.create, {
      familyId: FAMILY_ID,
      scope: "family",
      category: "behavioral",
      text: parsed.text,
      learnedAt: new Date(parsed.date).getTime(),
    });
    count++;
  }
  console.log(`  Lessons: ${count}`);
}

async function seedApprovals(client: ConvexHttpClient) {
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
      familyId: FAMILY_ID,
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
  console.log(`Family: ${FAMILY_ID}`);
  console.log(`Source: ${WORKSPACE}\n`);

  // Check if family already exists
  const existing = await client.query(api.families.getByFamilyId, {
    familyId: FAMILY_ID,
  });
  if (existing) {
    console.log(
      `Family "${FAMILY_ID}" already exists. Use --clean to re-seed.`,
    );
    if (!process.argv.includes("--clean")) {
      process.exit(0);
    }
    console.log("--clean flag detected, proceeding with seed (existing data preserved)...\n");
  }

  const routing = await seedFamily(client);
  await seedMembers(client, routing);
  await seedMedications(client);
  await seedScheduleItems(client);
  await seedConversations(client);
  await seedTimelineEvents(client);
  await seedLessons(client);
  await seedApprovals(client);

  await client.mutation(api.familyContext.seedContext, { familyId: FAMILY_ID });
  console.log("  Family context: materialized");

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
