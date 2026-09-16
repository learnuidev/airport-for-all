/**
 * The year spine of the article.
 *
 * Two different year numbers describe the same six chapters, and keeping them
 * apart matters:
 *
 *  - `year` is the calendar position inside the story — year 1, 3, 5, 10, 15,
 *    25. It is read straight off each section's kicker, so it follows the source
 *    file in every locale and nothing here is hard-coded.
 *  - `boardYear` is where that chapter sits on the /chart board, whose horizon
 *    is 20 years. Only the current model, the year slider and the board itself
 *    speak in these.
 */

import type { Section } from "@/lib/article";

export type YearStop = {
  /** The section's DOM id, used both as the anchor and as the join key. */
  id: string;
  /** The story's own year for this chapter, from the heading. */
  year: number;
  /** The year the board's slider should land on for this chapter. */
  boardYear: number;
  /** The section's heading without its kicker, e.g. "The Fees Begin". */
  title: string;
  /** 1-based reading position among the year chapters. */
  index: number;
};

/**
 * Where each year chapter sits on the board. Keyed by the section id in the
 * source, so the mapping survives translations of the prose: the ids are slugs
 * of the English headings that every locale keeps in its file.
 */
export const SECTION_YEARS: Record<string, number> = {
  "the-first-year-the-promises": 2,
  "the-third-year-the-fees-begin": 4,
  "the-fifth-year-the-nickel-and-dime": 8,
  "the-tenth-year-the-profits-flow-out": 12,
  "the-fifteenth-year-the-question-of-quality": 18,
  "the-twenty-fifth-year-the-lock-in": 20,
};

/** True for a chapter that carries a year in its kicker. */
function isYearSection(section: Section): boolean {
  return section.startYear !== null;
}

/**
 * Every dated chapter, in reading order, with both of its year numbers.
 * A section the board has no mapping for is kept — the rail is a reading aid
 * first — and its board year is clamped into the board's 20-year horizon.
 */
export function buildYearStops(sections: Section[]): YearStop[] {
  const dated = sections.filter(isYearSection);
  const gaps = dated
    .map((section, index) => (SECTION_YEARS[section.id] ?? 0) - (section.startYear ?? 0))
    .filter((gap) => gap > 0);
  const offset = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;

  return dated.map((section, index) => ({
    id: section.id,
    year: section.startYear as number,
    boardYear: SECTION_YEARS[section.id] ?? (section.startYear ?? 0) + offset,
    title: section.title,
    index: index + 1,
  }));
}
