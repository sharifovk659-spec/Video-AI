import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { page, pageSize } = paginationArgs(request.nextUrl.searchParams);
    const where = { userId: session.userId };
    const [total, rows] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: { package: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: rows.map((p) => ({
        id: p.id,
        status: p.status,
        amountCents: p.amountCents,
        currency: p.currency,
        creditsToGrant: p.creditsToGrant,
        creditsGranted: p.creditsGranted,
        description: p.description,
        packageName: p.package?.name ?? null,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
      meta: paginatedMeta(total, page, pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
