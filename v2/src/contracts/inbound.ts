import { z } from "zod";

export const MessagePartSchema = z.object({
  type: z.string().min(1),
  value: z.string().optional(),
  url: z.string().url().optional(),
  attachment_id: z.string().optional(),
});

export const LinqInboundPayloadSchema = z.object({
  chat_id: z.string().min(1),
  from: z.string().min(3),
  service: z.enum(["iMessage", "RCS", "SMS", "unknown"]).or(z.string().min(1)),
  message_id: z.string().min(1),
  parts: z.array(MessagePartSchema).min(1),
  received_at: z.string().datetime({ offset: true }),
  event_id: z.string().min(1).optional(),
});

export type LinqInboundPayload = z.infer<typeof LinqInboundPayloadSchema>;

export function extractText(parts: LinqInboundPayload["parts"]): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.value === "string")
    .map((p) => p.value ?? "")
    .join(" ")
    .trim();
}
