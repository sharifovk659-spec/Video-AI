import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin/require-admin-api";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { createGenerationForUser } from "@/lib/generations/create-generation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  photoUploadId: z.string().uuid(),
});

/** Admin test generation against draft or active template (no credit charge). */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { user } = await requireAdminApiSession();
    const { id } = await params;
    const body = bodySchema.parse(await request.json());

    const template = assertFound(
      await prisma.template.findUnique({ where: { id } }),
    );

    const generation = await createGenerationForUser({
      userId: user.id,
      templateSlug: template.slug,
      photoUploadId: body.photoUploadId,
      allowDraft: true,
      skipCharge: true,
      idempotencyKey: `admin-test-${id}-${body.photoUploadId}-${Date.now()}`,
    });

    return NextResponse.json(
      {
        data: {
          id: generation.id,
          status: generation.status,
          stage: generation.stage,
          templateSlug: generation.template.slug,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
