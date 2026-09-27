import { z } from "zod";
import { TemplateStatus } from "@prisma/client";

const mediaUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      value.startsWith("/") || z.string().url().safeParse(value).success,
    "Must be an absolute URL or a site path",
  )
  .optional()
  .nullable();

export const adminTemplateWriteSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(128).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional().nullable(),
  categoryId: z.string().uuid(),
  coverUrl: mediaUrlSchema,
  thumbnailUrl: mediaUrlSchema,
  previewVideoUrl: mediaUrlSchema,
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
