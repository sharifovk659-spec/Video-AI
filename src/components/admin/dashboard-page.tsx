"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Dashboard = {
  totalUsers: number;
  todayUsers: number;
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  revenueCents: number;
  apiEstimatedCostCents: number;
  estimatedGrossMarginCents: number;
  creditsChargedTotal: number;
  activeTemplates: number;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/dashboard", { credentials: "include" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Failed");
        setData(json.data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard"),
      );
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-zinc-500">Loading metrics…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-zinc-500">Operational overview (live DB)</p>
        </div>
        <Link
          href="/admin/analytics"
          className="text-sm text-violet-600 hover:underline"
        >
          Open analytics →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total users" value={data.totalUsers} />
        <Stat label="Active today" value={data.todayUsers} />
        <Stat label="Total generations" value={data.totalGenerations} />
        <Stat label="Successful" value={data.successfulGenerations} />
        <Stat label="Failed" value={data.failedGenerations} />
        <Stat
          label="Revenue"
          value={`$${(data.revenueCents / 100).toFixed(2)}`}
        />
        <Stat
          label="Est. AI cost"
          value={`$${(data.apiEstimatedCostCents / 100).toFixed(2)}`}
        />
        <Stat
          label="Est. gross margin"
          value={`$${(data.estimatedGrossMarginCents / 100).toFixed(2)}`}
        />
        <Stat label="Credits consumed" value={data.creditsChargedTotal} />
        <Stat label="Active templates" value={data.activeTemplates} />
      </div>
    </div>
  );
}
