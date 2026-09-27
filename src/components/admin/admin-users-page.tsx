"use client";

import { useCallback, useEffect, useState } from "react";

type UserRow = {
  id: string;
  freeGenerationsUsed: number;
  freeGenerationsGranted: number;
  freeQuotaBlocked?: boolean;
  telegramAccount: {
    username: string | null;
    firstName?: string | null;
    telegramUserId: string;
  } | null;
  creditWallet: { balance: number; reserved?: number } | null;
};

function freeRemaining(row: UserRow): number {
  if (row.freeQuotaBlocked) return 0;
  return Math.max(0, row.freeGenerationsGranted - row.freeGenerationsUsed);
}

function displayName(row: UserRow): string {
  const tg = row.telegramAccount;
  if (tg?.username) return `@${tg.username}`;
  if (tg?.firstName) return tg.firstName;
  return row.id.slice(0, 8);
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#12101a] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-violet-500/50";

export function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [creditDelta, setCreditDelta] = useState("10");
  const [creditNote, setCreditNote] = useState("");
  const [freeDelta, setFreeDelta] = useState("10");
  const [freeNote, setFreeNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedRow = rows.find((r) => r.id === selected);

  const load = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    const term = (searchTerm ?? query).trim();
    if (term) params.set("q", term);

    try {
      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Не удалось загрузить пользователей");
      }
      setRows(json.data ?? []);
    } catch (err) {
      setRows([]);
      setLoadError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load("");
    // initial list only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adjustCredits = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/credits/adjust", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected,
          delta: Number(creditDelta),
          note: creditNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Ошибка");
      }
      setMessage(`Кредиты: ${json.data.balance}`);
      setCreditNote("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const adjustFreeGenerations = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users/free-generations/adjust", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selected,
          delta: Number(freeDelta),
          note: freeNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Ошибка");
      }
      setMessage(
        `Бесплатные: осталось ${json.data.freeGenerationsRemaining} (выдано ${json.data.freeGenerationsGranted}, использовано ${json.data.freeGenerationsUsed})`,
      );
      setFreeNote("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Пользователи</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Корректировка бесплатных генераций и кредитов (отдельно).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={inputClass}
          placeholder="Поиск: @username или имя"
          onKeyDown={(e) => {
            if (e.key === "Enter") void load(query);
          }}
        />
        <button
          type="button"
          onClick={() => void load(query)}
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white"
        >
          Найти
        </button>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {loadError}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void load(query)}
          >
            Повторить
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : rows.length === 0 && !loadError ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-zinc-400">
          Пользователи не найдены
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const isSelected = selected === row.id;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row.id);
                    setMessage(null);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-violet-500/60 bg-violet-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-50">
                        {displayName(row)}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        ID {row.id.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p className="font-semibold text-emerald-400">
                        {freeRemaining(row)} бесплатно
                      </p>
                      <p className="text-zinc-500">
                        {row.freeGenerationsGranted}/{row.freeGenerationsUsed}{" "}
                        выд./исп.
                      </p>
                      <p className="text-zinc-400">
                        {row.creditWallet?.balance ?? 0} кр.
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && selectedRow ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0c0a12] p-4">
          <p className="text-sm font-medium text-zinc-200">
            Редактирование: {displayName(selectedRow)}
          </p>

          <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/90">
              Бесплатные генерации
            </p>
            <p className="text-xs text-zinc-400">
              Сейчас {freeRemaining(selectedRow)} осталось · введите Δ (+10 / −5)
            </p>
            <input
              value={freeDelta}
              onChange={(e) => setFreeDelta(e.target.value)}
              className={inputClass}
              inputMode="numeric"
              placeholder="+10"
            />
            <input
              value={freeNote}
              onChange={(e) => setFreeNote(e.target.value)}
              className={inputClass}
              placeholder="Причина (обязательно)"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void adjustFreeGenerations()}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Применить к бесплатным
            </button>
          </div>

          <div className="space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-300/90">
              Кредиты
            </p>
            <input
              value={creditDelta}
              onChange={(e) => setCreditDelta(e.target.value)}
              className={inputClass}
              inputMode="numeric"
              placeholder="Δ кредитов"
            />
            <input
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
              className={inputClass}
              placeholder="Причина (обязательно)"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void adjustCredits()}
              className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Применить к кредитам
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200">
          {message}
        </p>
      ) : null}
    </div>
  );
}
