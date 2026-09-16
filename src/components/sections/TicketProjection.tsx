"use client";

import { useMemo, useState } from "react";
import { LineChart } from "@/components/charts/LineChart";
import { CitationMarker } from "@/components/citations/CitationMarker";
import {
  ANNOUNCEMENT_YEAR,
  AERONAUTICAL_ANNUAL_GROWTH,
  BASE_AERONAUTICAL,
  BASE_AIRFARE,
  BASE_TAX,
  EXTRAS,
  FACTS,
  PHASES,
  TICKET,
  cad,
} from "@/lib/sourced";
import { useAnimatedNumber, useReducedMotion } from "@/lib/hooks";

const HORIZON = 25; // concession years modelled (2026 → 2051)
const FARE_PREMIUM = 0.0325; // Brazilian route premium: 3–3.5%
const LABOUR_PASSTHROUGH = 0.55; // share of a labour cut that reaches the passenger

type YearRow = {
  yearIndex: number;
  calendar: number;
  aif: number;
  aeronautical: number;
  extras: number;
  fare: number;
  total: number;
};

/** Logistic ramp: 0 before `start`, ~1 by `end`. */
function ramp(year: number, start: number, end: number): number {
  if (year <= start) return 0;
  if (year >= end) return 1;
  const t = (year - start) / (end - start);
  return t * t * (3 - 2 * t);
}

function selectedExtrasTotal(yearIndex: number, enabled: Set<string>): number {
  let total = 0;
  for (const extra of EXTRAS) {
    if (!enabled.has(extra.id)) continue;
    const share = ramp(yearIndex, 2, 10);
    total += extra.priceToday + extra.pricePrivate * share;
  }
  return total;
}

/**
 * The privatised-concession trajectory. The status-quo baseline is built on the
 * same year grid in `buildPublicBaseline` so both lines share one x axis.
 */
function buildModel(enabled: Set<string>): YearRow[] {
  const rows: YearRow[] = [];

  for (let t = 0; t <= HORIZON; t += 1) {
    const calendar = ANNOUNCEMENT_YEAR + t;

    // Airport Improvement Fee: a nudge while the deal settles, then a
    // profit-seeking trajectory toward the 15-20% revenue requirement.
    const aifGrowth = t === 0 ? 0 : t < 3 ? 0.035 : 0.055;
    const aif = TICKET.aif * Math.pow(1 + aifGrowth, t);

    // Aeronautical charges: Perth's measured rate for the first decade, then easing.
    const aeronautical =
      t === 0
        ? BASE_AERONAUTICAL
        : t <= 10
          ? BASE_AERONAUTICAL * Math.pow(1 + AERONAUTICAL_ANNUAL_GROWTH, t)
          : BASE_AERONAUTICAL *
            Math.pow(1 + AERONAUTICAL_ANNUAL_GROWTH, 10) *
            Math.pow(1.025, t - 10);

    // Sydney-style job cuts land in the first two years.
    const labourCut = 0.19 * LABOUR_PASSTHROUGH * ramp(t, 0.4, 2);
    // Brazilian evidence: a fare premium on routes with a privatised airport.
    const premium = t >= 3 ? FARE_PREMIUM : FARE_PREMIUM * ramp(t, 1, 3);
    const fare = BASE_AIRFARE * (1 + premium) * (1 - labourCut);

    const extras = selectedExtrasTotal(t, enabled);
    rows.push({
      yearIndex: t,
      calendar,
      aif,
      aeronautical,
      extras,
      fare,
      total: fare + aif + aeronautical + BASE_TAX + extras,
    });
  }

  return rows;
}

