export type RouteTier = "fast" | "reason" | "critical";

export type Intent =
  | "EMERGENCY"
  | "ESCALATION"
  | "MEDICATION_CHANGE"
  | "ONBOARDING"
  | "MULTI_MEMBER"
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

export type FamilyContextMode =
  | "family_full"
  | "family_meds"
  | "family_team";

export interface SystemBlocksInput {
  soulContent: string;
  routingContent: string;
  capabilitiesContent: string;
  skillsContent: string;
  lessonsContent: string;
  member: {
    name: string;
    phone: string;
    role: string;
    accessLevel: string;
    relationship: string;
  };
  memberContext: string;
  familyContext: string;
  intent: Intent | string;
  service: string;
  toolsActive: boolean;
}

export interface OutreachEntry {
  phone: string;
  name: string;
  message: string;
}

export interface FileUpdate {
  section: string;
  operation: string;
  content: string;
  oldContent: string;
}

export interface RoutingUpdate {
  action: string;
  phone: string;
  name: string;
  role: string;
  relationship: string;
  accessLevel: string;
}

export interface HandlerResult {
  success: boolean;
  response: string;
  error?: string;
  approvalHandled?: boolean;
  blocked?: boolean;
  leakedCategories?: string[];
  routedTier?: string;
  routedIntent?: string;
  lessonsLearned?: number;
  approvalsCreated?: number;
  outreachSent?: number;
}

export interface ReactionRequest {
  targetMessage: "last_inbound" | "last_outbound";
  type: "love" | "like" | "dislike" | "laugh" | "emphasize" | "question";
}

export interface EffectRequest {
  type: "screen" | "bubble";
  name: string;
}

export interface AgentResponse {
  smsResponse: string;
  internalNotes: string;
  needsOutreach: OutreachEntry[];
  familyFileUpdates: FileUpdate[];
  selfCorrections: string[];
  memberUpdates: FileUpdate[];
  routingUpdates: RoutingUpdate[];
  reactions: ReactionRequest[];
  effect: EffectRequest | null;
}
