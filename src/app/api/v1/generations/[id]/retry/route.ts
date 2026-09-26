import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { createGenerationForUser } from "@/lib/generations/create-generation";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const previous = assertFound(
      await prisma.generation.findFirst({
        where: { id, userId: session.userId },
        include: { template: { select: { slug: true } } },
      }),
    );

    if (previous.status !== "failed" && previous.status !== "cancelled") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Only failed or cancelled generations can be retried",
          },
        },
        { status: 409 },
      );
    }

    if (!previous.photoUploadId) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Original photo is missing; upload again",
          },
        },
        { status: 422 },
      );
    }

    const idempotencyKey =
      request.headers.get("idempotency-key") ??
      `retry:${previous.id}:${Date.now()}`;

    const generation = await createGenerationForUser({
      userId: session.userId,
      templateSlug: previous.template.slug,
      photoUploadId: previous.photoUploadId,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        data: {
          id: generation.id,
          status: generation.status,
          stage: generation.stage,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
