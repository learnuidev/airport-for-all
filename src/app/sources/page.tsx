import Link from "next/link";
import { getArticle } from "@/lib/article";
import { CitationsProvider } from "@/components/citations/CitationsContext";
import { SourceList } from "@/components/tools/SourceList";

export const metadata = {
  title: "Sources — Airport for All",
  description: "Every source listed in article.md, with its citation numbers.",
};

export default function SourcesPage() {
  const article = getArticle();

  return (
    <CitationsProvider references={article.references}>
      <main className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-[0.82rem] text-blue hover:underline">
          ← Back to the article
        </Link>

        <h1 className="mt-5 font-display text-[2rem] font-semibold tracking-[-0.01em] text-ink">
          Sources
        </h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">
          article.md carries two citation systems. Its footnote block numbers 15 sources — those
          are the ones cited in the prose above. Its closing reference list numbers 20. Both are
          listed here, with the overlap marked.
        </p>

        <div className="mt-8">
          <SourceList references={article.references} />
        </div>
      </main>
    </CitationsProvider>
  );
}
