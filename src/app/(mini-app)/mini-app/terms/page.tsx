import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <header>
        <Link href="/mini-app/profile" className="text-xs text-violet-300">
          ← Profile
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-white">Terms</h1>
      </header>
      <div className="vidoo-glass space-y-3 rounded-2xl p-4 text-sm leading-relaxed text-zinc-300">
        <p>
          By using Vidoo AI you agree to use the service lawfully and not to
          generate illegal, abusive, or infringing content.
        </p>
        <p>
          You must not create deceptive deepfakes, impersonate others without
          clear consent and disclosure, or use outputs for fraud or harassment.
        </p>
        <p>
          Credits and free generations are reserved when a job is accepted.
          Failed generations that are refunded return reserved credits where
          applicable.
        </p>
        <p>
          Templates, prompts, and provider configuration are proprietary. You
          may not attempt to extract hidden prompts or override internal AI
          parameters.
        </p>
        <p>
          All videos are AI-generated. See{" "}
          <Link href="/mini-app/ai-disclosure" className="text-violet-300">
            AI disclosure
          </Link>
          .
        </p>
        <p>
          We may suspend accounts that abuse free quotas, payment systems, or
          content policies.
        </p>
      </div>
    </div>
  );
}
