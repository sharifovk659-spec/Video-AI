import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Readiness: env loaded + MySQL reachable.
 * Never returns connection strings, users, or passwords.
 */
export async function GET() {
  try {
    const env = getEnv();
    if (!env.DATABASE_URL.startsWith("mysql://")) {
      return NextResponse.json(
        {
          ok: false,
          check: "ready",
          database: "misconfigured",
          engine: "expected-mysql",
        },
        { status: 503 },
      );
    }

    const rows = await prisma.$queryRaw<
      Array<{ ping: number; engine: string | null }>
    >`SELECT 1 AS ping, VERSION() AS engine`;
    const row = rows[0];
    const engine = typeof row?.engine === "string" ? row.engine : "";
    const isMysql =
      row?.ping === 1 &&
      (/mysql/i.test(engine) || /mariadb/i.test(engine) || engine.length > 0);

    if (!isMysql) {
      return NextResponse.json(
        {
          ok: false,
          check: "ready",
          database: "down",
          engine: "unknown",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      check: "ready",
      service: env.APP_NAME,
      database: "up",
      engine: "mysql",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        check: "ready",
        database: "down",
      },
      { status: 503 },
    );
  }
}
