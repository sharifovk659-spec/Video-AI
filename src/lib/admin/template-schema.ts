import { z } from "zod";
import { TemplateStatus } from "@prisma/client";

export const adminTemplateWriteSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().nullable(),
  categoryId: z.string().uuid(),
  coverUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  previewVideoUrl: z.string().url().optional().nullable(),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional().nullable(),
  aiModelId: z.string().uuid(),
  durationSeconds: z.coerce.number().int().positive().optional().nullable(),
  aspectRatio: z.string().max(16).optional().nullable(),
  creditCost: z.coerce.number().int().min(0).default(0),
  isPro: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  status: z.nativeEnum(TemplateStatus).default(TemplateStatus.draft),
  sortOrder: z.coerce.number().int().default(0),
  estimatedApiCostCents: z.coerce.number().int().min(0).default(0),
  coverStorageKey: z.string().max(512).optional().nullable(),
  previewStorageKey: z.string().max(512).optional().nullable(),
});

export const adminTemplatePatchSchema = adminTemplateWriteSchema.partial();
