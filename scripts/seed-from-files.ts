import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import type { Id } from "../convex/_generated/dataModel.js";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const WORKSPACE = path.resolve(import.meta.dirname, "../fork/workspace");
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

type RoutingData = {
  family_id: string;
  care_recipient?: string;
  status: string;
  created: string;
  members: Record<
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
};

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
      .map((cell) => cell.trim())
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
    timestamp: new Date(`${match[1]}Z`).getTime(),
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
    timestamp: new Date(`${match[1]}Z`).getTime(),
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

function loadRouting(): RoutingData {
  const routingPath = path.join(FAMILY_DIR, "routing.json");
  return JSON.parse(fs.readFileSync(routingPath, "utf-8")) as RoutingData;
}

function pickPrimaryUser(routing: RoutingData): {
  phone: string;
  name: string;
  relationship?: string;
  chatId?: string;
} {
  const members = Object.entries(routing.members);
  const primary =
    members.find(([, member]) => member.role === "primary_caregiver" && member.active) ??
    members.find(([, member]) => member.active) ??
    members[0];

  if (!primary) {
    throw new Error("No members found in routing.json");
  }

  const [phone, member] = primary;
  return {
    phone,
    name: member.name,
    relationship: member.relationship,
    chatId: member.chat_id,
  };
}

