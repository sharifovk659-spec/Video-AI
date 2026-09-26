import Link from "next/link";

export default function CreateIndexPage() {
  return (
    <div className="space-y-5 px-4 pb-28 pt-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Create</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Start from a template or open AI Studio for a custom prompt.
        </p>
      </div>
      <Link
        href="/mini-app/templates"
        className="vidoo-glass vidoo-glow block rounded-2xl p-4"
      >
        <p className="text-sm font-semibold text-white">Browse templates</p>
        <p className="mt-1 text-xs text-zinc-400">
          Pick a style, upload a photo, generate
        </p>
      </Link>
      <Link
        href="/mini-app/studio"
        className="block rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4"
      >
        <p className="text-sm font-semibold text-white">AI Studio</p>
        <p className="mt-1 text-xs text-violet-100/80">
          Custom description · paid / eligible users
        </p>
      </Link>
    </div>
  );
}
