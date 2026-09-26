import { GenerationStatus } from "@prisma/client";
import { getAIProvider } from "@/lib/ai/registry";
import { getEnv } from "@/lib/config/env";
import { refundGenerationCredits, finalizeGenerationCredits } from "@/lib/credits/charge";
import { prisma } from "@/lib/db/prisma";
import { createLogger } from "@/lib/logger";
import { createUploadAccessToken } from "@/lib/uploads/signed-access";
import { composeStudioProviderPrompt } from "@/lib/studio/safety";
import {
  notifyGenerationCompleted,
  notifyGenerationFailed,
} from "@/lib/notifications/generation-telegram";
import {
  cleanupExpiredUploads,
  cleanupOrphanGeneratedVideos,
} from "@/lib/storage/cleanup";

const log = createLogger("worker");

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastCleanupAt = 0;

export function kickGenerationWorker(): void {
  if (process.env.DISABLE_WORKER_AUTO_KICK === "true") return;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void processGenerationJobs();
  }, 50);
}

export async function processGenerationJobs(limit = 5): Promise<number> {
  if (running) return 0;
  running = true;
  let processed = 0;

  try {
    if (Date.now() - lastCleanupAt > 60_000) {
      lastCleanupAt = Date.now();
      void cleanupExpiredUploads(25);
      void cleanupOrphanGeneratedVideos(10);
    }

    for (let i = 0; i < limit; i++) {
      const did = await processOneJob();
      if (!did) break;
      processed += 1;
    }
  } finally {
    running = false;
  }

  if (process.env.DISABLE_WORKER_AUTO_KICK === "true") {
    return processed;
  }

  if (processed > 0) {
    kickGenerationWorker();
  } else {
    scheduleIdlePoll();
  }

  return processed;
}

function scheduleIdlePoll() {
  if (process.env.DISABLE_WORKER_AUTO_KICK === "true") return;
  if (timer) return;
  const interval = getEnv().GENERATION_POLL_INTERVAL_MS;
  timer = setTimeout(() => {
    timer = null;
    void processGenerationJobs();
  }, interval);
}

async function claimNextJob() {
  const env = getEnv();
  const now = new Date();
  const lockUntil = new Date(now.getTime() + env.GENERATION_JOB_LOCK_MS);

  const candidate = await prisma.generationJob.findFirst({
    where: {
      status: {
        in: [GenerationStatus.queued, GenerationStatus.processing],
      },
      AND: [
        {
          OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
        },
        {
          OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }],
        },
      ],
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    include: {
      generation: {
        include: {
          template: {
            include: { aiModel: { include: { provider: true } } },
          },
          photoUpload: true,
        },
      },
    },
  });

  if (!candidate) return null;

  const claimed = await prisma.generationJob.updateMany({
    where: {
      id: candidate.id,
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    data: {
      lockedUntil: lockUntil,
      startedAt: candidate.startedAt ?? now,
    },
  });

  if (claimed.count === 0) return null;
  return candidate;
}

