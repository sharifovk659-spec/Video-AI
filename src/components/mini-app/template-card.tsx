import Link from "next/link";
import type { PublicTemplateListItem } from "@/lib/mini-app/types";
import { LazyMedia } from "@/components/mini-app/lazy-media";

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "new" | "trend" | "pro" | "popular";
}) {
  const styles = {
    new: "bg-emerald-500/25 text-emerald-100 border-emerald-300/30",
    trend: "bg-orange-500/25 text-orange-100 border-orange-300/30",
    pro: "bg-violet-500/40 text-violet-50 border-violet-200/40",
    popular: "bg-fuchsia-500/25 text-fuchsia-100 border-fuchsia-300/30",
  }[tone];

  return (
    <span
      className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${styles}`}
    >
      {label}
    </span>
  );
}

export function TemplateCard({
  template,
  layout = "rail",
}: {
  template: PublicTemplateListItem;
  layout?: "rail" | "grid";
}) {
  const width =
    layout === "grid"
      ? "w-full"
      : "w-[42vw] max-w-[168px] shrink-0 sm:w-[168px]";

  return (
    <Link
      href={`/mini-app/templates/${template.slug}`}
      className={`group vidoo-glass block min-w-0 overflow-hidden rounded-2xl transition-transform duration-200 active:scale-[0.98] ${width}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-950">
        <LazyMedia
          coverUrl={template.coverUrl ?? template.thumbnailUrl}
          videoUrl={template.previewVideoUrl}
          alt={template.title}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute left-2 top-2 flex max-w-[70%] flex-wrap gap-1">
          {template.isNew ? <Badge label="Новое" tone="new" /> : null}
          {template.isTrending ? <Badge label="Тренд" tone="trend" /> : null}
          {template.isPopular ? <Badge label="Хит" tone="popular" /> : null}
          {template.isPro ? <Badge label="Pro" tone="pro" /> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2.5 pt-10">
          <p className="line-clamp-2 break-words text-[13px] font-semibold leading-tight text-white">
            {template.title}
          </p>
          <p className="mt-1 truncate text-[10px] text-violet-200/90">
            {template.durationSeconds ?? 8} сек · {template.creditCost} кр.
          </p>
        </div>
      </div>
    </Link>
  );
}
