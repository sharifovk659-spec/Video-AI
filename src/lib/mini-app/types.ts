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
  category: { id: string; slug: string; name: string };
};

export type MeUser = {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isPremium: boolean;
  photoUrl?: string | null;
  creditBalance: number;
  creditsReserved?: number;
  freeGenerationsUsed: number;
  freeGenerationsGranted?: number;
  freeGenerationsRemaining?: number;
  freeQuotaBlocked?: boolean;
  videosGenerated?: number;
  plan?: string;
  isAdmin: boolean;
};

export type HomeSection = {
  key: string;
  title: string;
  templates: PublicTemplateListItem[];
};

export type GenerationListItem = {
  id: string;
  status: string;
  stage: string | null;
  outputUrl: string | null;
  errorMessage?: string | null;
  creditsCharged: number;
  creditsRefunded?: boolean;
  durationSeconds: number | null;
  aspectRatio: string | null;
  isStudio: boolean;
  createdAt: string;
  template: {
    id: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    previewVideoUrl?: string | null;
    creditCost: number;
  };
};

export type StudioConfig = {
  eligible: boolean;
  reason: string | null;
  creditCost: number;
  maxPromptLength: number;
  minPromptLength: number;
  allowedDurations: number[];
  allowedAspects: string[];
};
