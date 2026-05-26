"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { useCurrentCareCase, useCurrentUser } from "./session";

/**
 * Data hooks — read layer for the companion app.
 *
 * Slice 1B: wired to real Convex queries via useQuery. The hooks default
 * collection results to [] while loading so call sites don't have to do
 * null-checking everywhere. useCurrentUser/useCurrentCareCase return
 * undefined while loading (the only place loading is observable in UI).
 *
 * Slice 1C will add auth gating; for now queries are public.
 */

export { useCurrentUser, useCurrentCareCase };

// ──────────────────────────────────────────────────────────────
// Memory hub categories — UI grouping derived from MemoryEntry tags.
// Prototype groups facts into 5 buckets: Routines / Health & Meds /
// Likes & Preferences / Personal Info / Things I'm Assuming.
// ──────────────────────────────────────────────────────────────

export type MemoryCategoryKey =
  | "routines"
  | "health"
  | "preferences"
  | "personal"
  | "assumptions";

export type MemoryHubCategory = {
  key: MemoryCategoryKey;
  label: string;
  description: string;
  color: string;
  bg: string;
  iconKind: "clock" | "pill" | "heart" | "idcard" | "question";
  facts: string[];
};

// Map each MemoryEntry into a hub bucket. Seed data tags content with a
// bracket prefix like "[routine]"; if absent, fall back to the schema's
// category enum.
function bucketForEntry(entry: Doc<"memoryEntries">): MemoryCategoryKey {
  const tagMatch = /^\[(routine|health|likes|personal|assumption)\]/i.exec(
    entry.content,
  );
  if (tagMatch) {
    const tag = tagMatch[1].toLowerCase();
    if (tag === "routine") return "routines";
    if (tag === "health") return "health";
    if (tag === "likes") return "preferences";
    if (tag === "personal") return "personal";
    if (tag === "assumption") return "assumptions";
  }
  switch (entry.category) {
    case "care_preference":
      return "preferences";
    case "profile":
      return "personal";
    case "lesson":
      return "assumptions";
    case "care_note":
    case "communication_preference":
    default:
      return "routines";
  }
}

function stripTag(content: string): string {
  return content.replace(/^\[[^\]]+\]\s*/, "");
}

const CATEGORY_META: Record<
  MemoryCategoryKey,
  Omit<MemoryHubCategory, "facts">
> = {
  routines: {
    key: "routines",
    label: "Habits & Routines",
    description: "How the days go",
    color: "var(--cs-accent)",
    bg: "#F3E1F8",
    iconKind: "clock",
  },
  health: {
    key: "health",
    label: "Health & Meds",
    description: "What I track",
    color: "var(--cs-success)",
    bg: "#DCF1E5",
    iconKind: "pill",
  },
  preferences: {
    key: "preferences",
    label: "Likes & Preferences",
    description: "What matters to her",
    color: "#D24A6F",
    bg: "#FCE0EB",
    iconKind: "heart",
  },
  personal: {
    key: "personal",
    label: "Personal Info",
    description: "Identity & history",
    color: "var(--cs-info)",
    bg: "#DCE7FA",
    iconKind: "idcard",
  },
  assumptions: {
    key: "assumptions",
    label: "Things I'm Assuming",
    description: "Correct me if I'm wrong",
    color: "var(--cs-warning)",
    bg: "#FAE7CC",
    iconKind: "question",
  },
};

// ──────────────────────────────────────────────────────────────
// Data hooks — each defaults to [] while loading to keep call sites
// stable. UI surfaces show an empty pane briefly until data arrives.
// ──────────────────────────────────────────────────────────────

export function useTodaySchedule(): Doc<"scheduleItems">[] {
  const careCase = useCurrentCareCase();
  const items = useQuery(
    api.scheduleItems.listByCareCase,
    careCase ? { careCaseId: careCase._id } : "skip",
  );
  if (!items) return [];
  const todayISO = new Date().toISOString().slice(0, 10);
  return items.filter((it) => it.date === todayISO);
}

export function useActiveMeds(): Doc<"medications">[] {
  const careCase = useCurrentCareCase();
  const meds = useQuery(
    api.medications.listActiveByCareCase,
    careCase ? { careCaseId: careCase._id } : "skip",
  );
  return meds ?? [];
}

export function useMemoryHub(): MemoryHubCategory[] {
  const careCase = useCurrentCareCase();
  const entries = useQuery(
    api.memoryEntries.listByCareCase,
    careCase ? { careCaseId: careCase._id } : "skip",
  );
  const grouped: Record<MemoryCategoryKey, string[]> = {
    routines: [],
    health: [],
    preferences: [],
    personal: [],
    assumptions: [],
  };
  if (entries) {
    for (const entry of entries) {
      if (!entry.active) continue;
      grouped[bucketForEntry(entry)].push(stripTag(entry.content));
    }
  }
  return (Object.keys(CATEGORY_META) as MemoryCategoryKey[]).map((key) => ({
    ...CATEGORY_META[key],
    facts: grouped[key],
  }));
}
