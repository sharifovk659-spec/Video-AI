import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminApiSession();
    const { id } = await params;
    assertFound(await prisma.template.findUnique({ where: { id } }));

    const versions = await prisma.templateVersion.findMany({
      where: { templateId: id },
      orderBy: { versionNumber: "desc" },
      take: 50,
      select: {
        id: true,
        versionNumber: true,
        createdAt: true,
        changeNote: true,
        title: true,
        providerSlug: true,
        modelSlug: true,
        creditCost: true,
        durationSeconds: true,
        aspectRatio: true,
        status: true,
        createdByUserId: true,
      },
    });

    return NextResponse.json({ data: versions });
  } catch (error) {
    return handleApiError(error);
  }
}
