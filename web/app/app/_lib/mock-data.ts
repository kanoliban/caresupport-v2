/**
 * Mock fixtures for slice 1A — shaped to mirror the Convex schema
 * (~/caresupport-v2/convex/schema.ts) so that slice 1B can swap to
 * real `useQuery(api.x.y, ...)` calls without changing call sites.
 *
 * Once Convex client is installed, replace the local types here with
 * `import { Doc } from "@/convex/_generated/dataModel"` and these
 * fixtures move into a seed script.
 */

// ──────────────────────────────────────────────────────────────
// Schema-mirrored types (slice 1B replaces with Convex Doc types).
// ──────────────────────────────────────────────────────────────

export type EntityStatus = "onboarding" | "active" | "paused" | "archived";

export type User = {
  _id: string;
  phone: string;
  name: string;
  careCaseId: string;
  status: EntityStatus;
  relationshipToRecipient?: string;
  chatId?: string;
  createdAt: number;
  updatedAt: number;
};

export type CareCase = {
  _id: string;
  title: string;
  status: EntityStatus;
  timezone: string;
  careRecipientName?: string;
  relationshipToRecipient?: string;
  createdAt: number;
  updatedAt: number;
};

export type ScheduleItemType = "appointment" | "task" | "reminder";
export type ScheduleItemStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "active";

export type ScheduleItem = {
  _id: string;
  careCaseId: string;
  type: ScheduleItemType;
  title: string;
  date?: string;
  time?: string;
  endTime?: string;
  recurrence?: string;
  location?: string;
  notes?: string;
  status: ScheduleItemStatus;
  provider?: string;
};

export type MedicationStatus =
  | "active"
  | "held"
  | "tapering"
  | "discontinued";

export type Medication = {
  _id: string;
  careCaseId: string;
  name: string;
  dose: string;
  schedule: string;
  prescriber?: string;
  pharmacy?: string;
  notes?: string;
  status: MedicationStatus;
  lastConfirmed?: number;
  refillDue?: string;
};

export type MemoryScope = "user" | "care_case";
export type MemoryCategory =
  | "profile"
  | "communication_preference"
  | "care_preference"
  | "care_note"
  | "lesson";

