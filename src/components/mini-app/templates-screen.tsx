"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TemplateCard } from "@/components/mini-app/template-card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/mini-app/states";
import type { PublicTemplateListItem } from "@/lib/mini-app/types";
import {
  fetchCategories,
  fetchTemplates,
  toggleFavorite,
} from "@/lib/mini-app/client-api";

const DISCOVERY_CHIPS: Array<{
  key: string;
  label: string;
  params: Record<string, string>;
}> = [
  { key: "all", label: "Все", params: {} },
  { key: "favorites", label: "Избранное", params: { favorites: "1" } },
  { key: "trending", label: "Тренд", params: { trending: "1" } },
  { key: "new", label: "Новые", params: { new: "1" } },
  { key: "popular", label: "Хиты", params: { popular: "1" } },
  { key: "pro", label: "Pro", params: { pro: "1" } },
];

export function TemplatesScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const section = searchParams.get("section");
  const favoritesParam = searchParams.get("favorites") === "1";
  const qParam = searchParams.get("q") ?? "";

  const initialChip = favoritesParam
    ? "favorites"
    : section && DISCOVERY_CHIPS.some((c) => c.key === section)
      ? section
      : "all";

  const [chip, setChip] = useState(initialChip);
  const [search, setSearch] = useState(qParam);
  const [debouncedSearch, setDebouncedSearch] = useState(qParam);
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [categories, setCategories] = useState<
    Array<{ id: string; slug: string; name: string }>
  >([]);
  const [items, setItems] = useState<PublicTemplateListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    void fetchCategories()
      .then((res) =>
        setCategories(
          res.data.filter((c) => c.slug !== "studio"),
        ),
      )
      .catch(() => undefined);
  }, []);

  const queryParams = useMemo(() => {
    const chipDef =
      DISCOVERY_CHIPS.find((c) => c.key === chip) ?? DISCOVERY_CHIPS[0];
    const params: Record<string, string> = {
      page: "1",
      pageSize: "24",
      ...chipDef.params,
    };
    if (debouncedSearch) {
      params.q = debouncedSearch;
      delete params.trending;
      delete params.new;
      delete params.popular;
      delete params.pro;
      delete params.favorites;
    } else if (category) {
      params.category = category;
    }
    return params;
  }, [chip, debouncedSearch, category]);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const params = {
          ...queryParams,
          page: String(nextPage),
          pageSize: "24",
        };
        const res = await fetchTemplates(params);
        setItems((prev) => (replace ? res.data : [...prev, ...res.data]));
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить стили");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [queryParams],
  );

  useEffect(() => {
    queueMicrotask(() => {
      void load(1, true);
    });
  }, [load]);

  const onChip = (key: string) => {
    setChip(key);
    setCategory("");
    const qs = new URLSearchParams();
    if (key === "favorites") qs.set("favorites", "1");
    else if (key !== "all") qs.set("section", key);
    if (search.trim()) qs.set("q", search.trim());
    router.replace(
      qs.toString() ? `/mini-app/templates?${qs}` : "/mini-app/templates",
    );
  };

  const onFavorite = async (template: PublicTemplateListItem) => {
    try {
      const res = await toggleFavorite(
        template.id,
        Boolean(template.isFavorite),
      );
      setItems((prev) =>
        prev.map((t) =>
          t.id === template.id
            ? { ...t, isFavorite: res.data.favorited }
            : t,
        ),
      );
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4 px-4 pt-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Стили</h1>
        <p className="text-xs text-zinc-400">
          Выберите стиль, загрузите фото и создайте видео
        </p>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Поиск по названию…"
        className="vidoo-glass w-full min-w-0 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600"
      />

      <div className="app-scroll-x flex gap-2 pb-1">
        {DISCOVERY_CHIPS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onChip(c.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              chip === c.key
                ? "bg-violet-600 text-white"
                : "vidoo-glass text-zinc-400"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!debouncedSearch && chip === "all" ? (
        <div className="app-scroll-x flex gap-2 pb-1">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] ${
              !category ? "bg-white/10 text-white" : "text-zinc-500"
            }`}
          >
            Все категории
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.slug)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] ${
                category === c.slug ? "bg-white/10 text-white" : "text-zinc-500"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load(1, true)} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Стилей нет"
          description="Смените фильтр или поисковый запрос."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((t) => (
              <div key={t.id} className="relative min-w-0">
                <TemplateCard template={t} layout="grid" />
                <button
                  type="button"
                  aria-label={t.isFavorite ? "Убрать из избранного" : "В избранное"}
                  onClick={() => void onFavorite(t)}
                  className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur ${
                    t.isFavorite
                      ? "border-fuchsia-300/40 bg-fuchsia-500/30 text-fuchsia-100"
                      : "border-white/10 bg-black/40 text-zinc-300"
                  }`}
                >
                  {t.isFavorite ? "♥" : "♡"}
                </button>
              </div>
            ))}
          </div>
          {page < totalPages ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load(page + 1, false)}
              className="vidoo-glass mx-auto block w-full rounded-xl py-3 text-sm text-violet-200"
            >
              {loadingMore ? "Загрузка…" : "Ещё"}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