/** The world where the airports stay non-profit, on the same year grid. */
function buildPublicBaseline(enabled: Set<string>): { x: number; y: number }[] {
  return Array.from({ length: HORIZON + 1 }, (_, t) => {
    const aif = TICKET.aif * Math.pow(1.025, t);
    const aeronautical = BASE_AERONAUTICAL * Math.pow(1.02, t);
    const extras = EXTRAS.reduce(
      (sum, extra) => sum + (enabled.has(extra.id) ? extra.priceToday : 0),
      0,
    );
    return { x: t, y: BASE_AIRFARE + aif + aeronautical + BASE_TAX + extras };
  });
}

export function TicketProjection() {
  const reduced = useReducedMotion();
  const [yearIndex, setYearIndex] = useState(10);
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(["parking", "dropoff", "food"]),
  );

  const privateRows = useMemo(() => buildModel(enabled), [enabled]);
  const publicSeries = useMemo(() => buildPublicBaseline(enabled), [enabled]);

  const active = privateRows[yearIndex];
  const activePublic = publicSeries[yearIndex];
  const delta = active.total - activePublic.y;
  const deltaPct = (delta / activePublic.y) * 100;

  const animatedPrivate = useAnimatedNumber(active.total, { duration: reduced ? 0 : 700 });
  const animatedPublic = useAnimatedNumber(activePublic.y, { duration: reduced ? 0 : 700 });
  const animatedDelta = useAnimatedNumber(delta, { duration: reduced ? 0 : 700 });

  const calendar = ANNOUNCEMENT_YEAR + yearIndex;

  const toggle = (id: string) => {
    setEnabled((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const breakdown = [
    { id: "fare", label: "Base airfare", value: active.fare, color: "var(--color-jet-400)" },
    { id: "aif", label: "Airport Improvement Fee", value: active.aif, color: "var(--color-signal-500)" },
    { id: "aero", label: "Aeronautical pass-through", value: active.aeronautical, color: "var(--color-haze-400)" },
    { id: "tax", label: "Taxes and other fees", value: BASE_TAX, color: "var(--color-ink-500)" },
    { id: "extras", label: "Non-ticket extras", value: active.extras, color: "var(--color-alarm-500)" },
  ].filter((row) => row.value > 0.5);

  const breakdownTotal = breakdown.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="rounded-3xl border border-ink-600/70 bg-ink-900/60 p-5 sm:p-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-signal-400">Interactive model</p>
          <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            What your airport costs you, year by year
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-fog-400">
            Drag the year. Switch the extras on and off to see which costs land on the ticket
            and which ones you only pay if you park, eat or get dropped off.
          </p>
        </div>
        <div className="rounded-2xl border border-ink-600/70 bg-ink-850/80 px-4 py-3 text-right">
          <div className="label-caps text-fog-500">Concession year {yearIndex}</div>
          <div className="font-display text-3xl font-bold tabular text-fog-100">{calendar}</div>
        </div>
      </header>

      {/* Year scrubber */}
      <div className="mt-6">
        <input
          type="range"
          min={0}
          max={HORIZON}
          step={1}
          value={yearIndex}
          onChange={(event) => setYearIndex(Number(event.target.value))}
          aria-label="Concession year"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-jet-500 via-signal-500 to-alarm-500 accent-signal-500 outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-950 [&::-webkit-slider-thumb]:bg-fog-100 [&::-webkit-slider-thumb]:shadow-[0_0_18px_-2px_var(--color-signal-500)]"
        />
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {PHASES.filter((phase) => phase.id !== "counterargument").map((phase) => {
            const start = (phase.concessionStart ?? 0) - 0;
            const end = phase.id === "year-25-plus" ? HORIZON : (phase.concessionEnd ?? HORIZON);
            const isActive =
              yearIndex >= start && (phase.id === "year-25-plus" ? true : yearIndex <= end);
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => setYearIndex(Math.min(HORIZON, Math.max(0, start)))}
                className={[
                  "label-caps cursor-pointer rounded-full border px-2.5 py-1 transition",
                  isActive
                    ? "border-signal-500/60 bg-signal-500/15 text-signal-400"
                    : "border-ink-600/70 bg-ink-850/60 text-fog-500 hover:border-ink-500 hover:text-fog-300",
                ].join(" ")}
              >
                {phase.id === "year-1-2" ? "Y1–2" : null}
                {phase.id === "year-3-5" ? "Y3–5" : null}
                {phase.id === "year-5-10" ? "Y5–10" : null}
                {phase.id === "year-10-15" ? "Y10–15" : null}
                {phase.id === "year-15-25" ? "Y15–25" : null}
                {phase.id === "year-25-plus" ? "Y25+" : null}
                <span className="ml-1 font-mono opacity-70">
                  {phase.id === "year-25-plus" ? "" : `→${ANNOUNCEMENT_YEAR + end}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Headline comparison */}
      <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-ink-600/70 bg-ink-600/40 sm:grid-cols-3">
        <div className="bg-ink-900/90 p-5">
          <p className="label-caps text-fog-500">Today&rsquo;s model, {calendar}</p>
          <p className="mt-2 font-display text-3xl font-bold tabular text-runway-400">
            {cad(animatedPublic)}
          </p>
          <p className="mt-1 text-xs text-fog-500">Non-profit authority, as it stands</p>
        </div>
        <div className="bg-ink-900/90 p-5">
          <p className="label-caps text-fog-500">Private concession, {calendar}</p>
          <p className="mt-2 font-display text-3xl font-bold tabular text-signal-400">
            {cad(animatedPrivate)}
          </p>
          <p className="mt-1 text-xs text-fog-500">
            Year {yearIndex} of the concession
          </p>
        </div>
        <div className="bg-ink-900/90 p-5">
          <p className="label-caps text-fog-500">Added cost per round trip</p>
          <p className="mt-2 font-display text-3xl font-bold tabular text-alarm-400">
            +{cad(animatedDelta)}
          </p>
          <p className="mt-1 text-xs text-fog-500">
            {deltaPct.toFixed(0)}% more than the public model
          </p>
        </div>
      </div>

      {/* Breakdown of the privatised fare */}
      <div className="mt-6">
        <p className="label-caps mb-2 text-fog-500">Where that {cad(active.total)} goes</p>
        <div className="flex h-11 w-full overflow-hidden rounded-xl border border-ink-600/70">
          {breakdown.map((row) => (
            <div
              key={row.id}
              title={`${row.label}: ${cad(row.value)}`}
              style={{
                width: `${(row.value / breakdownTotal) * 100}%`,
                background: row.color,
              }}
              className="group relative flex items-center justify-center transition-all duration-500"
            >
              <span className="font-mono text-[10px] font-semibold tabular text-ink-950/80">
                {(row.value / breakdownTotal) * 100 >= 11 ? cad(row.value) : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {breakdown.map((row) => (
            <span key={`b-${row.id}`} className="flex items-center gap-1.5 text-xs text-fog-400">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: row.color }} />
              {row.label}
              <span className="font-mono tabular text-fog-500">{cad(row.value)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Extras toggles */}
      <div className="mt-7">
        <div className="flex items-center justify-between gap-3">
          <p className="label-caps text-fog-500">Non-ticket charges</p>
          <p className="text-xs text-fog-500">from the UK evidence</p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {EXTRAS.map((extra) => {
            const on = enabled.has(extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                onClick={() => toggle(extra.id)}
                aria-pressed={on}
                className={[
                  "group flex items-start justify-between gap-3 rounded-xl border p-3 text-left transition",
                  on
                    ? "border-alarm-400/50 bg-alarm-500/10"
                    : "border-ink-600/70 bg-ink-850/50 hover:border-ink-500",
                ].join(" ")}
              >
                <span>
                  <span className="flex items-center gap-2">
                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                        on ? "border-alarm-400 bg-alarm-500/70" : "border-ink-500",
                      ].join(" ")}
                    >
                      {on ? (
                        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-ink-950">
                          <path d="M4.6 8.6 2 6l1-1 1.6 1.6L9 3l1 1z" />
                        </svg>
                      ) : null}
                    </span>
                    <span className={`text-[0.86rem] ${on ? "text-fog-100" : "text-fog-400"}`}>
                      {extra.label}
                    </span>
                  </span>
                  <span className="mt-1 block pl-6 text-[0.72rem] leading-5 text-fog-500">
                    {extra.detail}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[0.78rem] tabular text-fog-300">
                    {extra.priceToday > 0 ? `${cad(extra.priceToday)} →` : "$0 →"}
                  </span>
                  <span className="block font-mono text-[0.78rem] font-semibold tabular text-alarm-400">
                    {cad(extra.pricePrivate)}
                  </span>
                  <span className="mt-1 inline-flex gap-0.5">
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
      <div className="mt-8">
        <p className="label-caps mb-3 text-fog-500">Total trip cost, 2026 → 2051</p>
        <LineChart
          ariaLabel="Total trip cost per round trip under the public model versus a private concession"
          height={280}
          hover={yearIndex}
          onHover={(value) => {
            if (value !== null) setYearIndex(Math.min(HORIZON, Math.max(0, value)));
          }}
          formatX={(value) => String(ANNOUNCEMENT_YEAR + value)}
          formatY={(value) => `$${Math.round(value)}`}
          markers={[
            { x: 2, label: "protections end" },
            { x: 10, label: "nickel-and-dime" },
            { x: 25, label: "monopoly" },
          ]}
          series={[
            {
              id: "public",
              label: "Public, non-profit authority",
              color: "var(--color-runway-400)",
              points: publicSeries.map((point) => ({ x: point.x, y: point.y })),
              dashed: true,
            },
            {
              id: "private",
              label: "Private concession",
              color: "var(--color-signal-500)",
              area: true,
              points: privateRows.map((row) => ({ x: row.yearIndex, y: row.total })),
            },
          ]}
        />
      </div>

      {/* Provenance */}
      <details className="group mt-6 rounded-2xl border border-ink-600/60 bg-ink-850/50 p-4">
        <summary className="label-caps cursor-pointer list-none text-fog-400 transition hover:text-fog-200">
          How this model is built · assumptions &amp; sources
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-caps mb-2 text-fog-500">Anchored to article.md</p>
            <ul className="space-y-2 text-[0.82rem] leading-6 text-fog-400">
              <li>
                Aeronautical pass-through compounds at 6%/yr for a decade — the article reports
                Perth&rsquo;s +60% per decade. <CitationMarker refId={14} />
              </li>
              <li>
                A 3.25% fare premium from year three — the Brazilian study found 3–3.5% higher
                airfares on privatised routes. <CitationMarker refId={5} />
              </li>
              <li>
                Sydney&rsquo;s 40% workforce cut is applied through a 55% labour-cost passthrough,
                which is why the early fare line dips before it climbs. <CitationMarker refId={14} />
              </li>
              <li>
                Extras reach UK-style pricing between years 2 and 10: {cad(24)} drop-off,{" "}
                {cad(118)} for two days of parking, {cad(98)}/day at Heathrow scale.{" "}
                <CitationMarker refId={13} />
              </li>
              <li>
                The {cad(FACTS.uofaFees.amount)} per-passenger fee increase from the 2023 study is
                inside this range rather than added on top. <CitationMarker refId={14} />
              </li>
            </ul>
          </div>
          <div>
            <p className="label-caps mb-2 text-fog-500">Model assumptions</p>
            <ul className="space-y-2 text-[0.82rem] leading-6 text-fog-500">
              {TICKET.assumptions.map((assumption) => (
                <li key={assumption} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-500" />
                  {assumption}
                </li>
              ))}
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-500" />
                Status-quo comparison grows the Airport Improvement Fee at 2.5%/yr and
                aeronautical charges at 2%/yr, reflecting ordinary cost inflation rather than
                a profit mandate.
              </li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
