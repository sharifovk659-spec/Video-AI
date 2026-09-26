import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const writeSchema = z.object({
  slug: z.string().min(1).max(128),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const { page, pageSize } = paginationArgs(request.nextUrl.searchParams);
    const [total, rows] = await Promise.all([
      prisma.templateCategory.count(),
      prisma.templateCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return NextResponse.json({ data: rows, meta: paginatedMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const body = writeSchema.parse(await request.json());
    const created = await prisma.templateCategory.create({ data: body });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
