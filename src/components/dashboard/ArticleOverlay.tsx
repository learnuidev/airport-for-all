"use client";

import { useEffect } from "react";
import type { ParsedArticle } from "@/lib/article";
import { useCitations, useTrip } from "@/components/editorial/ArticleContext";
import { Column, Wide } from "@/components/editorial/Shell";
import { Prose } from "@/components/editorial/Prose";
import { Cite } from "@/components/editorial/Cite";
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

/** Chapter ids paired with the year on the board each one belongs to. */
const CHAPTER_YEARS: Record<string, number> = {
  "year-1-2": 2,
  "year-3-5": 4,
  "year-5-10": 8,
  "year-10-15": 12,
  "year-15-25": 18,
  "year-25-plus": 20,
};

const FIGURES: Record<string, React.ReactNode> = {
  "year-1-2": <WorkforceFigure />,
  "year-3-5": <TicketFigure />,
  "year-5-10": <JourneyFigure />,
  "year-10-15": <RevenueFigure />,
  "year-15-25": <ServiceFigure />,
  "year-25-plus": <LockInFigure />,
};

/**
 * The written article, opened over the board rather than on another page, so
 * the whole piece stays one screen deep.
 */
export function ArticleOverlay({
  article,
  onClose,
}: {
  article: ParsedArticle;
  onClose: () => void;
}) {
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

  const sections = article.sections.filter((section) => section.id !== "counterargument");
  const counterargument = article.sections.find((section) => section.id === "counterargument");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      {/* Reading header */}
      <div className="sticky top-0 z-10 border-b border-ink bg-paper">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5 sm:px-6">
          <span className="font-sans text-[0.7rem] font-bold uppercase tracking-[0.09em] text-ink-4">
            The full article
          </span>
          <span className="hidden font-sans text-[0.74rem] text-ink-4 sm:inline">
            {article.stats.words.toLocaleString()} words · {article.stats.citations} citations ·{" "}
            {article.stats.readingMinutes} min
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto cursor-pointer border border-ink px-3 py-1 font-sans text-[0.76rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
          >
            Back to the board
          </button>
        </div>
      </div>

      {/* Headline */}
      <header className="mx-auto max-w-5xl px-4 pb-6 pt-9 sm:px-6">
        <div className="mx-auto max-w-[42rem]">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-data-a">
            Projection
          </p>
          <h1 className="mt-3 font-serif text-[2rem] font-bold leading-[1.1] tracking-[-0.015em] sm:text-[2.6rem]">
            {article.title}
          </h1>
          <p className="mt-4 font-serif text-[1.2rem] leading-snug text-ink-2">{article.deck}</p>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-t border-ink pt-2.5">
            <p className="font-sans text-[0.78rem] text-ink-2">
              By <span className="font-semibold">The Data Desk</span>
            </p>
            <p className="font-sans text-[0.76rem] text-ink-4">15 September 2026</p>
          </div>
        </div>
      </header>

      <Column className="pb-2">
        <Prose blocks={article.standfirst} lead />
      </Column>

      {/* Chapters */}
      {sections.map((section, index) => (
        <section
          key={section.id}
          className="border-t border-rule py-9"
          id={`read-${section.id}`}
        >
          <Column>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink-4">
                {section.kicker}
              </p>
              <button
                type="button"
                onClick={() => {
                  trip.setYear(CHAPTER_YEARS[section.id] ?? 0);
                  onClose();
                }}
                className="cursor-pointer font-sans text-[0.74rem] text-data-b hover:underline"
              >
                See this year on the board →
              </button>
            </div>
            <h2 className="mt-2 font-serif text-[1.7rem] font-bold leading-tight tracking-[-0.01em] sm:text-[2rem]">
              {section.title}
            </h2>
            <div className="mt-5">
              <Prose blocks={section.blocks} />
            </div>
          </Column>
          {FIGURES[section.id] ? (
            <Wide className="mt-8">
              <div className="border-t border-rule pt-6">{FIGURES[section.id]}</div>
            </Wide>
          ) : null}
          {index === sections.length - 1 ? null : null}
        </section>
      ))}

      {/* Evidence */}
      <section className="border-t-2 border-ink py-9">
        <Column>
          <h2 className="font-serif text-[1.7rem] font-bold leading-tight">
            What the record shows
          </h2>
          <p className="mt-3 font-serif text-[1.1rem] leading-relaxed text-ink-2">
            The projection rests on what happened elsewhere. The record covers five countries and
            three decades; one academic study shows genuine benefits alongside the bill.
          </p>
        </Column>
        <Wide className="mt-8 space-y-10">
          <EvidenceFigure />
          <PromisesFigure />
        </Wide>
      </section>

      {/* Counterargument */}
      {counterargument ? (
        <section className="border-t border-rule py-9">
          <Column>
            <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-ink-4">
              The counterargument
            </p>
            <h2 className="mt-2 font-serif text-[1.7rem] font-bold leading-tight">
              {counterargument.title}
            </h2>
            <div className="mt-5">
              <Prose blocks={counterargument.blocks} />
            </div>
          </Column>
        </section>
      ) : null}

      {/* Sources */}
      <section className="border-t border-rule py-9">
        <Column>
          <h2 className="font-serif text-[1.5rem] font-bold">
            {references.length} sources, {references.filter((r) => r.cited).length} cited in the
            text
          </h2>
          <p className="mt-2 font-serif text-[1rem] leading-relaxed text-ink-3">
            The reporting carries a footnote block of 15 sources and a closing list of 20. Both are shown.
            Citation markers in the text open the matching entry here.
          </p>
          <ol id="sources" className="mt-5 divide-y divide-rule border-y border-rule">
            {references.map((reference) => (
              <li key={reference.id} id={`source-${reference.id}`} className="flex gap-4 py-2.5">
                <span className="w-5 shrink-0 font-sans text-[0.72rem] font-bold text-data-b">
                  {reference.id}
                </span>
                <p className="font-sans text-[0.84rem] leading-snug">
                  <span className="font-semibold">{reference.publisher}</span>.{" "}
                  <span className="italic">{reference.title}</span>.{" "}
                  <span className="text-ink-4">{reference.date}.</span>{" "}
                  {reference.url ? (
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-data-b underline decoration-data-b/30 underline-offset-2"
                    >
                      Open
                    </a>
                  ) : null}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-rule pt-3 font-sans text-[0.74rem] leading-relaxed text-ink-4">
            Every paragraph above comes from the reporting; the projections are anchored to its
            figures and labelled as modelled. <Cite id={1} />
          </p>
        </Column>
      </section>
    </div>
  );
}
