/**
 * Distributed and In-Memory Rate Limiting for Groq AI endpoints
 *
 * Architecture:
 * 1. Production Mode: Uses Upstash Redis (@upstash/redis + @upstash/ratelimit) for atomic,
 *    stateless sliding-window rate limiting across serverless Lambda instances.
 *    CRITICAL FAIL-CLOSED GUARANTEE: If Redis is unavailable or unconfigured in production,
 *    requests FAIL CLOSED (returns HTTP 503/429). It NEVER silently falls back to local memory.
 * 2. Development & Test Mode: In-memory sliding-window limiter is permitted for local development
 *    and automated offline test suites.
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { logger } from "@/lib/logger";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec?: number;
  error?: string;
  isServiceUnavailable?: boolean;
}

interface LocalRateLimitRecord {
  timestamps: number[];
}

const localRateLimitStore = new Map<string, LocalRateLimitRecord>();

// Clean up stale local entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of localRateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (record.timestamps.length === 0) {
        localRateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks whether Upstash Redis credentials are configured in the environment.
 */
export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.UPSTASH_REDIS_REST_URL.trim() !== "" &&
    process.env.UPSTASH_REDIS_REST_TOKEN.trim() !== ""
  );
}

// Lazy-loaded Redis and Ratelimit singletons
let redisInstance: Redis | null = null;
const ratelimitInstances = new Map<number, Ratelimit>();

function getUpstashRatelimit(maxRequests: number, windowSeconds: number): Ratelimit {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  const cacheKey = maxRequests * 10000 + windowSeconds;
  if (!ratelimitInstances.has(cacheKey)) {
    const limiter = new Ratelimit({
      redis: redisInstance,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      analytics: false,
      prefix: "lablens_ratelimit",
    });
    ratelimitInstances.set(cacheKey, limiter);
  }

  return ratelimitInstances.get(cacheKey)!;
}

/**
 * Synchronous in-memory sliding window check.
 * Strictly permitted ONLY in development and automated testing environments.
 */
export function checkRateLimit(
  identifier: string,
  maxRequests = 15,
  windowMs = 60000
): RateLimitResult {
  const now = Date.now();
  const record = localRateLimitStore.get(identifier) || { timestamps: [] };

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
  localRateLimitStore.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
  };
}

/**
 * Distributed rate limiter with strict production fail-closed semantics.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  maxRequests = 15,
  windowMs = 60000
): Promise<RateLimitResult> {
  const isProduction = process.env.NODE_ENV === "production";
  const upstashConfigured = isUpstashConfigured();

  if (upstashConfigured) {
    try {
      const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      const ratelimit = getUpstashRatelimit(maxRequests, windowSeconds);
      const result = await ratelimit.limit(identifier);

      if (!result.success) {
        const retryAfterSec = result.reset
          ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
          : Math.ceil(windowMs / 1000);
        return {
          allowed: false,
          remaining: result.remaining,
          retryAfterSec,
        };
      }

      return {
        allowed: true,
        remaining: result.remaining,
      };
    } catch (redisError: unknown) {
      const errorMsg = redisError instanceof Error ? redisError.message : String(redisError);
      logger.error("UPSTASH_REDIS_ERROR", {
        route: "rateLimit",
        error: errorMsg,
        details: { identifier, isProduction },
      });

      // CRITICAL: In production, FAIL CLOSED if Redis is configured but fails
      if (isProduction) {
        return {
          allowed: false,
          remaining: 0,
          error: "Rate limiting service temporarily unavailable. Request blocked for security.",
          isServiceUnavailable: true,
        };
      }

      // In non-production, log warning and allow fallback
      logger.warn("FALLBACK_TO_LOCAL_RATE_LIMIT", {
        error: errorMsg,
        details: { reason: "Non-production Redis failure" },
      });
      return checkRateLimit(identifier, maxRequests, windowMs);
    }
  }

  // If Upstash is NOT configured:
  if (isProduction) {
    // In production without Upstash configured, FAIL CLOSED to protect Groq API quota
    logger.error("PRODUCTION_RATE_LIMITER_UNCONFIGURED", {
      details: {
        error: "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured in production.",
      },
    });
    return {
      allowed: false,
      remaining: 0,
      error: "Distributed rate limiter is unconfigured in production environment.",
      isServiceUnavailable: true,
    };
  }

  // Permitted development & test fallback
  return checkRateLimit(identifier, maxRequests, windowMs);
}
