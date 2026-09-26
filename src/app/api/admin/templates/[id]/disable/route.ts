import { NextResponse } from "next/server";
import { TemplateStatus } from "@prisma/client";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { cacheInvalidate } from "@/lib/cache/memory-cache";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Immediately disable a template (archived) — removes from Mini App catalog. */
export async function POST(_request: Request, { params }: Params) {
  try {
    await requireAdminApiSession();
    const { id } = await params;
    assertFound(await prisma.template.findUnique({ where: { id } }));

    const updated = await prisma.template.update({
      where: { id },
      data: { status: TemplateStatus.archived },
      include: { category: true, aiModel: true },
    });

    cacheInvalidate("public:");

    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
