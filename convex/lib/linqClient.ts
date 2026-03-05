const LINQ_BASE_URL = "https://api.linqapp.com/api/partner/v3";
const MAX_BUBBLES = 5;
const REPLAY_WINDOW_SECONDS = 300;

interface LinqSendResult {
  success: boolean;
  messageId?: string;
  service?: string;
  error?: unknown;
}

interface LinqCreateResult {
  success: boolean;
  chatId?: string;
  messageId?: string;
  service?: string;
  error?: unknown;
}

// ─── HTTP helpers ────────────────────────────────────────────────────────

function headers(apiToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function linqRequest(
  method: string,
  path: string,
  apiToken: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const url = `${LINQ_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: headers(apiToken),
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  return { status: res.status, data };
}

// ─── Chat operations ─────────────────────────────────────────────────────

export async function sendMessage(
  chatId: string,
  text: string,
  apiToken: string,
): Promise<LinqSendResult> {
  const body = {
    message: { parts: [{ type: "text", value: text }] },
  };

  const { status, data } = await linqRequest(
    "POST",
    `/chats/${chatId}/messages`,
    apiToken,
    body,
  );

  if (status >= 200 && status < 300) {
    const msg = (data.message ?? data) as Record<string, unknown>;
    return {
      success: true,
      messageId: msg.id as string | undefined,
      service: (msg.service as string) ?? "unknown",
    };
  }
  return { success: false, error: data };
}

export async function createChat(
  toPhone: string,
  initialMessage: string,
  fromPhone: string,
  apiToken: string,
): Promise<LinqCreateResult> {
  const body = {
    from: fromPhone,
    to: [toPhone],
    message: { parts: [{ type: "text", value: initialMessage }] },
  };

  const { status, data } = await linqRequest("POST", "/chats", apiToken, body);

  if (status >= 200 && status < 300) {
    const chat = (data.chat ?? {}) as Record<string, unknown>;
    const msg = (chat.message ?? {}) as Record<string, unknown>;
    return {
      success: true,
      chatId: chat.id as string | undefined,
      messageId: msg.id as string | undefined,
      service: (msg.service as string) ?? "unknown",
    };
  }
  return { success: false, error: data };
}

export async function markAsRead(
  chatId: string,
  apiToken: string,
): Promise<{ success: boolean }> {
  const { status } = await linqRequest(
    "POST",
    `/chats/${chatId}/read`,
    apiToken,
  );
  return { success: status === 204 };
}

export async function startTyping(
  chatId: string,
  apiToken: string,
): Promise<{ success: boolean }> {
  const { status } = await linqRequest(
    "POST",
    `/chats/${chatId}/typing`,
    apiToken,
  );
  return { success: status === 204 };
}

// ─── Bubble splitting ────────────────────────────────────────────────────

const SENTENCE_BOUNDARY = /(?<=[.?!])\s+/;

export function splitIntoBubbles(
  text: string,
  maxLen = 450,
  minLen = 40,
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const paragraphs = trimmed.split("\n\n").filter((s) => s.trim());

  const bubbles: string[] = [];
  for (const rawPara of paragraphs) {
    const para = rawPara.trim();
    if (para.length <= maxLen) {
      bubbles.push(para);
      continue;
    }

    const sentences = para.split(SENTENCE_BOUNDARY);
    let current = "";
    for (const sentence of sentences) {
      if (current && current.length + sentence.length + 1 > maxLen) {
        bubbles.push(current.trim());
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current) {
      if (bubbles.length > 0 && current.trim().length < minLen) {
        bubbles[bubbles.length - 1] = `${bubbles[bubbles.length - 1]} ${current.trim()}`;
      } else {
        bubbles.push(current.trim());
      }
    }
  }

  if (bubbles.length > MAX_BUBBLES) {
    const tail = bubbles.slice(MAX_BUBBLES - 1).join("\n\n");
    return [...bubbles.slice(0, MAX_BUBBLES - 1), tail];
  }

  return bubbles.length > 0 ? bubbles : [trimmed];
}

// ─── Sequential message sending ──────────────────────────────────────────

export async function sendMessageSequence(
  chatId: string,
  bubbles: string[],
  apiToken: string,
  delayMs = 800,
): Promise<LinqSendResult[]> {
  const results: LinqSendResult[] = [];
  for (let i = 0; i < bubbles.length; i++) {
    if (i > 0) {
      try {
        await startTyping(chatId, apiToken);
      } catch {
        // typing indicator is best-effort
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      const result = await sendMessage(chatId, bubbles[i], apiToken);
      results.push(result);
    } catch (e: unknown) {
      results.push({
        success: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}

// ─── Webhook verification ────────────────────────────────────────────────

export async function verifyWebhookSignature(
  payload: string,
  timestamp: string,
  signature: string,
  signingSecret: string,
): Promise<boolean> {
  if (!signingSecret) return true;

  const webhookTime = parseInt(timestamp, 10);
  if (isNaN(webhookTime)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - webhookTime) > REPLAY_WINDOW_SECONDS) return false;

  const message = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const provided = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  if (expected.length !== provided.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Payload extraction helpers ──────────────────────────────────────────

export function extractSenderPhone(
  eventData: Record<string, unknown>,
): string {
  for (const key of ["sender_handle", "from_handle"]) {
    const handle = eventData[key] as Record<string, unknown> | undefined;
    if (handle?.handle) return handle.handle as string;
  }
  const msg = (eventData.message ?? {}) as Record<string, unknown>;
  for (const key of ["sender_handle", "from_handle"]) {
    const handle = msg[key] as Record<string, unknown> | undefined;
    if (handle?.handle) return handle.handle as string;
  }
  return "";
}

export function extractMessageText(
  eventData: Record<string, unknown>,
): string {
  const parts =
    (eventData.parts as Array<Record<string, unknown>>) ??
    ((eventData.message as Record<string, unknown>)?.parts as Array<
      Record<string, unknown>
    >) ??
    [];
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.value as string)
    .join(" ");
}

export function extractChatId(eventData: Record<string, unknown>): string {
  return (
    (eventData.chat_id as string) ??
    ((eventData.chat as Record<string, unknown>)?.id as string) ??
    ""
  );
}

export function extractService(eventData: Record<string, unknown>): string {
  return (
    (eventData.service as string) ??
    ((eventData.message as Record<string, unknown>)?.service as string) ??
    "unknown"
  );
}

export function extractMessageId(eventData: Record<string, unknown>): string {
  const msg = (eventData.message ?? {}) as Record<string, unknown>;
  return (
    (msg.id as string) ??
    (eventData.message_id as string) ??
    (eventData.id as string) ??
    ""
  );
}

export function extractFailureReason(
  eventData: Record<string, unknown>,
): string {
  if (typeof eventData.error === "string") return eventData.error;
  if (typeof eventData.reason === "string") return eventData.reason;
  const msg = (eventData.message ?? {}) as Record<string, unknown>;
  if (typeof msg.error === "string") return msg.error;
  return "unknown";
}
