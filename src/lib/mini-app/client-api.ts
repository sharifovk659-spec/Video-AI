"use client";

import type {
  GenerationListItem,
  HomeSection,
  MeUser,
  PublicTemplateListItem,
  StudioConfig,
} from "@/lib/mini-app/types";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Request failed");
  }
  return payload as T;
}

export async function authenticateMiniApp(initData: string) {
  return parseJson<{ data: MeUser }>(
    await fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ initData }),
    }),
  );
}

export async function fetchMe() {
  return parseJson<{ data: MeUser }>(
    await fetch("/api/me", { credentials: "include" }),
  );
}

export async function logoutMiniApp() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchHomeSections() {
  return parseJson<{ data: { sections: HomeSection[] } }>(
    await fetch("/api/v1/home", { credentials: "include" }),
  );
}

export async function fetchCategories() {
  return parseJson<{
    data: Array<{ id: string; slug: string; name: string }>;
  }>(await fetch("/api/v1/categories", { credentials: "include" }));
}

export async function fetchTemplates(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return parseJson<{
    data: PublicTemplateListItem[];
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }>(await fetch(`/api/v1/templates?${qs}`, { credentials: "include" }));
}

export async function fetchTemplate(slug: string) {
  return parseJson<{
    data: PublicTemplateListItem & {
      aiModel: { id: string; slug: string; name: string };
    };
  }>(await fetch(`/api/v1/templates/${slug}`, { credentials: "include" }));
}

export async function toggleFavorite(templateId: string, favorited: boolean) {
  return parseJson<{ data: { favorited: boolean } }>(
    await fetch(`/api/v1/favorites/${templateId}`, {
      method: favorited ? "DELETE" : "POST",
      credentials: "include",
    }),
  );
}

export async function fetchMyGenerations(
  page = 1,
  filter: "all" | "processing" | "ready" | "failed" = "all",
  pageSize = 12,
) {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filter !== "all") qs.set("filter", filter);
  return parseJson<{
    data: GenerationListItem[];
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }>(
    await fetch(`/api/v1/generations?${qs}`, { credentials: "include" }),
  );
}

export async function fetchStudioConfig() {
  return parseJson<{ data: StudioConfig }>(
    await fetch("/api/v1/studio", { credentials: "include" }),
  );
}

export async function uploadPhoto(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ id: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/uploads/photo");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const payload = JSON.parse(xhr.responseText) as {
          data?: { id: string; previewUrl: string };
          error?: { message?: string };
        };
        if (xhr.status >= 400) {
          reject(new Error(payload.error?.message ?? "Upload failed"));
          return;
        }
        resolve(payload.data!);
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export async function deleteUpload(id: string) {
  await parseJson(
    await fetch(`/api/v1/uploads/${id}`, {
      method: "DELETE",
      credentials: "include",
    }),
  );
}

export async function createGeneration(input: {
  templateSlug: string;
  photoUploadId: string;
  idempotencyKey?: string;
}) {
  return parseJson<{
    data: { id: string; status: string; stage: string | null };
  }>(
    await fetch("/api/v1/generations", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(input.idempotencyKey
          ? { "Idempotency-Key": input.idempotencyKey }
          : {}),
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function createStudioGeneration(input: {
  photoUploadId: string;
  userPrompt: string;
  durationSeconds: number;
  aspectRatio: string;
  idempotencyKey?: string;
}) {
  return parseJson<{
    data: { id: string; status: string; stage: string | null; mode: string };
  }>(
    await fetch("/api/v1/generations", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(input.idempotencyKey
          ? { "Idempotency-Key": input.idempotencyKey }
          : {}),
      },
      body: JSON.stringify({ mode: "studio", ...input }),
    }),
  );
}

export async function fetchGeneration(id: string) {
  return parseJson<{
    data: {
      id: string;
      status: string;
      stage: string | null;
      progressHint: number;
      progressIsEstimate: boolean;
      outputUrl: string | null;
      errorMessage: string | null;
      creditsCharged: number;
      creditsRefunded: boolean;
      canRetry: boolean;
      template: { slug: string; title: string; coverUrl: string | null };
    };
  }>(await fetch(`/api/v1/generations/${id}`, { credentials: "include" }));
}

export async function retryGeneration(id: string) {
  return parseJson<{ data: { id: string; status: string } }>(
    await fetch(`/api/v1/generations/${id}/retry`, {
      method: "POST",
      credentials: "include",
    }),
  );
}
