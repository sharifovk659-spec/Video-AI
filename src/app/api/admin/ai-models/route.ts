import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const { page, pageSize } = paginationArgs(request.nextUrl.searchParams);
    const [total, rows] = await Promise.all([
      prisma.aIModel.count(),
      prisma.aIModel.findMany({
        include: { provider: true },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return NextResponse.json({ data: rows, meta: paginatedMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
