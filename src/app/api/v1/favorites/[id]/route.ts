import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { TemplateStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    assertFound(
      await prisma.template.findFirst({
        where: {
          id,
          status: TemplateStatus.active,
          slug: { not: "ai-studio" },
        },
      }),
      "Template not found",
    );

    await prisma.favorite.upsert({
      where: {
        userId_templateId: { userId: session.userId, templateId: id },
      },
      create: { userId: session.userId, templateId: id },
      update: {},
    });

    return NextResponse.json({ data: { favorited: true } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await prisma.favorite.deleteMany({
      where: { userId: session.userId, templateId: id },
    });
    return NextResponse.json({ data: { favorited: false } });
  } catch (error) {
    return handleApiError(error);
  }
}
