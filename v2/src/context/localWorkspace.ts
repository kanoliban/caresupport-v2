import fs from "node:fs";
import path from "node:path";
import type { AccessLevel, ActorContext, FamilyContext } from "../types/domain.js";

interface RoutingMember {
  name?: string;
  role?: string;
  access_level?: string;
  active?: boolean;
  chat_id?: string;
}

interface RoutingFile {
  family_id?: string;
  care_recipient?: string;
  members?: Record<string, RoutingMember>;
}

interface FamilyBundle {
  familyId: string;
  familyName: string;
  careRecipient: string;
  markdown: string;
  memberFiles: Map<string, string>;
}

interface ConversationEntry {
  timestamp: string;
  timestampMs: number;
  direction: "INBOUND" | "OUTBOUND";
  text: string;
}

const ENTRY_START_RE = /^\[(?<timestamp>[^\]]+)\] \[(?<direction>INBOUND|OUTBOUND)\] /;
const CARE_RECIPIENT_RE = /^- Name:\s*(.+)$/i;

function resolveWorkspaceRoot(explicitRoot?: string): string | null {
  const candidates = [
    explicitRoot,
    process.env.CARESUPPORT_WORKSPACE_ROOT,
    path.resolve("fork/workspace"),
    path.resolve("../fork/workspace"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "families")) && fs.existsSync(path.join(candidate, "conversations"))) {
      return candidate;
    }
  }

  return null;
}

function readIfExists(filePath: string): string {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  } catch {
    return "";
  }
}

function parseJsonSafe<T>(filePath: string): T | null {
  const content = readIfExists(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function parseFrontmatter(markdown: string): Record<string, string> {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return {};
  const out: Record<string, string> = {};
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "---") break;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^"(.*)"$/, "$1");
    out[key] = value;
  }
  return out;
}

function extractCareRecipient(markdown: string): string | null {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const match = CARE_RECIPIENT_RE.exec(line.trim());
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function toAccessLevel(raw: unknown): AccessLevel {
  return typeof raw === "string" && raw.toLowerCase() === "full" ? "full" : "limited";
}

function normalizeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function phoneLookupKeys(phone: string): string[] {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  const keys = new Set<string>();
  if (trimmed) keys.add(trimmed);
  if (digits) {
    keys.add(digits);
    if (digits.length === 11 && digits.startsWith("1")) keys.add(digits.slice(1));
    if (digits.length === 10) keys.add(`1${digits}`);
  }
  return [...keys];
}

function parseConversationLog(content: string): ConversationEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: ConversationEntry[] = [];

  for (const line of lines) {
    const match = ENTRY_START_RE.exec(line);
    if (match?.groups?.direction) {
      const timestamp = match.groups.timestamp ?? "";
      entries.push({
        timestamp,
        timestampMs: Number.isNaN(Date.parse(timestamp)) ? NaN : Date.parse(timestamp),
        direction: match.groups.direction as ConversationEntry["direction"],
        text: line.replace(ENTRY_START_RE, "").trim(),
      });
      continue;
    }
    if (entries.length > 0 && line.trim().length > 0) {
      entries[entries.length - 1].text += `\n${line.trim()}`;
    }
  }

  return entries;
}

