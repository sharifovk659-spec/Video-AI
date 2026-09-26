import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { adminTemplateWriteSchema } from "@/lib/admin/template-schema";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { createTemplateVersion } from "@/lib/templates/versions";
import { cacheInvalidate } from "@/lib/cache/memory-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiSession();
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = paginationArgs(searchParams);
    const status = searchParams.get("status") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const q = searchParams.get("q")?.trim();

    const where = {
      ...(status ? { status: status as never } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { slug: { contains: q } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.template.count({ where }),
      prisma.template.findMany({
        where,
        include: { category: true, aiModel: { include: { provider: true } } },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: rows,
      meta: paginatedMeta(total, page, pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminApiSession();
    const body = adminTemplateWriteSchema.parse(await request.json());

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.template.create({
        data: {
          title: body.name,
          slug: body.slug,
          description: body.description ?? null,
          categoryId: body.categoryId,
          coverUrl: body.coverUrl ?? null,
          thumbnailUrl: body.thumbnailUrl ?? body.coverUrl ?? null,
          previewVideoUrl: body.previewVideoUrl ?? null,
          coverStorageKey: body.coverStorageKey ?? null,
          previewStorageKey: body.previewStorageKey ?? null,
          prompt: body.prompt,
          negativePrompt: body.negativePrompt ?? null,
          aiModelId: body.aiModelId,
          durationSeconds: body.durationSeconds ?? null,
          aspectRatio: body.aspectRatio ?? null,
          creditCost: body.creditCost,
          isPro: body.isPro,
          isTrending: body.isTrending,
          isNew: body.isNew,
          isPopular: body.isPopular,
          status: body.status,
          sortOrder: body.sortOrder,
          estimatedApiCostCents: body.estimatedApiCostCents,
          currentVersion: 0,
        },
        include: { aiModel: { include: { provider: true } }, category: true },
      });

      await createTemplateVersion(tx, row, {
        createdByUserId: user.id,
        changeNote: "created",
      });

      return tx.template.findUniqueOrThrow({
        where: { id: row.id },
        include: { category: true, aiModel: { include: { provider: true } } },
      });
    });

    cacheInvalidate("public:");

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
