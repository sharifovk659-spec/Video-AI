"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMiniAppAuth } from "@/components/mini-app/providers/mini-app-auth-provider";
import { ErrorState, SkeletonBlock } from "@/components/mini-app/states";
import { logoutMiniApp } from "@/lib/mini-app/client-api";

export default function SettingsPage() {
  const { user, loading, error, refresh } = useMiniAppAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3 p-4 pb-28">
        <SkeletonBlock className="h-24 w-full" />
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

  const deleteMedia = async () => {
    if (!confirm("Delete all your uploaded photos and stored video files?")) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/account/media", {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed");
      setMessage(`Deleted ${json.data.deleted} upload(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (
      !confirm(
        "Permanently delete your Vidoo AI account and all associated data? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/account", {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed");
      await logoutMiniApp();
      router.push("/mini-app");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <header>
        <Link href="/mini-app/profile" className="text-xs text-violet-300">
          ← Profile
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-white">Settings</h1>
      </header>

      <div className="vidoo-glass space-y-3 rounded-2xl p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Language</span>
          <span className="text-zinc-200">
            {user.languageCode?.toUpperCase() ?? "Auto"}
          </span>
        </div>
        <div className="flex justify-between gap-4 border-t border-white/5 pt-3">
          <span className="text-zinc-500">Plan</span>
          <span className="capitalize text-zinc-200">{user.plan ?? "free"}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-white/5 pt-3">
          <span className="text-zinc-500">User ID</span>
          <span className="truncate font-mono text-[11px] text-zinc-400">
            {user.id.slice(0, 8)}…
          </span>
        </div>
      </div>

      <div className="vidoo-glass space-y-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-violet-50">Privacy controls</p>
        <Link
          href="/mini-app/ai-disclosure"
          className="block text-sm text-violet-300"
        >
          AI-generated content disclosure →
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => void deleteMedia()}
          className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-zinc-200 disabled:opacity-50"
        >
          Delete my media
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void deleteAccount()}
          className="w-full rounded-xl border border-rose-500/40 py-2.5 text-sm text-rose-300 disabled:opacity-50"
        >
          Delete my account
        </button>
        {message ? <p className="text-xs text-zinc-400">{message}</p> : null}
      </div>
    </div>
  );
}
