/**
 * Sliding-window rate limiter for outgoing calls to a metered provider.
 *
 * Twelve Data's free tier allows 8 API credits/minute. Without this, every
 * ingestion cycle fires one concurrent request per watched symbol; once
 * you're tracking more than ~8 symbols, most of them get a real 429 from
 * the provider every single cycle — wasting quota on calls we could have
 * known would fail, and starving the same symbols every time since
 * Promise.all resolves the budget in array order.
 *
 * tryAcquire() is a synchronous, in-memory check: no network cost to find
 * out we're over budget, so a rejected symbol goes straight to the
 * existing fallback path instead of wasting a request.
 */
export class SlidingWindowRateLimiter {
  private timestamps: number[] = [];

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  tryAcquire(now: number = Date.now()): boolean {
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxRequests) return false;
    this.timestamps.push(now);
    return true;
  }
}
