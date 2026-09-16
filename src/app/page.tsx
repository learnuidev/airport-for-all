import Link from "next/link";
import { getArticle, type Section } from "@/lib/article";
import { CitationsProvider } from "@/components/citations/CitationsContext";
import {
  AirportStrip,
  ChapterCounterargument,
  ChapterFirstFees,
  ChapterLockIn,
  ChapterNickel,
  ChapterProfits,
  ChapterService,
  ChapterWorkforce,
  Closing,
  Masthead,
} from "@/components/article/ArticleParts";

/**
 * The article page: prose straight from article.md, one visual per chapter,
 * and links out to the deeper tools.
 */
export default function ArticlePage() {
  const article = getArticle();
  const bySlug = new Map(article.sections.map((section) => [section.id, section]));
  const pick = (id: string) => bySlug.get(id as Section["id"]);

  const workforce = pick("year-1-2");
  const firstFees = pick("year-3-5");
  const nickel = pick("year-5-10");
  const profits = pick("year-10-15");
  const service = pick("year-15-25");
  const lockIn = pick("year-25-plus");
  const counter = pick("counterargument");

  return (
    <CitationsProvider references={article.references}>
      <Masthead article={article} />

      <main id="article" className="mx-auto max-w-3xl px-5 pb-20">
        <div className="pt-10">
          <AirportStrip />
        </div>

        <div className="mt-4">
          {workforce ? <ChapterWorkforce section={workforce} index={0} /> : null}
          {firstFees ? <ChapterFirstFees section={firstFees} index={1} /> : null}
          {nickel ? <ChapterNickel section={nickel} index={2} /> : null}
          {profits ? <ChapterProfits section={profits} index={3} /> : null}
          {service ? <ChapterService section={service} index={4} /> : null}
          {lockIn ? <ChapterLockIn section={lockIn} index={5} /> : null}
          {counter ? <ChapterCounterargument section={counter} index={6} /> : null}
        </div>

        <Closing />

        <footer className="border-t border-line pt-6 text-[0.78rem] leading-relaxed text-ink-4">
          <p>
            Every paragraph above is parsed at build time from{" "}
            <code className="rounded bg-paper-3 px-1.5 py-0.5 font-mono text-[0.72rem] text-ink-2">
              article.md
            </code>
            : {article.stats.words.toLocaleString()} words, {article.stats.sections} chapters,{" "}
            {article.stats.citations} citation markers, {article.stats.distinctSources} distinct
            sources. Edit the markdown and this page follows.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/sources" className="text-blue hover:underline">
              Read the {article.references.length} listed sources
            </Link>
            <Link href="/ticket" className="text-blue hover:underline">
              Ticket calculator
            </Link>
            <Link href="/projection" className="text-blue hover:underline">
              25-year projection
            </Link>
            <Link href="/airports" className="text-blue hover:underline">
              Airport comparison
            </Link>
          </p>
        </footer>
      </main>
    </CitationsProvider>
  );
}
