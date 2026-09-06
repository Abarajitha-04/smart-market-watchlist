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
  /** Last N prices from the same window already fetched for evidence —
   *  zero extra DB cost, backs a lightweight trend sparkline in the UI. */
  recentPrices: number[];
  /** Which provider actually supplied the latest stored snapshot
   *  ("twelvedata" | "mock") — surfaced per-symbol so a provider-coverage
   *  gap (e.g. NSE/BSE requiring a paid Twelve Data plan) is visible to
   *  the user instead of silently indistinguishable from real data. */
  dataSource: string | null;
}

function isStale(sourceTimestamp: string | null): boolean {
  if (!sourceTimestamp) return true;
  return Date.now() - new Date(sourceTimestamp).getTime() > STALE_THRESHOLD_MS;
}

/**
 * Builds the watchlist view for a user AND resets each item's checkpoint —
 * this is the exact read that consumes "since you last checked" and
 * establishes the next one. See decision log: checkpoint updates on read.
 *
 * The checkpoint is scoped per-device (see migrations/002_device_baselines.sql):
 * watchlist ITEMS are shared across every device on this account (same
 * userId), but reading on one device only resets ITS OWN "since you last
 * checked" state, not every device's.
 */
export async function getWatchlistWithChanges(userId: string, deviceId: string): Promise<WatchlistEntry[]> {
  const symbols = await getWatchlistSymbols(userId);

  return Promise.all(
    symbols.map(async (symbol) => {
      const [baseline, window, latest] = await Promise.all([
        getBaseline(userId, deviceId, symbol),
        getRecentWindow(symbol, 20),
        getLatestSnapshot(symbol),
      ]);

      const evidence = evaluateChange(window, baseline);
      const stale = isStale(latest?.sourceTimestamp ?? null);

      // Reset this device's checkpoint to the latest known price now that
      // it has seen it — but only if we actually have fresh data to check.
      if (latest) {
        await upsertBaseline(userId, deviceId, symbol, latest.price);
      }

      return {
        symbol,
        price: latest?.price ?? null,
        volume: latest?.volume ?? null,
        lastUpdated: latest?.sourceTimestamp ?? null,
        isStale: stale,
        evidence,
        recentPrices: window.map((p) => p.price),
        dataSource: latest?.source ?? null,
      };
    })
  );
}

export async function getSymbolEvidence(userId: string, deviceId: string, symbol: string): Promise<Evidence> {
  const [baseline, window] = await Promise.all([getBaseline(userId, deviceId, symbol), getRecentWindow(symbol, 20)]);
  return evaluateChange(window, baseline);
}
