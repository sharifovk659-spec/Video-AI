import Link from "next/link";

export default function AiDisclosurePage() {
  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <header>
        <Link href="/mini-app/profile" className="text-xs text-violet-300">
          ← Profile
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-white">
          AI-generated content
        </h1>
      </header>
      <div className="vidoo-glass space-y-3 rounded-2xl p-4 text-sm leading-relaxed text-zinc-300">
        <p>
          Videos created with Vidoo AI are produced by automated AI systems from
          your photos and selected templates or Studio prompts.
        </p>
        <p>
          Outputs may contain artifacts, inaccuracies, or unexpected
          interpretations. Do not present AI videos as authentic recordings of
          real events without clear disclosure.
        </p>
        <p>
          You must not use Vidoo AI for deceptive deepfakes, impersonation,
          non-consensual intimate imagery, scams, or other abusive purposes.
          Violations may result in account suspension.
        </p>
        <p>
          Template prompts and provider credentials are proprietary and never
          exposed through public APIs.
        </p>
      </div>
    </div>
  );
}
