import { NextResponse } from "next/server";
import { isCloudinaryConfigured } from "@/lib/cloudinary/server";
import { isGroqConfigured, getValidatedGroqModel } from "@/lib/groq/client";

/**
 * Passive Readiness Probe
 * Verifies that all required service integrations and configurations are present.
 * NEVER calls downstream external APIs (e.g. Groq or Cloudinary) to preserve quotas and prevent billing spikes.
 * NEVER exposes secrets, tokens, or credential strings.
 */
export async function GET() {
  const isFirebaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID.trim() !== ""
  );

  const isCloudinaryReady = isCloudinaryConfigured();
  const isGroqReady = isGroqConfigured();

  const isUpstashConfigured = Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.UPSTASH_REDIS_REST_URL.trim() !== "" &&
    process.env.UPSTASH_REDIS_REST_TOKEN.trim() !== ""
  );

  const rateLimitingMode = isUpstashConfigured
    ? "distributed"
    : process.env.NODE_ENV === "production"
      ? "unconfigured_production"
      : "local_memory_fallback";

  // System is ready if Firebase and Groq are configured
  const isReady = isFirebaseConfigured && isGroqReady;

  return NextResponse.json(
    {
      status: isReady ? "ready" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        firebase: isFirebaseConfigured ? "configured" : "missing_project_id",
        cloudinary: isCloudinaryReady ? "configured" : "unconfigured",
        groq: isGroqReady ? "configured" : "missing_api_key",
        groqModel: isGroqReady ? getValidatedGroqModel() : "none",
        rateLimiting: rateLimitingMode,
      },
    },
    {
      status: isReady ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
