import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import { processGenerationJobs } from "@/lib/jobs/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeWorker(request: Request): boolean {
  const env = getEnv();
  const expected =
    env.GENERATION_WORKER_SECRET?.trim() || env.CRON_SECRET?.trim() || "";
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

/**
 * Processes queued generation jobs (for Vercel Cron or Hostinger curl).
 * Does not log secrets or provider responses.
 */
async function runWorker() {
  const prev = process.env.DISABLE_WORKER_AUTO_KICK;
  process.env.DISABLE_WORKER_AUTO_KICK = "true";
  try {
    const processed = await processGenerationJobs(15);
    return NextResponse.json({ ok: true, processed });
  } finally {
    if (prev === undefined) {
      delete process.env.DISABLE_WORKER_AUTO_KICK;
    } else {
      process.env.DISABLE_WORKER_AUTO_KICK = prev;
    }
  }
}

export async function GET(request: Request) {
  if (!authorizeWorker(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return runWorker();
}

export async function POST(request: Request) {
  if (!authorizeWorker(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return runWorker();
}
