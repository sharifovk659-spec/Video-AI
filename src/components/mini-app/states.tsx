export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`vidoo-shimmer rounded-xl bg-white/5 ${className}`} />;
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="vidoo-glass rounded-2xl p-6 text-center">
      <p className="text-sm font-semibold text-violet-100">{title}</p>
      <p className="mt-2 text-xs text-zinc-400">{description}</p>
    </div>
  );
}

export function ErrorState({
  title = "Что-то пошло не так",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="vidoo-glass rounded-2xl border border-red-500/30 p-6 text-center">
      <p className="text-sm font-semibold text-red-200">{title}</p>
      <p className="mt-2 text-xs text-zinc-400">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-medium text-white"
        >
          Повторить
        </button>
      ) : null}
    </div>
  );
}
