"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorState, SkeletonBlock } from "@/components/mini-app/states";
import type { StudioConfig } from "@/lib/mini-app/types";
import {
  createStudioGeneration,
  deleteUpload,
  fetchStudioConfig,
  uploadPhoto,
} from "@/lib/mini-app/client-api";

export function AiStudioScreen() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [config, setConfig] = useState<StudioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(8);
  const [aspect, setAspect] = useState("9:16");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchStudioConfig()
      .then((res) => {
        setConfig(res.data);
        if (res.data.allowedDurations.length) {
          setDuration(res.data.allowedDurations[0]!);
        }
        if (res.data.allowedAspects.length) {
          setAspect(res.data.allowedAspects[0]!);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load studio"),
      )
      .finally(() => setLoading(false));
  }, []);

  const onPick = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setUploadProgress(0);
    try {
      if (uploadId) await deleteUpload(uploadId).catch(() => undefined);
      const result = await uploadPhoto(file, setUploadProgress);
      setUploadId(result.id);
      setPreviewUrl(`${result.previewUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadId(null);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const onGenerate = async () => {
    if (!uploadId || !config) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createStudioGeneration({
        photoUploadId: uploadId,
        userPrompt: prompt,
        durationSeconds: duration,
        aspectRatio: aspect,
        idempotencyKey: crypto.randomUUID(),
      });
      router.push(`/mini-app/generations/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4 pb-28">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonBlock className="h-40 w-full" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-4 pb-28">
        <ErrorState message={error ?? "Studio unavailable"} />
      </div>
    );
  }

  if (!config.eligible) {
    return (
      <div className="space-y-4 px-4 pb-28 pt-4">
        <header>
          <h1 className="text-xl font-semibold text-white">AI Studio</h1>
          <p className="text-xs text-zinc-400">Custom videos from your prompt</p>
        </header>
        <div className="vidoo-glass rounded-2xl p-5">
          <p className="text-sm text-zinc-200">
            {config.reason ?? "AI Studio requires credits or a paid plan."}
          </p>
          <Link
            href="/mini-app/pricing"
            className="mt-4 block rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-center text-sm font-semibold text-white"
          >
            Buy credits
          </Link>
        </div>
      </div>
    );
  }

  const canSubmit =
    Boolean(uploadId) &&
    prompt.trim().length >= config.minPromptLength &&
    prompt.trim().length <= config.maxPromptLength &&
    !uploading &&
    !submitting;

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-violet-300/80">
          Premium
        </p>
        <h1 className="text-xl font-semibold text-white">AI Studio</h1>
        <p className="text-xs text-zinc-400">
          Upload a photo, describe the video — {config.creditCost} credits
        </p>
      </header>

      <section className="vidoo-glass rounded-2xl p-4">
        <p className="text-sm font-medium text-violet-50">Photo</p>
        {previewUrl ? (
          <div className="mt-3 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Upload preview"
              className="mx-auto max-h-56 w-full rounded-xl object-contain"
            />
            <button
              type="button"
              className="text-xs text-rose-300"
              onClick={() => {
                if (uploadId) void deleteUpload(uploadId).catch(() => undefined);
                setUploadId(null);
                setPreviewUrl(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Remove photo
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-3 flex h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-violet-500/30 bg-black/20 text-sm text-zinc-400"
          >
            {uploading ? `Uploading ${uploadProgress}%` : "Tap to upload image"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-end justify-between">
          <label className="text-sm font-medium text-violet-50">
            Video description
          </label>
          <span className="text-[10px] text-zinc-500">
            {prompt.length}/{config.maxPromptLength}
          </span>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, config.maxPromptLength))}
          rows={5}
          placeholder="Describe motion, mood, lighting, and scene…"
          className="vidoo-glass w-full resize-none rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600"
        />
        <p className="text-[10px] text-zinc-500">
          Min {config.minPromptLength} characters. Provider credentials and
          internal prompts cannot be set by users.
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <p className="mb-2 text-xs text-zinc-400">Duration</p>
          <div className="flex gap-2">
            {config.allowedDurations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`rounded-xl px-3 py-2 text-sm ${
                  duration === d
                    ? "bg-violet-600 text-white"
                    : "vidoo-glass text-zinc-400"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-zinc-400">Aspect ratio</p>
          <div className="flex gap-2">
            {config.allowedAspects.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAspect(a)}
                className={`rounded-xl px-3 py-2 text-sm ${
                  aspect === a
                    ? "bg-violet-600 text-white"
                    : "vidoo-glass text-zinc-400"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void onGenerate()}
        className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        {submitting
          ? "Starting…"
          : `Generate · ${config.creditCost} credits`}
      </button>
    </div>
  );
}
