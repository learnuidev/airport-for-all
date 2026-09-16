"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { ParsedArticle } from "@/lib/article";
import { useTrip } from "@/components/editorial/ArticleContext";
import { Column, Wide } from "@/components/editorial/Shell";
import { Prose } from "@/components/editorial/Prose";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ReadingProgress } from "./ReadingProgress";
import { SectionFigure } from "./SectionFigures";
import { YearTimeline, ANCHOR_OFFSET } from "./YearTimeline";
import { boardYearFor, buildYearStops } from "./yearStops";

/**
 * The article. The prose is whatever the locale's source file contains; the
 * editorial layer added here is one animated figure and one year stop per
 * section.
 */
export function ArticlePage({
  article,
  translated,
}: {
  article: ParsedArticle;
  /** False when this locale is reading the English prose. */
  translated: boolean;
}) {
  const { t } = useTranslation();
  const references = article.references;
  const yearStops = buildYearStops(article.sections);

  return (
    <div className="min-h-screen bg-paper pb-[6.5rem]">
      {/* The year timeline is fixed to the foot of the window; this padding is
          the room it needs, so it never covers the last paragraph. */}
      <ReadingProgress />

      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 sm:px-6">
          <Link href="/" className="font-serif text-[0.98rem] font-bold tracking-tight">
            {t("app.title")}
          </Link>
          <span className="hidden font-sans text-[0.68rem] uppercase tracking-[0.09em] text-ink-4 sm:inline">
            {t("app.kicker")}
          </span>
          {translated ? null : (
            <span className="font-sans text-[0.72rem] text-data-a">{t("article.englishOnly")}</span>
          )}
          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/chart"
              className="border border-ink px-3 py-1 font-sans text-[0.76rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
            >
              {t("nav.chart")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <header className="mx-auto max-w-5xl px-4 pb-6 pt-10 sm:px-6">
        <div className="mx-auto max-w-[42rem]">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-data-a">
            {t("article.kicker")}
          </p>
          <h1 className="mt-3 font-serif text-[2.1rem] font-bold leading-[1.1] tracking-[-0.015em] sm:text-[2.8rem]">
            {article.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-2.5">
            <p className="font-sans text-[0.82rem] text-ink">
              {t("article.byline")}{" "}
              <span className="font-semibold">{article.byline || t("article.author")}</span>
            </p>
            <p className="font-sans text-[0.76rem] text-ink-4">
              {t("article.meta", {
                words: article.stats.words.toLocaleString(),
                citations: references.length,
                minutes: article.stats.readingMinutes,
              })}
            </p>
          </div>
        </div>
      </header>

      <Column className="pb-4">
        <Prose blocks={article.standfirst} lead />
      </Column>

      {yearStops.length ? <YearTimeline stops={yearStops} /> : null}

      {article.sections.map((section, index) => (
        <section key={section.id} id={section.id} style={{ scrollMarginTop: ANCHOR_OFFSET }}>
          <Column>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule pt-6">
              <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink-4">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(article.sections.length).padStart(2, "0")}
              </p>
              <BoardLink sectionIndex={index} />
            </div>
            <h2 className="mt-2 font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.01em] sm:text-[2.1rem]">
              {section.title}
            </h2>
            <div className="mt-5">
              <Prose blocks={section.blocks} />
            </div>
          </Column>

          <Wide className="mt-10">
            <SectionFigure sectionId={section.id} index={index} />
          </Wide>
        </section>
      ))}

      {references.length ? (
        <section id="sources" className="scroll-mt-16 border-t-2 border-ink py-10">
          <Column>
            <h2 className="font-serif text-[1.6rem] font-bold">
              {t("article.sourcesHeading", { total: references.length, cited: references.length })}
            </h2>
            <ol className="mt-5 divide-y divide-rule border-y border-rule">
              {references.map((reference) => (
                <li key={reference.id} id={`source-${reference.id}`} className="flex gap-4 py-2.5">
                  <span className="w-5 shrink-0 font-sans text-[0.72rem] font-bold text-data-b">
                    {reference.id}
                  </span>
                  <p className="font-sans text-[0.84rem] leading-snug">
                    <span className="font-semibold">{reference.publisher}</span>
                    {reference.title ? (
                      <>
                        {". "}
                        <span className="italic">{reference.title}</span>
                      </>
                    ) : null}
                    {reference.date ? (
                      <>
                        {". "}
                        <span className="text-ink-4">{reference.date}</span>
                      </>
                    ) : null}
                    {"."}
                    {reference.url ? (
                      <>
                        {" "}
                        <a
                          href={reference.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-data-b underline decoration-data-b/30 underline-offset-2"
                        >
                          {t("article.openSource")}
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-6 border-t border-rule pt-3 font-sans text-[0.74rem] leading-relaxed text-ink-4">
              {t("article.footer")}
            </p>
            <div className="mt-8">
              <Link
                href="/chart"
                className="inline-block rounded-lg bg-ink px-4 py-2.5 font-sans text-[0.85rem] font-medium text-white transition hover:bg-ink-2"
              >
                {t("nav.chartCta")}
              </Link>
            </div>
          </Column>
        </section>
      ) : null}
    </div>
  );
}

/** Links to the board with the year this section is about. */
function BoardLink({ sectionIndex }: { sectionIndex: number }) {
  const { t } = useTranslation();
  const trip = useTrip();
  const year = boardYearFor(sectionIndex);
  if (year === undefined) return null;
  return (
    <Link
      href="/chart"
      onClick={() => trip.setYear(year)}
      className="font-sans text-[0.74rem] text-data-b hover:underline"
    >
      {t("article.seeYear")} →
    </Link>
  );
}
