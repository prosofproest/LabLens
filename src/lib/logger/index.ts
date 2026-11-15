/**
 * Structured Server-Side Logger for LabLens AI
 *
 * Enforces JSON structured logging with automatic credential and secret redaction.
 * NEVER prints passwords, Bearer tokens, or external API secrets in server outputs.
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  route?: string;
  userUid?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
  error?: string;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /api[_-]?key/i,
  /credential/i,
  /private[_-]?key/i,
  /auth/i,
  /cookie/i,
];

/**
 * Recursively redacts sensitive values from objects or arrays.
 */
export function redactSensitiveData(data: unknown, depth = 0): unknown {
  if (depth > 6 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Redact Bearer tokens embedded in string values
    if (data.toLowerCase().startsWith("bearer ")) {
      return "Bearer [REDACTED]";
    }
    // Redact potential JWT structures (three dot-separated base64url segments)
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data)) {
      return "[REDACTED_JWT]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof data === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitiveData(value, depth + 1);
      }
    }
    return redacted;
  }

  return data;
}

function formatLog(level: LogLevel, event: string, metadata: Partial<Omit<LogEntry, "timestamp" | "level" | "event">> = {}): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    route: metadata.route,
    userUid: metadata.userUid,
    durationMs: metadata.durationMs,
    details: metadata.details ? (redactSensitiveData(metadata.details) as Record<string, unknown>) : undefined,
    error: metadata.error ? String(metadata.error) : undefined,
  };

  return JSON.stringify(entry);
}

export const logger = {
  info(event: string, metadata?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>) {
    console.log(formatLog("info", event, metadata));
  },
  warn(event: string, metadata?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>) {
    console.warn(formatLog("warn", event, metadata));
  },
  error(event: string, metadata?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>) {
    console.error(formatLog("error", event, metadata));
  },
  debug(event: string, metadata?: Partial<Omit<LogEntry, "timestamp" | "level" | "event">>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", event, metadata));
    }
  },
};

