"use client";

import { useMemo, useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { ReferenceNote } from "@/components/ui/ReferenceNote";
import { PRECEDENTS, cad } from "@/lib/sourced";
import { useAnimatedNumber } from "@/lib/hooks";

const REVENUE_2022_B = 3.95;
const RENT_M = 525;

export function RevenueSplit() {
  const [requirement, setRequirement] = useState(0.175);
  const [year, setYear] = useState(10);

  const maths = useMemo(() => {
    const annualRevenueB = REVENUE_2022_B * Math.pow(1.03, year);
    const extraB = annualRevenueB * requirement;
    const cumulative = Array.from({ length: year + 1 }, (_, t) =>
      REVENUE_2022_B * Math.pow(1.03, t) * requirement * 1000,
    ).reduce((sum, value) => sum + value, 0);
    return { annualRevenueB, extraB, annual: extraB * 1000, cumulative };
  }, [requirement, year]);

  const animatedAnnual = useAnimatedNumber(maths.annual, { duration: 400 });
  const animatedCumulative = useAnimatedNumber(maths.cumulative, { duration: 400 });
  const animatedExtra = useAnimatedNumber(maths.extraB, { duration: 400, decimals: 2 });

  return (
    <section className="card p-5">
      <h2 className="font-display text-[1.2rem] font-semibold text-ink">
        The windfall against the extraction
      </h2>
      <p className="mt-1 max-w-2xl text-[0.9rem] leading-relaxed text-ink-3">
        A not-for-profit authority reinvests its surplus. A private operator has to generate a
        return on top of the same cost base.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-green-soft p-4">
          <p className="label-caps text-green">Today · not-for-profit</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular text-ink">
            {cad(REVENUE_2022_B * 1000)}
          </p>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-3">
            System revenue in 2022, with expenses and revenues effectively identical. Rents return
            about {cad(RENT_M)} million a year to the federal government.{" "}
            <CitationMarker refId={1} />
          </p>
        </div>
        <div className="rounded-lg border border-accent-line bg-accent-soft p-4">
          <p className="label-caps text-accent">Private · extra revenue needed per year</p>
          <p className="mt-2 font-display text-2xl font-semibold tabular text-accent">
            +{animatedExtra.toFixed(2)}B
          </p>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-3">
            At {Math.round(requirement * 100)}% of year-{year} revenue.{" "}
            <CitationMarker refId={14} />
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="requirement" className="label-caps text-ink-4">
              Return investors require
            </label>
            <span className="font-mono text-[0.8rem] tabular text-ink-2">
              {(requirement * 100).toFixed(1)}%
            </span>
          </div>
          <input
            id="requirement"
            type="range"
            min={15}
            max={20}
            step={0.5}
            value={requirement * 100}
            onChange={(event) => setRequirement(Number(event.target.value) / 100)}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-accent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          />
          <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-4">
            The band article.md reports is 15–20%. Macquarie-backed airport funds have promised
            returns of over 13%. <CitationMarker refId={1} />
          </p>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="projection-year" className="label-caps text-ink-4">
              Concession year
            </label>
            <span className="font-mono text-[0.8rem] tabular text-ink-2">
              {2026 + year}
            </span>
          </div>
          <input
            id="projection-year"
            type="range"
            min={1}
            max={25}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-accent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-paper-2 p-3">
              <p className="label-caps text-ink-4">This year</p>
              <p className="mt-1 font-display text-lg font-semibold tabular text-accent">
                {cad(animatedAnnual)}M
              </p>
            </div>
            <div className="rounded-lg bg-paper-2 p-3">
              <p className="label-caps text-ink-4">Since signing</p>
              <p className="mt-1 font-display text-lg font-semibold tabular text-ink">
                {cad(animatedCumulative)}M
              </p>
            </div>
          </div>
        </div>
      </div>

      <ReferenceNote>
        Modelled from the article&rsquo;s $3.95 billion 2022 system revenue, a 3%/yr revenue
        growth rate and the reported 15–20% return requirement. The revenue split outside the
        reported 37% Airport Improvement Fee share is illustrative.
      </ReferenceNote>
    </section>
  );
}

export function EvidenceTable() {
  const [direction, setDirection] = useState<"all" | "cost" | "benefit">("all");
  const rows = PRECEDENTS.filter(
    (precedent) => direction === "all" || precedent.direction === direction,
  );

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-[1.05rem] font-semibold text-ink">
            What the record shows, measured in numbers
          </h2>
          <p className="mt-1 text-[0.85rem] text-ink-3">
            article.md reports a consistent pattern across Australia, New Zealand, Portugal, the UK
            and the United States.
          </p>
        </div>
        <div className="flex gap-1">
          {(["all", "cost", "benefit"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDirection(option)}
              className={[
                "cursor-pointer rounded-md px-2.5 py-1 text-[0.78rem] capitalize transition",
                direction === option
                  ? "bg-paper-3 font-medium text-ink"
                  : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-line">
        {rows.map((precedent) => (
          <li
            key={`${precedent.country}-${precedent.asset}-${precedent.effect}`}
            className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[11rem_1fr_9rem]"
          >
            <div>
              <p className="text-[0.85rem] text-ink">
                <span aria-hidden className="mr-1.5">
                  {precedent.flag}
                </span>
                {precedent.country}
              </p>
              <p className="text-[0.72rem] text-ink-4">{precedent.asset}</p>
            </div>
            <p className="text-[0.83rem] leading-relaxed text-ink-3">{precedent.effect}</p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span
                className={[
                  "font-mono text-[0.82rem] font-semibold tabular",
                  precedent.direction === "benefit" ? "text-green" : "text-accent",
                ].join(" ")}
              >
                {precedent.amount.toLocaleString()} {precedent.unit}
              </span>
              <span className="flex gap-0.5">
                {precedent.refs.map((ref) => (
                  <CitationMarker key={`${precedent.asset}-${ref}`} refId={ref} />
                ))}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