async function seedCareCaseAndUser(
  client: ConvexHttpClient,
): Promise<{ careCaseId: Id<"careCases">; userId: Id<"users">; userPhone: string; userName: string }> {
  const routing = loadRouting();
  const primary = pickPrimaryUser(routing);
  const now = Date.now();

  const careCaseId = await client.mutation(api.careCases.create, {
    title: `${primary.name} caring for ${routing.care_recipient ?? "their loved one"}`,
    status: routing.status === "active" ? "active" : "onboarding",
    timezone: "America/Chicago",
    careRecipientName: routing.care_recipient,
    relationshipToRecipient: primary.relationship,
    createdAt: new Date(routing.created).getTime(),
    updatedAt: now,
  });

  const userId = await client.mutation(api.users.create, {
    phone: primary.phone,
    name: primary.name,
    careCaseId,
    status: routing.status === "active" ? "active" : "onboarding",
    relationshipToRecipient: primary.relationship,
    chatId: primary.chatId,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`  Care case: ${careCaseId}`);
  console.log(`  User: ${primary.name} (${primary.phone})`);

  return {
    careCaseId,
    userId,
    userPhone: primary.phone,
    userName: primary.name,
  };
}

async function seedMedications(
  client: ConvexHttpClient,
  careCaseId: Id<"careCases">,
) {
  const content = fs.readFileSync(path.join(FAMILY_DIR, "medications.md"), "utf-8");
  const rows = parseMarkdownTableRows(content, "## Active Medications");
  let count = 0;

  for (const row of rows) {
    const [name, dose, schedule, prescriber, pharmacy, lastConfirmed, status, refillDue] = row;
    await client.mutation(api.medications.create, {
      careCaseId,
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

const WEEKDAY_SHORT_BY_NAME: Record<string, string> = {
  sun: "sun",
  sunday: "sun",
  mon: "mon",
  monday: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  wed: "wed",
  wednesday: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  fri: "fri",
  friday: "fri",
  sat: "sat",
  saturday: "sat",
};

export function dayNameToWeeklyRecurrence(raw: string): string {
  const key = raw.trim().toLowerCase();
  const short = WEEKDAY_SHORT_BY_NAME[key];
  if (!short) {
    throw new Error(`Cannot convert day name "${raw}" to weekly recurrence.`);
  }
  return `weekly:${short}`;
}

export function time12hTo24h(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  // Already 24-hour HH:MM — pass through.
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/);
  if (!match) {
    throw new Error(`Cannot convert time "${raw}" to 24-hour HH:MM.`);
  }
  const hour12 = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const isPm = match[3].toLowerCase() === "p";
  if (hour12 < 1 || hour12 > 12 || minute > 59) {
    throw new Error(`Invalid 12-hour time "${raw}".`);
  }
  let hour24 = hour12 % 12;
  if (isPm) hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

async function seedScheduleItems(
  client: ConvexHttpClient,
  careCaseId: Id<"careCases">,
) {
  const content = fs.readFileSync(path.join(FAMILY_DIR, "schedule.md"), "utf-8");
  let count = 0;

  const rideRows = parseMarkdownTableRows(content, "### Rides");
  for (const row of rideRows) {
    const [day, amDriver, pmDriver, notes] = row;
    const recurrence = dayNameToWeeklyRecurrence(day);
    if (amDriver && amDriver !== "—") {
      await client.mutation(api.scheduleItems.create, {
        careCaseId,
        type: "task",
        title: "AM ride to work",
        recurrence,
        time: time12hTo24h("7:30 AM"),
        notes: notes || undefined,
        status: "active",
      });
      count++;
    }
    if (pmDriver && pmDriver !== "—") {
      await client.mutation(api.scheduleItems.create, {
        careCaseId,
        type: "task",
        title: "PM ride from work",
        recurrence,
        time: time12hTo24h("4:30 PM"),
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
      careCaseId,
      type: "reminder",
      title: `${task}${assigned ? ` (${assigned})` : ""}`,
      recurrence: dayNameToWeeklyRecurrence(day),
      time: time12hTo24h(time),
      notes: notes || undefined,
      status: "active",
    });
    count++;
  }

  const appointmentRows = parseMarkdownTableRows(content, "### Appointments");
  for (const row of appointmentRows) {
    const [date, time, type, provider, location, transport, notes] = row;
    const noteParts = [transport, notes].filter((value) => value && value !== "—");
    await client.mutation(api.scheduleItems.create, {
      careCaseId,
      type: "appointment",
      title: type,
      date,
      time: time12hTo24h(time),
      provider: provider === "—" ? undefined : provider,
      location: location === "—" ? undefined : location,
      notes: noteParts.length > 0 ? noteParts.join(" | ") : undefined,
      status: "active",
    });
    count++;
  }

  console.log(`  Schedule items: ${count}`);
}

async function seedMessages(
  client: ConvexHttpClient,
  careCaseId: Id<"careCases">,
  userId: Id<"users">,
  userPhone: string,
  userName: string,
) {
  const convDir = path.join(WORKSPACE, "conversations");
  if (!fs.existsSync(convDir)) {
    console.log("  Messages: 0 (no directory)");
    return;
  }

  const logDir = path.join(convDir, userPhone);
  if (!fs.existsSync(logDir)) {
    console.log("  Messages: 0 (no user conversation directory)");
    return;
  }

  const logFiles = fs.readdirSync(logDir).filter((file) => file.endsWith(".log"));
  let count = 0;

  for (const logFile of logFiles) {
    const content = fs.readFileSync(path.join(logDir, logFile), "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      const parsed = parseConversationLogLine(line);
      if (!parsed) continue;

      await client.mutation(api.messages.create, {
        careCaseId,
        userId,
        senderPhone: userPhone,
        actorType: parsed.direction === "inbound" ? "user" : "assistant",
        direction: parsed.direction,
        displayName: userName,
        body: parsed.body,
        timestamp: parsed.timestamp,
      });
      count++;
    }
  }

  console.log(`  Messages: ${count}`);
}

async function seedLessons(
  client: ConvexHttpClient,
  careCaseId: Id<"careCases">,
  userId: Id<"users">,
) {
  const lessonsPath = path.resolve(import.meta.dirname, "../runtime/learning/lessons.md");
  if (!fs.existsSync(lessonsPath)) {
    console.log("  Lessons: 0 (no file)");
    return;
  }

  const content = fs.readFileSync(lessonsPath, "utf-8");
  let count = 0;

  for (const line of content.split("\n")) {
    const parsed = parseLessonLine(line);
    if (!parsed) continue;

    await client.mutation(api.memoryEntries.create, {
      careCaseId,
      userId,
      scope: "care_case",
      category: "lesson",
      content: parsed.text,
      active: true,
      createdAt: new Date(parsed.date).getTime(),
      updatedAt: new Date(parsed.date).getTime(),
    });
    count++;
  }

  console.log(`  Lessons: ${count}`);
}

async function main() {
  const url = getConvexUrl();
  const client = new ConvexHttpClient(url);

  console.log(`Seeding Convex at ${url}...`);
  console.log(`Source family: ${FAMILY_DIR_NAME}`);
  console.log(`Workspace: ${WORKSPACE}\n`);

  const { careCaseId, userId, userPhone, userName } = await seedCareCaseAndUser(client);
  await seedMedications(client, careCaseId);
  await seedScheduleItems(client, careCaseId);
  await seedMessages(client, careCaseId, userId, userPhone, userName);
  await seedLessons(client, careCaseId, userId);

  console.log("\nSeed complete.");
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
