import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness: process is up (no DB / full env required).
 * Use for load balancer / process supervisor checks.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    check: "health",
    service: process.env.APP_NAME?.trim() || "Vidoo AI",
    timestamp: new Date().toISOString(),
  });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
