// In-memory sliding-window rate limiter for Groq AI endpoints
//
// NOTE (Serverless Architecture Limitation):
// In-memory rate limiting operates within a single Node.js runtime process.
// In multi-instance or serverless deployments (such as Vercel scale-out), separate
// lambda instances maintain isolated memory spaces. This serves as the primary
// process-level defense against rapid looping and resource spikes.

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
}

/**
 * Checks and registers an operation against a sliding 60-second window.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests = 15,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier) || { timestamps: [] };

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, retryAfterSec),
    };
  }

  record.timestamps.push(now);
  rateLimitStore.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
  };
}
