"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMiniAppAuth } from "@/components/mini-app/providers/mini-app-auth-provider";
import { ErrorState, SkeletonBlock } from "@/components/mini-app/states";
import { logoutMiniApp } from "@/lib/mini-app/client-api";

const LINKS: Array<{ href: string; label: string; tone?: "danger" }> = [
  { href: "/mini-app/videos", label: "My Videos" },
  { href: "/mini-app/templates?favorites=1", label: "Favorite Templates" },
  { href: "/mini-app/pricing", label: "Buy Credits" },
  { href: "/mini-app/studio", label: "AI Studio" },
  { href: "/mini-app/settings", label: "Settings" },
  { href: "/mini-app/help", label: "Help" },
  { href: "/mini-app/privacy", label: "Privacy" },
  { href: "/mini-app/terms", label: "Terms" },
  { href: "/mini-app/ai-disclosure", label: "AI disclosure" },
];

function planLabel(plan?: string) {
  switch (plan) {
    case "credits":
      return "Credits";
    case "free":
      return "Free";
    default:
      return plan ? plan.replace(/_/g, " ") : "Free";
  }
}

export function ProfileScreen() {
  const { user, loading, error, refresh } = useMiniAppAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return (
      <div className="space-y-3 p-4 pb-28">
        <SkeletonBlock className="h-28 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 pb-28">
        <ErrorState
          message={error ?? "Sign in via Telegram"}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    "Telegram user";
  const initial = (user.firstName?.[0] ?? user.username?.[0] ?? "V").toUpperCase();

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutMiniApp();
      await refresh();
      router.push("/mini-app");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <p className="text-xs text-zinc-400">Your Vidoo AI account</p>
      </header>

      <div className="vidoo-glass vidoo-glow flex items-center gap-4 rounded-2xl p-4">
        {user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoUrl}
            alt=""
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-violet-400/30"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 text-xl font-semibold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-violet-50">{name}</p>
          <p className="text-sm text-zinc-400">
            {user.username ? `@${user.username}` : "No username"}
          </p>
          <p className="mt-1 inline-flex rounded-md border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
            {planLabel(user.plan)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="vidoo-glass rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Credits
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {user.creditBalance}
          </p>
        </div>
        <div className="vidoo-glass rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Free left
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {user.freeGenerationsRemaining ?? 0}
          </p>
        </div>
        <div className="vidoo-glass rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Videos
          </p>
          <p className="mt-1 text-xl font-semibold text-white">
            {user.videosGenerated ?? 0}
          </p>
        </div>
      </div>

      <nav className="vidoo-glass overflow-hidden rounded-2xl">
        {LINKS.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-4 py-3.5 text-sm text-zinc-100 transition hover:bg-white/5 ${
              index > 0 ? "border-t border-white/5" : ""
            }`}
          >
            <span>{item.label}</span>
            <span className="text-zinc-600">›</span>
          </Link>
        ))}
        <button
          type="button"
          disabled={loggingOut}
          onClick={() => void onLogout()}
          className="flex w-full items-center justify-between border-t border-white/5 px-4 py-3.5 text-left text-sm text-rose-300 transition hover:bg-white/5 disabled:opacity-60"
        >
          <span>{loggingOut ? "Signing out…" : "Logout"}</span>
          <span className="text-rose-500/60">›</span>
        </button>
      </nav>

      {user.isAdmin ? (
        <Link
          href="/admin"
          className="block text-center text-xs text-violet-400/80"
        >
          Open admin console
        </Link>
      ) : null}
    </div>
  );
}
