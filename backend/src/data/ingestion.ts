import { ProviderError, type MarketDataProvider, type Quote } from "./types.js";
import { MockProvider } from "./providers/MockProvider.js";
import { getLatestSnapshot, insertSnapshot, getDistinctWatchedSymbols } from "../db/repository.js";

export interface IngestResult {
  ok: boolean;
  quote?: Quote;
  usedFallback: boolean;
  skippedReason?: "stale-or-duplicate-timestamp" | "duplicate-ingest";
}

/**
 * Fetches one quote for a symbol and writes it to price_snapshots.
 * This is the single point where "fetch once per instrument, reuse across
 * users" is enforced — see decision log's scaling model. It never fans out
 * per user.
 */
export async function ingestSymbol(
  provider: MarketDataProvider,
  symbol: string,
  fallback: MarketDataProvider = new MockProvider()
): Promise<IngestResult> {
  let quote: Quote;
  let usedFallback = false;

  try {
    quote = await provider.fetchQuote(symbol);
  } catch (err) {
    // Bounded fallback, not an indefinite retry storm: one attempt against
    // the real provider, then the seeded mock feed takes over. Logged
    // loudly on purpose — a silent fallback is exactly the kind of hidden
    // failure this project's reliability story is supposed to prevent.
    if (err instanceof ProviderError) {
      console.warn(
        `[ingestion] ${provider.name} failed for ${symbol} (${err.kind}): ${err.message} — falling back to ${fallback.name}`
      );
      quote = await fallback.fetchQuote(symbol);
      usedFallback = true;
    } else {
      console.error(`[ingestion] unexpected non-ProviderError for ${symbol}:`, err);
      throw err;
    }
  }

  // Out-of-order / duplicate protection: never let an older or identical
  // tick overwrite the newest known state for this symbol.
  const latest = await getLatestSnapshot(symbol);
  if (latest && new Date(quote.sourceTimestamp).getTime() <= new Date(latest.sourceTimestamp).getTime()) {
    return { ok: true, usedFallback, skippedReason: "stale-or-duplicate-timestamp" };
  }

  const outcome = await insertSnapshot({
    symbol: quote.symbol,
    price: quote.price,
    volume: quote.volume,
    sourceTimestamp: quote.sourceTimestamp,
    source: quote.source,
  });

  if (outcome === "duplicate") {
    return { ok: true, quote, usedFallback, skippedReason: "duplicate-ingest" };
  }

  return { ok: true, quote, usedFallback };
}

export interface IngestionCycleSummary {
  symbolCount: number;
  usedFallback: boolean;
  fallbackSymbols: string[];
}

// Rotates which symbol gets first crack at a limited request budget each
// cycle. Without this, ingestSymbol()'s calls resolve in array order —
// since a client-side rate limiter's tryAcquire() is synchronous, the same
// symbols at the front of the list would win the budget every time,
// starving whichever symbols happen to sort last.
let rotationOffset = 0;

export async function ingestAllWatchedSymbols(provider: MarketDataProvider): Promise<IngestionCycleSummary> {
  const symbols = await getDistinctWatchedSymbols();

  const rotated =
    symbols.length > 0
      ? [...symbols.slice(rotationOffset % symbols.length), ...symbols.slice(0, rotationOffset % symbols.length)]
      : symbols;
  rotationOffset = (rotationOffset + 1) % Math.max(symbols.length, 1);

  // Concurrent, but one call per distinct instrument — not per user.
  const results = await Promise.all(rotated.map((s) => ingestSymbol(provider, s)));

  // Real per-cycle outcome, not a hardcoded guess — this is what /status
  // reports, and it's only honest if it reflects what actually happened.
  const fallbackSymbols = rotated.filter((_, i) => results[i].usedFallback);
  return {
    symbolCount: rotated.length,
    usedFallback: fallbackSymbols.length > 0,
    fallbackSymbols,
  };
}
