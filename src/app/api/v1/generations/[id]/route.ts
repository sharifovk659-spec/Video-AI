import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { kickGenerationWorker } from "@/lib/jobs/worker";
import {
  USER_GENERATION_ERROR,
  generationProgressPercent,
} from "@/lib/generations/progress";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;

    void kickGenerationWorker();

    const generation = assertFound(
      await prisma.generation.findFirst({
        where: { id, userId: session.userId },
        include: {
          template: {
            select: { slug: true, title: true, coverUrl: true, thumbnailUrl: true },
          },
          job: true,
        },
      }),
    );

    const stage = generation.stage ?? generation.status;
    const progressHint = generationProgressPercent({
      status: generation.status,
      stage,
      createdAt: generation.createdAt,
    });
    const failed =
      generation.status === "failed" || generation.status === "cancelled";

    return NextResponse.json({
      data: {
        id: generation.id,
        status: generation.status,
        stage,
        progressHint,
        progressIsEstimate: generation.status !== "completed",
        outputUrl: generation.outputUrl,
        errorMessage: failed ? USER_GENERATION_ERROR : null,
        creditsCharged: generation.creditsCharged,
        creditsRefunded: generation.creditsRefunded,
        usedFreeQuota: generation.usedFreeQuota,
        canRetry:
          generation.status === "failed" || generation.status === "cancelled",
        createdAt: generation.createdAt.toISOString(),
        updatedAt: generation.updatedAt.toISOString(),
        template: {
          slug: generation.template.slug,
          title: generation.template.title,
          coverUrl:
            generation.template.coverUrl ?? generation.template.thumbnailUrl,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
