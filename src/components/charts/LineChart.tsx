"use client";

import { useId } from "react";
import { useElementWidth } from "@/lib/hooks";

export type Series = {
  id: string;
  label: string;
  color: string;
  points: { x: number; y: number }[];
  dashed?: boolean;
  /** Filled area under the line. */
  area?: boolean;
};

export type Marker = {
  x: number;
  label: string;
  color?: string;
  /** Draw the label below the axis instead of above the plot. */
  below?: boolean;
};

const PAD = { top: 26, right: 18, bottom: 34, left: 52 };

/**
 * Dependency-free responsive line chart with a hover crosshair.
 */
export function LineChart({
  series,
  markers = [],
  formatX = (value: number) => String(value),
  formatY = (value: number) => String(Math.round(value)),
  height = 260,
  yMin,
  yMax,
  hover,
  onHover,
  ariaLabel,
}: {
  series: Series[];
  markers?: Marker[];
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  height?: number;
  yMin?: number;
  yMax?: number;
  hover?: number | null;
  onHover?: (x: number | null) => void;
  ariaLabel: string;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const gradientPrefix = useId().replace(/[:]/g, "");

  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const minX = allX.length ? Math.min(...allX) : 0;
  const maxX = allX.length ? Math.max(...allX) : 1;
  const rawMinY = yMin ?? (allY.length ? Math.min(...allY) : 0);
  const rawMaxY = yMax ?? (allY.length ? Math.max(...allY) : 1);
  const span = rawMaxY - rawMinY || 1;
  const minY = yMin ?? rawMinY - span * 0.08;
  const maxY = yMax ?? rawMaxY + span * 0.12;

  const plotW = Math.max(80, width - PAD.left - PAD.right);
  const plotH = Math.max(60, height - PAD.top - PAD.bottom);

  const sx = (x: number) =>
    PAD.left + (maxX === minX ? plotW / 2 : ((x - minX) / (maxX - minX)) * plotW);
  const sy = (y: number) => PAD.top + plotH - ((y - minY) / (maxY - minY || 1)) * plotH;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => minY + ((maxY - minY) * i) / ticks);
  const xTickCount = Math.min(7, Math.max(2, Math.round(plotW / 92)));
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) =>
    Math.round(minX + ((maxX - minX) * i) / xTickCount),
  );

  const hoveredX = hover ?? null;
  const hoveredValues = hoveredX === null
    ? []
    : series
        .map((s) => {
          const point = s.points.reduce<{ x: number; y: number } | null>((best, candidate) => {
            if (!best) return candidate;
            return Math.abs(candidate.x - hoveredX) < Math.abs(best.x - hoveredX) ? candidate : best;
          }, null);
          return point ? { series: s, point } : null;
        })
        .filter((value): value is { series: Series; point: { x: number; y: number } } => Boolean(value));

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    if (!onHover) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    onHover(Math.round(minX + ratio * (maxX - minX)));
  };

  return (
    <div ref={ref} className="relative w-full select-none">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${Math.max(width, 320)} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="overflow-visible"
      >
        <defs>
          {series
            .filter((s) => s.area)
            .map((s) => (
              <linearGradient key={s.id} id={`${gradientPrefix}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.34" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
        </defs>

        {/* grid */}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={sy(tick)}
              y2={sy(tick)}
              stroke="currentColor"
              className="text-rule"
              strokeWidth={1}
              strokeDasharray={tick === minY ? undefined : "3 6"}
            />
            <text
              x={PAD.left - 10}
              y={sy(tick)}
              dy="0.32em"
              textAnchor="end"
              className="fill-ink-4 font-sans text-[10px] tabular"
            >
              {formatY(tick)}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <text
            key={`x-${tick}`}
            x={sx(tick)}
            y={PAD.top + plotH + 20}
            textAnchor="middle"
            className="fill-ink-4 font-sans text-[10px] tabular"
          >
            {formatX(tick)}
          </text>
        ))}

        {/* markers */}
        {markers.map((marker) => (
          <g key={`m-${marker.label}-${marker.x}`}>
            <line
              x1={sx(marker.x)}
              x2={sx(marker.x)}
              y1={PAD.top - 8}
              y2={PAD.top + plotH}
              stroke={marker.color ?? "currentColor"}
              className={marker.color ? undefined : "text-ink-4"}
              strokeWidth={1}
              strokeDasharray="2 5"
            />
            <text
              x={sx(marker.x)}
              y={marker.below ? PAD.top + plotH + 30 : PAD.top - 14}
              textAnchor="middle"
              className="font-mono text-[9.5px] uppercase tracking-wider"
              fill={marker.color ?? "currentColor"}
            >
              {marker.label}
            </text>
          </g>
        ))}

        {/* series */}
        {series.map((s) => {
          const d = s.points
            .map((point, index) => `${index === 0 ? "M" : "L"}${sx(point.x)},${sy(point.y)}`)
            .join(" ");
          const areaD = `${d} L${sx(s.points[s.points.length - 1]?.x ?? 0)},${PAD.top + plotH} L${sx(
            s.points[0]?.x ?? 0,
          )},${PAD.top + plotH} Z`;
          return (
            <g key={s.id}>
              {s.area ? <path d={areaD} fill={`url(#${gradientPrefix}-${s.id})`} /> : null}
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? "5 5" : undefined}
                style={{ filter: `drop-shadow(0 4px 14px ${s.color}55)` }}
              />
            </g>
          );
        })}

        {/* hover crosshair */}
        {hoveredX !== null ? (
          <g>
            <line
              x1={sx(hoveredX)}
              x2={sx(hoveredX)}
              y1={PAD.top - 6}
              y2={PAD.top + plotH}
              stroke="white"
              strokeOpacity={0.32}
              strokeWidth={1}
            />
            {hoveredValues.map(({ series: s, point }) => (
              <circle
                key={`h-${s.id}`}
                cx={sx(point.x)}
                cy={sy(point.y)}
                r={4.5}
                fill={s.color}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </g>
        ) : null}

        {onHover ? (
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => onHover(null)}
            className="cursor-crosshair"
          />
        ) : null}
      </svg>

      {hoveredX !== null && hoveredValues.length ? (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[9.5rem] -translate-x-1/2 rounded-xl border border-ink bg-white p-2.5 text-xs shadow-2xl"
          style={{
            left: Math.min(Math.max(sx(hoveredX), 96), Math.max(width - 96, 96)),
          }}
        >
          <div className="mb-1.5 font-sans text-[0.7rem] font-bold uppercase tracking-wide text-ink-4">{formatX(hoveredX)}</div>
          <ul className="space-y-1">
            {hoveredValues.map(({ series: s, point }) => (
              <li key={`tip-${s.id}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono tabular text-ink">{formatY(point.y)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 pl-1">
        {series.map((s) => (
          <span key={`legend-${s.id}`} className="flex items-center gap-2 text-xs text-ink-2">
            <span
              className="h-0.5 w-5 rounded-full"
              style={{
                background: s.color,
                opacity: s.dashed ? 0.6 : 1,
              }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
