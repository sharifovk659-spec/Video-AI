import type { Template, TemplateCategory, AIModel } from "@prisma/client";

export type PublicTemplateListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  previewVideoUrl: string | null;
  durationSeconds: number | null;
  aspectRatio: string | null;
  isPro: boolean;
  isTrending: boolean;
  isNew: boolean;
  isPopular?: boolean;
  isFavorite?: boolean;
  creditCost: number;
  sortOrder: number;
  category: {
    id: string;
    slug: string;
    name: string;
  };
};

export type PublicTemplateDetail = PublicTemplateListItem & {
  aiModel: {
    id: string;
    slug: string;
    name: string;
  };
};

type TemplateWithRelations = Template & {
  category: TemplateCategory;
  aiModel?: AIModel;
};

export function toPublicTemplateListItem(
  template: TemplateWithRelations,
): PublicTemplateListItem {
  return {
    id: template.id,
    slug: template.slug,
    title: template.title,
    description: template.description,
    coverUrl: template.coverUrl ?? template.thumbnailUrl,
    thumbnailUrl: template.thumbnailUrl,
    previewVideoUrl: template.previewVideoUrl,
    durationSeconds: template.durationSeconds,
    aspectRatio: template.aspectRatio,
    isPro: template.isPro,
    isTrending: template.isTrending,
    isNew: template.isNew,
    isPopular: template.isPopular,
    creditCost: template.creditCost,
    sortOrder: template.sortOrder,
    category: {
      id: template.category.id,
      slug: template.category.slug,
      name: template.category.name,
    },
  };
}

export function toPublicTemplateDetail(
  template: TemplateWithRelations & { aiModel: AIModel },
): PublicTemplateDetail {
  return {
    ...toPublicTemplateListItem(template),
    aiModel: {
      id: template.aiModel.id,
      slug: template.aiModel.slug,
      name: template.aiModel.name,
    },
  };
}

export const publicTemplateSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverUrl: true,
  thumbnailUrl: true,
  previewVideoUrl: true,
  durationSeconds: true,
  aspectRatio: true,
  isPro: true,
  isTrending: true,
  isNew: true,
  isPopular: true,
  creditCost: true,
  sortOrder: true,
  category: {
    select: { id: true, slug: true, name: true },
  },
} as const;
