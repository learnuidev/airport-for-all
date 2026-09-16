"use client";

import { useEffect, useMemo, useState } from "react";
import { ANNOUNCEMENT_YEAR, HORIZON, cad, type YearCosts } from "@/components/editorial/model";

/* ------------------------------------------------------------------ *
 * Series colours and names. Used only inside the chart.
 * ------------------------------------------------------------------ */

export const SERIES: Record<string, { label: string; colour: string }> = {
  parking: { label: "Parking", colour: "#d0021b" },
  food: { label: "Food and retail", colour: "#e8853f" },
  drop: { label: "Drop-off", colour: "#7a3fa0" },
  aif: { label: "Improvement Fee", colour: "#1a5fb4" },
  aeronautical: { label: "Aeronautical", colour: "#4a90d9" },
  airfare: { label: "Airline fare", colour: "#c9c9c9" },
  taxes: { label: "Taxes and fees", colour: "#666666" },
};

export const TICKET_KEYS = ["airfare", "aif", "aeronautical", "taxes"] as const;
export const EXTRA_KEYS = ["parking", "drop", "food"] as const;

export function componentValue(row: YearCosts, key: string): number {
  switch (key) {
    case "parking":
      return row.parking;
    case "drop":
      return row.dropOff;
    case "food":
      return row.food;
    case "aif":
      return row.aif;
    case "aeronautical":
      return row.aeronautical;
    case "airfare":
      return row.airfare;
    case "taxes":
      return row.taxes;
    default:
      return 0;
  }
}

export type ChartView = "waterline" | "stacked" | "contribution";
export type ViewId = "cost" | "charges" | "ticket" | "revenue" | "books" | "record";

export const VIEWS: {
  id: ViewId;
  label: string;
  title: string;
  blurb: string;
  chart: ChartView;
}[] = [
  {
    id: "cost",
    label: "Trip cost",
    title: "The fare barely moves. The trip does.",
    blurb:
      "Your ticket against everything else you pay — parking, drop-off, food and retail. The gap is what a private operator adds.",
    chart: "waterline",
  },
  {
    id: "charges",
    label: "Charges",
    title: "Which charge grows, and how fast",
    blurb: "Each non-ticket charge on its own. Switch them off to see what the total depends on.",
    chart: "contribution",
  },
  {
    id: "ticket",
    label: "In your ticket",
    title: "Inside the ticket, year by year",
    blurb:
      "The four reported components of a Canadian fare, stacked. Switch any of them off to strip the fare back.",
    chart: "stacked",
  },
  {
    id: "revenue",
    label: "Where it goes",
    title: "A one-time windfall, a permanent extraction",
    blurb:
      "The authorities made no profit on $3.95 billion of 2022 revenue. A private operator has to find 15–20 percent more, every year.",
    chart: "contribution",
  },
  {
    id: "books",
    label: "The books",
    title: "The accounts privatisation would close",
    blurb:
      "The 2025 statements of the three busiest airports, from the CLC report's own tables. This is the disclosure a private owner would no longer owe anyone.",
    chart: "contribution",
  },
  {
    id: "record",
    label: "The record",
    title: "Five countries, three decades, one direction",
    blurb:
      "Every measured outcome article.md reports, with the 2023 study's benefits included rather than buried.",
    chart: "contribution",
  },
];

/**
 * The 2025 accounts of the three busiest airports, in $ millions. Drawn from the
 * report's revenue and expense tables, which it compiled from each authority's
 * consolidated financial statements.
 */
export const BOOKS = {
  revenue: [
    { key: "aeronautical", label: "Aeronautical", colour: "#1a5fb4" },
    { key: "nonAeronautical", label: "Non-aeronautical", colour: "#4a90d9" },
    { key: "aif", label: "Improvement Fees", colour: "#d0021b" },
  ],
  expenses: [
    { key: "wages", label: "Salaries, wages, benefits", colour: "#7a3fa0" },
    { key: "rent", label: "Transport Canada rent", colour: "#e8853f" },
  ],
} as const;

