import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          video.inovaauto.com
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Vidoo AI
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Telegram AI Video SaaS — production foundation (API, Mini App, Bot, Admin, database).
        </p>
      </div>
      <nav className="flex flex-wrap gap-3 text-sm">
        <Link
          className="rounded-lg bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900"
          href="/mini-app"
        >
          Mini App
        </Link>
        <Link
          className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          href="/admin"
        >
          Admin
        </Link>
        <Link
          className="rounded-lg border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          href="/api/health"
        >
          Health API
        </Link>
      </nav>
    </main>
  );
}
