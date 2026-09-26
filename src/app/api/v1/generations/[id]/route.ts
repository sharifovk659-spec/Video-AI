import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { handleApiError, assertFound } from "@/lib/errors/handle-api-error";
import { prisma } from "@/lib/db/prisma";
import { kickGenerationWorker } from "@/lib/jobs/worker";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const STAGE_PROGRESS: Record<string, number> = {
  queued: 10,
  submitting: 20,
  retrying: 25,
  processing: 55,
  rendering: 75,
  completed: 100,
  failed: 100,
  cancelled: 100,
};

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
    const progressHint = STAGE_PROGRESS[stage] ?? STAGE_PROGRESS[generation.status] ?? 15;

    return NextResponse.json({
      data: {
        id: generation.id,
        status: generation.status,
        stage,
        progressHint,
        progressIsEstimate: true,
        outputUrl: generation.outputUrl,
        errorMessage: generation.errorMessage,
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
