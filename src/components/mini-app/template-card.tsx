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
    new: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    trend: "bg-orange-500/20 text-orange-200 border-orange-400/30",
    pro: "bg-violet-500/30 text-violet-100 border-violet-300/40",
    popular: "bg-sky-500/20 text-sky-100 border-sky-400/30",
  }[tone];

  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}
    >
      {label}
    </span>
  );
}

export function TemplateCard({ template }: { template: PublicTemplateListItem }) {
  return (
    <Link
      href={`/mini-app/templates/${template.slug}`}
      className="group vidoo-glass vidoo-glow block w-[148px] max-w-full shrink-0 overflow-hidden rounded-2xl transition-transform active:scale-[0.98] sm:w-full"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
        <LazyMedia
          coverUrl={template.coverUrl ?? template.thumbnailUrl}
          videoUrl={template.previewVideoUrl}
          alt={template.title}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {template.isNew ? <Badge label="NEW" tone="new" /> : null}
          {template.isTrending ? <Badge label="TREND" tone="trend" /> : null}
          {template.isPopular ? <Badge label="HOT" tone="popular" /> : null}
          {template.isPro ? <Badge label="PRO" tone="pro" /> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
          <p className="line-clamp-2 text-xs font-semibold text-white">
            {template.title}
          </p>
          <p className="mt-0.5 text-[10px] text-violet-200/80">
            {template.creditCost} credits
          </p>
        </div>
      </div>
    </Link>
  );
}
