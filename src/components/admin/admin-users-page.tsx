"use client";

import { useEffect, useState } from "react";

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

export function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [creditDelta, setCreditDelta] = useState("10");
  const [creditNote, setCreditNote] = useState("");
  const [freeDelta, setFreeDelta] = useState("10");
  const [freeNote, setFreeNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const selectedRow = rows.find((r) => r.id === selected);

  const load = async () => {
    const res = await fetch("/api/admin/users?page=1&pageSize=50", {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) setRows(json.data ?? []);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  const adjustCredits = async () => {
    setMessage(null);
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
      setMessage(json.error?.message ?? "Failed");
      return;
    }
    setMessage(`Кредиты: ${json.data.balance}`);
    setCreditNote("");
    await load();
  };

  const adjustFreeGenerations = async () => {
    setMessage(null);
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
      setMessage(json.error?.message ?? "Failed");
      return;
    }
    setMessage(
      `Бесплатные генерации: осталось ${json.data.freeGenerationsRemaining} (выдано ${json.data.freeGenerationsGranted}, использовано ${json.data.freeGenerationsUsed})`,
    );
    setFreeNote("");
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Пользователи</h1>
        <p className="text-sm text-zinc-500">
          Ручная корректировка кредитов и бесплатных генераций (отдельно).
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">Пользователь</th>
              <th className="px-3 py-2">Кредиты</th>
              <th className="px-3 py-2">Бесплатно осталось</th>
              <th className="px-3 py-2">Выдано / использ.</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t dark:border-zinc-800">
                <td className="px-3 py-2">{displayName(row)}</td>
                <td className="px-3 py-2">{row.creditWallet?.balance ?? 0}</td>
                <td className="px-3 py-2 font-medium">{freeRemaining(row)}</td>
                <td className="px-3 py-2 text-zinc-500">
                  {row.freeGenerationsGranted} / {row.freeGenerationsUsed}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-violet-600"
                    onClick={() => {
                      setSelected(row.id);
                      setMessage(null);
                    }}
                  >
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && selectedRow ? (
        <div className="grid max-w-2xl gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl border p-4 dark:border-zinc-800">
            <p className="text-sm font-medium">
              Бесплатные генерации — {displayName(selectedRow)}
            </p>
            <p className="text-xs text-zinc-500">
              Сейчас: {freeRemaining(selectedRow)} осталось (выдано{" "}
              {selectedRow.freeGenerationsGranted}, использовано{" "}
              {selectedRow.freeGenerationsUsed})
            </p>
            <input
              value={freeDelta}
              onChange={(e) => setFreeDelta(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Δ (+10 / -5)"
            />
            <input
              value={freeNote}
              onChange={(e) => setFreeNote(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Причина (обязательно)"
            />
            <button
              type="button"
              onClick={() => void adjustFreeGenerations()}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white"
            >
              Применить к бесплатным
            </button>
          </div>
          <div className="space-y-2 rounded-xl border p-4 dark:border-zinc-800">
            <p className="text-sm font-medium">
              Кредиты — {displayName(selectedRow)}
            </p>
            <input
              value={creditDelta}
              onChange={(e) => setCreditDelta(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Δ (+/-)"
            />
            <input
              value={creditNote}
              onChange={(e) => setCreditNote(e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Причина (обязательно)"
            />
            <button
              type="button"
              onClick={() => void adjustCredits()}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white"
            >
              Применить к кредитам
            </button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      ) : null}
    </div>
  );
}
