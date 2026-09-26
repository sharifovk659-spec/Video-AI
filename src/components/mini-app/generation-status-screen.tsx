"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchGeneration,
  retryGeneration,
} from "@/lib/mini-app/client-api";
import { ErrorState, SkeletonBlock } from "@/components/mini-app/states";

type GenData = Awaited<ReturnType<typeof fetchGeneration>>["data"];

function stageLabel(stage: string | null, status: string) {
  const key = (stage ?? status).toLowerCase();
  const map: Record<string, string> = {
    queued: "Queued",
    submitting: "Sending to AI",
    retrying: "Retrying",
    processing: "Processing",
    rendering: "Rendering",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return map[key] ?? key;
}

export function GenerationStatusScreen({ id }: { id: string }) {
  const [data, setData] = useState<GenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const res = await fetchGeneration(id);
        if (cancelled) return;
        setData(res.data);
        setError(null);
        if (
          res.data.status === "queued" ||
          res.data.status === "processing"
        ) {
          timer = setTimeout(() => void poll(), 2500);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load status");
        timer = setTimeout(() => void poll(), 4000);
      }
    };

    queueMicrotask(() => void poll());

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (!data && !error) {
    return (
      <div className="space-y-4 p-4 pb-28">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 pb-28">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!data) return null;

  if (data.status === "completed" && data.outputUrl) {
    return (
      <div className="space-y-4 px-4 pb-28 pt-4">
        <h1 className="text-xl font-semibold text-white">Ready</h1>
        <video
          src={data.outputUrl}
          controls
          playsInline
          className="w-full rounded-2xl bg-black"
        />
        <div className="grid gap-2">
          <a
            href={data.outputUrl}
            download
            className="rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white"
          >
            Download
          </a>
          <button
            type="button"
            className="rounded-xl border border-violet-500/30 py-3 text-sm text-violet-100"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: data.template.title,
                  url: data.outputUrl!,
                });
              } else {
                await navigator.clipboard.writeText(data.outputUrl!);
              }
            }}
          >
            Share
          </button>
          <Link
            href={`/mini-app/create/${data.template.slug}`}
            className="rounded-xl border border-violet-500/30 py-3 text-center text-sm text-violet-100"
          >
            Create Another
          </Link>
          <Link
            href="/mini-app/videos"
            className="rounded-xl border border-violet-500/30 py-3 text-center text-sm text-violet-100"
          >
            My Videos
          </Link>
        </div>
      </div>
    );
  }

  if (data.status === "failed" || data.status === "cancelled") {
    return (
      <div className="space-y-4 px-4 pb-28 pt-4">
        <h1 className="text-xl font-semibold text-white">Generation failed</h1>
        <div className="vidoo-glass rounded-2xl border border-red-500/30 p-4 text-sm text-red-100">
          {data.errorMessage ?? "The provider could not complete this video."}
        </div>
        {data.creditsRefunded ? (
          <p className="text-xs text-emerald-300">
            Credits / free quota were refunded.
          </p>
        ) : null}
        {data.canRetry ? (
          <button
            type="button"
            disabled={retrying}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white"
            onClick={async () => {
              setRetrying(true);
              try {
                const res = await retryGeneration(id);
                router.replace(`/mini-app/generations/${res.data.id}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Retry failed");
                setRetrying(false);
              }
            }}
          >
            {retrying ? "Retrying…" : "Retry"}
          </button>
        ) : null}
        <Link
          href={`/mini-app/create/${data.template.slug}`}
          className="block text-center text-sm text-violet-300"
        >
          Upload a new photo
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <div>
        <p className="text-xs text-violet-300/80">Generating</p>
        <h1 className="text-xl font-semibold text-white">{data.template.title}</h1>
      </div>

      <div className="vidoo-glass vidoo-glow rounded-2xl p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <p className="text-sm font-medium text-violet-50">
          {stageLabel(data.stage, data.status)}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Stage-based estimate — not a live provider percentage
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${data.progressHint}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-zinc-500">
          ~{data.progressHint}% (estimated)
        </p>
      </div>

      <p className="text-center text-xs text-zinc-500">
        You can close Telegram — your job keeps running on the server.
      </p>
      <Link
        href="/mini-app/videos"
        className="block text-center text-sm text-violet-300"
      >
        View My Videos
      </Link>
    </div>
  );
}
