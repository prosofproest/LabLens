import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/serverAuth";
import { getGroqClient, getValidatedGroqModel, isGroqConfigured } from "@/lib/groq/client";
import { checkRateLimit } from "@/lib/groq/rateLimit";
import { readJsonWithByteLimit, PayloadTooLargeError } from "@/lib/groq/streamLimit";

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessageInput[];
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
      // Guest client: Rate-limit by client IP
      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "guest_client";
      rateLimitKey = `ip_${clientIp}`;
    }

    // 3. Enforce Rate Limiting (15 chat messages per minute)
    const rateCheck = checkRateLimit(rateLimitKey, 15, 60000);
    if (!rateCheck.allowed) {
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
