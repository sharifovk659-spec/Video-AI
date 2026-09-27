import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { serializeAdminUserListItem } from "@/lib/admin/serialize-admin-user";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const { page, pageSize } = paginationArgs(request.nextUrl.searchParams);
    const q = request.nextUrl.searchParams.get("q")?.trim();

    const where = q
      ? {
          OR: [
            { telegramAccount: { username: { contains: q } } },
            { telegramAccount: { firstName: { contains: q } } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: { telegramAccount: true, creditWallet: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: rows.map(serializeAdminUserListItem),
      meta: paginatedMeta(total, page, pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
