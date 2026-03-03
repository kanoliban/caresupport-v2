export function splitIntoBubbles(text: string, maxLen = 450, minLen = 40): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const paragraphs = trimmed
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const bubbles: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxLen) {
      bubbles.push(paragraph);
      continue;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let current = "";
    for (const sentence of sentences) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length > maxLen && current) {
        bubbles.push(current);
        current = sentence;
      } else {
        current = candidate;
      }
    }

    if (current) {
      if (current.length < minLen && bubbles.length > 0) {
        bubbles[bubbles.length - 1] = `${bubbles[bubbles.length - 1]} ${current}`.trim();
      } else {
        bubbles.push(current);
      }
    }
  }

  if (bubbles.length > 5) {
    return [...bubbles.slice(0, 4), bubbles.slice(4).join("\n\n")];
  }

  return bubbles;
}
