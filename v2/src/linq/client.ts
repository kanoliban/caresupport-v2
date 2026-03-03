import { config } from "../config.js";

export interface LinqSendResult {
  success: boolean;
  status: number;
  body: unknown;
}

export class LinqClient {
  constructor(
    private readonly baseUrl: string = config.linq.baseUrl,
    private readonly token: string | undefined = config.linq.apiToken,
    private readonly requestTimeoutMs: number = config.linqRequestTimeoutMs,
  ) {}

  private async request(path: string, init: RequestInit): Promise<LinqSendResult> {
    if (!this.token) {
      return { success: false, status: 401, body: { error: "LINQ_API_TOKEN missing" } };
    }

    const controller = new AbortController();
    const timeoutMs = Math.max(1000, this.requestTimeoutMs);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.token}`,
          ...(init.headers ?? {}),
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : "request_failed";
      return {
        success: false,
        status: message.toLowerCase().includes("abort") ? 408 : 502,
        body: { error: message },
      };
    } finally {
      clearTimeout(timeoutId);
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return {
      success: response.ok,
      status: response.status,
      body,
    };
  }

  sendMessage(chatId: string, text: string): Promise<LinqSendResult> {
    return this.request(`/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message: { parts: [{ type: "text", value: text }] } }),
    });
  }

  markAsRead(chatId: string): Promise<LinqSendResult> {
    return this.request(`/chats/${chatId}/read`, { method: "POST" });
  }

  startTyping(chatId: string): Promise<LinqSendResult> {
    return this.request(`/chats/${chatId}/typing`, { method: "POST" });
  }

  stopTyping(chatId: string): Promise<LinqSendResult> {
    return this.request(`/chats/${chatId}/typing`, { method: "DELETE" });
  }

  async sendMessageSequence(chatId: string, bubbles: string[], interBubbleDelayMs = 800): Promise<LinqSendResult[]> {
    const out: LinqSendResult[] = [];
    for (const [index, bubble] of bubbles.entries()) {
      if (!bubble.trim()) continue;
      if (index > 0) {
        try {
          await this.startTyping(chatId);
        } catch {
          // best-effort UX signal only
        }
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, interBubbleDelayMs)));
      }
      out.push(await this.sendMessage(chatId, bubble.trim()));
    }
    return out;
  }
}
