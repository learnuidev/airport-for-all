/**
 * The year spine of the article.
 *
 * Two different year numbers describe the same six dated chapters, and keeping
 * them apart matters:
 *
 *  - `year` is the calendar position inside the story — 1, 3, 5, 10, 15, 25.
 *    The timeline is spaced by this, so the gaps in the narrative read as gaps
 *    on the scale.
 *  - `boardYear` is where that chapter sits on the /chart board, whose horizon
 *    is 20 years. Only the board and its year slider speak in these.
 *
 * Neither comes from the parser's `startYear`/`endYear`, which are only filled
 * for a kicker written "Year 3–5" — this source spells its headings out, so
 * they are null on every section.
 *
 * The chapters are keyed by their position in the article rather than by
 * section id, because the ids are slugs of the headings and so differ in every
 * language (and vanish entirely for Chinese). Reading order is the one thing
 * all four locales share: the chronology is the first six sections, and the
 * closing argument follows it. `chapterYear` from the parser corroborates this
 * where the script allows it.
 */

import type { Section } from "@/lib/article";

export type YearStop = {
  /** The section's DOM id, used as the anchor. */
  id: string;
  /** The story's own year for this chapter. */
  year: number;
  /** The year the board's slider should land on for this chapter. */
  boardYear: number;
  /** The section's heading without its kicker, e.g. "The Fees Begin". */
  title: string;
  /** 1-based position among the dated chapters, in reading order. */
  index: number;
};

type Chapter = { year: number; boardYear: number };

/**
 * The six dated chapters, by reading position.
 *
 * Note that the two columns diverge as the story goes on: the article's last
 * chapter is set in year 25, while the board's projection stops at year 20.
 */
const CHAPTERS: Chapter[] = [
  { year: 1, boardYear: 2 },
  { year: 3, boardYear: 4 },
  { year: 5, boardYear: 8 },
  { year: 10, boardYear: 12 },
  { year: 15, boardYear: 18 },
  { year: 25, boardYear: 20 },
];

/** Where a chapter sits on the board, or undefined for the closing argument. */
export function boardYearFor(sectionIndex: number): number | undefined {
  return CHAPTERS[sectionIndex]?.boardYear;
}

/**
 * The dated chapters of this article, in reading order. The closing argument
 * ("But Wait—Is There Another Way?", "The Question We Must Ask") is not part of
 * the chronology, so it stays off the timeline — it is prose, not a period.
 */
export function buildYearStops(sections: Section[]): YearStop[] {
  const stops: YearStop[] = [];

  sections.forEach((section, position) => {
    const chapter = CHAPTERS[position];
    if (!chapter) return;

    stops.push({
      id: section.id,
      // Trust the parser when it could read a year, and keep the structural
      // figure when it could not (Chinese headings, or a new translation).
      year: section.chapterYear ?? chapter.year,
      boardYear: chapter.boardYear,
      title: section.title,
      index: stops.length + 1,
    });
  });

  return stops;
}
