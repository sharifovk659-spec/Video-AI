"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/mini-app/states";
import { fetchTemplate } from "@/lib/mini-app/client-api";
import type { PublicTemplateListItem } from "@/lib/mini-app/types";

export function TemplateDetailScreen({ slug }: { slug: string }) {
  const [template, setTemplate] = useState<
    (PublicTemplateListItem & { aiModel?: { name: string } }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTemplate(slug)
      .then((res) => setTemplate(res.data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Template not found"),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-4 p-4 pb-28">
        <SkeletonBlock className="aspect-video w-full" />
        <SkeletonBlock className="h-8 w-2/3" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="p-4 pb-28">
        <ErrorState message={error ?? "Not found"} />
      </div>
    );
  }

  const media =
    template.previewVideoUrl ?? template.coverUrl ?? template.thumbnailUrl;

  return (
    <div className="space-y-4 pb-28">
      <div className="relative aspect-[9/16] max-h-[70vh] w-full overflow-hidden bg-black sm:aspect-video sm:max-h-none">
        {media ? (
          template.previewVideoUrl ? (
            <video
              src={template.previewVideoUrl}
              className="h-full w-full object-cover"
              controls
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media} alt={template.title} className="h-full w-full object-cover" />
          )
        ) : (
          <EmptyState title="No preview" description="Preview coming soon." />
        )}
      </div>
      <div className="space-y-3 px-4">
        <div className="flex flex-wrap gap-2 text-[10px] uppercase">
          {template.isNew ? (
            <span className="rounded bg-emerald-500/20 px-2 py-1 text-emerald-200">NEW</span>
          ) : null}
          {template.isTrending ? (
            <span className="rounded bg-orange-500/20 px-2 py-1 text-orange-200">TREND</span>
          ) : null}
          {template.isPro ? (
            <span className="rounded bg-violet-500/30 px-2 py-1 text-violet-100">PRO</span>
          ) : null}
        </div>
        <h1 className="text-2xl font-semibold text-white">{template.title}</h1>
        <p className="text-sm text-zinc-400">{template.description}</p>
        <div className="vidoo-glass flex items-center justify-between rounded-xl px-4 py-3 text-sm">
          <span className="text-zinc-400">Cost</span>
          <span className="font-semibold text-violet-100">
            {template.creditCost} credits
          </span>
        </div>
        <Link
          href={`/mini-app/create/${template.slug}`}
          className="block rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-center text-sm font-semibold text-white"
        >
          Create with my photo
        </Link>
      </div>
    </div>
  );
}
