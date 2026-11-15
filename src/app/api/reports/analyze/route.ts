import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken, VerifiedFirebaseToken } from "@/lib/firebase/serverAuth";
import { isGroqConfigured } from "@/lib/groq/client";
import { analyzeFaultReport, createUnavailableAiAnalysis, TriageInput } from "@/lib/groq/triage";
import { checkDistributedRateLimit } from "@/lib/groq/rateLimit";
import { readJsonWithByteLimit, PayloadTooLargeError } from "@/lib/groq/streamLimit";

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce 32 KB request size limit by counting chunks on the actual stream
    let body: Partial<TriageInput>;
    try {
      body = await readJsonWithByteLimit<Partial<TriageInput>>(req, 32 * 1024);
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json({ error: err.message }, { status: 413 });
      }
      return NextResponse.json(
        { error: `Invalid request payload: ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 }
      );
    }

    // 2. Enforce Authentication: Verify Firebase ID Token on the server
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required. Missing or malformed Authorization header." },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required. Bearer token is empty." },
        { status: 401 }
      );
    }

    let verifiedUser: VerifiedFirebaseToken;
    try {
      verifiedUser = await verifyFirebaseIdToken(token);
    } catch (authError: unknown) {
      const message = authError instanceof Error ? authError.message : "Token validation failed.";
      return NextResponse.json({ error: `Unauthorized: ${message}` }, { status: 401 });
    }

    // 3. Enforce Distributed Rate Limiting (15 triage requests per minute per authenticated user)
    const rateCheck = await checkDistributedRateLimit(`triage_${verifiedUser.uid}`, 15, 60000);
    if (!rateCheck.allowed) {
      if (rateCheck.isServiceUnavailable) {
        return NextResponse.json(
          { error: rateCheck.error || "Rate limiting service temporarily unavailable." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${rateCheck.retryAfterSec || 30} seconds before requesting AI triage.`,
        },
        { status: 429 }
      );
    }

    // 4. Validate input fields
    const { equipmentName, assetId, labName, description } = body;

    if (
      !equipmentName || typeof equipmentName !== "string" || equipmentName.trim().length < 2 ||
      !assetId || typeof assetId !== "string" || assetId.trim().length < 2 ||
      !labName || typeof labName !== "string" || labName.trim().length < 2 ||
      !description || typeof description !== "string" || description.trim().length < 5
    ) {
      return NextResponse.json(
        { error: "Missing or invalid report attributes for symptom triage." },
        { status: 400 }
      );
    }

    // 5. If Groq is not configured, gracefully return an unavailable analysis
    if (!isGroqConfigured()) {
      return NextResponse.json(
        {
          success: true,
          analysis: createUnavailableAiAnalysis(
            "Groq AI is not configured on the server. Please add GROQ_API_KEY to .env.local."
          ),
        },
        { status: 200 }
      );
    }

    // 6. Execute Groq AI triage
    const analysis = await analyzeFaultReport({
      equipmentName: equipmentName.trim(),
      assetId: assetId.trim().toUpperCase(),
      labName: labName.trim(),
      description: description.trim(),
    });

    return NextResponse.json({ success: true, analysis }, { status: 200 });
  } catch (error: unknown) {
    console.error("API /api/reports/analyze error:", error);
    // Even if an unexpected error occurs, return an unavailable analysis so client never blocks
    return NextResponse.json(
      { success: true, analysis: createUnavailableAiAnalysis() },
      { status: 200 }
    );
  }
}
