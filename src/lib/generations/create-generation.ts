import { GenerationStatus, TemplateStatus } from "@prisma/client";
import { resolveAIModelSlug, resolveAIProviderSlug } from "@/lib/ai/resolve-provider";
import { getAIProvider } from "@/lib/ai/registry";
import { getEnv } from "@/lib/config/env";
import {
  getFreeGenerationsLimit,
  reserveForGeneration,
} from "@/lib/credits/charge";
import { assertFreeGenerationPacing } from "@/lib/credits/anti-abuse";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logger";
import { kickGenerationWorker } from "@/lib/jobs/worker";
import { getOrCreateVersionForGeneration } from "@/lib/templates/versions";
import { runPreGenerationModeration } from "@/lib/moderation/pre-generation";

const log = createLogger("generations");

export type CreateGenerationParams = {
  userId: string;
  templateSlug: string;
  photoUploadId: string;
  idempotencyKey?: string | null;
  /** Allow draft templates for admin test generations */
  allowDraft?: boolean;
  /** Skip credit charge (admin test) */
  skipCharge?: boolean;
};

export async function createGenerationForUser(params: CreateGenerationParams) {
  if (params.idempotencyKey) {
    const existing = await prisma.generation.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
      include: { job: true, template: { select: { slug: true, title: true } } },
    });
    if (existing) {
      if (existing.userId !== params.userId) {
        throw new AppError("CONFLICT", "Idempotency key belongs to another user");
      }
      return existing;
    }
  }

  const template = await prisma.template.findFirst({
    where: {
      slug: params.templateSlug,
      status: params.allowDraft
        ? { in: [TemplateStatus.active, TemplateStatus.draft] }
        : TemplateStatus.active,
    },
    include: {
      aiModel: { include: { provider: true } },
    },
  });
  if (!template) {
    throw new AppError("NOT_FOUND", "Template not found");
  }
  if (template.slug === "ai-studio" && !params.allowDraft) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Use AI Studio endpoint for custom generations",
    );
  }
  if (!template.aiModel.isActive || !template.aiModel.provider.isActive) {
    throw new AppError("SERVICE_UNAVAILABLE", "Template AI model is unavailable");
  }

  await runPreGenerationModeration({
    userId: params.userId,
    templateSlug: template.slug,
    templateTitle: template.title,
    isStudio: false,
  });

  const photo = await prisma.userPhotoUpload.findFirst({
    where: { id: params.photoUploadId, userId: params.userId },
  });
  if (!photo) {
    throw new AppError("NOT_FOUND", "Photo upload not found");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
  });

  if (!params.skipCharge) {
    const freeLimit = await getFreeGenerationsLimit();
    const granted = Math.max(0, user.freeGenerationsGranted || freeLimit);
    const freeRemaining = Math.max(0, granted - user.freeGenerationsUsed);
    if (template.creditCost > 0 && freeRemaining > 0 && !user.freeQuotaBlocked) {
      assertFreeGenerationPacing(user);
    }
  }

  const version = await getOrCreateVersionForGeneration(template.id);

  const providerSlug = resolveAIProviderSlug(template.aiModel.provider.slug);
  const modelSlug = resolveAIModelSlug(
    template.aiModel.provider.slug,
    template.aiModel.slug,
  );
  const provider = getAIProvider(providerSlug);
  const estimatedCost = provider.estimateCost({
    modelSlug,
    durationSeconds: template.durationSeconds,
  });

  const env = getEnv();
  const now = new Date();

  const generation = await prisma.$transaction(async (tx) => {
    const created = await tx.generation.create({
      data: {
        userId: params.userId,
        templateId: template.id,
        templateVersionId: version.id,
        photoUploadId: photo.id,
        status: GenerationStatus.queued,
        stage: "queued",
        providerSlug: resolveAIProviderSlug(version.providerSlug),
        providerModelSlug: resolveAIModelSlug(
          version.providerSlug,
          version.modelSlug,
        ),
        estimatedProviderCostCents:
          template.estimatedApiCostCents || estimatedCost,
        idempotencyKey: params.idempotencyKey || null,
        snapshottedPrompt: version.prompt,
        snapshottedNegativePrompt: version.negativePrompt,
        durationSeconds: version.durationSeconds,
        aspectRatio: version.aspectRatio,
      },
    });

    if (!params.skipCharge) {
      const charge = await reserveForGeneration(tx, {
        userId: params.userId,
        generationId: created.id,
        creditCost: template.creditCost,
      });

      await tx.generation.update({
        where: { id: created.id },
        data: {
          creditsReserved: charge.creditsReserved,
          usedFreeQuota: charge.usedFreeQuota,
        },
      });
    }

    // Clear expiry so cleanup won't delete an in-use upload
    await tx.userPhotoUpload.update({
      where: { id: photo.id },
      data: { expiresAt: null },
    });

    await tx.generationJob.create({
      data: {
        generationId: created.id,
        status: GenerationStatus.queued,
        attempts: 0,
        maxAttempts: env.GENERATION_JOB_MAX_ATTEMPTS,
        scheduledAt: now,
        nextPollAt: now,
      },
    });

    return tx.generation.findUniqueOrThrow({
      where: { id: created.id },
      include: { job: true, template: { select: { slug: true, title: true } } },
    });
  });

  log.info("Generation created", {
    generationId: generation.id,
    provider: generation.providerSlug,
    templateVersionId: version.id,
  });

  void kickGenerationWorker();

  return generation;
}
