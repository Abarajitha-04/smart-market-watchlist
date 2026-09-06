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
    // the real provider, then the seeded mock feed takes over silently.
    if (err instanceof ProviderError) {
      quote = await fallback.fetchQuote(symbol);
      usedFallback = true;
    } else {
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

export async function ingestAllWatchedSymbols(provider: MarketDataProvider): Promise<void> {
  const symbols = await getDistinctWatchedSymbols();
  // Concurrent, but one call per distinct instrument — not per user.
  await Promise.all(symbols.map((s) => ingestSymbol(provider, s)));
}
