import type { MemoryCategory } from "../memory";

export type RouteTier = "fast" | "reason" | "critical";

export type Intent =
  | "EMERGENCY"
  | "MEDICATION_CHANGE"
  | "ONBOARDING"
  | "BILLING"
  | "GENERAL";

export interface RouteResult {
  tier: RouteTier;
  model: string;
  intent: Intent;
  reason: string;
}

export interface SystemBlock {
  type: "text";
  text: string;
  cacheBreakpoint: boolean;
}

export interface MessageTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SystemBlocksInput {
  soulContent: string;
  routingContent: string;
  capabilitiesContent: string;
  skillsContent: string;
  lessonsContent: string;
  user: {
    name: string;
    phone: string;
    relationshipToRecipient?: string;
    status: string;
  };
  userContext: string;
  careCase: {
    title: string;
    careRecipientName?: string;
    relationshipToRecipient?: string;
    timezone: string;
    status: string;
  };
  careCaseContext: string;
  intent: Intent | string;
  service: string;
  currentDateIso: string;
  currentDayOfWeek: string;
  currentTimeUtc: string;
  timezone: string;
  /** False until the timezone is established from the user; gates the ask-once prompt. */
  timezoneConfirmed?: boolean;
  calendarContext?: string;
  isTestEnv?: boolean;
}

export interface MemoryUpdate {
  category: MemoryCategory;
  content: string;
  source?: string;
}

export interface UserProfileUpdate {
  name?: string;
  relationship_to_recipient?: string;
  status?: "onboarding" | "active" | "paused" | "archived";
}

export interface CareCaseProfileUpdate {
  care_recipient_name?: string;
  relationship_to_recipient?: string;
  timezone?: string;
  status?: "onboarding" | "active" | "paused" | "archived";
}

export interface HandlerResult {
  success: boolean;
  response: string;
  error?: string;
  blocked?: boolean;
  routedTier?: string;
  routedIntent?: string;
  lessonsLearned?: number;
  memoriesSaved?: number;
}

export interface ReactionRequest {
  targetMessage: "last_inbound" | "last_outbound";
  type: "love" | "like" | "dislike" | "laugh" | "emphasize" | "question";
}

export interface EffectRequest {
  type: "screen" | "bubble";
  name: string;
}

export interface MedicationUpdate {
  action: "add" | "update" | "remove";
  name: string;
  dose?: string;
  schedule?: string;
  prescriber?: string;
  notes?: string;
}

export interface ScheduleUpdate {
  action: "add" | "update" | "remove";
  type: "appointment" | "task" | "reminder";
  title: string;
  date?: string;
  time?: string;
  end_time?: string;
  location?: string;
  notes?: string;
  provider?: string;
}

export interface CalendarUpdate {
  action: "create" | "update" | "delete";
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  eventId?: string;
  // Simple recurrence keyword: daily | weekdays | weekly | biweekly | monthly | yearly
  recurrence?: string;
}

export interface CareContactUpdate {
  action: "add" | "update" | "remove";
  name: string;
  phone?: string;
  relationship?: string;
  contactType?: "family" | "professional_caregiver" | "agency" | "clinician" | "other";
  agencyName?: string;
  role?: string;
  availabilityNotes?: string;
  contactPriority?: number;
  canReceiveTexts?: boolean;
  consentToContact?: boolean;
  notes?: string;
}

export interface CoordinationEventUpdate {
  action: "add" | "update" | "remove";
  title: string;
  type?: "coverage_gap" | "schedule_change" | "handoff" | "task_followup" | "appointment" | "medication" | "outreach" | "other";
  status?: "open" | "waiting" | "resolved" | "cancelled";
  urgency?: "low" | "normal" | "high" | "urgent";
  description?: string;
  contactName?: string;
  date?: string;
  time?: string;
}

export interface OutreachRequest {
  contactName: string;
  purpose: string;
  message: string;
  coordinationEventTitle?: string;
  approvalPrompt?: string;
}

export interface AgentResponse {
  smsResponse: string;
  internalNotes: string;
  userProfileUpdate: UserProfileUpdate | null;
  careCaseProfileUpdate: CareCaseProfileUpdate | null;
  userMemoryUpdates: MemoryUpdate[];
  careCaseMemoryUpdates: MemoryUpdate[];
  selfCorrections: string[];
  reactions: ReactionRequest[];
  effect: EffectRequest | null;
  medicationUpdates?: MedicationUpdate[];
  scheduleUpdates?: ScheduleUpdate[];
  calendarUpdates?: CalendarUpdate[];
  careContactUpdates?: CareContactUpdate[];
  coordinationEventUpdates?: CoordinationEventUpdate[];
  outreachRequests?: OutreachRequest[];
}
