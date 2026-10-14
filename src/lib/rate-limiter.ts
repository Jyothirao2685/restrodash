/**
 * Sliding Window Rate Limiter for Public Endpoints (QR Ordering & Tunnels)
 * Protects local SQLite POS databases from internet bot scrapers and brute-force attacks.
 */

interface RateLimitRecord {
  timestamps: number[];
  blockedUntil?: number;
}

class MemoryRateLimiter {
  private ipMap = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly blockDurationMs: number;

  constructor(options: { windowMs?: number; maxRequests?: number; blockDurationMs?: number } = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute window
    this.maxRequests = options.maxRequests || 60; // Max 60 requests per minute
    this.blockDurationMs = options.blockDurationMs || 5 * 60 * 1000; // 5-minute cooldown for abusers

    // Periodic cleanup of stale entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  public check(ip: string): { allowed: boolean; remaining: number; resetInSeconds: number; reason?: string } {
    const now = Date.now();
    let record = this.ipMap.get(ip);

    if (!record) {
      record = { timestamps: [now] };
      this.ipMap.set(ip, record);
      return { allowed: true, remaining: this.maxRequests - 1, resetInSeconds: Math.ceil(this.windowMs / 1000) };
    }

    // Check if IP is currently under temporary cooldown block
    if (record.blockedUntil && now < record.blockedUntil) {
      const waitSec = Math.ceil((record.blockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: waitSec,
        reason: `Rate limit exceeded. Temporary block active for ${waitSec}s.`,
      };
    }

    // Filter out timestamps outside the sliding window
    const windowStart = now - this.windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      // Abuser detected: apply cooldown block
      record.blockedUntil = now + this.blockDurationMs;
      const waitSec = Math.ceil(this.blockDurationMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: waitSec,
        reason: `Rate limit threshold exceeded (${this.maxRequests} req/min). Cooldown applied.`,
      };
    }

    // Allow request
    record.timestamps.push(now);
    const remaining = this.maxRequests - record.timestamps.length;
    const oldestTimestamp = record.timestamps[0];
    const resetInSeconds = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);

    return { allowed: true, remaining, resetInSeconds };
  }

  private cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    for (const [ip, record] of this.ipMap.entries()) {
      if ((!record.blockedUntil || record.blockedUntil < now) && record.timestamps.every((ts) => ts < cutoff)) {
        this.ipMap.delete(ip);
      }
    }
  }
}

// Global singleton
declare global {
  var __restrodash_rate_limiter: MemoryRateLimiter | undefined;
}

export const publicRateLimiter =
  globalThis.__restrodash_rate_limiter ?? new MemoryRateLimiter({ maxRequests: 60, windowMs: 60 * 1000 });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__restrodash_rate_limiter = publicRateLimiter;
}
