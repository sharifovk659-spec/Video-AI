"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/mini-app/states";
import type { GenerationListItem } from "@/lib/mini-app/types";
import { fetchMyGenerations } from "@/lib/mini-app/client-api";

type FilterKey = "all" | "processing" | "ready" | "failed";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Все" },
  { key: "processing", label: "В работе" },
  { key: "ready", label: "Готово" },
  { key: "failed", label: "Ошибка" },
];

function statusTone(status: string) {
  if (status === "completed") return "text-emerald-300";
  if (status === "failed" || status === "cancelled") return "text-rose-300";
  return "text-amber-200";
}

function statusLabel(status: string) {
  if (status === "completed") return "Готово";
  if (status === "queued" || status === "processing") return "В работе";
  if (status === "failed") return "Ошибка";
  if (status === "cancelled") return "Отменено";
  return status;
}

async function shareVideo(item: GenerationListItem) {
  const url = item.outputUrl;
  if (!url) return;
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } };
    }
  ).Telegram?.WebApp;
  if (navigator.share) {
    try {
      await navigator.share({
        title: item.template.title,
        text: `Моё видео Vidoo AI: ${item.template.title}`,
        url,
      });
      return;
    } catch {
      /* fall through */
    }
  }
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(item.template.title)}`,
    );
    return;
  }
  await navigator.clipboard.writeText(url);
}

export function MyVideosScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [items, setItems] = useState<GenerationListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadPage = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await fetchMyGenerations(nextPage, filter, 12);
        setItems((prev) => (replace ? res.data : [...prev, ...res.data]));
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load videos");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void loadPage(1, true);
    });
  }, [loadPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !loading &&
          !loadingMore &&
          page < totalPages
        ) {
          void loadPage(page + 1, false);
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadPage, loading, loadingMore, page, totalPages]);

  return (
    <div className="space-y-4 px-4 pt-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Мои видео</h1>
        <p className="text-xs text-zinc-400">История ваших генераций</p>
      </header>

      <div className="app-scroll-x flex gap-2 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key
                ? "bg-violet-600 text-white"
                : "vidoo-glass text-zinc-400"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-28 w-full" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadPage(1, true)} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Видео пока нет"
          description="Создайте первое видео из стиля или AI Студии."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const ready = item.status === "completed" && item.outputUrl;
            const preview =
              item.outputUrl ??
              item.template.previewVideoUrl ??
              item.template.coverUrl;
            return (
              <li key={item.id} className="vidoo-glass overflow-hidden rounded-2xl">
                <div className="flex gap-3 p-3">
                  <Link
                    href={`/mini-app/generations/${item.id}`}
                    className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-900"
                  >
                    {preview ? (
                      item.outputUrl || item.template.previewVideoUrl ? (
                        <video
                          src={preview}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                        —
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium text-white">
                      {item.template.title}
                    </p>
                    <p className={`text-xs capitalize ${statusTone(item.status)}`}>
                      {statusLabel(item.status)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-400">
                      <span>
                        {item.durationSeconds
                          ? `${item.durationSeconds}s`
                          : "—"}
                      </span>
                      <span>{item.creditsCharged} кр.</span>
                      {item.isStudio ? <span>Студия</span> : null}
                    </div>
                  </div>
                </div>

                {ready ? (
                  <div className="grid grid-cols-4 gap-px border-t border-white/5 bg-white/5 text-[11px]">
                    <Link
                      href={`/mini-app/generations/${item.id}`}
                      className="bg-[#0d0915] py-2.5 text-center text-violet-200"
                    >
                      Смотреть
                    </Link>
                    <a
                      href={item.outputUrl!}
                      download
                      className="bg-[#0d0915] py-2.5 text-center text-violet-200"
                    >
                      Скачать
                    </a>
                    <button
                      type="button"
                      className="bg-[#0d0915] py-2.5 text-violet-200"
                      onClick={() => void shareVideo(item)}
                    >
                      Поделиться
                    </button>
                    <button
                      type="button"
                      className="bg-[#0d0915] py-2.5 text-violet-200"
                      onClick={() => {
                        if (item.isStudio) {
                          router.push("/mini-app/studio");
                        } else {
                          router.push(`/mini-app/create/${item.template.slug}`);
                        }
                      }}
                    >
                      Ещё раз
                    </button>
                  </div>
                ) : (
                  <div className="border-t border-white/5 px-3 py-2">
                    <Link
                      href={`/mini-app/generations/${item.id}`}
                      className="text-xs text-violet-300"
                    >
                      Статус →
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div ref={sentinelRef} className="h-4" />
      {loadingMore ? (
        <p className="text-center text-xs text-zinc-500">Загрузка…</p>
      ) : null}
    </div>
  );
}
