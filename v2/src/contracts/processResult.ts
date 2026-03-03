import { z } from "zod";

export const OutreachTaskSchema = z.object({
  phone: z.string().min(3),
  name: z.string().min(1),
  message: z.string().min(1),
});

export const FamilyUpdateSchema = z.object({
  section: z.string().min(1),
  operation: z.enum(["append", "prepend", "replace", "resolve_issue"]),
  content: z.string().min(1),
  old_content: z.string().optional(),
});

export const MemberUpdateSchema = z.object({
  member_id: z.string().min(1),
  section: z.string().min(1),
  operation: z.enum(["append", "prepend", "replace", "resolve_issue"]),
  content: z.string().min(1),
  old_content: z.string().optional(),
});

export const RoutingUpdateSchema = z.object({
  action: z.enum(["add", "update", "deactivate"]),
  phone: z.string().min(3),
  name: z.string().min(1),
  role: z.enum(["family_caregiver", "professional_caregiver", "community_supporter"]),
  relationship: z.string().min(1),
  access_level: z.enum(["full", "limited"]),
});

export const AuditEnvelopeSchema = z.object({
  model: z.string().min(1),
  intent: z.string().min(1),
  decisions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  token_usage: z
    .object({ input: z.number().nonnegative(), output: z.number().nonnegative() })
    .optional(),
});

export const ProcessResultSchema = z.object({
  sms_response: z.string().min(1),
  needs_outreach: z.array(OutreachTaskSchema).default([]),
  family_updates: z.array(FamilyUpdateSchema).default([]),
  member_updates: z.array(MemberUpdateSchema).default([]),
  routing_updates: z.array(RoutingUpdateSchema).default([]),
  audit: AuditEnvelopeSchema,
});

export type OutreachTask = z.infer<typeof OutreachTaskSchema>;
export type FamilyUpdate = z.infer<typeof FamilyUpdateSchema>;
export type MemberUpdate = z.infer<typeof MemberUpdateSchema>;
export type RoutingUpdate = z.infer<typeof RoutingUpdateSchema>;
export type AuditEnvelope = z.infer<typeof AuditEnvelopeSchema>;
export type ProcessResult = z.infer<typeof ProcessResultSchema>;