export type MemoryEntry = {
  _id: string;
  careCaseId: string;
  userId: string;
  scope: MemoryScope;
  category: MemoryCategory;
  content: string;
  source?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

export type CareContactType =
  | "family"
  | "professional_caregiver"
  | "agency"
  | "clinician"
  | "other";

export type CareContact = {
  _id: string;
  careCaseId: string;
  name: string;
  phone?: string;
  relationship?: string;
  contactType: CareContactType;
  agencyName?: string;
  role?: string;
  availabilityNotes?: string;
  contactPriority?: number;
  canReceiveTexts: boolean;
  consentToContact?: boolean;
  active: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

// ──────────────────────────────────────────────────────────────
// Sample data — matches prototype's hardcoded TODAY content.
// Rob is the coordinator (the caregiver who has the app).
// Degitu is the care recipient.
// ──────────────────────────────────────────────────────────────

const NOW = Date.now();
const todayISO = new Date().toISOString().slice(0, 10);

const userId = "u_mock_rob" as const;
const careCaseId = "cc_mock_degitu" as const;

export const mockUser: User = {
  _id: userId,
  phone: "+15555550100",
  name: "Rob",
  careCaseId,
  status: "active",
  relationshipToRecipient: "Son",
  chatId: "linq_chat_mock",
  createdAt: NOW - 1000 * 60 * 60 * 24 * 60,
  updatedAt: NOW,
};

export const mockCareCase: CareCase = {
  _id: careCaseId,
  title: "Rob caring for Degitu",
  status: "active",
  timezone: "America/New_York",
  careRecipientName: "Degitu Bekele",
  relationshipToRecipient: "Mother",
  createdAt: NOW - 1000 * 60 * 60 * 24 * 60,
  updatedAt: NOW,
};

// ──────────────────────────────────────────────────────────────
// Today's schedule (mirrors prototype's TODAY_EVENTS).
// Convex's status enum is {scheduled, completed, cancelled, active}
// — display-level statuses (taken/done/due/open) live as derived
// state in the UI layer or in `notes` for slice 1A.
// ──────────────────────────────────────────────────────────────

const mkScheduleId = (slug: string) => `si_mock_${slug}`;

export const mockScheduleItems: ScheduleItem[] = [
  {
    _id: mkScheduleId("shift-am"),
    careCaseId,
    type: "task",
    title: "Morning shift · Maria",
    date: todayISO,
    time: "07:00",
    endTime: "11:00",
    status: "completed",
    notes: "Maria Kim covering 7–11 AM",
    provider: "Maria Kim",
  },
  {
    _id: mkScheduleId("med-am-1"),
    careCaseId,
    type: "reminder",
    title: "Lisinopril 10 mg",
    date: todayISO,
    time: "08:00",
    status: "completed",
    notes: "with breakfast",
  },
  {
    _id: mkScheduleId("activity-am"),
    careCaseId,
    type: "task",
    title: "Morning walk",
    date: todayISO,
    time: "09:30",
    status: "completed",
    notes: "around the block with Maria",
  },
  {
    _id: mkScheduleId("med-noon"),
    careCaseId,
    type: "reminder",
    title: "Eliquis 5 mg",
    date: todayISO,
    time: "12:00",
    status: "completed",
    notes: "with lunch",
  },
  {
    _id: mkScheduleId("rest-pm"),
    careCaseId,
    type: "task",
    title: "Afternoon rest",
    date: todayISO,
    time: "13:30",
    endTime: "15:00",
    status: "active",
    notes: "quiet time, no visitors",
  },
  {
    _id: mkScheduleId("shift-pm"),
    careCaseId,
    type: "task",
    title: "Evening shift · OPEN",
    date: todayISO,
    time: "18:00",
    endTime: "22:00",
    status: "scheduled",
    notes: "Angela cancelled — coverage needed",
  },
  {
    _id: mkScheduleId("med-pm-1"),
    careCaseId,
    type: "reminder",
    title: "Eliquis 5 mg",
    date: todayISO,
    time: "20:00",
    status: "scheduled",
    notes: "with dinner",
  },
  {
    _id: mkScheduleId("med-pm-2"),
    careCaseId,
    type: "reminder",
    title: "Vitamin D 1000 IU",
    date: todayISO,
    time: "20:00",
    status: "scheduled",
  },
  {
    _id: mkScheduleId("routine-pm"),
    careCaseId,
    type: "task",
    title: "Bedtime routine",
    date: todayISO,
    time: "21:30",
    status: "scheduled",
    notes: "TV off, lights low",
  },
];

// ──────────────────────────────────────────────────────────────
// Today's meds + standing meds.
// ──────────────────────────────────────────────────────────────

const mkMedId = (slug: string) => `med_mock_${slug}`;

export const mockMedications: Medication[] = [
  {
    _id: mkMedId("lisinopril"),
    careCaseId,
    name: "Lisinopril",
    dose: "10 mg",
    schedule: "Once daily · morning · with breakfast",
    prescriber: "Dr. Park (cardiology)",
    pharmacy: "Walgreens Girard Ave",
    status: "active",
    notes: "blood pressure",
    refillDue: "in 18 days",
  },
  {
    _id: mkMedId("eliquis"),
    careCaseId,
    name: "Eliquis",
    dose: "5 mg",
    schedule: "Twice daily · with food",
    prescriber: "Dr. Park (cardiology)",
    pharmacy: "Walgreens Girard Ave",
    status: "active",
    notes: "anticoagulant",
    refillDue: "in 11 days",
  },
  {
    _id: mkMedId("vitamin-d"),
    careCaseId,
    name: "Vitamin D",
    dose: "1000 IU",
    schedule: "Once daily · evening",
    status: "active",
  },
];

// ──────────────────────────────────────────────────────────────
// Memory entries — the 5 prototype categories mapped to the
// Convex memory schema. Categories are grouped client-side by
// the UI layer (memoryHub.ts) into Routines / Health / Likes /
// Personal / Assumptions.
// ──────────────────────────────────────────────────────────────

const mkMemId = (slug: string) => `mem_mock_${slug}`;
const mkMem = (
  slug: string,
  category: MemoryCategory,
  content: string,
  source = "imessage",
): MemoryEntry => ({
  _id: mkMemId(slug),
  careCaseId,
  userId,
  scope: "care_case",
  category,
  content,
  source,
  active: true,
  createdAt: NOW - 1000 * 60 * 60 * 24 * 14,
  updatedAt: NOW,
});

export const mockMemoryEntries: MemoryEntry[] = [
  // Routines
  mkMem(
    "routine-1",
    "care_note",
    "[routine] Maria covers Degitu's morning routine on weekdays, 7–11 AM.",
  ),
  mkMem(
    "routine-2",
    "care_note",
    "[routine] Coffee at 7:15 — half-caf, oat milk, no sugar.",
  ),
  mkMem(
    "routine-3",
    "care_note",
    "[routine] Short walk around the block before 10 if weather allows.",
  ),
  mkMem(
    "routine-4",
    "care_note",
    "[routine] Quiet rest between 1:30–3 PM, no calls or visitors.",
  ),
  mkMem(
    "routine-5",
    "care_note",
    "[routine] Bedtime by 9:30, TV off at 9, low light only.",
  ),

  // Health & Meds
  mkMem(
    "health-1",
    "care_note",
    "[health] Lisinopril 10 mg every morning with breakfast.",
  ),
  mkMem(
    "health-2",
    "care_note",
    "[health] Eliquis 5 mg twice daily with food — anticoagulant.",
  ),
  mkMem(
    "health-3",
    "care_note",
    "[health] Cardiology follow-up with Dr. Park every 3 months.",
  ),
  mkMem(
    "health-4",
    "care_note",
    "[health] Allergic to penicillin — severe (hives + airway swelling, March 2018).",
  ),
  mkMem(
    "health-5",
    "care_note",
    "[health] BP usually 130s/80s; flag anything over 150/95.",
  ),

  // Likes & Preferences
  mkMem(
    "pref-1",
    "care_preference",
    "[likes] Likes Ethiopian coffee and injera with shiro.",
  ),
  mkMem(
    "pref-2",
    "care_preference",
    "[likes] Loves jazz — especially Mulatu Astatke.",
  ),
  mkMem(
    "pref-3",
    "care_preference",
    "[likes] Prefers being called 'Mama Degitu' by caregivers she knows well.",
  ),
  mkMem(
    "pref-4",
    "care_preference",
    "[likes] Does not like surprise visitors — always confirm in advance.",
  ),

  // Personal Info
  mkMem(
    "personal-1",
    "profile",
    "[personal] Degitu Bekele, age 78. Born in Addis Ababa.",
  ),
  mkMem(
    "personal-2",
    "profile",
    "[personal] Speaks Amharic and English. Switches to Amharic when tired.",
  ),
  mkMem(
    "personal-3",
    "profile",
    "[personal] Widowed 2019. Husband was Yonas.",
  ),
  mkMem(
    "personal-4",
    "profile",
    "[personal] Three children: Rob (primary coordinator), Sara, Marcus.",
  ),

  // Things I'm Assuming
  mkMem(
    "assume-1",
    "lesson",
    "[assumption] Assuming Maria continues weekday mornings — confirm monthly.",
  ),
  mkMem(
    "assume-2",
    "lesson",
    "[assumption] Assuming evening shifts are covered through end of month.",
  ),
  mkMem(
    "assume-3",
    "lesson",
    "[assumption] Assuming pharmacy auto-refills Eliquis — verify with Walgreens.",
  ),
];

// ──────────────────────────────────────────────────────────────
// Care contacts — the "people" section in the memory hub.
// Maps to careContacts table in Convex schema (which exists today).
// ──────────────────────────────────────────────────────────────

const mkContactId = (slug: string) => `cc_mock_${slug}`;
const mkContact = (
  slug: string,
  name: string,
  contactType: CareContactType,
  role: string,
  relationship?: string,
): CareContact => ({
  _id: mkContactId(slug),
  careCaseId,
  name,
  contactType,
  role,
  relationship,
  canReceiveTexts: true,
  consentToContact: true,
  active: true,
  createdAt: NOW - 1000 * 60 * 60 * 24 * 30,
  updatedAt: NOW,
});

export const mockCareContacts: CareContact[] = [
  mkContact(
    "maria",
    "Maria Kim",
    "professional_caregiver",
    "Weekday mornings · 7–11 AM",
  ),
  mkContact(
    "angela",
    "Angela Reyes",
    "professional_caregiver",
    "Evenings · 6–10 PM",
  ),
  mkContact(
    "marcus",
    "Marcus Bekele",
    "family",
    "Backup · evenings after 8 only",
    "Son",
  ),
  mkContact(
    "sara",
    "Sara Bekele",
    "family",
    "Weekend afternoons",
    "Daughter",
  ),
  mkContact("dr-park", "Dr. Park", "clinician", "Cardiology"),
  mkContact("lillian", "Aunt Lillian", "family", "Cultural / language", "Aunt"),
];
