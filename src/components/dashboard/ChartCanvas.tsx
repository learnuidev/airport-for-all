"use client";

import { useMemo } from "react";
import { ANNOUNCEMENT_YEAR, HORIZON, cad, type YearCosts } from "@/components/editorial/model";

/* ------------------------------------------------------------------ *
 * Palette for data series. Used nowhere else in the interface.
 * ------------------------------------------------------------------ */

export const SERIES_COLOURS: Record<string, string> = {
  parking: "#d0021b",
  food: "#e8853f",
  drop: "#7a3fa0",
  aif: "#1a5fb4",
  aeronautical: "#4a90d9",
  airfare: "#b8b8b8",
  taxes: "#666666",
  retail: "#c2185b",
};

export const SERIES_LABELS: Record<string, string> = {
  parking: "Parking",
  food: "Food and retail",
  drop: "Drop-off",
  aif: "Airport Improvement Fee",
  aeronautical: "Aeronautical charges",
  airfare: "Airline fare",
  taxes: "Taxes and fees",
  retail: "Retail markup",
};

/** The components that make up the whole trip, in the order a reader meets them. */
export const EXTRA_KEYS = ["parking", "drop", "food"] as const;
export const TICKET_KEYS = ["airfare", "aif", "aeronautical", "taxes"] as const;

export type ExtraKey = (typeof EXTRA_KEYS)[number];

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

/* ------------------------------------------------------------------ *
 * The canvas. One SVG, several views, driven entirely by props.
 * ------------------------------------------------------------------ */

export type ChartView = "waterline" | "stacked" | "contribution";

const PAD = { top: 18, right: 14, bottom: 26, left: 62 };

