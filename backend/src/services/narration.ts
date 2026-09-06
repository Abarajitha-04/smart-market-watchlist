import type { WatchlistEntry } from "./watchlistService.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 5_000;
const MAX_DIGEST_LENGTH = 220;

/**
 * Optional one-line AI digest ("2 stocks worth a look since you last
 * checked"). Non-negotiable rule from the decision log: AI sits strictly
 * after the deterministic decision, never inside it. This function cannot
 * change any tier, cannot see anything the engine didn't already compute,
 * and its only possible outputs are a short string or null. Every caller
 * treats null identically to "AI unavailable" — the product is fully
 * correct and demoable with GROQ_API_KEY unset entirely.
 */
export async function generateDigest(entries: WatchlistEntry[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const flagged = entries.filter((e) => e.evidence.tier !== "NORMAL" && e.evidence.sufficientHistory);
  if (flagged.length === 0) return null; // Nothing to narrate — save the call entirely.

  const facts = flagged
    .map((e) => `${e.symbol}: ${e.evidence.tier}, ${e.evidence.reason}`)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 80,
        messages: [
          {
            role: "system",
            content:
              "You narrate stock watchlist alerts in one short, plain sentence (under 30 words). " +
              "You are only allowed to restate the facts given — never invent a number, cause, or " +
              "news event that isn't in the input. No markdown, no emoji, no preamble.",
          },
          { role: "user", content: facts },
        ],
      }),
    });

    if (!res.ok) {
      console.warn(`[narration] Groq returned ${res.status} — falling back to raw numbers`);
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    return text.length > MAX_DIGEST_LENGTH ? `${text.slice(0, MAX_DIGEST_LENGTH)}…` : text;
  } catch (err) {
    // Timeout, network failure, malformed response — all identical to the
    // user: no digest today, the deterministic summary still renders.
    console.warn("[narration] Groq call failed, failing open:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