function humanizeFamilyName(familyId: string): string {
  return familyId
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export class LocalWorkspaceContext {
  private readonly workspaceRoot: string | null;
  private loaded = false;
  private readonly actorsByPhone = new Map<string, ActorContext>();
  private readonly actorsByChatId = new Map<string, ActorContext>();
  private readonly families = new Map<string, FamilyBundle>();

  constructor(explicitWorkspaceRoot?: string) {
    this.workspaceRoot = resolveWorkspaceRoot(explicitWorkspaceRoot);
  }

  resolveActor(phone: string, chatId?: string): ActorContext | null {
    this.ensureLoaded();

    if (chatId && this.actorsByChatId.has(chatId)) {
      return this.actorsByChatId.get(chatId) ?? null;
    }

    for (const key of phoneLookupKeys(phone)) {
      const actor = this.actorsByPhone.get(key);
      if (actor) {
        return {
          ...actor,
          chatId: chatId ?? actor.chatId,
          phone,
        };
      }
    }

    return null;
  }

  loadFamilyContext(actor: ActorContext, receivedAt?: string): FamilyContext | null {
    this.ensureLoaded();
    const family = this.families.get(actor.familyId);
    if (!family) return null;

    return {
      familyId: family.familyId,
      familyName: family.familyName,
      careRecipient: family.careRecipient,
      markdown: family.markdown || "[No family context loaded]",
      memberMarkdown: this.resolveMemberMarkdown(family, actor),
      recentConversation: this.buildRecentConversation(actor.phone, receivedAt),
    };
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;

    if (!this.workspaceRoot) return;
    const familiesRoot = path.join(this.workspaceRoot, "families");
    if (!fs.existsSync(familiesRoot)) return;

    for (const familyDirName of fs.readdirSync(familiesRoot)) {
      const familyDir = path.join(familiesRoot, familyDirName);
      if (!fs.statSync(familyDir).isDirectory()) continue;

      const familyMarkdown = readIfExists(path.join(familyDir, "family.md"));
      const routing = parseJsonSafe<RoutingFile>(path.join(familyDir, "routing.json")) ?? {};
      const frontmatter = parseFrontmatter(familyMarkdown);
      const familyId = String(routing.family_id ?? frontmatter.family_id ?? familyDirName);
      const careRecipient =
        String(routing.care_recipient ?? frontmatter.care_recipient ?? extractCareRecipient(familyMarkdown) ?? "Unknown")
          .trim() || "Unknown";
      const familyName = humanizeFamilyName(familyId);

      const memberFiles = new Map<string, string>();
      const membersDir = path.join(familyDir, "members");
      if (fs.existsSync(membersDir)) {
        for (const memberFile of fs.readdirSync(membersDir)) {
          if (!memberFile.endsWith(".md")) continue;
          const key = normalizeId(memberFile.replace(/\.md$/, ""));
          memberFiles.set(key, readIfExists(path.join(membersDir, memberFile)));
        }
      }

      this.families.set(familyId, {
        familyId,
        familyName,
        careRecipient,
        markdown: familyMarkdown,
        memberFiles,
      });

      const members = routing.members ?? {};
      for (const [phone, member] of Object.entries(members)) {
        if (member?.active === false) continue;
        const actor: ActorContext = {
          familyId,
          memberId: phone,
          memberName: member?.name ?? phone,
          role: member?.role ?? "family_caregiver",
          accessLevel: toAccessLevel(member?.access_level),
          phone,
          chatId: member?.chat_id,
        };

        for (const key of phoneLookupKeys(phone)) {
          this.actorsByPhone.set(key, actor);
        }
        if (member?.chat_id) {
          this.actorsByChatId.set(member.chat_id, actor);
        }
      }
    }
  }

  private resolveMemberMarkdown(family: FamilyBundle, actor: ActorContext): string | undefined {
    const candidates = [actor.memberName, actor.memberName.split(" ")[0] ?? "", actor.memberId, actor.phone]
      .map(normalizeId)
      .filter(Boolean);

    for (const candidate of candidates) {
      const match = family.memberFiles.get(candidate);
      if (match) return match;
    }
    return undefined;
  }

  private buildRecentConversation(phone: string, receivedAt?: string): string {
    if (!this.workspaceRoot) return "[No conversation history]";
    const cutoffMs = receivedAt ? Date.parse(receivedAt) : NaN;

    const logsDir = path.join(this.workspaceRoot, "conversations", phone);
    if (!fs.existsSync(logsDir)) return "[No conversation history]";

    const logs = fs
      .readdirSync(logsDir)
      .filter((entry) => entry.endsWith(".log"))
      .sort((a, b) => a.localeCompare(b))
      .slice(-2);

    const entries: ConversationEntry[] = [];
    for (const logFile of logs) {
      const content = readIfExists(path.join(logsDir, logFile));
      if (!content) continue;
      for (const entry of parseConversationLog(content)) {
        if (Number.isFinite(cutoffMs) && Number.isFinite(entry.timestampMs) && entry.timestampMs > cutoffMs) {
          continue;
        }
        entries.push(entry);
      }
    }

    while (entries.length > 0 && entries[entries.length - 1].direction === "INBOUND") {
      entries.pop();
    }

    if (entries.length === 0) {
      return "[No conversation history]";
    }

    return entries
      .slice(-12)
      .map((entry) => `[${entry.direction}] ${entry.text}`)
      .join("\n");
  }
}
