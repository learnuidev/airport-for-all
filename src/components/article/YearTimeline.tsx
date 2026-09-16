"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { YearStop } from "./yearStops";

/**
 * Distance from the viewport top, in pixels, at which a chapter counts as the
 * one being read. It sits just under the sticky masthead plus a line of margin,
 * so a chapter lights up exactly as its heading crosses that line.
 */
const READING_LINE = 120;

/** How far below the masthead an anchor lands when a year is clicked. */
export const ANCHOR_OFFSET = 64;

/* ------------------------------------------------------------------ *
 * Geometry
 *
 * The markers are placed by year, not evenly: a chapter set twenty-five years
 * in really is further along the line than one set in year three. So the
 * timeline needs a little arithmetic, and that arithmetic is all of the
 * "animation" that happens as the reader scrolls — everything else is a CSS
 * transition.
 * ------------------------------------------------------------------ */

type Geometry = {
  min: number;
  max: number;
  /** Horizontal position of a year along the track, as a percentage of its width. */
  position: (year: number) => number;
};

function makeGeometry(stops: YearStop[]): Geometry {
  const years = stops.map((stop) => stop.year);
  const min = years.length ? Math.min(...years) : 0;
  const max = years.length ? Math.max(...years) : 0;
  const span = Math.max(1, max - min);
  return { min, max, position: (year) => ((year - min) / span) * 100 };
}

/** The chapter being read at a given scroll position, or null above the first. */
function findActiveIndex(offsets: number[], scrollY: number): number | null {
  let index: number | null = null;
  for (let i = 0; i < offsets.length; i += 1) {
    if (offsets[i] <= scrollY) index = i;
    else break;
  }
  return index;
}

/* ------------------------------------------------------------------ *
 * The timeline
 * ------------------------------------------------------------------ */

/**
 * The year timeline: a horizontal scale of the article's dated chapters, fixed
 * to the foot of the window, that marks the chapter being read as the reader
 * moves down the page and jumps to any of them on click.
 *
 * The bar is fixed rather than sticky on purpose — it stays put whatever the
 * column is doing, and it cannot scroll out of reach the way a sticky element
 * does once its container ends. Every year is a real anchor (`href="#id"`), so
 * middle-click, the keyboard and the browser's own smooth scroll all keep
 * working; the click handler only exists to hand the highlight over at once
 * instead of letting it lag the scroll.
 *
 * The page reserves the bar's height at the foot of the document, in
 * `ArticlePage`, so nothing is ever hidden underneath it.
 */
export function YearTimeline({ stops }: { stops: YearStop[] }) {
  const [active, setActive] = useState<number | null>(null);

  const geometry = useMemo(() => makeGeometry(stops), [stops]);
  const ids = useMemo(() => stops.map((stop) => stop.id), [stops]);

  const update = useCallback(() => {
    const offsets = ids.map((id) => {
      const section = document.getElementById(id);
      if (!section) return Number.POSITIVE_INFINITY;
      return section.getBoundingClientRect().top + window.scrollY - READING_LINE;
    });
    if (offsets.every((offset) => !Number.isFinite(offset))) return;

    let index = findActiveIndex(offsets, window.scrollY);

    // At the very bottom of the page the last chapter may still sit below the
    // reading line, but nothing after it will ever cross. Claim it, rather than
    // leaving the timeline stuck on the second-to-last year through the sources
    // and the closing argument.
    const doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) index = ids.length - 1;

    setActive(index);
  }, [ids]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // The figures above and below each chapter change height as fonts land and
    // charts settle, which moves every year. Watch the document and recompute
    // when it moves rather than trusting the first measurement.
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onScroll);
    observer?.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [update]);

  if (!stops.length) return null;

  const current = active === null ? null : stops[active];
  const progress = current ? geometry.position(current.year) : 0;

  return (
    <nav
      aria-labelledby="year-timeline-label"
      className="year-timeline fixed inset-x-0 bottom-0 z-30 bg-paper"
    >
      <div className="mx-auto max-w-5xl px-4 pt-2.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] sm:px-6">
        <div className="flex items-baseline gap-3">
          <p
            id="year-timeline-label"
            className="shrink-0 font-sans text-[0.72rem] font-bold uppercase tracking-[0.1em] text-data-a"
          >
            Year {current ? current.year : geometry.min}
          </p>
          <p className="min-w-0 flex-1 truncate font-serif text-[0.8rem] leading-snug text-ink-2">
            {current?.title ?? ""}
          </p>
        </div>

        {/* The scale. The bar fills to the year being read, so the line reports
            progress and not only position. */}
        <div className="relative mt-2 mb-2 h-2">
          <span
            aria-hidden
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule"
          />
          <span
            aria-hidden
            className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 bg-data-a transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />

          {stops.map((stop, index) => {
            const isActive = index === active;
            const isRead = active !== null && index < active;
            return (
              <span
                key={stop.id}
                aria-hidden
                className="absolute top-1/2 block -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${geometry.position(stop.year)}%` }}
              >
                <span
                  className={[
                    "block size-2 rounded-full border transition-all duration-300",
                    isActive
                      ? "scale-150 border-data-a bg-data-a"
                      : isRead
                        ? "border-ink-3 bg-ink-3"
                        : "border-ink-4 bg-paper",
                  ].join(" ")}
                />
              </span>
            );
          })}
        </div>

        <ol className="flex list-none items-stretch">
          {stops.map((stop, index) => {
            const isActive = index === active;
            const isRead = active !== null && index < active;
            return (
              <li key={stop.id} className="min-w-0 flex-1">
                <a
                  href={`#${stop.id}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => setActive(index)}
                  className={[
                    "block border-t pt-1.5 text-center font-sans text-[0.78rem] font-bold tabular no-underline transition-colors duration-300",
                    isActive
                      ? "border-data-a text-data-a"
                      : isRead
                        ? "border-ink-3 text-ink-3"
                        : "border-rule text-ink-4",
                  ].join(" ")}
                >
                  {stop.year}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
