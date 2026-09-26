import { NextRequest, NextResponse } from "next/server";
import { TemplateStatus } from "@prisma/client";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import {
  createTemplateVersion,
  uniqueCloneSlug,
} from "@/lib/templates/versions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Clone an existing template recipe into a new draft for quick viral variants. */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { user } = await requireAdminApiSession();
    const { id } = await params;
    const source = assertFound(
      await prisma.template.findUnique({
        where: { id },
        include: { aiModel: { include: { provider: true } } },
      }),
    );

    const slug = await uniqueCloneSlug(source.slug);

    const created = await prisma.$transaction(async (tx) => {
      const clone = await tx.template.create({
        data: {
          title: `${source.title} (copy)`,
          slug,
          description: source.description,
          categoryId: source.categoryId,
          aiModelId: source.aiModelId,
          coverUrl: source.coverUrl,
          thumbnailUrl: source.thumbnailUrl,
          previewVideoUrl: source.previewVideoUrl,
          coverStorageKey: source.coverStorageKey,
          previewStorageKey: source.previewStorageKey,
          durationSeconds: source.durationSeconds,
          aspectRatio: source.aspectRatio,
          isTrending: false,
          isNew: true,
          isPopular: false,
          isPro: source.isPro,
          creditCost: source.creditCost,
          estimatedApiCostCents: source.estimatedApiCostCents,
          prompt: source.prompt,
          negativePrompt: source.negativePrompt,
          sortOrder: source.sortOrder,
          status: TemplateStatus.draft,
          clonedFromId: source.id,
          currentVersion: 0,
        },
        include: { aiModel: { include: { provider: true } }, category: true },
      });

      await createTemplateVersion(tx, clone, {
        createdByUserId: user.id,
        changeNote: `cloned from ${source.slug}`,
      });

      return tx.template.findUniqueOrThrow({
        where: { id: clone.id },
        include: { category: true, aiModel: { include: { provider: true } } },
      });
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
