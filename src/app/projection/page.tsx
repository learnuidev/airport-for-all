import Link from "next/link";
import { getArticle } from "@/lib/article";
import { CitationsProvider } from "@/components/citations/CitationsContext";
import { EvidenceTable, RevenueSplit } from "@/components/tools/RevenueSplit";

export const metadata = {
  title: "The 25-year projection — Airport for All",
  description:
    "What the international evidence suggests happens to Canadian airport revenue as a private concession matures.",
};

export default function ProjectionPage() {
  const article = getArticle();

  return (
    <CitationsProvider references={article.references}>
      <main className="mx-auto max-w-4xl px-5 py-12">
        <Link href="/" className="text-[0.82rem] text-blue hover:underline">
          ← Back to the article
        </Link>

        <h1 className="mt-5 font-display text-[2rem] font-semibold tracking-[-0.01em] text-ink">
          Profit flow and the cost of reversing course
        </h1>
        <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-ink-2">
          The &ldquo;tens of billions&rdquo; raised by a concession is a one-time windfall. The
          revenue a private operator has to find — 15 to 20 percent above the current model — is
          annual and permanent.
        </p>

        <div className="mt-8 space-y-6">
          <RevenueSplit />
          <EvidenceTable />
        </div>
      </main>
    </CitationsProvider>
  );
}
