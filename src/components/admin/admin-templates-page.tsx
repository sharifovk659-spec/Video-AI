"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TemplateRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  creditCost: number;
  isPro: boolean;
  isTrending: boolean;
  isNew: boolean;
  isPopular: boolean;
  coverUrl: string | null;
  previewVideoUrl: string | null;
  currentVersion?: number;
  category: { name: string };
};

type VersionRow = {
  id: string;
  versionNumber: number;
  createdAt: string;
  changeNote: string | null;
  providerSlug: string;
  modelSlug: string;
};

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  categoryId: "",
  coverUrl: "",
  coverStorageKey: "",
  previewVideoUrl: "",
  previewStorageKey: "",
  prompt: "",
  negativePrompt: "",
  aiModelId: "",
  durationSeconds: "8",
  aspectRatio: "9:16",
  creditCost: "1",
  isPro: false,
  isTrending: false,
  isNew: false,
  isPopular: false,
  status: "draft",
  sortOrder: "0",
  estimatedApiCostCents: "0",
};

export function AdminTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testGenerationId, setTestGenerationId] = useState<string | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const previewInput = useRef<HTMLInputElement>(null);
  const testPhotoInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const [templatesRes, categoriesRes, modelsRes] = await Promise.all([
      fetch(`/api/admin/templates?${params}`, { credentials: "include" }),
      fetch("/api/admin/categories?page=1&pageSize=100", { credentials: "include" }),
      fetch("/api/admin/ai-models?page=1&pageSize=100", { credentials: "include" }),
    ]);
    const templatesJson = await templatesRes.json();
    const categoriesJson = await categoriesRes.json();
    const modelsJson = await modelsRes.json();
    if (!templatesRes.ok) throw new Error(templatesJson.error?.message);
    setRows(templatesJson.data);
    setCategories(categoriesJson.data ?? []);
    setModels(modelsJson.data ?? []);
  }, [q, status]);

  useEffect(() => {
    queueMicrotask(() => {
      void load().catch((err) =>
        setError(err instanceof Error ? err.message : "Load failed"),
      );
    });
  }, [load]);

  const loadVersions = async (id: string) => {
    const res = await fetch(`/api/admin/templates/${id}/versions`, {
      credentials: "include",
    });
    const json = await res.json();
    if (res.ok) setVersions(json.data ?? []);
  };

  const uploadMedia = async (kind: "cover" | "preview", file: File) => {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/admin/media", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Upload failed");
      if (kind === "cover") {
        setForm((f) => ({
          ...f,
          coverUrl: json.data.url,
          coverStorageKey: json.data.storageKey,
        }));
      } else {
        setForm((f) => ({
          ...f,
          previewVideoUrl: json.data.url,
          previewStorageKey: json.data.storageKey,
        }));
      }
      setInfo(`${kind} uploaded`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async (asDraft = true): Promise<string | null> => {
    setError(null);
    setInfo(null);
    setBusy(true);
    const payload = {
      ...form,
      creditCost: Number(form.creditCost),
      sortOrder: Number(form.sortOrder),
      durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null,
      estimatedApiCostCents: Number(form.estimatedApiCostCents),
      description: form.description || null,
      coverUrl: form.coverUrl || null,
      previewVideoUrl: form.previewVideoUrl || null,
      coverStorageKey: form.coverStorageKey || null,
      previewStorageKey: form.previewStorageKey || null,
      negativePrompt: form.negativePrompt || null,
      status: asDraft ? "draft" : form.status,
    };
    try {
      const res = await fetch(
        editingId ? `/api/admin/templates/${editingId}` : "/api/admin/templates",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Save failed");
      setEditingId(json.data.id);
      setInfo("Saved");
      await load();
      await loadVersions(json.data.id);
      return json.data.id as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = (await save(true)) ?? editingId;
      if (!id) return;
      const res = await fetch(`/api/admin/templates/${id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeNote: "published from admin" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Publish failed");
      setForm((f) => ({ ...f, status: "active" }));
      setInfo("Published");
      await load();
      await loadVersions(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Duplicate failed");
      setInfo(`Cloned as ${json.data.slug}`);
      await load();
      await edit(json.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duplicate failed");
    } finally {
      setBusy(false);
    }
  };

  const disableTemplate = async (id: string) => {
    if (!confirm("Disable this template immediately?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/templates/${id}/disable`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Disable failed");
      setInfo("Template disabled");
      if (editingId === id) {
        setForm((f) => ({ ...f, status: "archived" }));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disable failed");
    } finally {
      setBusy(false);
    }
  };

  const runTest = async (file: File) => {
    if (!editingId) {
      setError("Save the template before testing");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const up = await fetch("/api/v1/uploads/photo", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error?.message ?? "Photo upload failed");

      const res = await fetch(`/api/admin/templates/${editingId}/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUploadId: upJson.data.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Test failed");
      setTestGenerationId(json.data.id);
      setInfo(`Test generation started: ${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setBusy(false);
    }
  };

  const edit = async (id: string) => {
    const res = await fetch(`/api/admin/templates/${id}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok) return;
    const t = json.data;
    setEditingId(id);
    setForm({
      name: t.title,
      slug: t.slug,
      description: t.description ?? "",
      categoryId: t.categoryId,
      coverUrl: t.coverUrl ?? "",
      coverStorageKey: t.coverStorageKey ?? "",
      previewVideoUrl: t.previewVideoUrl ?? "",
      previewStorageKey: t.previewStorageKey ?? "",
      prompt: t.prompt,
      negativePrompt: t.negativePrompt ?? "",
      aiModelId: t.aiModelId,
      durationSeconds: t.durationSeconds?.toString() ?? "8",
      aspectRatio: t.aspectRatio ?? "9:16",
      creditCost: String(t.creditCost),
      isPro: t.isPro,
      isTrending: t.isTrending,
      isNew: t.isNew,
      isPopular: t.isPopular ?? false,
      status: t.status,
      sortOrder: String(t.sortOrder),
      estimatedApiCostCents: String(t.estimatedApiCostCents ?? 0),
    });
    setVersions(t.versions ?? []);
    await loadVersions(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-sm text-zinc-500">
          Viral publish workflow — draft → media → prompt → test → publish
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <button
          type="button"
          className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setVersions([]);
            setTestGenerationId(null);
          }}
        >
          Add Template
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-600">{info}</p> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ver</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-zinc-500">
                      {row.category.name} · {row.creditCost} cr
                    </div>
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">v{row.currentVersion ?? 0}</td>
                  <td className="space-x-2 px-3 py-2">
                    <button
                      type="button"
                      className="text-violet-600"
                      onClick={() => void edit(row.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-zinc-500"
                      onClick={() => void duplicate(row.id)}
                    >
                      Duplicate
                    </button>
                    {row.status !== "archived" ? (
                      <button
                        type="button"
                        className="text-rose-600"
                        onClick={() => void disableTemplate(row.id)}
                      >
                        Disable
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 rounded-xl border p-4 dark:border-zinc-800">
          <p className="font-medium">
            {editingId ? "Edit template" : "New template"}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["name", "Name"],
                ["slug", "Slug"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs">
                {label}
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  required
                />
              </label>
            ))}
          </div>

          <label className="block text-xs">
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <div className="rounded-lg border border-dashed p-3 dark:border-zinc-700">
            <p className="mb-2 text-xs font-medium">Cover image</p>
            {form.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.coverUrl}
                alt="Cover"
                className="mb-2 h-28 w-auto rounded object-cover"
              />
            ) : null}
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadMedia("cover", f);
              }}
            />
            <button
              type="button"
              disabled={busy}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-white"
              onClick={() => coverInput.current?.click()}
            >
              Upload cover
            </button>
          </div>

          <div className="rounded-lg border border-dashed p-3 dark:border-zinc-700">
            <p className="mb-2 text-xs font-medium">Preview video</p>
            {form.previewVideoUrl ? (
              <video
                src={form.previewVideoUrl}
                className="mb-2 max-h-40 w-full rounded"
                controls
                muted
              />
            ) : null}
            <input
              ref={previewInput}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadMedia("preview", f);
              }}
            />
            <button
              type="button"
              disabled={busy}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-white"
              onClick={() => previewInput.current?.click()}
            >
              Upload preview
            </button>
          </div>

          <label className="block text-xs">
            Internal prompt
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              rows={4}
              className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              required
            />
          </label>
          <label className="block text-xs">
            Negative prompt
            <textarea
              value={form.negativePrompt}
              onChange={(e) =>
                setForm({ ...form, negativePrompt: e.target.value })
              }
              rows={2}
              className="mt-1 w-full rounded border px-2 py-1.5 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs">
              Category
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                required
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              AI model
              <select
                value={form.aiModelId}
                onChange={(e) => setForm({ ...form, aiModelId: e.target.value })}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                required
              >
                <option value="">Select…</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs">
              Duration (sec)
              <input
                value={form.durationSeconds}
                onChange={(e) =>
                  setForm({ ...form, durationSeconds: e.target.value })
                }
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-xs">
              Aspect ratio
              <input
                value={form.aspectRatio}
                onChange={(e) =>
                  setForm({ ...form, aspectRatio: e.target.value })
                }
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-xs">
              Credit cost
              <input
                value={form.creditCost}
                onChange={(e) => setForm({ ...form, creditCost: e.target.value })}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="block text-xs">
              Sort order
              <input
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            {(["isTrending", "isNew", "isPro", "isPopular"] as const).map(
              (flag) => (
                <label key={flag} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form[flag]}
                    onChange={(e) =>
                      setForm({ ...form, [flag]: e.target.checked })
                    }
                  />
                  {flag.replace("is", "")}
                </label>
              ),
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-3 dark:border-zinc-800">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void save(true)}
            >
              Save draft
            </button>
            <input
              ref={testPhotoInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runTest(f);
              }}
            />
            <button
              type="button"
              disabled={busy || !editingId}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => testPhotoInput.current?.click()}
            >
              Test Generation
            </button>
            <button
              type="button"
              disabled={busy || !editingId}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void publish()}
            >
              Publish
            </button>
          </div>

          {testGenerationId ? (
            <p className="text-xs text-zinc-500">
              Preview test:{" "}
              <a
                className="text-violet-500"
                href={`/mini-app/generations/${testGenerationId}`}
                target="_blank"
                rel="noreferrer"
              >
                open generation
              </a>
            </p>
          ) : null}

          {versions.length > 0 ? (
            <div className="border-t pt-3 dark:border-zinc-800">
              <p className="mb-2 text-xs font-medium">Version history</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-zinc-500">
                {versions.map((v) => (
                  <li key={v.id}>
                    v{v.versionNumber} · {v.providerSlug}/{v.modelSlug} ·{" "}
                    {v.changeNote ?? "—"} ·{" "}
                    {new Date(v.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
