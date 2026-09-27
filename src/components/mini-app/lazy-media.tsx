"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Loads video/image only when near viewport — keeps Telegram WebView light on slow links.
 */
export function LazyMedia({
  coverUrl,
  videoUrl,
  alt,
  className,
}: {
  coverUrl: string | null;
  videoUrl: string | null;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !videoUrl) return;
    const t = setTimeout(() => setPlayVideo(true), 350);
    return () => clearTimeout(t);
  }, [visible, videoUrl]);

  return (
    <div ref={ref} className={className ?? "h-full w-full"}>
      {!visible ? (
        <div className="h-full w-full bg-zinc-900" />
      ) : playVideo && videoUrl ? (
        <video
          src={videoUrl}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          autoPlay
          preload="none"
          poster={coverUrl ?? undefined}
        />
      ) : coverUrl || videoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl ?? videoUrl!}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-fuchsia-900/20 text-xs text-zinc-500">
          Превью
        </div>
      )}
    </div>
  );
}

export function LazyImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

export function MediaPlaceholder({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center bg-zinc-900 text-xs text-zinc-600">
      {children ?? "—"}
    </div>
  );
}
