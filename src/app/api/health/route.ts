import { NextResponse } from "next/server";

/**
 * Lightweight Liveness Health Probe
 * Returns HTTP 200 immediately without executing any database or external AI API calls.
 * Used for automated uptime monitors, container orchestrators, and load balancer pings.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

