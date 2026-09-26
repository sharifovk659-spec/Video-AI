"use client";

import { useEffect, useState } from "react";

export function AdminListPage({
  title,
  endpoint,
}: {
  title: string;
  endpoint: string;
}) {
  const [rows, setRows] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${endpoint}?page=1&pageSize=50`, { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed");
        setRows(json.data ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, [endpoint]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <pre className="overflow-auto rounded-xl border bg-white p-4 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        {JSON.stringify(rows, null, 2)}
      </pre>
    </div>
  );
}
