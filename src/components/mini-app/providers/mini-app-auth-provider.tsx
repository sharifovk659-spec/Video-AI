"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MeUser } from "@/lib/mini-app/types";
import { authenticateMiniApp, fetchMe } from "@/lib/mini-app/client-api";

type AuthState = {
  user: MeUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MiniAppAuthContext = createContext<AuthState | null>(null);

function getTelegramInitData(): string | null {
  if (typeof window === "undefined") return null;
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { initData?: string } };
    }
  ).Telegram?.WebApp;
  return tg?.initData?.trim() || null;
}

export function MiniAppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const initData = getTelegramInitData();
      if (initData) {
        await authenticateMiniApp(initData);
      }
      const me = await fetchMe();
      setUser(me.data);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, error, refresh }),
    [user, loading, error, refresh],
  );

  return (
    <MiniAppAuthContext.Provider value={value}>
      {children}
    </MiniAppAuthContext.Provider>
  );
}

export function useMiniAppAuth() {
  const ctx = useContext(MiniAppAuthContext);
  if (!ctx) {
    throw new Error("useMiniAppAuth must be used within MiniAppAuthProvider");
  }
  return ctx;
}
