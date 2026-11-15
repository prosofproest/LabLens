import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/serverAuth";
import { getGroqClient, getValidatedGroqModel, isGroqConfigured } from "@/lib/groq/client";
import { checkDistributedRateLimit } from "@/lib/groq/rateLimit";
import { readJsonWithByteLimit, PayloadTooLargeError } from "@/lib/groq/streamLimit";

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessageInput[];
}

/**
 * Normalizes an origin candidate string into a canonical origin URL string.
 * Strips paths, trailing slashes, and lowercases the host.
 */
function normalizeOrigin(originCandidate: string): string | null {
  try {
    const url = new URL(originCandidate.trim());
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Builds the exact set of trusted origins from environment configuration.
 * Strictly avoids blanket wildcards.
 */
export function getExactTrustedOrigins(): Set<string> {
  const trusted = new Set<string>();

  // 1. Explicitly configured APP_TRUSTED_ORIGINS (comma-separated list of full origins)
  const rawList = process.env.APP_TRUSTED_ORIGINS?.trim();
  if (rawList) {
    for (const item of rawList.split(",")) {
      const normalized = normalizeOrigin(item);
      if (normalized) {
        trusted.add(normalized);
      }
    }
  }

  // 2. Canonical NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    const normalized = normalizeOrigin(appUrl);
    if (normalized) {
      trusted.add(normalized);
    }
  }

  // 3. Exact Vercel deployment URLs (never wildcard *.vercel.app)
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const normalized = normalizeOrigin(`https://${vercelUrl}`);
    if (normalized) {
      trusted.add(normalized);
    }
  }

  const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProdUrl) {
    const normalized = normalizeOrigin(`https://${vercelProdUrl}`);
    if (normalized) {
      trusted.add(normalized);
    }
  }

  return trusted;
}

/**
 * Validates that unauthenticated guest requests originate from trusted application origins.
 * In production:
 * - Requires a valid Origin or Referer header.
 * - Rejects missing, malformed, or untrusted origins.
 * - Does not trust arbitrary Host headers as a substitute for Origin.
 * In development:
 * - Preserves localhost and loopback development/testing origins.
 */
export function isTrustedGuestOrigin(req: NextRequest): boolean {
  const isDev = process.env.NODE_ENV !== "production";

  const originHeader = req.headers.get("origin")?.trim();
  const refererHeader = req.headers.get("referer")?.trim();

  let candidateOrigin: string | null = null;
  if (originHeader) {
    candidateOrigin = originHeader;
  } else if (refererHeader) {
    try {
      candidateOrigin = new URL(refererHeader).origin;
    } catch {
      return false;
    }
  } else if (isDev) {
    // In local development and testing only: allow local dev tools/scripts calling without origin
    if (req.nextUrl?.origin && req.nextUrl.origin !== "null") {
      candidateOrigin = req.nextUrl.origin;
    } else if (req.url) {
      try {
        candidateOrigin = new URL(req.url).origin;
      } catch {
        return false;
      }
    }
  }

  // Unauthenticated requests missing identifiable origin are strictly rejected
  if (!candidateOrigin) {
    return false;
  }

  const normalizedCandidate = normalizeOrigin(candidateOrigin);
  if (!normalizedCandidate) {
    return false;
  }

  let candidateUrl: URL;
  try {
    candidateUrl = new URL(normalizedCandidate);
  } catch {
    return false;
  }

  const hostname = candidateUrl.hostname.toLowerCase();

  // Local development and loopback origins (strictly allowed only in non-production)
  if (isDev) {
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1"
    ) {
      return true;
    }
  }

  // Exact matching against configured trusted origins allowlist
  const trustedOrigins = getExactTrustedOrigins();
  if (trustedOrigins.has(normalizedCandidate)) {
    return true;
  }

  return false;
}

