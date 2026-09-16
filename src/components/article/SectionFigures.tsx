"use client";

import { useTranslation } from "react-i18next";
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
 * The animated figure that belongs to each section, keyed by the section's
 * heading slug. Every section of the article lands on one, so no stretch of
 * prose runs without a visual.
 *
 * All of these are live: they read the reader's airport and fare, and they
 * respond to the year on the chart page.
 */
const FIGURES: Record<string, React.ComponentType> = {
  "the-first-year-the-promises": WorkforceFigure,
  "the-third-year-the-fees-begin": TicketFigure,
  "the-fifth-year-the-nickel-and-dime": JourneyFigure,
  "the-tenth-year-the-profits-flow-out": RevenueFigure,
  "the-fifteenth-year-the-question-of-quality": ServiceFigure,
  "the-twenty-fifth-year-the-lock-in": LockInFigure,
  "but-wait-is-there-another-way": PromisesFigure,
  "the-question-we-must-ask": EvidenceFigure,
};

/** Fallback by position, in case a heading is reworded in the source. */
const ORDER: React.ComponentType[] = [
  WorkforceFigure,
  TicketFigure,
  JourneyFigure,
  RevenueFigure,
  ServiceFigure,
  LockInFigure,
  PromisesFigure,
  EvidenceFigure,
];

export function SectionFigure({ sectionId, index }: { sectionId: string; index: number }) {
  const { t } = useTranslation();
  const Figure = FIGURES[sectionId] ?? ORDER[index % ORDER.length];

  return (
    <div className="border-t-2 border-ink pt-5">
      <p className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.09em] text-ink-4">
        {t("article.figureLabel")}
      </p>
      <div className="mt-4">
        <Figure />
      </div>
    </div>
  );
}
