import type { Prisma, Template, TemplateStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Tx = Prisma.TransactionClient;

export type TemplateWithModel = Template & {
  aiModel: { slug: string; provider: { slug: string } };
};

export async function createTemplateVersion(
  tx: Tx,
  template: TemplateWithModel,
  opts?: {
    createdByUserId?: string | null;
    changeNote?: string | null;
  },
) {
  const nextVersion = template.currentVersion + 1;
  const version = await tx.templateVersion.create({
    data: {
      templateId: template.id,
      versionNumber: nextVersion,
      createdByUserId: opts?.createdByUserId ?? null,
      changeNote: opts?.changeNote ?? null,
      title: template.title,
      prompt: template.prompt,
      negativePrompt: template.negativePrompt,
      aiModelId: template.aiModelId,
      providerSlug: template.aiModel.provider.slug,
      modelSlug: template.aiModel.slug,
      durationSeconds: template.durationSeconds,
      aspectRatio: template.aspectRatio,
      creditCost: template.creditCost,
      coverUrl: template.coverUrl,
      previewVideoUrl: template.previewVideoUrl,
      status: template.status,
    },
  });

  await tx.template.update({
    where: { id: template.id },
    data: { currentVersion: nextVersion },
  });

  return version;
}

const RECIPE_FIELDS = [
  "prompt",
  "negativePrompt",
  "aiModelId",
  "durationSeconds",
  "aspectRatio",
  "creditCost",
  "title",
  "coverUrl",
  "previewVideoUrl",
  "status",
] as const;

export function recipeChanged(
  before: Pick<Template, (typeof RECIPE_FIELDS)[number]>,
  after: Pick<Template, (typeof RECIPE_FIELDS)[number]>,
): boolean {
  return RECIPE_FIELDS.some((f) => before[f] !== after[f]);
}

export async function ensureLatestTemplateVersion(
  templateId: string,
  createdByUserId?: string | null,
  changeNote?: string | null,
) {
  const template = await prisma.template.findUniqueOrThrow({
    where: { id: templateId },
    include: { aiModel: { include: { provider: true } } },
  });

  if (template.currentVersion === 0) {
    return prisma.$transaction((tx) =>
      createTemplateVersion(tx, template, { createdByUserId, changeNote }),
    );
  }

  const latest = await prisma.templateVersion.findUnique({
    where: {
      templateId_versionNumber: {
        templateId,
        versionNumber: template.currentVersion,
      },
    },
  });

  if (
    !latest ||
    recipeChanged(
      {
        prompt: latest.prompt,
        negativePrompt: latest.negativePrompt,
        aiModelId: latest.aiModelId,
        durationSeconds: latest.durationSeconds,
        aspectRatio: latest.aspectRatio,
        creditCost: latest.creditCost,
        title: latest.title,
        coverUrl: latest.coverUrl,
        previewVideoUrl: latest.previewVideoUrl,
        status: latest.status,
      },
      template,
    )
  ) {
    return prisma.$transaction((tx) =>
      createTemplateVersion(tx, template, {
        createdByUserId,
        changeNote: changeNote ?? "recipe update",
      }),
    );
  }

  return latest;
}

export async function getOrCreateVersionForGeneration(templateId: string) {
  return ensureLatestTemplateVersion(templateId, null, "generation snapshot");
}

export async function uniqueCloneSlug(baseSlug: string): Promise<string> {
  const root = baseSlug.replace(/-copy(-\d+)?$/, "");
  let candidate = `${root}-copy`;
  let n = 2;
  while (await prisma.template.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-copy-${n}`;
    n += 1;
  }
  return candidate;
}

export type PublishStatus = TemplateStatus;
