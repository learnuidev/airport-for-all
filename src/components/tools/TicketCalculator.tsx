"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { ReferenceNote } from "@/components/ui/ReferenceNote";
import { ANNOUNCEMENT_YEAR, EXTRAS, TICKET, cad } from "@/lib/sourced";
import { useAnimatedNumber } from "@/lib/hooks";

const HORIZON = 25;
const BASE_AIRFARE = 266;
const BASE_AERONAUTICAL = 22;
const BASE_TAX = 107;
const FARE_PREMIUM = 0.0325;
const LABOUR_PASSTHROUGH = 0.55;

const ramp = (year: number, start: number, end: number) => {
  if (year <= start) return 0;
  if (year >= end) return 1;
  const t = (year - start) / (end - start);
  return t * t * (3 - 2 * t);
};

export function TicketCalculator() {
  const [yearIndex, setYearIndex] = useState(10);
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(["parking", "dropoff", "food"]),
  );

  const extraCost = (t: number, extras: Set<string>) =>
    EXTRAS.reduce(
      (sum, extra) =>
        sum + (extras.has(extra.id) ? extra.priceToday + extra.pricePrivate * ramp(t, 2, 10) : 0),
      0,
    );

  const rows = useMemo(
    () =>
      Array.from({ length: HORIZON + 1 }, (_, t) => {
        const aifGrowth = t === 0 ? 0 : t < 3 ? 0.035 : 0.055;
        const aif = TICKET.aif * Math.pow(1 + aifGrowth, t);
        const aeronautical =
          t <= 10
            ? BASE_AERONAUTICAL * Math.pow(1.06, t)
            : BASE_AERONAUTICAL * Math.pow(1.06, 10) * Math.pow(1.02, t - 10);
        const labourCut = 0.19 * LABOUR_PASSTHROUGH * ramp(t, 0.4, 2);
        const premium = t >= 3 ? FARE_PREMIUM : FARE_PREMIUM * ramp(t, 1, 3);
        const fare = BASE_AIRFARE * (1 + premium) * (1 - labourCut);
        return {
          t,
          calendar: ANNOUNCEMENT_YEAR + t,
          fare,
          aif,
          aeronautical,
          extras: extraCost(t, enabled),
          total: fare + aif + aeronautical + BASE_TAX + extraCost(t, enabled),
        };
      }),
    [enabled],
  );

  const baseline = useMemo(
    () =>
      Array.from({ length: HORIZON + 1 }, (_, t) => ({
        x: t,
        y:
          BASE_AIRFARE +
          TICKET.aif * Math.pow(1.025, t) +
          BASE_AERONAUTICAL * Math.pow(1.02, t) +
          BASE_TAX +
          extraCost(t, new Set()),
      })),
    [],
  );

  const active = rows[yearIndex];
  const publicNow = BASE_AIRFARE + TICKET.aif * Math.pow(1.025, yearIndex) +
    BASE_AERONAUTICAL * Math.pow(1.02, yearIndex) + BASE_TAX +
    EXTRAS.reduce((sum, extra) => sum + (enabled.has(extra.id) ? extra.priceToday : 0), 0);

  const delta = active.total - publicNow;
  const animatedPrivate = useAnimatedNumber(active.total, { duration: 400 });
  const animatedPublic = useAnimatedNumber(publicNow, { duration: 400 });

  const parts = [
    { id: "fare", label: "Base airfare", value: active.fare, className: "bg-ink-4" },
    { id: "aif", label: "Airport Improvement Fee", value: active.aif, className: "bg-accent" },
    { id: "aero", label: "Aeronautical charges", value: active.aeronautical, className: "bg-accent-line" },
    { id: "tax", label: "Taxes and fees", value: BASE_TAX, className: "bg-line-strong" },
    { id: "extras", label: "Non-ticket charges", value: active.extras, className: "bg-blue" },
  ].filter((part) => part.value > 0.5);
  const partTotal = parts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div className="space-y-6">
      {/* Headline numbers */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="label-caps text-ink-4">Today's model · {active.calendar}</p>
          <p className="mt-1.5 font-display text-3xl font-semibold tabular text-green">
            {cad(animatedPublic)}
          </p>
          <p className="mt-1 text-[0.78rem] text-ink-3">Non-profit authority, as it stands</p>
        </div>
        <div className="card p-4">
          <p className="label-caps text-ink-4">Private concession · {active.calendar}</p>
          <p className="mt-1.5 font-display text-3xl font-semibold tabular text-ink">
            {cad(animatedPrivate)}
          </p>
          <p className="mt-1 text-[0.78rem] text-ink-3">Year {yearIndex} of the term</p>
        </div>
        <div className="card p-4">
          <p className="label-caps text-ink-4">Added per round trip</p>
          <p className="mt-1.5 font-display text-3xl font-semibold tabular text-accent">
            +{cad(delta)}
          </p>
          <p className="mt-1 text-[0.78rem] text-ink-3">
            {((delta / publicNow) * 100).toFixed(0)}% above the public model
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="calc-year" className="label-caps text-ink-4">
            Year of the concession
          </label>
          <span className="font-mono text-[0.82rem] tabular text-ink-2">
            year {yearIndex} · {active.calendar}
          </span>
        </div>
        <input
          id="calc-year"
          type="range"
          min={0}
          max={HORIZON}
          value={yearIndex}
          onChange={(event) => setYearIndex(Number(event.target.value))}
          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-accent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
        <div className="mt-2 flex justify-between font-mono text-[0.68rem] text-ink-4">
          <span>signed 2026</span>
          <span>2051</span>
        </div>

        {/* Breakdown */}
        <div className="mt-6">
          <p className="label-caps mb-2 text-ink-4">Where {cad(active.total)} goes</p>
          <div className="flex h-8 w-full overflow-hidden rounded-md">
            {parts.map((part) => (
              <div
                key={part.id}
                title={`${part.label}: ${cad(part.value)}`}
                style={{ width: `${(part.value / partTotal) * 100}%` }}
                className={`${part.className} transition-all duration-300`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {parts.map((part) => (
              <span key={`n-${part.id}`} className="flex items-center gap-1.5 text-[0.78rem] text-ink-3">
                <span className={`h-2.5 w-2.5 rounded-sm ${part.className}`} />
                {part.label}
                <span className="font-mono tabular text-ink-4">{cad(part.value)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Extras */}
      <div className="card p-5">
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">
          Non-ticket charges
        </h2>
        <p className="mt-1 text-[0.85rem] text-ink-3">
          These are the UK charges article.md documents. Switch them on to see what a privatised
          terminal adds beyond the fare.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {EXTRAS.map((extra) => {
            const on = enabled.has(extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                onClick={() =>
                  setEnabled((current) => {
                    const next = new Set(current);
                    if (next.has(extra.id)) next.delete(extra.id);
                    else next.add(extra.id);
                    return next;
                  })
                }
                aria-pressed={on}
                className={[
                  "flex cursor-pointer items-start justify-between gap-3 rounded-lg border p-3 text-left transition",
                  on ? "border-accent-line bg-accent-soft" : "border-line hover:bg-paper-2",
                ].join(" ")}
              >
                <span>
                  <span className="block text-[0.86rem] text-ink">{extra.label}</span>
                  <span className="mt-0.5 block text-[0.74rem] leading-snug text-ink-3">
                    {extra.detail}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[0.72rem] tabular text-ink-4">
                    {extra.priceToday > 0 ? cad(extra.priceToday) : "$0"} →
                  </span>
                  <span className="block font-mono text-[0.8rem] font-semibold tabular text-accent">
                    {cad(extra.pricePrivate)}
                  </span>
                  <span className="mt-1 flex justify-end gap-0.5">
                    {extra.refs.map((ref) => (
                      <CitationMarker key={`${extra.id}-${ref}`} refId={ref} />
                    ))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trajectory */}
      <div className="card p-5">
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">
          Total trip cost, 2026 to 2051
        </h2>
        <p className="mt-1 text-[0.85rem] text-ink-3">
          Move the pointer across the chart to scrub the year.
        </p>
        <div className="mt-4">
          <LineChart
            ariaLabel="Total trip cost under the public model versus a private concession"
            height={260}
            hover={yearIndex}
            onHover={(value) => {
              if (value !== null) setYearIndex(Math.min(HORIZON, Math.max(0, value)));
            }}
            formatX={(value) => String(ANNOUNCEMENT_YEAR + value)}
            formatY={(value) => `$${Math.round(value)}`}
            markers={[
              { x: 2, label: "protections end", color: "#8a8e96" },
              { x: 10, label: "nickel-and-dime", color: "#8a8e96" },
            ]}
            series={[
              {
                id: "public",
                label: "Public, non-profit authority",
                color: "#15803d",
                dashed: true,
                points: baseline,
              },
              {
                id: "private",
                label: "Private concession",
                color: "#c2410c",
                area: true,
                points: rows.map((row) => ({ x: row.t, y: row.total })),
              },
            ]}
          />
        </div>
        <ReferenceNote>
          The green line is the same airport under ordinary inflation with no profit mandate. The
          early dip in the orange line is the Sydney-style labour cut, which lowers costs before
          the fee increases arrive.
        </ReferenceNote>
      </div>
    </div>
  );
}
