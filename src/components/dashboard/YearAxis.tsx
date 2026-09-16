"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ANNOUNCEMENT_YEAR, HORIZON, cad } from "@/components/editorial/model";

/* ------------------------------------------------------------------ *
 * The year axis: the primary control of the whole dashboard.
 *
 * Rendered as a real x axis rather than a slider — every year is a hit target,
 * every fifth year is labelled, phase boundaries are marked, and it can be
 * dragged, clicked or driven from the keyboard. Arrow keys work globally.
 * ------------------------------------------------------------------ */

export const YEARS = Array.from({ length: HORIZON + 1 }, (_, index) => index);

export type PhaseMark = { year: number; label: string };

export const PHASE_MARKS: PhaseMark[] = [
  { year: 0, label: "Signed" },
  { year: 2, label: "Protections end" },
  { year: 5, label: "Nickel-and-dime" },
  { year: 10, label: "Profits out" },
  { year: 20, label: "Monopoly" },
];

/** Global arrow-key control, so the year can be driven without aiming at the axis. */
export function useYearKeys(year: number, setYear: (year: number) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight" || event.key === "ArrowUp") {
        event.preventDefault();
        setYear(Math.min(HORIZON, year + (event.shiftKey ? 5 : 1)));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
        event.preventDefault();
        setYear(Math.max(0, year - (event.shiftKey ? 5 : 1)));
      } else if (event.key === "Home") {
        event.preventDefault();
        setYear(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setYear(HORIZON);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [year, setYear, enabled]);
}

/** Auto-play the timeline, for readers who want to watch it happen. */
export function usePlayback(year: number, setYear: (year: number) => void) {
  const [playing, setPlaying] = useState(false);
  const direction = useRef(1);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const next = year + direction.current;
      if (next > HORIZON) {
        direction.current = -1;
        setYear(HORIZON - 1);
      } else if (next < 0) {
        direction.current = 1;
        setYear(1);
      } else {
        setYear(next);
      }
    }, 420);
    return () => window.clearInterval(timer);
  }, [playing, year, setYear]);

  return { playing, toggle: () => setPlaying((value) => !value), stop: () => setPlaying(false) };
}

export function YearAxis({
  year,
  setYear,
  values,
  highlight,
  unit = "$",
}: {
  year: number;
  setYear: (year: number) => void;
  /** One value per year, used to draw the sparkline forming the axis baseline. */
  values: number[];
  /** Years worth drawing attention to, e.g. when a component is switched off. */
  highlight?: number[];
  unit?: string;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);

  const yearFromClientX = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return year;
      const bounds = rail.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
      return Math.round(ratio * HORIZON);
    },
    [year],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => setYear(yearFromClientX(event.clientX));
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, setYear, yearFromClientX]);

  const path = useMemo(() => {
    const range = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / HORIZON) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [values, max, min]);

  return (
    <div className="select-none">
      {/* Phase labels */}
      <div className="relative mb-1 h-8">
        {PHASE_MARKS.map((mark) => (
          <button
            key={mark.year}
            type="button"
            onClick={() => setYear(mark.year)}
            style={{ left: `${(mark.year / HORIZON) * 100}%` }}
            className="absolute top-0 -translate-x-1/2 cursor-pointer whitespace-nowrap px-1.5 text-center"
          >
            <span className="block font-sans text-[0.62rem] font-bold uppercase tracking-[0.06em] text-ink-4 transition hover:text-ink">
              {mark.label}
            </span>
            <span className="block font-sans text-[0.6rem] tabular text-ink-4">
              {ANNOUNCEMENT_YEAR + mark.year}
            </span>
          </button>
        ))}
      </div>

      {/* The axis itself */}
      <div
        ref={railRef}
        onPointerDown={(event) => {
          setDragging(true);
          setYear(yearFromClientX(event.clientX));
        }}
        role="slider"
        tabIndex={0}
        aria-label="Year of the concession"
        aria-valuemin={ANNOUNCEMENT_YEAR}
        aria-valuemax={ANNOUNCEMENT_YEAR + HORIZON}
        aria-valuenow={ANNOUNCEMENT_YEAR + year}
        aria-valuetext={`${ANNOUNCEMENT_YEAR + year}`}
        className="relative h-20 cursor-crosshair touch-none border-t border-ink"
      >
        {/* sparkline of the active metric */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-4 top-2 h-[calc(100%-1.5rem)] w-full overflow-visible"
          aria-hidden
        >
          <path d={path} fill="none" stroke="#d0021b" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* one hit target per year */}
        <div className="absolute inset-x-0 bottom-4 top-0 flex">
          {YEARS.map((index) => {
            const isActive = index === year;
            const isMarked = highlight?.includes(index);
            return (
              <button
                key={index}
                type="button"
                onClick={() => setYear(index)}
                onPointerEnter={(event) => {
                  if (event.buttons === 1) setYear(index);
                }}
                aria-label={`Year ${ANNOUNCEMENT_YEAR + index}`}
                title={`${ANNOUNCEMENT_YEAR + index} · ${unit}${Math.round(values[index]).toLocaleString()}`}
                className="group relative flex-1 cursor-pointer"
              >
                <span
                  className={[
                    "absolute bottom-0 left-1/2 w-px -translate-x-1/2 transition-all",
                    isActive
                      ? "h-full bg-ink"
                      : index % 5 === 0
                        ? "h-2.5 bg-ink-4"
                        : "h-1.5 bg-rule",
                  ].join(" ")}
                />
                {isActive ? (
                  <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-paper bg-ink" />
                ) : null}
                {isMarked && !isActive ? (
                  <span className="absolute bottom-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-data-a" />
                ) : null}
                <span
                  className={[
                    "pointer-events-none absolute inset-y-0 left-0 w-full transition",
                    isActive ? "bg-ink/[0.04]" : "group-hover:bg-ink/[0.03]",
                  ].join(" ")}
                />
              </button>
            );
          })}
        </div>

        {/* year labels */}
        <div className="absolute inset-x-0 bottom-0 h-4">
          {YEARS.filter((index) => index % 5 === 0 || index === year).map((index) => (
            <span
              key={`label-${index}`}
              style={{ left: `${(index / HORIZON) * 100}%` }}
              className={[
                "absolute -translate-x-1/2 font-sans text-[0.68rem] tabular",
                index === year ? "font-bold text-ink" : "text-ink-4",
              ].join(" ")}
            >
              {ANNOUNCEMENT_YEAR + index}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Play control
 * ------------------------------------------------------------------ */

export function PlaybackButton({
  playing,
  onToggle,
}: {
  playing: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={playing}
      className="flex cursor-pointer items-center gap-2 border border-ink px-2.5 py-1 font-sans text-[0.74rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
    >
      {playing ? (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current" aria-hidden>
          <rect x="1.5" y="1" width="3" height="10" />
          <rect x="7.5" y="1" width="3" height="10" />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current" aria-hidden>
          <path d="M2 1l9 5-9 5z" />
        </svg>
      )}
      {playing ? "Pause" : "Play the years"}
    </button>
  );
}

export { cad };
