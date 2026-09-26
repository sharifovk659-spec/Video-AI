"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { deleteUpload, uploadPhoto } from "@/lib/mini-app/client-api";

const TIPS = [
  "Use a clear, well-lit photo of your face or subject.",
  "Avoid heavy filters — the AI works best with natural images.",
  "PNG/JPG/WEBP up to 5 MB.",
];

export function PhotoUploadFlow({
  templateSlug,
  templateTitle,
}: {
  templateSlug: string;
  templateTitle: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      if (uploadId) {
        await deleteUpload(uploadId);
      }
      const result = await uploadPhoto(file, setProgress);
      setUploadId(result.id);
      setPreviewUrl(`${result.previewUrl}?t=${Date.now()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(null);
      setUploadId(null);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (uploadId) {
      await deleteUpload(uploadId).catch(() => undefined);
    }
    setUploadId(null);
    setPreviewUrl(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <div>
        <p className="text-xs text-violet-300/80">Template</p>
        <h1 className="text-xl font-semibold text-white">{templateTitle}</h1>
      </div>

      <div className="vidoo-glass rounded-2xl p-4">
        <p className="text-sm font-medium text-violet-50">Upload your photo</p>
        <p className="mt-1 text-xs text-zinc-400">
          JPG, JPEG, PNG, WEBP · validated on the server
        </p>

        {previewUrl ? (
          <div className="mt-4 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Upload preview"
              className="mx-auto max-h-64 w-full rounded-xl object-contain"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex-1 rounded-xl border border-violet-500/30 px-3 py-2 text-xs text-violet-100"
              >
                Replace photo
              </button>
              <button
                type="button"
                onClick={() => void removePhoto()}
                className="flex-1 rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-violet-400/30 bg-violet-500/5 px-4 py-10 text-sm text-violet-100"
          >
            {uploading ? `Uploading… ${progress}%` : "Tap to choose a photo"}
          </button>
        )}

        {uploading ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}

        {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="vidoo-glass rounded-2xl p-4 text-xs text-zinc-400">
        <p className="mb-2 font-medium text-violet-100">Photo tips</p>
        <ul className="list-disc space-y-1 pl-4">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      {uploadId ? (
        <Link
          href={`/mini-app/create/${templateSlug}/confirm?upload=${uploadId}`}
          className="block rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-center text-sm font-semibold text-white"
        >
          Continue
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="w-full rounded-2xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-500"
        >
          Continue
        </button>
      )}
    </div>
  );
}
