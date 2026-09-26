"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CreditPill } from "@/components/mini-app/credit-pill";
import { TemplateCard } from "@/components/mini-app/template-card";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/mini-app/states";
import type { HomeSection } from "@/lib/mini-app/types";
import { fetchHomeSections, fetchTemplates } from "@/lib/mini-app/client-api";

export function HomeScreen() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<HomeSection["templates"]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHomeSections();
      setSections(res.data.sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load home");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      void load();
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      queueMicrotask(() => setSearchResults([]));
      return;
    }
    const handle = setTimeout(() => {
      void fetchTemplates({ q: search.trim(), page: "1", pageSize: "12" })
        .then((res) => setSearchResults(res.data))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const visibleSections = useMemo(() => sections, [sections]);

  return (
    <div className="space-y-6 pb-28 pt-4">
      <header className="space-y-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400/80">
              Vidoo AI
            </p>
            <h1 className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-violet-100 bg-clip-text text-2xl font-semibold text-transparent">
              Cinematic AI Videos
            </h1>
          </div>
          <CreditPill />
        </div>
        <div className="vidoo-glass relative overflow-hidden rounded-2xl p-4 vidoo-glow">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl" />
          <p className="relative text-sm font-medium text-violet-50">
            Premium templates. Telegram-native. Ready when you are.
          </p>
          <Link
            href="/mini-app/templates"
            className="relative mt-3 inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white"
          >
            Explore templates
          </Link>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="vidoo-glass w-full rounded-xl border border-violet-500/20 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-400/50"
        />
      </header>

      {loading ? (
        <div className="space-y-4 px-4">
          <SkeletonBlock className="h-8 w-40" />
          <div className="flex gap-3 overflow-hidden">
            <SkeletonBlock className="h-48 w-[148px]" />
            <SkeletonBlock className="h-48 w-[148px]" />
            <SkeletonBlock className="h-48 w-[148px]" />
          </div>
        </div>
      ) : error ? (
        <div className="px-4">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      ) : search.trim() ? (
        <section className="px-4">
          <h2 className="mb-3 text-sm font-semibold text-violet-100">
            Search results
          </h2>
          {searchResults.length === 0 ? (
            <EmptyState
              title="No templates found"
              description="Try another keyword or browse categories."
            />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {searchResults.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </section>
      ) : (
        visibleSections.map((section) => (
          <section key={section.key}>
            <div className="mb-3 flex items-center justify-between px-4">
              <h2 className="text-sm font-semibold text-violet-100">
                {section.title}
              </h2>
              <Link
                href={`/mini-app/templates?section=${section.key}`}
                className="text-xs text-violet-300/80"
              >
                See all
              </Link>
            </div>
            {section.templates.length === 0 ? (
              <div className="px-4">
                <EmptyState
                  title="No templates yet"
                  description="Check back soon — new drops are on the way."
                />
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {section.templates.map((t) => (
                  <TemplateCard key={t.id} template={t} />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
