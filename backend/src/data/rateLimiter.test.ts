import { describe, it, expect } from "vitest";
import { SlidingWindowRateLimiter } from "./rateLimiter.js";

describe("SlidingWindowRateLimiter", () => {
  it("allows up to maxRequests within the window", () => {
    const limiter = new SlidingWindowRateLimiter(3, 1000);
    expect(limiter.tryAcquire(0)).toBe(true);
    expect(limiter.tryAcquire(0)).toBe(true);
    expect(limiter.tryAcquire(0)).toBe(true);
    expect(limiter.tryAcquire(0)).toBe(false);
  });

  it("frees up capacity once old requests fall outside the window", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1000);
    expect(limiter.tryAcquire(0)).toBe(true);
    expect(limiter.tryAcquire(500)).toBe(true);
    expect(limiter.tryAcquire(600)).toBe(false); // still within 1000ms of both
    expect(limiter.tryAcquire(1001)).toBe(true); // the t=0 request has aged out
  });

  it("never exceeds the limit even under a burst of simultaneous calls", () => {
    const limiter = new SlidingWindowRateLimiter(5, 1000);
    const results = Array.from({ length: 20 }, () => limiter.tryAcquire(100));
    expect(results.filter(Boolean).length).toBe(5);
  });
});
