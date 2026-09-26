import { NextRequest, NextResponse } from "next/server";
import { TemplateStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import { createTemplateVersion } from "@/lib/templates/versions";
import { cacheInvalidate } from "@/lib/cache/memory-cache";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  changeNote: z.string().max(512).optional(),
});

/** Publish = set active + record an auditable recipe version. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await requireAdminApiSession();
    const { id } = await params;
    const body = bodySchema.parse(await request.json().catch(() => ({})));

    const template = assertFound(
      await prisma.template.findUnique({
        where: { id },
        include: { aiModel: { include: { provider: true } } },
      }),
    );

    if (!template.prompt.trim()) {
      throw new AppError("VALIDATION_ERROR", "Prompt is required to publish");
    }
    if (!template.aiModel.isActive) {
      throw new AppError("VALIDATION_ERROR", "AI model is inactive");
    }

    const published = await prisma.$transaction(async (tx) => {
      const updated = await tx.template.update({
        where: { id },
        data: { status: TemplateStatus.active },
        include: { aiModel: { include: { provider: true } }, category: true },
      });

      await createTemplateVersion(tx, updated, {
        createdByUserId: user.id,
        changeNote: body.changeNote ?? "published",
      });

      return updated;
    });

    cacheInvalidate("public:");

    return NextResponse.json({ data: published });
  } catch (error) {
    return handleApiError(error);
  }
}
