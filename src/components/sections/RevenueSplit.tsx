"use client";

import { useMemo, useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { FACTS, cad } from "@/lib/sourced";
import { useAnimatedNumber } from "@/lib/hooks";

/**
 * The revenue streams article.md names for Canada's large airports, with the
 * reported split. Only the Airport Improvement Fee has a reported share (37%);
 * the remainder is spread across the other two categories, which the CCPA says a
 * private company "would look for new revenue" in.
 */
type Stream = {
  id: string;
  label: string;
  share: number;
  reachable: "locked" | "open" | "partial";
  note: string;
  refs: number[];
};

const STREAMS: Stream[] = [
  {
    id: "aif",
    label: "Airport Improvement Fees",
    share: 37,
    reachable: "partial",
    note: "Today restricted to capital improvements — the restriction a private operator would argue hardest to remove.",
    refs: [1],
  },
  {
    id: "aero",
    label: "Aeronautical charges",
    share: 33,
    reachable: "open",
    note: "Landing, gates, passenger handling. Directly controlled by the airport authority; airlines pass them to the ticket.",
    refs: [1],
  },
  {
    id: "non-aero",
    label: "Non-aeronautical revenue",
    share: 30,
    reachable: "open",
    note: "Parking, rent from retailers, ground transport, food. The UK shows what this looks like when it is optimised.",
    refs: [1, 13],
  },
];

const REVENUE_2022 = 3.95; // billion CAD, from article.md
const RENT = 525; // million CAD per year, from article.md
const REQUIREMENT_LOW = 0.15;
const REQUIREMENT_HIGH = 0.2;

export function RevenueSplit() {
  const [requirement, setRequirement] = useState(0.175);
  const [yearIndex, setYearIndex] = useState(10);

  const maths = useMemo(() => {
    // Revenue grows with the concession; a mature year is used for the comparison.
    const growth = Math.pow(1.03, yearIndex);
    const annualRevenueB = REVENUE_2022 * growth;
    const extraB = annualRevenueB * requirement;
    const annualWindfall = extraB * 1000; // $ millions extracted per year
    const cumulative = Array.from({ length: yearIndex + 1 }, (_, t) => {
      const revenue = REVENUE_2022 * Math.pow(1.03, t);
      return revenue * requirement * 1000;
    }).reduce((sum, value) => sum + value, 0);
    return { annualRevenueB, extraB, annualWindfall, cumulative };
  }, [requirement, yearIndex]);

  const animatedWindfall = useAnimatedNumber(maths.annualWindfall, { duration: 600 });
  const animatedCumulative = useAnimatedNumber(maths.cumulative, { duration: 600 });
  const animatedExtra = useAnimatedNumber(maths.extraB, { duration: 600, decimals: 2 });

  return (
    <div className="rounded-3xl border border-ink-600/70 bg-ink-900/60 p-5 sm:p-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-haze-400">Year 10–15 · where the money goes</p>
          <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            A one-time windfall against a permanent extraction
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-fog-400">
            Not-for-profit authorities reinvest their surplus. A private operator has to
            generate a return on top of the same cost base — on the Canadian Labour Congress
            estimate, 15 to 20 percent more revenue.
          </p>
        </div>
      </header>

      {/* Two-column comparison */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-runway-400/30 bg-runway-500/5 p-5">
          <p className="label-caps text-runway-400">Today · not-for-profit authority</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold tabular text-runway-400">
              {cad(FACTS.systemRevenue2022.amount * 1000)}
            </span>
            <span className="text-sm text-fog-500">revenue in 2022</span>
            <CitationMarker refId={1} />
          </div>
          <div className="mt-4 flex h-8 w-full overflow-hidden rounded-lg border border-ink-600/60">
            <div className="flex w-full items-center justify-center bg-runway-500/20">
              <span className="font-mono text-[0.72rem] tabular text-runway-400">
                revenue ≈ expenses · surplus reinvested
              </span>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-[0.84rem] leading-6 text-fog-400">
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-runway-400" />
              Surpluses go back into the airports.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-runway-400" />
              Rents return about {cad(RENT)} million a year to the federal government.{" "}
              <CitationMarker refId={1} />
            </li>
            <li className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-runway-400" />
              Governance sits with local boards, not shareholders.{" "}
              <CitationMarker refId={1} />
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-signal-500/30 bg-signal-500/5 p-5">
          <p className="label-caps text-signal-400">Under a private concession</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold tabular text-signal-400">
              +{animatedExtra.toFixed(2)}B
            </span>
            <span className="text-sm text-fog-500">extra revenue needed per year</span>
            <CitationMarker refId={14} />
          </div>
          <div className="mt-4 flex h-8 w-full overflow-hidden rounded-lg border border-ink-600/60">
            {STREAMS.map((stream) => (
              <div
                key={stream.id}
                title={`${stream.label}: ${stream.share}% of revenue`}
                style={{
                  width: `${stream.share}%`,
                  background:
                    stream.reachable === "locked"
                      ? "var(--color-ink-500)"
                      : stream.reachable === "partial"
                        ? "color-mix(in oklab, var(--color-signal-500) 55%, var(--color-ink-600))"
                        : "var(--color-signal-500)",
                }}
                className="flex items-center justify-center"
              >
                <span className="font-mono text-[0.68rem] tabular text-ink-950/80">
                  {stream.share}%
                </span>
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-2.5">
            {STREAMS.map((stream) => (
              <li key={`s-${stream.id}`} className="flex gap-2 text-[0.82rem] leading-6">
                <span
                  className={[
                    "mt-1.5 h-2 w-2 shrink-0 rounded-sm",
                    stream.reachable === "open"
                      ? "bg-signal-500"
                      : stream.reachable === "partial"
                        ? "bg-signal-500/50"
                        : "bg-ink-500",
                  ].join(" ")}
                />
                <span className="text-fog-400">
                  <span className="text-fog-200">{stream.label}</span> — {stream.note}{" "}
                  {stream.refs.map((ref) => (
                    <CitationMarker key={`${stream.id}-${ref}`} refId={ref} />
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-600/60 bg-ink-850/50 p-4">
          <div className="flex items-baseline justify-between">
            <label htmlFor="requirement" className="label-caps text-fog-500">
              Return required by investors
            </label>
            <span className="font-mono text-sm tabular text-signal-400">
              {(requirement * 100).toFixed(1)}%
            </span>
          </div>
          <input
            id="requirement"
            type="range"
            min={REQUIREMENT_LOW * 100}
            max={REQUIREMENT_HIGH * 100}
            step={0.5}
            value={requirement * 100}
            onChange={(event) => setRequirement(Number(event.target.value) / 100)}
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-signal-400"
          />
          <p className="mt-2 text-[0.72rem] leading-5 text-fog-500">
            The article.md band is 15–20%. Macquarie-backed airport funds have promised returns of
            over 13%. <CitationMarker refId={1} />
          </p>
        </div>

        <div className="rounded-2xl border border-ink-600/60 bg-ink-850/50 p-4">
          <div className="flex items-baseline justify-between">
            <label htmlFor="concession-year" className="label-caps text-fog-500">
              Concession year
            </label>
            <span className="font-mono text-sm tabular text-signal-400">
              Year {yearIndex} · {2026 + yearIndex}
            </span>
          </div>
          <input
            id="concession-year"
            type="range"
            min={1}
            max={25}
            step={1}
            value={yearIndex}
            onChange={(event) => setYearIndex(Number(event.target.value))}
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-haze-400"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="label-caps text-fog-500">Extraction this year</p>
              <p className="font-display text-xl font-bold tabular text-signal-400">
                {cad(animatedWindfall)}M
              </p>
            </div>
            <div>
              <p className="label-caps text-fog-500">Cumulative since signing</p>
              <p className="font-display text-xl font-bold tabular text-alarm-400">
                {cad(animatedCumulative)}M
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border-l-2 border-signal-500 bg-ink-850/60 p-4">
        <p className="text-[0.9rem] leading-7 text-fog-300">
          &ldquo;The <strong className="text-signal-400">tens of billions</strong> Carney promises
          to raise will be a one-time windfall. The annual profit extraction will be permanent.&rdquo;
        </p>
        <p className="mt-2 text-[0.75rem] leading-5 text-fog-500">
          Reporting in article.md, drawn from the CCPA and the Canadian Labour Congress.{" "}
          <CitationMarker refId={1} />
          <CitationMarker refId={14} />
        </p>
      </div>

      <p className="mt-4 text-[0.72rem] leading-5 text-fog-500">
        Modelled from article.md&rsquo;s figures: {cad(FACTS.systemRevenue2022.amount * 1000)}{" "}
        system revenue in 2022, a 37/33/30 revenue split, and revenue growth of 3%/yr. The split
        outside the reported 37% Airport Improvement Fee share is illustrative.
      </p>
    </div>
  );
}