/** Cumulative revenue extraction, in $ millions, after `year` years. */
export function extractionAt(year: number): number {
  return Array.from({ length: year + 1 }, (_, t) => Math.pow(1.03, t) * 3.95 * 0.175 * 1000).reduce(
    (sum, value) => sum + value,
    0,
  );
}

/** One value per year, drawn as the axis baseline. */
export function axisValues(view: ViewId, rows: YearCosts[] | null, ticket: number): number[] {
  if (!rows) {
    return Array.from({ length: HORIZON + 1 }, (_, year) => {
      const aif = Math.pow(1.055, year);
      const aero = Math.pow(1.6, Math.min(year, 9) / 9);
      return ticket * aif * aero * 0.35;
    });
  }
  switch (view) {
    case "charges":
      return rows.map((row) => row.extrasTotal);
    case "ticket":
      return rows.map((row) => row.ticketTotal);
    case "revenue":
      return rows.map((_, index) => extractionAt(index));
    case "books":
      return rows.map((row, index) => 3.95 * Math.pow(1.03, index) * 1000);
    case "record":
      return rows.map((row) => (row.tripTotal - row.ticketTotal) / row.tripTotal);
    default:
      return rows.map((row) => row.tripTotal);
  }
}


/* ------------------------------------------------------------------ *
 * The summary shown inside the plot. Three lines at most: where the cost
 * lands, when it arrives, and the sentence the selected view is making.
 * ------------------------------------------------------------------ */

export type SummaryLine = { text: string; tone?: "bad" | "good" | "muted" };

