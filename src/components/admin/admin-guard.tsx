"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fetchMe } from "@/lib/mini-app/client-api";

export function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "denied" | "ok">("loading");

  useEffect(() => {
    void fetchMe()
      .then((res) => setState(res.data.isAdmin ? "ok" : "denied"))
      .catch(() => setState("denied"));
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-zinc-500">
        Checking admin access…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Admin access required
        </p>
        <p className="text-sm text-zinc-500">
          Sign in with a Telegram account listed in ADMIN_TELEGRAM_IDS.
        </p>
      </div>
    );
  }

  return children;
}
