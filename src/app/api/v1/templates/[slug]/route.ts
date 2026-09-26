import { NextRequest, NextResponse } from "next/server";
import { TemplateStatus } from "@prisma/client";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { toPublicTemplateDetail } from "@/lib/templates/public-template";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    if (slug === "ai-studio") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 },
      );
    }
    const template = assertFound(
      await prisma.template.findFirst({
        where: { slug, status: TemplateStatus.active },
        include: { category: true, aiModel: true },
      }),
      "Template not found",
    );

    return NextResponse.json({ data: toPublicTemplateDetail(template) });
  } catch (error) {
    return handleApiError(error);
  }
}
