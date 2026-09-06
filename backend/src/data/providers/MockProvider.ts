import type { MarketDataProvider, Quote } from "../types.js";

/**
 * Deterministic, seeded fake data generator.
 *
 * This is the demo-safety net: insurance against the real API rate-limiting
 * or failing during a live demo, and the thing that makes "handling stale
 * data" demonstrable rather than theoretical. Seeded per-symbol so runs are
 * reproducible for tests and for rehearsing the demo.
 */
export class MockProvider implements MarketDataProvider {
  readonly name = "mock";

  private seeds = new Map<string, number>();
  private lastPrice = new Map<string, number>();
  private tickCount = new Map<string, number>();

  constructor(
    private opts: {
      staleInjectionRate?: number; // fraction of calls that return a stale (old) timestamp
      basePrice?: (symbol: string) => number;
    } = {}
  ) {}

  private seedFor(symbol: string): number {
    if (!this.seeds.has(symbol)) {
      let hash = 0;
      for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
      this.seeds.set(symbol, hash);
    }
    return this.seeds.get(symbol)!;
  }

  private nextRandom(symbol: string): number {
    // Simple LCG seeded per symbol — deterministic, no external dependency.
    const seed = this.seedFor(symbol);
    const tick = this.tickCount.get(symbol) ?? 0;
    const x = Math.sin(seed + tick * 12.9898) * 43758.5453;
    this.tickCount.set(symbol, tick + 1);
    return x - Math.floor(x);
  }

  async fetchQuote(symbol: string): Promise<Quote> {
    const base = this.opts.basePrice?.(symbol) ?? 1000 + (this.seedFor(symbol) % 2000);
    const prev = this.lastPrice.get(symbol) ?? base;

    const r = this.nextRandom(symbol);
    // Mostly small moves, occasionally a larger one — gives the engine
    // something realistic to classify as NORMAL vs HIGH over time.
    const shock = r < 0.05 ? (this.nextRandom(symbol) - 0.5) * 0.08 : (r - 0.5) * 0.01;
    const price = Math.max(0.01, prev * (1 + shock));
    this.lastPrice.set(symbol, price);

    const volumeShock = Math.abs(shock) > 0.02 ? 3 + this.nextRandom(symbol) * 2 : 0.7 + this.nextRandom(symbol) * 0.6;
    const volume = Math.round(50000 * volumeShock);

    const staleRate = this.opts.staleInjectionRate ?? 0;
    const isStale = this.nextRandom(symbol) < staleRate;
    const sourceTimestamp = isStale
      ? new Date(Date.now() - (5 + Math.floor(this.nextRandom(symbol) * 10)) * 60 * 1000).toISOString()
      : new Date().toISOString();

    return {
      symbol,
      price: Number(price.toFixed(2)),
      volume,
      sourceTimestamp,
      source: "mock",
    };
  }
}
