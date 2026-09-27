"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createGeneration } from "@/lib/mini-app/client-api";
import { useMiniAppAuth } from "@/components/mini-app/providers/mini-app-auth-provider";

export function ConfirmGenerationScreen({
  templateSlug,
  templateTitle,
  creditCost,
}: {
  templateSlug: string;
  templateTitle: string;
  creditCost: number;
}) {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("upload");
  const router = useRouter();
  const { user, refresh } = useMiniAppAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (!uploadId) {
      setError("Фото не загружено");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const key = `gen:${templateSlug}:${uploadId}`;
      const res = await createGeneration({
        templateSlug,
        photoUploadId: uploadId,
        idempotencyKey: key,
      });
      await refresh();
      router.replace(`/mini-app/generations/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось начать");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-4">
      <div>
        <p className="text-xs text-violet-300/80">Подтверждение</p>
        <h1 className="text-xl font-semibold text-white">{templateTitle}</h1>
      </div>

      {uploadId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/v1/uploads/${uploadId}`}
          alt="Your photo"
          className="mx-auto max-h-56 w-full rounded-2xl object-contain vidoo-glass"
        />
      ) : null}

      <div className="vidoo-glass space-y-2 rounded-2xl p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400">Стоимость стиля</span>
          <span>{creditCost} кр.</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Баланс</span>
          <span>{user?.creditBalance ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Бесплатно</span>
          <span>{user?.freeGenerationsRemaining ?? "—"}</span>
        </div>
        <p className="text-xs text-zinc-500">
          Сначала списываются бесплатные генерации. После старта можно закрыть
          Telegram — задача продолжится на сервере.
        </p>
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <button
        type="button"
        disabled={loading || !uploadId}
        onClick={() => void start()}
        className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Запуск…" : "Создать видео"}
      </button>
    </div>
  );
}
