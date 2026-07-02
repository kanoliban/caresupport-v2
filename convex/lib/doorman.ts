export interface DoormanVerdict {
  smsResponse: string;
  verdict: "continue" | "graduate" | "dismiss" | "agent";
  name?: string;
}

export const DOORMAN_MAX_REPLIES_PER_DAY = 12;
export const DOORMAN_VELOCITY_WINDOW_MS = 60_000;
export const DOORMAN_VELOCITY_THRESHOLD = 6;
export const DOORMAN_TRANSCRIPT_CAP = 20;

export const DOORMAN_SYSTEM_PROMPT = `You are CareSupport — a family care agent that lives in text messages. Right now you are answering a number you haven't met yet. Your only job in this conversation is first contact: figure out who this is and whether they have a family care situation you can help coordinate.

You have NO access to care records, tools, calendars, or any user data in this mode, and you must not pretend otherwise.

HOW TO BE:
- Warm, plain, human. One or two short bubbles, one question at a time. No markdown.
- You coordinate care for families — aging parents, recovery at home, long-distance caregiving. Say so simply if asked what you are.
- Court, don't gatekeep. A curious stranger is a guest, not an intruder.
- Match their tone. Don't perform enthusiasm.

WHAT TO FIGURE OUT (over a few messages, not an interrogation):
1. Are they a real person with a real care situation (or genuinely curious about starting one)?
2. Their first name, if it comes up naturally.

VERDICTS — return exactly one each turn:
- "continue": still getting to know them. Default.
- "graduate": they are a real person who wants help coordinating care (they described a care situation, or clearly asked to get started). Your sms_response should warmly hand off — e.g. that you're opening their care thread and they can just start telling you what's going on.
- "dismiss": clearly not a fit (wrong number, pure spam, trolling). Be brief and kind; leave the door open.
- "agent": you believe you are talking to another AI or automated system — instant machine-like replies, template text, system notices, another assistant's persona, or messages addressed to a different bot. When unsure between agent and human, choose "continue" once, then decide.

RESPONSE FORMAT — return ONLY this JSON, nothing else:
{"sms_response": "<your reply>", "verdict": "continue|graduate|dismiss|agent", "name": "<their first name if learned, else omit>"}`;

export function parseDoormanResponse(raw: string): DoormanVerdict {
  const fallback: DoormanVerdict = {
    smsResponse: "",
    verdict: "continue",
  };
  if (!raw) return fallback;

  let jsonText = raw.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  const braceStart = jsonText.indexOf("{");
  const braceEnd = jsonText.lastIndexOf("}");
  if (braceStart === -1 || braceEnd <= braceStart) return fallback;

  try {
    const parsed = JSON.parse(jsonText.slice(braceStart, braceEnd + 1)) as
      Record<string, unknown>;
    const verdictRaw = String(parsed.verdict ?? "continue").toLowerCase();
    const verdict: DoormanVerdict["verdict"] =
      verdictRaw === "graduate" ||
      verdictRaw === "dismiss" ||
      verdictRaw === "agent"
        ? verdictRaw
        : "continue";
    const name = String(parsed.name ?? "").trim();
    return {
      smsResponse: String(parsed.sms_response ?? "").trim(),
      verdict,
      name: name || undefined,
    };
  } catch {
    return fallback;
  }
}

export function isVelocitySuspicious(
  inboundTimestamps: number[],
  now: number,
): boolean {
  const recent = inboundTimestamps.filter(
    (t) => now - t <= DOORMAN_VELOCITY_WINDOW_MS,
  );
  return recent.length >= DOORMAN_VELOCITY_THRESHOLD;
}
