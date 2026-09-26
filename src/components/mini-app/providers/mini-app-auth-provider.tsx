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
import {
  authenticateMiniApp,
  fetchMe,
  logoutMiniApp,
} from "@/lib/mini-app/client-api";
import {
  getTelegramInitData,
  waitForTelegramWebApp,
} from "@/lib/telegram/webapp-client";

type AuthState = {
  user: MeUser | null;
  loading: boolean;
  error: string | null;
  outsideTelegram: boolean;
  refresh: () => Promise<void>;
};

const MiniAppAuthContext = createContext<AuthState | null>(null);

const OUTSIDE_TELEGRAM_MESSAGE =
  "Open Vidoo AI from Telegram to continue. This Mini App only works inside Telegram.";

export function MiniAppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outsideTelegram, setOutsideTelegram] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOutsideTelegram(false);
    try {
      const tg = await waitForTelegramWebApp();
      if (!tg) {
        try {
          await logoutMiniApp();
        } catch {
          /* ignore */
        }
        setUser(null);
        setOutsideTelegram(true);
        setError(OUTSIDE_TELEGRAM_MESSAGE);
        return;
      }

      try {
        tg.ready();
        tg.expand();
      } catch {
        /* older clients */
      }

      // Give initData a brief chance to appear after ready().
      let initData = getTelegramInitData();
      if (!initData) {
        await new Promise((r) => setTimeout(r, 150));
        initData = getTelegramInitData();
      }

      if (!initData) {
        try {
          await logoutMiniApp();
        } catch {
          /* ignore */
        }
        setUser(null);
        setOutsideTelegram(true);
        setError(OUTSIDE_TELEGRAM_MESSAGE);
        return;
      }

      await authenticateMiniApp(initData);
      const me = await fetchMe();
      setUser(me.data);
      setOutsideTelegram(false);
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
    () => ({ user, loading, error, outsideTelegram, refresh }),
    [user, loading, error, outsideTelegram, refresh],
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
