import { NextRequest, NextResponse } from "next/server";
import { GenerationStatus } from "@prisma/client";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors/handle-api-error";
import { createGenerationForUser } from "@/lib/generations/create-generation";
import { createStudioGeneration } from "@/lib/studio/create-studio-generation";
import { paginationArgs, paginatedMeta } from "@/lib/api/pagination";
import { prisma } from "@/lib/db/prisma";
import { kickGenerationWorker } from "@/lib/jobs/worker";

export const dynamic = "force-dynamic";

const createSchema = z.union([
  z.object({
    mode: z.literal("studio"),
    photoUploadId: z.string().uuid(),
    userPrompt: z.string().min(1),
    durationSeconds: z.coerce.number().int(),
    aspectRatio: z.string().min(1),
    idempotencyKey: z.string().min(8).max(128).optional(),
  }),
  z.object({
    mode: z.literal("template").optional(),
    templateSlug: z.string().min(1),
    photoUploadId: z.string().uuid(),
    idempotencyKey: z.string().min(8).max(128).optional(),
  }),
]);

function statusFilter(filter: string | null) {
  switch (filter) {
    case "processing":
      return {
        status: {
          in: [GenerationStatus.queued, GenerationStatus.processing],
        },
      };
    case "ready":
      return { status: GenerationStatus.completed };
    case "failed":
      return {
        status: {
          in: [GenerationStatus.failed, GenerationStatus.cancelled],
        },
      };
    default:
      return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const { page, pageSize } = paginationArgs(request.nextUrl.searchParams);
    const filter = request.nextUrl.searchParams.get("filter");

    const where = {
      userId: session.userId,
      ...statusFilter(filter),
    };

    const [total, rows] = await Promise.all([
      prisma.generation.count({ where }),
      prisma.generation.findMany({
        where,
        include: {
          template: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverUrl: true,
              thumbnailUrl: true,
              previewVideoUrl: true,
              durationSeconds: true,
              creditCost: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    void kickGenerationWorker();

    return NextResponse.json({
      data: rows.map((g) => ({
        id: g.id,
        status: g.status,
        stage: g.stage,
        outputUrl: g.outputUrl,
        errorMessage: g.errorMessage,
        creditsCharged: g.creditsCharged || g.creditsReserved,
        creditsRefunded: g.creditsRefunded,
        durationSeconds: g.durationSeconds ?? g.template.durationSeconds,
        aspectRatio: g.aspectRatio,
        isStudio: g.isStudio,
        createdAt: g.createdAt.toISOString(),
        template: {
          id: g.template.id,
          slug: g.template.slug,
          title: g.isStudio ? "AI Studio" : g.template.title,
          coverUrl: g.template.coverUrl ?? g.template.thumbnailUrl,
          previewVideoUrl: g.template.previewVideoUrl,
          creditCost: g.template.creditCost,
        },
      })),
      meta: paginatedMeta(total, page, pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await request.json());
    const idempotencyKey =
      body.idempotencyKey ??
      request.headers.get("idempotency-key") ??
      undefined;

    if (body.mode === "studio") {
      const generation = await createStudioGeneration({
        userId: session.userId,
        photoUploadId: body.photoUploadId,
        userPrompt: body.userPrompt,
        durationSeconds: body.durationSeconds,
        aspectRatio: body.aspectRatio,
        idempotencyKey,
      });
      return NextResponse.json(
        {
          data: {
            id: generation.id,
            status: generation.status,
            stage: generation.stage,
            mode: "studio",
          },
        },
        { status: 202 },
      );
    }

    const generation = await createGenerationForUser({
      userId: session.userId,
      templateSlug: body.templateSlug,
      photoUploadId: body.photoUploadId,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        data: {
          id: generation.id,
          status: generation.status,
          stage: generation.stage,
          templateSlug: generation.template.slug,
          templateTitle: generation.template.title,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