export function summaryFor(
  view: ViewId,
  rows: YearCosts[],
  year: number,
): { heading: string; lines: SummaryLine[] } {
  const active = rows[Math.min(year, rows.length - 1)];
  const now = rows[0];
  const yearLabel = year === 0 ? "At signing" : `${year} years in · ${ANNOUNCEMENT_YEAR + year}`;

  if (view === "charges") {
    const grew = active.extrasTotal - now.extrasTotal;
    const next = rows[Math.min(year + 5, rows.length - 1)];
    const total5 = next.extrasTotal - active.extrasTotal;
    return {
      heading: yearLabel,
      lines: [
        {
          text: `Non-ticket charges reach ${cad(active.extrasTotal)} of a ${cad(active.tripTotal)} trip${
            grew > 1 ? `, up ${cad(grew)} since signing` : ""
          }.`,
          tone: grew > 1 ? "bad" : "muted",
        },
        { text: `Parking leads at ${cad(active.parking)}, then food at ${cad(active.food)}.` },
        {
          text:
            year >= 20
              ? "The ramp is finished: from here these prices only follow inflation."
              : `Five years on it climbs another ${cad(total5)}.`,
          tone: "muted",
        },
      ],
    };
  }

  if (view === "ticket") {
    const added = active.ticketTotal - now.ticketTotal;
    return {
      heading: yearLabel,
      lines: [
        {
          text: `The fare reaches ${cad(active.ticketTotal)}${
            added > 1 ? `, up ${cad(added)} on ${cad(now.ticketTotal)} at signing` : ""
          }.`,
          tone: added > 1 ? "bad" : "muted",
        },
        {
          text: `The Improvement Fee is the fastest climber at ${cad(active.aif)}; taxes stay fixed at ${cad(active.taxes)}.`,
        },
        { text: "The airline fare moves with inflation, not with the concession.", tone: "muted" },
      ],
    };
  }

  if (view === "revenue") {
    const needed = 3.95 * Math.pow(1.03, year) * 0.175 * 1000;
    return {
      heading: yearLabel,
      lines: [
        {
          text: `Investors need about $${Math.round(needed).toLocaleString()}M of extra revenue this year.`,
          tone: "bad",
        },
        {
          text: `That is $${Math.round(extractionAt(year)).toLocaleString()}M taken out since signing — against a one-time windfall.`,
        },
        { text: "Out of a $3.95B revenue base that made no profit at all.", tone: "muted" },
      ],
    };
  }

  if (view === "record") {
    return {
      heading: yearLabel,
      lines: [
        { text: "Five countries, three decades: higher charges, pressure on workers, lost public value.", tone: "bad" },
        { text: "Sydney cut 40% of its workforce once protections expired; Perth's charges rose 60% per passenger." },
        { text: "One 2023 study found 50% fewer cancellations — and $20 more in fees per passenger.", tone: "muted" },
      ],
    };
  }

  // Trip cost
  const added = active.tripTotal - now.tripTotal;
  const share = active.tripTotal > 0 ? (active.extrasTotal / active.tripTotal) * 100 : 0;
  return {
    heading: yearLabel,
    lines: [
      {
        text: added > 1
          ? `The trip costs ${cad(active.tripTotal)}, up ${cad(added)} on ${cad(now.tripTotal)} at signing.`
          : `The trip costs ${cad(active.tripTotal)} before the concession bites.`,
        tone: added > 1 ? "bad" : "muted",
      },
      {
        text: `Off-ticket charges are now ${cad(active.extrasTotal)} — ${share.toFixed(0)}% of what you pay.`,
      },
      {
        text:
          added > 1
            ? `The fare itself accounts for only ${cad(active.ticketTotal - now.ticketTotal)} of that increase.`
            : "Switch on a charge on the left to see it land.",
        tone: "muted",
      },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * The chart
 * ------------------------------------------------------------------ */

const PAD = { top: 16, right: 14, bottom: 26, left: 60 };

export function Chart({
  rows,
  view,
  year,
  setYear,
  enabled,
  summary,
  width,
  height,
}: {
  rows: YearCosts[];
  view: ChartView;
  year: number;
  setYear: (year: number) => void;
  enabled: string[];
  summary?: { heading: string; lines: SummaryLine[] };
  width: number;
  height: number;
}) {
  const plotW = Math.max(60, width - PAD.left - PAD.right);
  const plotH = Math.max(50, height - PAD.top - PAD.bottom);

  const max = useMemo(() => {
    let peak = 0;
    if (view === "stacked") {
      for (const row of rows) {
        const sum = [...TICKET_KEYS, ...EXTRA_KEYS]
          .filter((key) => enabled.includes(key))
          .reduce((total, key) => total + componentValue(row, key), 0);
        peak = Math.max(peak, sum);
      }
    } else if (view === "contribution") {
      for (const row of rows)
        for (const key of EXTRA_KEYS) peak = Math.max(peak, componentValue(row, key));
      peak = Math.max(peak, rows[rows.length - 1].tripTotal * 0.001);
    } else {
      for (const row of rows) peak = Math.max(peak, row.ticketTotal, row.tripTotal);
    }
    return peak * 1.08 || 1;
  }, [rows, view, enabled]);

  const sx = (index: number) => PAD.left + (index / HORIZON) * plotW;
  const sy = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const active = rows[Math.min(year, rows.length - 1)];

  const path = (pick: (row: YearCosts) => number) =>
    rows
      .map((row, i) => `${i === 0 ? "M" : "L"}${sx(row.year).toFixed(1)},${sy(pick(row)).toFixed(1)}`)
      .join(" ");

  const scrub = (event: React.PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setYear(Math.round(ratio * HORIZON));
  };

  /** The summary box: top-right of the plot, sized to its longest line. */
  const box = useMemo(() => {
    if (!summary || plotW < 360) return null;
    const charWidth = 5.62;
    const longest = Math.max(
      summary.heading.length * 5.6,
      ...summary.lines.map((line) => line.text.length * charWidth),
    );
    const boxWidth = Math.min(plotW - 24, Math.max(220, longest + 24));
    const boxHeight = 42 + summary.lines.length * 15;
    if (boxHeight > plotH - 12) return null;
    return {
      width: boxWidth,
      height: boxHeight,
      // Anchored to the bottom-right: the empty corner in every view, since the
      // cost curves rise away from it and the stacked bars sit at the baseline.
      x: PAD.left + plotW - boxWidth - 10,
      y: PAD.top + plotH - boxHeight - 12,
      heading: summary.heading,
      lines: summary.lines,
    };
  }, [summary, plotW, plotH]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-full w-full"
      role="img"
      aria-label="Costs by year since the concession was signed"
    >
      {[0, 0.5, 1].map((fraction) => (
        <g key={`grid-${fraction}`}>
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={sy(max * fraction)}
            y2={sy(max * fraction)}
            stroke={fraction === 0 ? "#121212" : "#e6e6e6"}
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={sy(max * fraction)}
            dy="0.32em"
            textAnchor="end"
            className="fill-ink-4 font-sans text-[10px] tabular"
          >
            ${Math.round(max * fraction).toLocaleString()}
          </text>
        </g>
      ))}

      {[0, 10, HORIZON].map((index) => (
        <text
          key={`x-${index}`}
          x={sx(index)}
          y={height - 7}
          textAnchor={index === 0 ? "start" : index === HORIZON ? "end" : "middle"}
          className="fill-ink-4 font-sans text-[10px] tabular"
        >
          {ANNOUNCEMENT_YEAR + index}
        </text>
      ))}

      <line x1={sx(year)} x2={sx(year)} y1={PAD.top} y2={PAD.top + plotH} stroke="#121212" strokeWidth={1} />

      {/* Waterline: ticket against whole trip */}
      {view === "waterline" ? (
        <>
          {enabled.includes("trip") ? (
            <>
              <path
                d={`${path((row) => row.tripTotal)} L${sx(HORIZON)},${PAD.top + plotH} L${sx(0)},${PAD.top + plotH} Z`}
                fill="#d0021b"
                fillOpacity={0.09}
              />
              <path d={path((row) => row.tripTotal)} fill="none" stroke="#d0021b" strokeWidth={2.5} />
              <circle cx={sx(year)} cy={sy(active.tripTotal)} r={5} fill="#d0021b" stroke="#fff" strokeWidth={2} />
            </>
          ) : null}
          {enabled.includes("ticket") ? (
            <>
              <path
                d={path((row) => row.ticketTotal)}
                fill="none"
                stroke="#0f7b3e"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <circle cx={sx(year)} cy={sy(active.ticketTotal)} r={4} fill="#0f7b3e" stroke="#fff" strokeWidth={2} />
            </>
          ) : null}
        </>
      ) : null}

      {/* Stacked: everything that makes up the trip */}
      {view === "stacked"
        ? rows.map((row) => {
            const keys = [...TICKET_KEYS, ...EXTRA_KEYS].filter((key) => enabled.includes(key));
            let cursor = 0;
            const barWidth = Math.max(2, plotW / (HORIZON + 1) - 2.5);
            return (
              <g key={`bar-${row.year}`} opacity={row.year === year ? 1 : 0.7}>
                {keys.map((key) => {
                  const value = componentValue(row, key);
                  const top = sy(cursor + value);
                  const bottom = sy(cursor);
                  cursor += value;
                  return (
                    <rect
                      key={key}
                      x={sx(row.year) - barWidth / 2}
                      y={top}
                      width={barWidth}
                      height={Math.max(0.5, bottom - top)}
                      fill={SERIES[key].colour}
                    />
                  );
                })}
              </g>
            );
          })
        : null}

      {/* Contribution: each off-ticket charge on its own scale */}
      {view === "contribution"
        ? EXTRA_KEYS.map((key) => {
            const on = enabled.includes(key);
            return (
              <g key={`line-${key}`} opacity={on ? 1 : 0.2}>
                <path
                  d={path((row) => componentValue(row, key))}
                  fill="none"
                  stroke={SERIES[key].colour}
                  strokeWidth={on ? 2.4 : 1.3}
                  strokeDasharray={on ? undefined : "3 3"}
                />
                <circle
                  cx={sx(year)}
                  cy={sy(componentValue(active, key))}
                  r={4.5}
                  fill={SERIES[key].colour}
                  stroke="#fff"
                  strokeWidth={2}
                />
              </g>
            );
          })
        : null}

      {/* Summary of what this year means, drawn in the plot. */}
      {box ? (
        <g>
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            rx={2}
            fill="#faf9f7"
            stroke="#121212"
            strokeWidth={1}
          />
          <text
            x={box.x + 12}
            y={box.y + 19}
            className="fill-ink font-sans text-[10px] font-bold uppercase"
            style={{ letterSpacing: "0.06em" }}
          >
            {box.heading}
          </text>
          {box.lines.map((line, index) => (
            <text
              key={`sum-${index}`}
              x={box.x + 12}
              y={box.y + 37 + index * 15}
              className={[
                "font-sans text-[11px]",
                line.tone === "bad"
                  ? "fill-data-a"
                  : line.tone === "good"
                    ? "fill-data-d"
                    : "fill-ink-2",
              ].join(" ")}
            >
              {line.text}
            </text>
          ))}
        </g>
      ) : null}

      <rect
        x={PAD.left}
        y={PAD.top}
        width={plotW}
        height={plotH}
        fill="transparent"
        className="cursor-crosshair"
        onPointerDown={scrub}
        onPointerMove={(event) => {
          if (event.buttons === 1) scrub(event);
        }}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * The year axis — every year is a target along the bottom
 * ------------------------------------------------------------------ */

export function YearAxis({
  year,
  setYear,
  values,
  onPlay,
  playing,
}: {
  year: number;
  setYear: (year: number) => void;
  values: number[];
  onPlay: () => void;
  playing: boolean;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const spark = values
    .map((value, index) => {
      const x = (index / HORIZON) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="relative select-none">
      <div className="flex items-center gap-3 pb-1">
        <button
          type="button"
          onClick={onPlay}
          aria-pressed={playing}
          className="flex cursor-pointer items-center gap-1.5 border border-ink px-2 py-0.5 font-sans text-[0.68rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <span className="font-sans text-[0.7rem] uppercase tracking-wide text-ink-4">
          Drag the years
        </span>
      </div>

      <div
        className="relative h-16 border-t border-ink"
        role="slider"
        tabIndex={0}
        aria-label="Year of the concession"
        aria-valuemin={ANNOUNCEMENT_YEAR}
        aria-valuemax={ANNOUNCEMENT_YEAR + HORIZON}
        aria-valuenow={ANNOUNCEMENT_YEAR + year}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-4 top-1 h-[calc(100%-1.25rem)] w-full"
          aria-hidden
        >
          <path d={spark} fill="none" stroke="#d0021b" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="absolute inset-x-0 bottom-4 top-0 flex">
          {Array.from({ length: HORIZON + 1 }, (_, index) => {
            const isActive = index === year;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setYear(index)}
                onPointerEnter={(event) => {
                  if (event.buttons === 1) setYear(index);
                }}
                aria-label={`Year ${ANNOUNCEMENT_YEAR + index}`}
                title={`${ANNOUNCEMENT_YEAR + index}`}
                className="group relative flex-1 cursor-pointer"
              >
                <span
                  className={[
                    "absolute bottom-0 left-1/2 -translate-x-1/2 transition-all",
                    isActive ? "h-full w-0.5 bg-ink" : "h-2 w-px bg-ink-4/60 group-hover:h-3.5",
                  ].join(" ")}
                />
                {isActive ? (
                  <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-paper bg-ink" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-4">
          {Array.from({ length: HORIZON + 1 }, (_, index) => index).filter(
            (index) => index % 5 === 0 || index === year,
          ).map((index) => (
            <span
              key={`label-${index}`}
              style={{ left: `${(index / HORIZON) * 100}%` }}
              className={[
                "absolute -translate-x-1/2 font-sans text-[0.64rem] tabular",
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

/** Arrow keys drive the year. */
export function useYearKeys(year: number, setYear: (year: number) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setYear(Math.min(HORIZON, year + (event.shiftKey ? 5 : 1)));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setYear(Math.max(0, year - (event.shiftKey ? 5 : 1)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [year, setYear, enabled]);
}

export function usePlayback(year: number, setYear: (year: number) => void) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setYear(year >= HORIZON ? 0 : year + 1);
    }, 420);
    return () => window.clearInterval(timer);
  }, [playing, year, setYear]);
  return {
    playing,
    toggle: () => setPlaying((value) => !value),
    stop: () => setPlaying(false),
  };
}

export { cad };
