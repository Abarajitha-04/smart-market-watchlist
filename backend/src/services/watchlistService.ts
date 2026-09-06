import { evaluateChange, type Evidence } from "../engine/changeDetection.js";
import {
  getWatchlistSymbols,
  getBaseline,
  upsertBaseline,
  getRecentWindow,
  getLatestSnapshot,
} from "../db/repository.js";

const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes during market hours — stated explicitly

export interface WatchlistEntry {
  symbol: string;
  price: number | null;
  volume: number | null;
  lastUpdated: string | null;
  isStale: boolean;
  evidence: Evidence;
}

function isStale(sourceTimestamp: string | null): boolean {
  if (!sourceTimestamp) return true;
  return Date.now() - new Date(sourceTimestamp).getTime() > STALE_THRESHOLD_MS;
}

/**
 * Builds the watchlist view for a user AND resets each item's checkpoint —
 * this is the exact read that consumes "since you last checked" and
 * establishes the next one. See decision log: checkpoint updates on read.
 */
export async function getWatchlistWithChanges(userId: string): Promise<WatchlistEntry[]> {
  const symbols = await getWatchlistSymbols(userId);

  return Promise.all(
    symbols.map(async (symbol) => {
      const [baseline, window, latest] = await Promise.all([
        getBaseline(userId, symbol),
        getRecentWindow(symbol, 20),
        getLatestSnapshot(symbol),
      ]);

      const evidence = evaluateChange(window, baseline);
      const stale = isStale(latest?.sourceTimestamp ?? null);

      // Reset the checkpoint to the latest known price now that the user
      // has seen it — but only if we actually have fresh data to check.
      if (latest) {
        await upsertBaseline(userId, symbol, latest.price);
      }

      return {
        symbol,
        price: latest?.price ?? null,
        volume: latest?.volume ?? null,
        lastUpdated: latest?.sourceTimestamp ?? null,
        isStale: stale,
        evidence,
      };
    })
  );
}

export async function getSymbolEvidence(userId: string, symbol: string): Promise<Evidence> {
  const [baseline, window] = await Promise.all([getBaseline(userId, symbol), getRecentWindow(symbol, 20)]);
  return evaluateChange(window, baseline);
}