export function ChartCanvas({
  rows,
  view,
  year,
  setYear,
  enabled,
  width,
  height,
  title,
  unit = "CAD",
}: {
  rows: YearCosts[];
  view: ChartView;
  year: number;
  setYear: (year: number) => void;
  /** Which components are currently switched on. */
  enabled: string[];
  /** Measured pixel size of the container — the viewBox matches it 1:1 so
   *  axis text renders at true size instead of being stretched. */
  width: number;
  height: number;
  title: string;
  unit?: "CAD" | "GBP";
}) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const geometry = useMemo(() => {
    let max = 0;
    if (view === "stacked") {
      for (const row of rows) {
        const sum = [...TICKET_KEYS, ...EXTRA_KEYS]
          .filter((key) => enabled.includes(key))
          .reduce((total, key) => total + componentValue(row, key), 0);
        max = Math.max(max, sum);
      }
    } else if (view === "contribution") {
      for (const row of rows) {
        for (const key of EXTRA_KEYS) max = Math.max(max, componentValue(row, key));
      }
    } else {
      for (const row of rows) max = Math.max(max, row.ticketTotal, row.tripTotal);
    }
    return { max: max * 1.08 };
  }, [rows, view, enabled]);

  const sx = (yearIndex: number) => PAD.left + (yearIndex / HORIZON) * plotW;
  const sy = (value: number) => PAD.top + plotH - (value / (geometry.max || 1)) * plotH;

  const active = rows[Math.min(year, rows.length - 1)];
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => (geometry.max / ticks) * i);
  const xTicks = Array.from({ length: HORIZON + 1 }, (_, i) => i).filter(
    (i) => i % 5 === 0 || i === HORIZON,
  );

  const money = (value: number) =>
    unit === "GBP" ? `£${Math.round(value)}` : `$${Math.round(value)}`;

  /** Drag anywhere on the plot to scrub the year. */
  const scrub = (event: React.PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setYear(Math.round(ratio * HORIZON));
  };

  return (
    <figure className="h-full">
      <figcaption className="sr-only">{title}</figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-full w-full"
        role="img"
        aria-label={title}
      >
        {/* horizontal grid */}
        {yTicks.map((tick) => (
          <g key={`grid-${tick}`}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={sy(tick)}
              y2={sy(tick)}
              stroke={tick === 0 ? "#121212" : "#e2e2e2"}
              strokeWidth={tick === 0 ? 1 : 1}
              strokeDasharray={tick === 0 ? undefined : "2 4"}
            />
            <text
              x={PAD.left - 10}
              y={sy(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-ink-4 font-sans text-[11px] tabular"
            >
              {money(tick)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {xTicks.map((tick) => (
          <text
            key={`xlabel-${tick}`}
            x={sx(tick)}
            y={height - 8}
            textAnchor={tick === 0 ? "start" : tick === HORIZON ? "end" : "middle"}
            className="fill-ink-4 font-sans text-[11px] tabular"
          >
            {ANNOUNCEMENT_YEAR + tick}
          </text>
        ))}

        {/* active-year guide */}
        <line
          x1={sx(year)}
          x2={sx(year)}
          y1={PAD.top - 6}
          y2={PAD.top + plotH}
          stroke="#121212"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* ---------------- waterline ---------------- */}
        {view === "waterline" ? (
          <>
            {enabled.includes("trip") ? (
              <path
                d={`${rows
                  .map((row, i) => `${i === 0 ? "M" : "L"}${sx(row.year)},${sy(row.tripTotal)}`)
                  .join(" ")} L${sx(HORIZON)},${PAD.top + plotH} L${sx(0)},${PAD.top + plotH} Z`}
                fill="#d0021b"
                fillOpacity={0.1}
              />
            ) : null}
            {enabled.includes("trip") ? (
              <path
                d={rows
                  .map((row, i) => `${i === 0 ? "M" : "L"}${sx(row.year)},${sy(row.tripTotal)}`)
                  .join(" ")}
                fill="none"
                stroke="#d0021b"
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {enabled.includes("ticket") ? (
              <path
                d={rows
                  .map((row, i) => `${i === 0 ? "M" : "L"}${sx(row.year)},${sy(row.ticketTotal)}`)
                  .join(" ")}
                fill="none"
                stroke="#0f7b3e"
                strokeWidth={2}
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {(enabled.includes("trip") ? ["trip"] : []).length
              ? null
              : enabled.includes("ticket")
                ? null
                : null}
            {enabled.includes("trip") ? (
              <circle cx={sx(year)} cy={sy(active.tripTotal)} r={5} fill="#d0021b" stroke="#fff" strokeWidth={2} />
            ) : null}
            {enabled.includes("ticket") ? (
              <circle cx={sx(year)} cy={sy(active.ticketTotal)} r={5} fill="#0f7b3e" stroke="#fff" strokeWidth={2} />
            ) : null}
          </>
        ) : null}

        {/* ---------------- stacked ---------------- */}
        {view === "stacked"
          ? rows.map((row) => {
              const keys = [...TICKET_KEYS, ...EXTRA_KEYS].filter((key) => enabled.includes(key));
              let cursor = 0;
              const bandWidth = Math.max(2.5, plotW / (HORIZON + 1) - 2);
              return (
                <g key={`bar-${row.year}`} opacity={row.year === year ? 1 : 0.82}>
                  {keys.map((key) => {
                    const value = componentValue(row, key);
                    const y0 = sy(cursor + value);
                    const y1 = sy(cursor);
                    cursor += value;
                    return (
                      <rect
                        key={`${row.year}-${key}`}
                        x={sx(row.year) - bandWidth / 2}
                        y={y0}
                        width={bandWidth}
                        height={Math.max(0.6, y1 - y0)}
                        fill={SERIES_COLOURS[key]}
                      />
                    );
                  })}
                </g>
              );
            })
          : null}

        {/* ---------------- contribution ---------------- */}
        {view === "contribution"
          ? EXTRA_KEYS.map((key) => {
              const points = rows
                .map((row, i) => `${i === 0 ? "M" : "L"}${sx(row.year)},${sy(componentValue(row, key))}`)
                .join(" ");
              const isOn = enabled.includes(key);
              return (
                <g key={`line-${key}`} opacity={isOn ? 1 : 0.22}>
                  <path
                    d={points}
                    fill="none"
                    stroke={SERIES_COLOURS[key]}
                    strokeWidth={isOn ? 2.4 : 1.4}
                    strokeDasharray={isOn ? undefined : "3 3"}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx={sx(year)}
                    cy={sy(componentValue(active, key))}
                    r={4.5}
                    fill={SERIES_COLOURS[key]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                </g>
              );
            })
          : null}

        {/* scrub layer */}
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

      {/* value strip under the plot */}
      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-rule pt-2">
        <span className="font-sans text-[0.8rem] text-ink-3">
          {ANNOUNCEMENT_YEAR + year}
          {view === "stacked" ? (
            <>
              {" · "}
              <span className="font-bold tabular text-ink">
                {cad(
                  [...TICKET_KEYS, ...EXTRA_KEYS]
                    .filter((key) => enabled.includes(key))
                    .reduce((total, key) => total + componentValue(active, key), 0),
                )}
              </span>
            </>
          ) : view === "waterline" ? (
            <>
              {" · ticket "}
              <span className="font-bold tabular text-data-d">{cad(active.ticketTotal)}</span>
              {" · whole trip "}
              <span className="font-bold tabular text-data-a">{cad(active.tripTotal)}</span>
            </>
          ) : (
            <span className="ml-1 text-ink-4">per component</span>
          )}
        </span>
        <span className="ml-auto font-sans text-[0.72rem] uppercase tracking-wide text-ink-4">
          Drag the plot or the axis · arrow keys change the year
        </span>
      </div>
    </figure>
  );
}
