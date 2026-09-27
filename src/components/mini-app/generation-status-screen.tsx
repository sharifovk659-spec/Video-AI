"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchGeneration,
  retryGeneration,
} from "@/lib/mini-app/client-api";
import { generatedVideoPosterTime } from "@/lib/mini-app/result-video-time";
import { ErrorState, SkeletonBlock } from "@/components/mini-app/states";

type GenData = Awaited<ReturnType<typeof fetchGeneration>>["data"];

function stageLabel(stage: string | null, status: string) {
  const key = (stage ?? status).toLowerCase();
  const map: Record<string, string> = {
    queued: "В очереди",
    submitting: "Отправка в AI",
    retrying: "Повтор",
    processing: "Обработка",
    rendering: "Рендер",
    completed: "Готово",
    failed: "Ошибка",
    cancelled: "Отменено",
  };
  return map[key] ?? key;
}

const USER_FAIL = "Не удалось создать видео. Попробуйте ещё раз.";

function ResultVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setFrameReady(false);
    setPlaying(false);
    const timer = setTimeout(() => setFrameReady(true), 4000);
    return () => clearTimeout(timer);
  }, [src]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        controls={playing}
        className={`aspect-[9/16] w-full bg-black object-contain ${
          frameReady ? "opacity-100" : "opacity-0"
        }`}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          if (!Number.isFinite(video.duration) || video.duration <= 0) return;
          const at = generatedVideoPosterTime(video.duration);
          if (at <= 0) {
            setFrameReady(true);
            return;
          }
          try {
            video.currentTime = at;
          } catch {
            setFrameReady(true);
          }
        }}
        onSeeked={() => setFrameReady(true)}
        onError={() => setFrameReady(true)}
      />
      {!frameReady ? (
        <div className="absolute inset-0 flex aspect-[9/16] flex-col items-center justify-center gap-3 bg-[#0c0914]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-300" />
          <p className="text-xs text-zinc-400">Загрузка видео…</p>
        </div>
      ) : null}
      {frameReady && !playing ? (
        <button
          type="button"
          aria-label="Воспроизвести"
          className="absolute inset-0 flex items-center justify-center"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            setPlaying(true);
            void video.play();
          }}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-white/40">
            <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8 fill-current" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function GenerationStatusScreen({ id }: { id: string }) {
  const [data, setData] = useState<GenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [shownProgress, setShownProgress] = useState(1);
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
          res.data.status === "processing" ||
          (res.data.status === "completed" && !res.data.outputUrl)
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

  useEffect(() => {
    const target = data?.status === "completed" ? 100 : (data?.progressHint ?? 1);
    const timer = setInterval(() => {
      setShownProgress((prev) => {
        if (prev >= target) return prev;
        return prev + 1;
      });
    }, 160);
    return () => clearInterval(timer);
  }, [data?.progressHint, data?.status]);

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

  if (data.status === "completed" && !data.outputUrl) {
    return (
      <div className="space-y-4 px-4 pb-28 pt-4">
        <h1 className="text-xl font-semibold text-white">Готово</h1>
        <div className="flex aspect-[9/16] flex-col items-center justify-center gap-3 rounded-2xl bg-[#0c0914]">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-300" />
          <p className="text-xs text-zinc-400">Видео ещё готовится</p>
        </div>
      </div>
    );
  }

  if (data.status === "completed" && data.outputUrl) {
    const videoUrl = data.outputUrl;
    return (
      <div className="space-y-4 px-4 pb-28 pt-4">
        <h1 className="text-xl font-semibold text-white">Готово</h1>
        <ResultVideo src={videoUrl} />
        <div className="grid gap-2">
          <a
            href={videoUrl}
            download
            className="rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white"
          >
            Скачать
          </a>
          <button
            type="button"
            className="rounded-xl border border-violet-500/30 py-3 text-sm text-violet-100"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: data.template.title,
                  url: videoUrl,
                });
              } else {
                await navigator.clipboard.writeText(videoUrl);
              }
            }}
          >
            Поделиться
          </button>
          <Link
            href={`/mini-app/create/${data.template.slug}`}
            className="rounded-xl border border-violet-500/30 py-3 text-center text-sm text-violet-100"
          >
            Создать ещё
          </Link>
          <Link
            href="/mini-app/videos"
            className="rounded-xl border border-violet-500/30 py-3 text-center text-sm text-violet-100"
          >
            Мои видео
          </Link>
        </div>
      </div>
    );
  }

  if (data.status === "failed" || data.status === "cancelled") {
    return (
      <div className="space-y-4 px-4 pb-28 pt-4">
        <h1 className="text-xl font-semibold text-white">Не удалось создать</h1>
        <div className="vidoo-glass rounded-2xl border border-red-500/30 p-4 text-sm text-red-100">
          {USER_FAIL}
        </div>
        {data.creditsRefunded ? (
          <p className="text-xs text-emerald-300">
            Кредиты или бесплатная квота возвращены.
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
            {retrying ? "Повтор…" : "Повторить"}
          </button>
        ) : null}
        <Link
          href={`/mini-app/create/${data.template.slug}`}
          className="block text-center text-sm text-violet-300"
        >
          Загрузить другое фото
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <div>
        <p className="text-xs text-violet-300/80">Создание</p>
        <h1 className="text-xl font-semibold text-white">{data.template.title}</h1>
      </div>

      <div className="vidoo-glass vidoo-glow rounded-2xl p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <p className="text-sm font-medium text-violet-50">
          {stageLabel(data.stage, data.status)}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-150"
            style={{ width: `${shownProgress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">{shownProgress}%</p>
      </div>

      <p className="text-center text-xs text-zinc-500">
        Можно закрыть Telegram — задача продолжится на сервере.
      </p>
      <Link
        href="/mini-app/videos"
        className="block text-center text-sm text-violet-300"
      >
        Открыть мои видео
      </Link>
    </div>
  );
}
