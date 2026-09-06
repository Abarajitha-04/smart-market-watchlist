// Mirrors backend/src/engine/changeDetection.ts and
// backend/src/services/watchlistService.ts. Kept in sync by hand (no shared
// package across the two apps yet — a deliberate v1 scope cut, see README).

export type Tier = "NORMAL" | "MODERATE" | "HIGH";

export interface Evidence {
  tier: Tier;
  priceMove: number | null;
  zScore: number | null;
  volumeRatio: number | null;
  rollingVolatility: number | null;
  rollingAvgVolume: number | null;
  windowSize: number;
  historyCount: number;
  sufficientHistory: boolean;
  reason: string;
}

export interface WatchlistEntry {
  symbol: string;
  price: number | null;
  volume: number | null;
  lastUpdated: string | null;
  isStale: boolean;
  evidence: Evidence;
  recentPrices: number[];
  dataSource: string | null;
}

export interface WatchlistResponse {
  items: WatchlistEntry[];
  digest: string | null;
}

export interface SystemStatus {
  lastIngestionAt: string | null;
  lastProviderUsed: string | null;
  lastCallUsedFallback: boolean;
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
  symbol?: string;
}
