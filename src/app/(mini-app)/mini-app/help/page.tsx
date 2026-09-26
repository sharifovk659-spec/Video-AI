import Link from "next/link";

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <header>
        <Link href="/mini-app/profile" className="text-xs text-violet-300">
          ← Profile
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-white">{title}</h1>
      </header>
      <div className="vidoo-glass space-y-3 rounded-2xl p-4 text-sm leading-relaxed text-zinc-300">
        {children}
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <LegalShell title="Help">
      <p>
        Vidoo AI turns your photos into short videos using curated templates or
        AI Studio custom prompts.
      </p>
      <p>
        Generations run asynchronously. Open My Videos to track Processing,
        Ready, and Failed statuses.
      </p>
      <p>
        Free users receive a limited number of generations. Buy credits for more
        templates and to unlock AI Studio.
      </p>
      <p>
        Need support? Message the Vidoo AI Telegram bot and describe the issue
        with your generation ID if available.
      </p>
    </LegalShell>
  );
}
