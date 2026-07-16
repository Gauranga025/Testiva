// Simple in-memory token bucket rate limiter
// Can be swapped for Redis-backed implementation in production
interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<number, RateLimitEntry> = new Map();
  private refillInterval: number;
  private tokensPerInterval: number;

  constructor(
    private maxTokens: number = 10,
    private refillMs: number = 60_000 // 1 minute
  ) {
    this.tokensPerInterval = maxTokens;
    this.refillInterval = refillMs;
  }

  consume(userId: number, tokensToConsume: number = 1): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.buckets.get(userId);

    if (!entry) {
      this.buckets.set(userId, {
        tokens: this.maxTokens - tokensToConsume,
        lastRefill: now,
      });
      return { allowed: true, remaining: this.maxTokens - tokensToConsume, resetAt: now + this.refillInterval };
    }

    // Refill tokens based on elapsed time
    const elapsed = now - entry.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.refillInterval) * this.tokensPerInterval);
    
    if (tokensToAdd > 0) {
      entry.tokens = Math.min(this.maxTokens, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    if (entry.tokens >= tokensToConsume) {
      entry.tokens -= tokensToConsume;
      return { allowed: true, remaining: entry.tokens, resetAt: entry.lastRefill + this.refillInterval };
    }

    return { allowed: false, remaining: entry.tokens, resetAt: entry.lastRefill + this.refillInterval };
  }

  // Clean up old entries to prevent memory leak
  cleanup(maxAgeMs: number = 5 * 60_000): void {
    const now = Date.now();
    for (const [userId, entry] of this.buckets.entries()) {
      if (now - entry.lastRefill > maxAgeMs) {
        this.buckets.delete(userId);
      }
    }
  }
}

// Singleton instances for different rate limits
export const generateTestCasesLimiter = new RateLimiter(5, 60_000); // 5 requests per minute
export const runTestCasesLimiter = new RateLimiter(10, 60_000); // 10 requests per minute

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    generateTestCasesLimiter.cleanup();
    runTestCasesLimiter.cleanup();
  }, 5 * 60_000);
}
