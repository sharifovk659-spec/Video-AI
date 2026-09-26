import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import { handleApiError } from "@/lib/errors/handle-api-error";

export const dynamic = "force-dynamic";

/**
 * Liveness: process is up (no DB required).
 * Use for load balancer / process supervisor checks.
 */
export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      check: "health",
      service: getEnv().APP_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
