/**
 * Meaningful-change detection engine.
 *
 * Design rule (non-negotiable, see decision log): this module is pure,
 * deterministic, and has zero I/O and zero AI. Nothing here depends on a
 * network call, a model, or anything non-deterministic. It must be fully
 * unit-testable and fully explainable — every tier assigned here can be
 * traced back to the exact numbers that produced it.
 */

export type Tier = "NORMAL" | "MODERATE" | "HIGH";

export interface PricePoint {
  price: number;
  volume: number;
  timestamp: string; // ISO source timestamp
}

export interface Evidence {
  tier: Tier;
  priceMove: number | null; // fractional change, e.g. 0.032 = +3.2%
  zScore: number | null;
  volumeRatio: number | null;
  rollingVolatility: number | null;
  rollingAvgVolume: number | null;
  windowSize: number;
  historyCount: number;
  sufficientHistory: boolean;
  reason: string;
}

export const MIN_WINDOW = 20;

// Tiering thresholds — stated explicitly so they can be tuned in one place,
// never scattered through the codebase. See decision log for the reasoning.
const Z_HIGH = 2;
const Z_MODERATE = 1;
const VOLUME_RATIO_HIGH_WITH_MODERATE_Z = 2.5;
const VOLUME_RATIO_MODERATE = 1.5;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdDev(xs: number[]): number {
  const m = mean(xs);
  const variance = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(variance);
}

/**
 * Computes pct returns between consecutive points in a price history window.
 * history must be in chronological order (oldest first).
 */
function pctReturns(history: PricePoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].price;
    const curr = history[i].price;
    if (prev === 0 || prev == null || curr == null) continue;
    returns.push((curr - prev) / prev);
  }
  return returns;
}

/**
 * Evaluates whether the latest point in `history` represents a meaningful
 * change, relative to the rolling window that precedes it.
 *
 * @param history chronological (oldest-first) price/volume snapshots,
 *   including the current/latest point as the last element.
 * @param baselinePrice the user's last-seen price for this symbol (the
 *   checkpoint), used to compute the user-facing price move. If null,
 *   the move is computed against the previous snapshot instead.
 */
export function evaluateChange(
  history: PricePoint[],
  baselinePrice: number | null
): Evidence {
  const windowSize = MIN_WINDOW;

  if (history.length === 0) {
    return {
      tier: "NORMAL",
      priceMove: null,
      zScore: null,
      volumeRatio: null,
      rollingVolatility: null,
      rollingAvgVolume: null,
      windowSize,
      historyCount: 0,
      sufficientHistory: false,
      reason: "No data available yet.",
    };
  }

  const latest = history[history.length - 1];
  const referencePrice = baselinePrice ?? history[history.length - 2]?.price ?? null;
  const priceMove =
    referencePrice != null && referencePrice !== 0
      ? (latest.price - referencePrice) / referencePrice
      : null;

  // Cold start: not enough history to compute a defensible rolling baseline.
  // Never fabricate a tier from partial data — show raw numbers only.
  if (history.length < windowSize) {
    return {
      tier: "NORMAL",
      priceMove,
      zScore: null,
      volumeRatio: null,
      rollingVolatility: null,
      rollingAvgVolume: null,
      windowSize,
      historyCount: history.length,
      sufficientHistory: false,
      reason: `Insufficient history: ${history.length}/${windowSize} snapshots. Showing raw numbers only.`,
    };
  }

  const window = history.slice(-windowSize);
  const returns = pctReturns(window);
  const volatility = returns.length > 0 ? stdDev(returns) : 0;

  const volumes = window.slice(0, -1).map((p) => p.volume);
  const avgVolume = volumes.length > 0 ? mean(volumes) : 0;

  const zScore =
    priceMove != null && volatility > 0 ? priceMove / volatility : priceMove != null ? 0 : null;
  const volumeRatio = avgVolume > 0 ? latest.volume / avgVolume : null;

  const absZ = zScore != null ? Math.abs(zScore) : 0;
  const vr = volumeRatio ?? 0;

  let tier: Tier;
  let reason: string;

  if (absZ >= Z_HIGH || (absZ >= Z_MODERATE && vr >= VOLUME_RATIO_HIGH_WITH_MODERATE_Z)) {
    tier = "HIGH";
    reason =
      absZ >= Z_HIGH
        ? `Price move is ${absZ.toFixed(2)}x this stock's normal volatility.`
        : `Elevated price move (${absZ.toFixed(2)}x normal) combined with ${vr.toFixed(
            2
          )}x normal volume.`;
  } else if (absZ >= Z_MODERATE || vr >= VOLUME_RATIO_MODERATE) {
    tier = "MODERATE";
    reason =
      absZ >= Z_MODERATE
        ? `Price move is ${absZ.toFixed(2)}x this stock's normal volatility.`
        : `Volume is ${vr.toFixed(2)}x the recent average.`;
  } else {
    tier = "NORMAL";
    reason = "Within this stock's normal range of movement and volume.";
  }

  return {
    tier,
    priceMove,
    zScore,
    volumeRatio,
    rollingVolatility: volatility,
    rollingAvgVolume: avgVolume,
    windowSize,
    historyCount: window.length,
    sufficientHistory: true,
    reason,
  };
}
