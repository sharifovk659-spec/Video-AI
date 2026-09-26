import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = paginationArgs(searchParams);
    const status = searchParams.get("status") ?? undefined;

    const where = status ? { status: status as never } : {};

    const [total, rows] = await Promise.all([
      prisma.generation.count({ where }),
      prisma.generation.findMany({
        where,
        include: {
          user: { include: { telegramAccount: true } },
          template: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ data: rows, meta: paginatedMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
