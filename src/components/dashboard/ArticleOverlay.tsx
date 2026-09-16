"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ParsedArticle } from "@/lib/article";
import { useCitations, useTrip } from "@/components/editorial/ArticleContext";
import { Column, Wide } from "@/components/editorial/Shell";
import { Prose } from "@/components/editorial/Prose";
import { Cite } from "@/components/editorial/Cite";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import {
  EvidenceFigure,
  JourneyFigure,
  LockInFigure,
  PromisesFigure,
  RevenueFigure,
  ServiceFigure,
  TicketFigure,
  WorkforceFigure,
} from "@/components/editorial/figures";

/**
 * The figure that belongs to each section, keyed by the section's heading slug.
 * Every section of the article gets one, so the prose always lands on a visual.
 */
const FIGURE_BY_SECTION: Record<string, { node: React.ReactNode; label: string }> = {
  "the-first-year-the-promises": { node: <WorkforceFigure />, label: "Jobs" },
  "the-third-year-the-fees-begin": { node: <TicketFigure />, label: "Fares" },
  "the-fifth-year-the-nickel-and-dime": { node: <JourneyFigure />, label: "Charges" },
  "the-tenth-year-the-profits-flow-out": { node: <RevenueFigure />, label: "Profits" },
  "the-fifteenth-year-the-question-of-quality": { node: <ServiceFigure />, label: "Quality" },
  "the-twenty-fifth-year-the-lock-in": { node: <LockInFigure />, label: "Lock-in" },
  "but-wait-is-there-another-way": { node: <PromisesFigure />, label: "Guardrails" },
  "the-question-we-must-ask": { node: <EvidenceFigure />, label: "The record" },
};

/**
 * The written article, opened over the board rather than on another page. The
 * prose is whatever `article.md` (or its translated sibling) contains; the only
 * editorial layer added here is one figure per section.
 */
export function ArticleOverlay({
  article,
  locale,
  translated,
  onClose,
}: {
  article: ParsedArticle;
  locale: string;
  translated: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const trip = useTrip();
  const { references } = useCitations();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /** Year on the board that each section is about. */
  const YEAR_BY_SECTION: Record<string, number> = {
    "the-first-year-the-promises": 2,
    "the-third-year-the-fees-begin": 4,
    "the-fifth-year-the-nickel-and-dime": 8,
    "the-tenth-year-the-profits-flow-out": 12,
    "the-fifteenth-year-the-question-of-quality": 18,
    "the-twenty-fifth-year-the-lock-in": 20,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      {/* Reading header */}
      <div className="sticky top-0 z-10 border-b border-ink bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 sm:px-6">
          <span className="font-sans text-[0.7rem] font-bold uppercase tracking-[0.09em] text-ink-4">
            {t("article.readTitle")}
          </span>
          <span className="hidden font-sans text-[0.74rem] text-ink-4 sm:inline">
            {t("article.meta", {
              words: article.stats.words.toLocaleString(),
              citations: article.stats.citations,
              minutes: article.stats.readingMinutes,
            })}
          </span>
          {translated ? null : (
            <span className="font-sans text-[0.72rem] text-data-a">
              {t("article.englishOnly")}
            </span>
          )}
          <div className="ml-auto flex items-center gap-4">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer border border-ink px-3 py-1 font-sans text-[0.76rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
            >
              {t("article.backToBoard")}
            </button>
          </div>
        </div>
      </div>

      {/* Headline */}
      <header className="mx-auto max-w-5xl px-4 pb-6 pt-9 sm:px-6">
        <div className="mx-auto max-w-[42rem]">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-data-a">
            {t("article.kicker")}
          </p>
          <h1 className="mt-3 font-serif text-[2rem] font-bold leading-[1.1] tracking-[-0.015em] sm:text-[2.6rem]">
            {article.title}
          </h1>
          {article.deck ? (
            <p className="mt-4 font-serif text-[1.2rem] leading-snug text-ink-2">{article.deck}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-2.5">
            <p className="font-sans text-[0.8rem] text-ink">
              {t("article.byline")}{" "}
              <span className="font-semibold">{article.byline || t("article.author")}</span>
            </p>
            <p className="font-sans text-[0.76rem] text-ink-4">{t("article.dateline")}</p>
          </div>
        </div>
      </header>

      <Column className="pb-2">
        <Prose blocks={article.standfirst} lead />
      </Column>

      {/* Every section: its prose, then its figure. */}
      {article.sections.map((section, index) => {
        const figure = FIGURE_BY_SECTION[section.id];
        const boardYear = YEAR_BY_SECTION[section.id];
        return (
          <section key={section.id} id={`read-${section.id}`} className="border-t border-rule py-9">
            <Column>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink-4">
                  {String(index + 1).padStart(2, "0")} / {String(article.sections.length).padStart(2, "0")}
                </p>
                {boardYear !== undefined ? (
                  <button
                    type="button"
                    onClick={() => {
                      trip.setYear(boardYear);
                      onClose();
                    }}
                    className="cursor-pointer font-sans text-[0.74rem] text-data-b hover:underline"
                  >
                    {t("article.seeYear")} →
                  </button>
                ) : null}
              </div>

              <h2 className="mt-2 font-serif text-[1.7rem] font-bold leading-tight tracking-[-0.01em] sm:text-[2rem]">
                {section.title}
              </h2>

              <div className="mt-5">
                <Prose blocks={section.blocks} />
              </div>
            </Column>

            {figure ? (
              <Wide className="mt-9">
                <div className="border-t-2 border-ink pt-5">{figure.node}</div>
              </Wide>
            ) : null}
          </section>
        );
      })}

      {/* Sources */}
      {references.length ? (
        <section className="border-t border-rule py-9">
          <Column>
            <h2 className="font-serif text-[1.5rem] font-bold">
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
              {t("article.footer")} <Cite id={1} />
            </p>
          </Column>
        </section>
      ) : null}
    </div>
  );
}