const SYSTEM_CHAT_PROMPT = `You are LabLens Assistant, an intelligent, safety-conscious academic laboratory assistant for LabLens AI.
Your role is to guide students, faculty, and lab personnel regarding equipment fault reporting, symptom diagnosis, laboratory procedures, and safety precautions.

MANDATORY SAFETY PROTOCOL:
1. NEVER instruct the user to open device casings, dismantle power supplies, touch internal components or capacitors, use multimeter probes on live circuits, or attempt physical repairs.
2. ONLY recommend powering off at the wall outlet if it is safe to do so without touching exposed, sparking, or hot components.
3. ALWAYS instruct the user to maintain a safe physical distance, keep others away from the station, post an out-of-order notice, and wait for authorized departmental technical staff.

SCOPE & DATA PRIVACY:
- You do not perform live database queries. If a user asks about the status of a specific personal ticket, instruct them to log into their account and visit their authenticated Dashboard (/dashboard) to view live technician assignments and updates.
- Keep responses concise, structured, and easy to read on mobile and desktop screens.`;

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce 32 KB request size limit before parsing
    let body: Partial<ChatRequestBody>;
    try {
      body = await readJsonWithByteLimit<Partial<ChatRequestBody>>(req, 32 * 1024);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json({ error: err.message }, { status: 413 });
      }
      return NextResponse.json(
        { error: `Invalid request payload: ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 }
      );
    }

    // 2. Authentication Enforcement:
    // If Authorization header is provided, it MUST be valid. If invalid, reject with 401.
    // If omitted, support guest access with IP rate limiting. Never trust a client-supplied UID.
    const authHeader = req.headers.get("authorization");
    let rateLimitKey: string;

    if (authHeader) {
      if (!authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Authentication malformed. Bearer token required." },
          { status: 401 }
        );
      }
      const token = authHeader.substring(7).trim();
      try {
        const verified = await verifyFirebaseIdToken(token);
        rateLimitKey = `user_${verified.uid}`;
      } catch (authError: unknown) {
        const message = authError instanceof Error ? authError.message : "Invalid token.";
        return NextResponse.json(
          { error: `Unauthorized: ${message}` },
          { status: 401 }
        );
      }
    } else {
      // Guest client: Validate origin to block cross-site abuse, then rate-limit by client IP
      if (!isTrustedGuestOrigin(req)) {
        return NextResponse.json(
          { error: "Forbidden: Request origin is not permitted for unauthenticated guest access." },
          { status: 403 }
        );
      }

      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "guest_client";
      rateLimitKey = `ip_${clientIp}`;
    }

    // 3. Enforce Distributed Rate Limiting (15 chat messages per minute)
    const rateCheck = await checkDistributedRateLimit(rateLimitKey, 15, 60000);
    if (!rateCheck.allowed) {
      if (rateCheck.isServiceUnavailable) {
        return NextResponse.json(
          { error: rateCheck.error || "Rate limiting service temporarily unavailable." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error: `Chat rate limit reached. Please wait ${rateCheck.retryAfterSec || 30} seconds before sending another message.`,
        },
        { status: 429 }
      );
    }

    // 4. Validate messages payload
    const { messages } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid messages array in request body." },
        { status: 400 }
      );
    }

    // Enforce history length constraint (max 6 messages / 3 conversational turns)
    if (messages.length > 6) {
      return NextResponse.json(
        { error: "Conversation history exceeds the maximum limit of 6 messages." },
        { status: 400 }
      );
    }

    // Validate individual messages
    const sanitizedMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    for (const msg of messages) {
      if (
        !msg ||
        typeof msg !== "object" ||
        (msg.role !== "user" && msg.role !== "assistant") ||
        typeof msg.content !== "string" ||
        msg.content.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "Each message must have role 'user' or 'assistant' and non-empty content." },
          { status: 400 }
        );
      }

      // Enforce 1,000 character limit per message
      if (msg.content.length > 1000) {
        return NextResponse.json(
          { error: "Message content exceeds the 1,000 character limit." },
          { status: 400 }
        );
      }

      sanitizedMessages.push({
        role: msg.role,
        content: msg.content.trim(),
      });
    }

    // 5. Verify Groq availability
    if (!isGroqConfigured()) {
      return NextResponse.json(
        {
          error:
            "Groq AI service is not configured on the server. Please configure GROQ_API_KEY in .env.local.",
        },
        { status: 503 }
      );
    }

    const model = getValidatedGroqModel();
    const groq = getGroqClient();

    // 6. Execute Groq completion with server-enforced system prompt
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_CHAT_PROMPT },
        ...sanitizedMessages,
      ],
      max_tokens: 600,
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error("Empty response returned from Groq AI.");
    }

    return NextResponse.json(
      {
        success: true,
        reply,
        model,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("API /api/chat error:", error);
    const message =
      error instanceof Error ? error.message : "AI assistant is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
