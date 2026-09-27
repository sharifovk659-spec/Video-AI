import { getOrCreateVersionForGeneration } from "@/lib/templates/versions";
import { validateStudioInput } from "@/lib/studio/safety";
import { reserveForGeneration } from "@/lib/credits/charge";
import { resolveAIModelSlug, resolveAIProviderSlug } from "@/lib/ai/resolve-provider";
import { getAIProvider } from "@/lib/ai/registry";
import { getEnv } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logger";
import { kickGenerationWorker } from "@/lib/jobs/worker";
import { GenerationStatus, PaymentStatus, TemplateStatus } from "@prisma/client";
import { runPreGenerationModeration } from "@/lib/moderation/pre-generation";

const log = createLogger("studio");
const STUDIO_TEMPLATE_SLUG = "ai-studio";

export async function assertStudioEligible(userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      creditWallet: true,
      payments: {
        where: { status: PaymentStatus.paid },
        take: 1,
        select: { id: true },
      },
      subscriptions: {
        where: { status: "active" },
        take: 1,
        select: { id: true },
      },
    },
  });

  if (user.isBlocked) {
    throw new AppError("FORBIDDEN", "Account is blocked");
  }

  const setting = await prisma.appSetting.findUnique({
    where: { key: "studio_min_credits" },
  });
  const minCredits = typeof setting?.value === "number" ? setting.value : 1;
  const balance = user.creditWallet?.balance ?? 0;
  const eligible =
    balance >= minCredits ||
    user.payments.length > 0 ||
    user.subscriptions.length > 0;

  if (!eligible) {
    throw new AppError(
      "FORBIDDEN",
      "AI Studio requires credits or a paid plan. Buy credits to unlock.",
    );
  }
}

export async function getStudioCreditCost(): Promise<number> {
  const setting = await prisma.appSetting.findUnique({
    where: { key: "studio_credit_cost" },
  });
  if (typeof setting?.value === "number" && setting.value >= 0) {
    return setting.value;
  }
  const template = await prisma.template.findUnique({
    where: { slug: STUDIO_TEMPLATE_SLUG },
    select: { creditCost: true },
  });
  return template?.creditCost ?? 5;
}

export async function createStudioGeneration(params: {
  userId: string;
  photoUploadId: string;
  userPrompt: string;
  durationSeconds: number;
  aspectRatio: string;
  idempotencyKey?: string | null;
}) {
  await assertStudioEligible(params.userId);

  let safe;
  try {
    safe = validateStudioInput({
      userPrompt: params.userPrompt,
      durationSeconds: params.durationSeconds,
      aspectRatio: params.aspectRatio,
    });
  } catch (error) {
    throw new AppError(
      "VALIDATION_ERROR",
      error instanceof Error ? error.message : "Invalid studio input",
    );
  }

  await runPreGenerationModeration({
    userId: params.userId,
    templateSlug: STUDIO_TEMPLATE_SLUG,
    templateTitle: "AI Studio",
    userPrompt: safe.userPrompt,
    isStudio: true,
  });

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
    where: { slug: STUDIO_TEMPLATE_SLUG, status: TemplateStatus.active },
    include: { aiModel: { include: { provider: true } } },
  });
  if (!template) {
    throw new AppError("SERVICE_UNAVAILABLE", "AI Studio is not configured");
  }

  const photo = await prisma.userPhotoUpload.findFirst({
    where: { id: params.photoUploadId, userId: params.userId },
  });
  if (!photo) {
    throw new AppError("NOT_FOUND", "Photo upload not found");
  }

  const creditCost = await getStudioCreditCost();
  const version = await getOrCreateVersionForGeneration(template.id);
  const providerSlug = resolveAIProviderSlug(template.aiModel.provider.slug);
  const modelSlug = resolveAIModelSlug(
    template.aiModel.provider.slug,
    template.aiModel.slug,
  );
  const provider = getAIProvider(providerSlug);
  const estimatedCost = provider.estimateCost({
    modelSlug,
    durationSeconds: safe.durationSeconds,
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
        userPrompt: safe.userPrompt,
        durationSeconds: safe.durationSeconds,
        aspectRatio: safe.aspectRatio,
        isStudio: true,
      },
    });

    const charge = await reserveForGeneration(tx, {
      userId: params.userId,
      generationId: created.id,
      creditCost,
    });

    await tx.generation.update({
      where: { id: created.id },
      data: {
        creditsReserved: charge.creditsReserved,
        usedFreeQuota: charge.usedFreeQuota,
      },
    });

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

  log.info("Studio generation created", { generationId: generation.id });
  void kickGenerationWorker();
  return generation;
}