async function processOneJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const env = getEnv();
  const generation = job.generation;
  const started = job.startedAt ?? job.createdAt;
  const timedOut =
    Date.now() - started.getTime() > env.GENERATION_JOB_TIMEOUT_MS;

  if (timedOut) {
    await failJob(job.id, generation.id, "Generation timed out", true);
    return true;
  }

  try {
    const providerSlug =
      generation.providerSlug ?? generation.template.aiModel.provider.slug;
    const provider = getAIProvider(providerSlug);

    if (!generation.providerRequestId) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: GenerationStatus.processing,
          stage: "submitting",
        },
      });
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: GenerationStatus.processing,
          attempts: { increment: 1 },
        },
      });

      const appUrl = env.APP_URL.replace(/\/$/, "");
      const imageUrl =
        generation.photoUploadId
          ? `${appUrl}/api/v1/uploads/${generation.photoUploadId}/public?token=${encodeURIComponent(
              createUploadAccessToken(
                generation.photoUploadId,
                generation.userId,
              ),
            )}`
          : null;

      const basePrompt =
        generation.snapshottedPrompt ?? generation.template.prompt;
      const prompt =
        generation.isStudio && generation.userPrompt
          ? composeStudioProviderPrompt(basePrompt, generation.userPrompt)
          : basePrompt;

      const negativePrompt =
        generation.snapshottedNegativePrompt ??
        generation.template.negativePrompt;

      const created = await provider.createGeneration({
        generationId: generation.id,
        modelSlug:
          generation.providerModelSlug ?? generation.template.aiModel.slug,
        prompt,
        negativePrompt,
        imageUrl,
        durationSeconds:
          generation.durationSeconds ?? generation.template.durationSeconds,
        aspectRatio: generation.aspectRatio ?? generation.template.aspectRatio,
      });

      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          providerRequestId: created.providerRequestId,
          stage: "processing",
        },
      });

      await finalizeGenerationCredits(generation.id);

      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          nextPollAt: new Date(Date.now() + env.GENERATION_POLL_INTERVAL_MS),
          lockedUntil: null,
          lastError: null,
        },
      });

      return true;
    }

    const status = await provider.getGenerationStatus(generation.providerRequestId);

    if (status.status === "completed" && status.outputUrl) {
      await prisma.$transaction([
        prisma.generation.update({
          where: { id: generation.id },
          data: {
            status: GenerationStatus.completed,
            stage: "completed",
            outputUrl: status.outputUrl,
            errorMessage: null,
          },
        }),
        prisma.generationJob.update({
          where: { id: job.id },
          data: {
            status: GenerationStatus.completed,
            finishedAt: new Date(),
            lockedUntil: null,
            lastError: null,
          },
        }),
      ]);
      log.info("Generation completed", { generationId: generation.id });
      void notifyGenerationCompleted(generation.id);
      return true;
    }

    if (status.status === "failed" || status.status === "cancelled") {
      await failJob(
        job.id,
        generation.id,
        status.errorMessage ?? `Provider reported ${status.status}`,
        true,
        status.status === "cancelled"
          ? GenerationStatus.cancelled
          : GenerationStatus.failed,
      );
      return true;
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: GenerationStatus.processing,
        stage: status.stage ?? "processing",
      },
    });
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: GenerationStatus.processing,
        nextPollAt: new Date(Date.now() + env.GENERATION_POLL_INTERVAL_MS),
        lockedUntil: null,
      },
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = job.attempts + (generation.providerRequestId ? 0 : 1);
    const maxAttempts = job.maxAttempts;

    log.error("Job processing error", {
      jobId: job.id,
      message,
      attempts,
    });

    if (attempts >= maxAttempts) {
      await failJob(job.id, generation.id, message, true);
    } else {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          attempts: generation.providerRequestId ? job.attempts : attempts,
          lastError: message.slice(0, 2000),
          nextPollAt: new Date(Date.now() + env.GENERATION_POLL_INTERVAL_MS),
          lockedUntil: null,
          status: GenerationStatus.queued,
        },
      });
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: GenerationStatus.queued,
          stage: "retrying",
          errorMessage: message.slice(0, 2000),
        },
      });
    }

    return true;
  }
}

async function failJob(
  jobId: string,
  generationId: string,
  reason: string,
  refund: boolean,
  status: GenerationStatus = GenerationStatus.failed,
) {
  await prisma.$transaction([
    prisma.generation.update({
      where: { id: generationId },
      data: {
        status,
        stage: status,
        errorMessage: reason.slice(0, 2000),
      },
    }),
    prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status,
        finishedAt: new Date(),
        timedOutAt: reason.includes("timed out") ? new Date() : undefined,
        lastError: reason.slice(0, 2000),
        lockedUntil: null,
      },
    }),
  ]);

  if (refund) {
    await refundGenerationCredits(generationId);
  }

  if (status === GenerationStatus.failed) {
    void notifyGenerationFailed(generationId);
  }
}
