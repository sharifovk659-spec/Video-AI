import Link from "next/link";

export default function CreateIndexPage() {
  return (
    <div className="space-y-5 px-4 pt-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Создать</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Выберите готовый стиль или опишите видео в AI Студии.
        </p>
      </div>
      <Link
        href="/mini-app/templates"
        className="vidoo-glass block min-w-0 rounded-2xl p-4"
      >
        <p className="text-sm font-semibold text-white">Каталог стилей</p>
        <p className="mt-1 text-xs text-zinc-400">
          Стиль, фото и генерация за пару шагов
        </p>
      </Link>
      <Link
        href="/mini-app/studio"
        className="block min-w-0 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4"
      >
        <p className="text-sm font-semibold text-white">AI Студия</p>
        <p className="mt-1 text-xs text-violet-100/80">
          Свой промпт · для пользователей с кредитами
        </p>
      </Link>
    </div>
  );
}
