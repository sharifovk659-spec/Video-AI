"use client";

import { useEffect, useState } from "react";

type UserRow = {
  id: string;
  freeGenerationsUsed: number;
  freeQuotaBlocked?: boolean;
  telegramAccount: { username: string | null; telegramUserId: string } | null;
  creditWallet: { balance: number; reserved?: number } | null;
};

export function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [delta, setDelta] = useState("10");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

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

  const adjust = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/credits/adjust", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selected,
        delta: Number(delta),
        note,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error?.message ?? "Failed");
      return;
    }
    setMessage(`Balance now ${json.data.balance}`);
    setNote("");
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-zinc-500">Manual credit adjustments are audited.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Credits</th>
              <th className="px-3 py-2">Free used</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t dark:border-zinc-800">
                <td className="px-3 py-2">
                  {row.telegramAccount?.username
                    ? `@${row.telegramAccount.username}`
                    : row.id.slice(0, 8)}
                </td>
                <td className="px-3 py-2">{row.creditWallet?.balance ?? 0}</td>
                <td className="px-3 py-2">{row.freeGenerationsUsed}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-violet-600"
                    onClick={() => setSelected(row.id)}
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <div className="max-w-md space-y-2 rounded-xl border p-4 dark:border-zinc-800">
          <p className="text-sm font-medium">Adjust credits for {selected.slice(0, 8)}…</p>
          <input
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Delta (+/-)"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Audit note (required)"
          />
          <button
            type="button"
            onClick={() => void adjust()}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white"
          >
            Apply adjustment
          </button>
          {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
