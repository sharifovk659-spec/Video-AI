import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { adminTemplatePatchSchema } from "@/lib/admin/template-schema";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import {
  createTemplateVersion,
  recipeChanged,
} from "@/lib/templates/versions";
import { cacheInvalidate } from "@/lib/cache/memory-cache";
import { deleteTemplateMedia } from "@/lib/uploads/template-media-storage";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminApiSession();
    const { id } = await params;
    const template = assertFound(
      await prisma.template.findUnique({
        where: { id },
        include: {
          category: true,
          aiModel: { include: { provider: true } },
          versions: {
            orderBy: { versionNumber: "desc" },
            take: 10,
            select: {
              id: true,
              versionNumber: true,
              createdAt: true,
              changeNote: true,
              providerSlug: true,
              modelSlug: true,
            },
          },
        },
      }),
    );
    return NextResponse.json({ data: template });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { user } = await requireAdminApiSession();
    const { id } = await params;
    const body = adminTemplatePatchSchema.parse(await request.json());

    const before = assertFound(
      await prisma.template.findUnique({
        where: { id },
        include: { aiModel: { include: { provider: true } } },
      }),
    );

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.template.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { title: body.name } : {}),
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
          ...(body.categoryId !== undefined
            ? { categoryId: body.categoryId }
            : {}),
          ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl } : {}),
          ...(body.thumbnailUrl !== undefined
            ? { thumbnailUrl: body.thumbnailUrl }
            : {}),
          ...(body.previewVideoUrl !== undefined
            ? { previewVideoUrl: body.previewVideoUrl }
            : {}),
          ...(body.coverStorageKey !== undefined
            ? { coverStorageKey: body.coverStorageKey }
            : {}),
          ...(body.previewStorageKey !== undefined
            ? { previewStorageKey: body.previewStorageKey }
            : {}),
          ...(body.prompt !== undefined ? { prompt: body.prompt } : {}),
          ...(body.negativePrompt !== undefined
            ? { negativePrompt: body.negativePrompt }
            : {}),
          ...(body.aiModelId !== undefined ? { aiModelId: body.aiModelId } : {}),
          ...(body.durationSeconds !== undefined
            ? { durationSeconds: body.durationSeconds }
            : {}),
          ...(body.aspectRatio !== undefined
            ? { aspectRatio: body.aspectRatio }
            : {}),
          ...(body.creditCost !== undefined
            ? { creditCost: body.creditCost }
            : {}),
          ...(body.isPro !== undefined ? { isPro: body.isPro } : {}),
          ...(body.isTrending !== undefined
            ? { isTrending: body.isTrending }
            : {}),
          ...(body.isNew !== undefined ? { isNew: body.isNew } : {}),
          ...(body.isPopular !== undefined
            ? { isPopular: body.isPopular }
            : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.sortOrder !== undefined
            ? { sortOrder: body.sortOrder }
            : {}),
          ...(body.estimatedApiCostCents !== undefined
            ? { estimatedApiCostCents: body.estimatedApiCostCents }
            : {}),
        },
        include: {
          aiModel: { include: { provider: true } },
          category: true,
        },
      });

      if (
        recipeChanged(before, row) ||
        body.prompt !== undefined ||
        body.aiModelId !== undefined
      ) {
        await createTemplateVersion(tx, row, {
          createdByUserId: user.id,
          changeNote: "updated",
        });
      }

      return row;
    });

    cacheInvalidate("public:");

    if (
      body.coverStorageKey !== undefined &&
      body.coverStorageKey !== before.coverStorageKey
    ) {
      await deleteTemplateMedia(before.coverStorageKey);
    }
    if (
      body.previewStorageKey !== undefined &&
      body.previewStorageKey !== before.previewStorageKey
    ) {
      await deleteTemplateMedia(before.previewStorageKey);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminApiSession();
    const { id } = await params;
    await prisma.template.delete({ where: { id } });
    cacheInvalidate("public:");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
