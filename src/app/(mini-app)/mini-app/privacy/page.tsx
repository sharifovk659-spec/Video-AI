import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <header>
        <Link href="/mini-app/profile" className="text-xs text-violet-300">
          ← Profile
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-white">Privacy</h1>
      </header>
      <div className="vidoo-glass space-y-3 rounded-2xl p-4 text-sm leading-relaxed text-zinc-300">
        <p>
          We process your Telegram identity, uploaded photos, and generation
          metadata to provide the Mini App service. Media binaries are stored in
          object storage — not in the application database.
        </p>
        <p>
          Your generations are private to your account. Other users cannot access
          your outputs through the API.
        </p>
        <p>
          Retention: unused uploads are cleaned after the configured TTL;
          generation outputs follow retention settings managed by admins.
          You can delete your media or entire account from Settings.
        </p>
        <p>
          Payment and credit records are kept to manage balances and prevent
          fraud. See also{" "}
          <Link href="/mini-app/ai-disclosure" className="text-violet-300">
            AI disclosure
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
