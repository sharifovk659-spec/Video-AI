"use client";

import { useCallback, useEffect, useState } from "react";

type PackageRow = {
  id: string;
  slug: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  isPopular: boolean;
  sortOrder: number;
  benefits: string | null;
};

const empty = {
  slug: "",
  name: "",
  credits: "50",
  priceCents: "499",
  currency: "USD",
  isActive: true,
  isPopular: false,
  sortOrder: "0",
  benefits: "",
};

export function AdminPackagesPage() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/packages?page=1&pageSize=100", {
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message ?? "Failed");
    setRows(json.data);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load().catch((err) =>
        setError(err instanceof Error ? err.message : "Load failed"),
      );
    });
  }, [load]);

  const save = async () => {
    setError(null);
    const payload = {
      slug: form.slug,
      name: form.name,
      credits: Number(form.credits),
      priceCents: Number(form.priceCents),
      currency: form.currency,
      isActive: form.isActive,
      isPopular: form.isPopular,
      sortOrder: Number(form.sortOrder),
      benefits: form.benefits || null,
    };
    const res = await fetch(
      editingId ? `/api/admin/packages/${editingId}` : "/api/admin/packages",
      {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? "Save failed");
      return;
    }
    setForm(empty);
    setEditingId(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Credit packages</h1>
        <p className="text-sm text-zinc-500">
          Prices live here — not hardcoded in business logic.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Credits</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t dark:border-zinc-800">
                  <td className="px-3 py-2">
                    {row.name}
                    {!row.isActive ? (
                      <span className="ml-2 text-xs text-zinc-400">inactive</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{row.credits}</td>
                  <td className="px-3 py-2">
                    {(row.priceCents / 100).toFixed(2)} {row.currency}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-violet-600"
                      onClick={() => {
                        setEditingId(row.id);
                        setForm({
                          slug: row.slug,
                          name: row.name,
                          credits: String(row.credits),
                          priceCents: String(row.priceCents),
                          currency: row.currency,
                          isActive: row.isActive,
                          isPopular: row.isPopular,
                          sortOrder: String(row.sortOrder),
                          benefits: row.benefits ?? "",
                        });
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          className="space-y-2 rounded-xl border p-4 dark:border-zinc-800"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <p className="font-medium">{editingId ? "Edit package" : "New package"}</p>
          {(
            [
              ["slug", "Slug"],
              ["name", "Name"],
              ["credits", "Credits"],
              ["priceCents", "Price (cents)"],
              ["currency", "Currency"],
              ["sortOrder", "Sort order"],
              ["benefits", "Benefits"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs">
              {label}
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                required={key !== "benefits"}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
            />
            Popular
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-violet-600 py-2 text-sm text-white"
          >
            Save package
          </button>
        </form>
      </div>
    </div>
  );
}
