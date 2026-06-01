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
  modelConstitutionContent?: string;
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

export type CareContactType =
  | "family"
  | "professional_caregiver"
  | "agency"
  | "clinician"
  | "other";

export interface CareContactUpdate {
  action: "add" | "update" | "remove";
  name?: string;
  phone?: string;
  relationship?: string;
  contactType?: CareContactType;
  agencyName?: string;
  role?: string;
  availabilityNotes?: string;
  contactPriority?: number;
  canReceiveTexts?: boolean;
  consentToContact?: boolean;
  active?: boolean;
  notes?: string;
}

export type CoordinationEventType =
  | "coverage_gap"
  | "schedule_change"
  | "handoff"
  | "task_followup"
  | "appointment"
  | "medication"
  | "outreach"
  | "other";

export type CoordinationEventStatus =
  | "open"
  | "waiting"
  | "resolved"
  | "cancelled";

export type CoordinationUrgency = "low" | "normal" | "high" | "urgent";

export interface CoordinationEventUpdate {
  action: "add" | "update" | "remove";
  title?: string;
  type?: CoordinationEventType;
  status?: CoordinationEventStatus;
  urgency?: CoordinationUrgency;
  description?: string;
  startsAt?: number;
  endsAt?: number;
  originalAssigneeName?: string;
  confirmedContactNames?: string[];
  pendingContactNames?: string[];
  declinedContactNames?: string[];
  fallbackContactNames?: string[];
  nextActionAt?: number;
  escalationAt?: number;
  resolution?: string;
}

export interface OutreachRequest {
  contactName: string;
  purpose: string;
  message: string;
  coordinationEventTitle?: string;
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
  careContactUpdates?: CareContactUpdate[];
  coordinationEventUpdates?: CoordinationEventUpdate[];
  outreachRequests?: OutreachRequest[];
}
