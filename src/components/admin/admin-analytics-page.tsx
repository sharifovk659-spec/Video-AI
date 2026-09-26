"use client";

import { useCallback, useEffect, useState } from "react";

type AnalyticsData = {
  range: { from: string; to: string };
  summary: {
    dailyActiveUsers: number;
    newUsers: number;
    generations: number;
    generationsCompleted: number;
    generationsFailed: number;
    successRate: number | null;
    failureRate: number | null;
    creditsPurchased: number;
    creditsConsumed: number;
    revenueCents: number;
    estimatedAiCostCents: number;
    estimatedGrossMarginCents: number;
    paidPayments: number;
  };
  generationsPerDay: Array<{
    date: string;
    generations: number;
    completed: number;
    failed: number;
  }>;
  mostUsedTemplates: Array<{
    templateId: string;
    slug: string | null;
    title: string;
    generations: number;
  }>;
  meta: { queryMs: number; source: string };
};

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function pct(rate: number | null) {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const [from, setFrom] = useState(toInputDate(defaultFrom));
  const [to, setTo] = useState(toInputDate(now));
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        from: new Date(`${from}T00:00:00.000Z`).toISOString(),
        to: new Date(`${to}T23:59:59.999Z`).toISOString(),
      });
      const res = await fetch(`/api/admin/analytics?${qs}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Failed");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-zinc-500">
            Internal product metrics from live database records
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <label className="text-xs">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="text-xs">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white"
          >
            Apply
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading analytics…</p>
      ) : null}

      {s ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Daily active users" value={s.dailyActiveUsers} />
            <Stat label="New users" value={s.newUsers} />
            <Stat label="Generations" value={s.generations} />
            <Stat label="Success rate" value={pct(s.successRate)} />
            <Stat label="Failure rate" value={pct(s.failureRate)} />
            <Stat label="Credits purchased" value={s.creditsPurchased} />
            <Stat label="Credits consumed" value={s.creditsConsumed} />
            <Stat label="Revenue" value={money(s.revenueCents)} />
            <Stat
              label="Est. AI cost"
              value={money(s.estimatedAiCostCents)}
            />
            <Stat
              label="Est. gross margin"
              value={money(s.estimatedGrossMarginCents)}
            />
            <Stat label="Paid payments" value={s.paidPayments} />
            <Stat
              label="Completed / failed"
              value={`${s.generationsCompleted} / ${s.generationsFailed}`}
            />
          </div>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border p-4 dark:border-zinc-800">
              <h2 className="mb-3 text-sm font-semibold">Generations / day</h2>
              <div className="max-h-72 overflow-y-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="py-1 pr-2">Date</th>
                      <th className="py-1 pr-2">Total</th>
                      <th className="py-1 pr-2">OK</th>
                      <th className="py-1">Fail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.generationsPerDay.map((row) => (
                      <tr key={row.date} className="border-t dark:border-zinc-800">
                        <td className="py-1.5 pr-2 tabular-nums">{row.date}</td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {row.generations}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums text-emerald-600">
                          {row.completed}
                        </td>
                        <td className="py-1.5 tabular-nums text-rose-600">
                          {row.failed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border p-4 dark:border-zinc-800">
              <h2 className="mb-3 text-sm font-semibold">Most-used templates</h2>
              {data!.mostUsedTemplates.length === 0 ? (
                <p className="text-xs text-zinc-500">No generations in range.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data!.mostUsedTemplates.map((t) => (
                    <li
                      key={t.templateId}
                      className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2 dark:border-zinc-800"
                    >
                      <span className="truncate">
                        {t.title}
                        {t.slug ? (
                          <span className="ml-2 text-xs text-zinc-500">
                            {t.slug}
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-zinc-500">
                        {t.generations}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <p className="text-[11px] text-zinc-500">
            Queried in {data!.meta.queryMs}ms · source={data!.meta.source} · no
            private media included
          </p>
        </>
      ) : null}
    </div>
  );
}
