"use client";

import { useMemo, useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { AIRPORTS, AIRPORT_TOTAL_PASSENGERS, FACTS } from "@/lib/sourced";
import { useAnimatedNumber } from "@/lib/hooks";

/** Sydney's measured post-privatisation reduction. */
const SYDNEY_CUT = 0.4;
/** Modelled staff per million annual passengers, weighting the two UCTE airports. */
const STAFF_PER_MILLION = 62;

type Row = {
  code: string;
  name: string;
  passengers: number;
  staff: number;
  cut: number;
  survivors: number;
  unionised: boolean;
};

export function WorkforceImpact() {
  const [severity, setSeverity] = useState(0.4);
  const [protections, setProtections] = useState(true);

  const rows: Row[] = useMemo(
    () =>
      AIRPORTS.map((airport) => {
        const staff = Math.round(airport.passengers * STAFF_PER_MILLION);
        // Post-sale protections delay and soften the cut; they do not prevent it.
        const effective = protections ? severity * 0.45 : severity;
        const cut = Math.round(staff * effective);
        return {
          code: airport.code,
          name: airport.city,
          passengers: airport.passengers,
          staff,
          cut,
          survivors: staff - cut,
          unionised: airport.unionised,
        };
      }),
    [severity, protections],
  );

  const totalStaff = rows.reduce((sum, row) => sum + row.staff, 0);
  const totalCut = rows.reduce((sum, row) => sum + row.cut, 0);
  const animatedCut = useAnimatedNumber(totalCut, { duration: 700 });
  const animatedShare = useAnimatedNumber((totalCut / totalStaff) * 100, {
    duration: 700,
    decimals: 1,
  });

  const maxStaff = Math.max(...rows.map((row) => row.staff));

  return (
    <div className="rounded-3xl border border-ink-600/70 bg-ink-900/60 p-5 sm:p-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-alarm-400">Year 1–2 · the labour lever</p>
          <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            Cutting labour is the fastest route to a 15–20% return
          </h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-fog-400">
            After Sydney Airport was privatised, the new owners cut 40% of the workforce once
            post-sale protections expired. Scale that to the four Canadian airports named in the
            announcement.
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_18rem]">
        {/* Airport bars */}
        <div className="space-y-3">
          {rows.map((row) => {
            const width = (row.staff / maxStaff) * 100;
            const cutWidth = (row.cut / maxStaff) * 100;
            return (
              <div key={row.code} className="rounded-2xl border border-ink-600/60 bg-ink-850/50 p-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-sm font-bold tracking-wider text-jet-400">
                      {row.code}
                    </span>
                    <span className="text-[0.92rem] text-fog-200">{row.name}</span>
                    {row.unionised ? (
                      <span className="label-caps rounded-full border border-haze-400/40 bg-haze-400/10 px-2 py-0.5 text-haze-400">
                        UCTE
                      </span>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs tabular text-fog-500">
                    {row.passengers.toFixed(1)}M pax
                  </span>
                </div>

                <div className="relative mt-3 h-7 overflow-hidden rounded-lg bg-ink-800/80">
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r from-ink-600 to-ink-500 transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-l-lg bg-gradient-to-r from-alarm-500/90 to-alarm-400/80 transition-all duration-700"
                    style={{ width: `${cutWidth}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="font-mono text-[0.72rem] font-semibold tabular text-fog-100">
                      −{row.cut.toLocaleString()} jobs
                    </span>
                    <span className="font-mono text-[0.72rem] tabular text-fog-500">
                      {row.survivors.toLocaleString()} remain
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls + totals */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-alarm-400/30 bg-alarm-500/5 p-4">
            <p className="label-caps text-fog-500">Jobs cut across the four airports</p>
            <p className="mt-1 font-display text-4xl font-bold tabular text-alarm-400">
              {Math.round(animatedCut).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-fog-500">
              {animatedShare.toFixed(1)}% of a modelled{" "}
              {totalStaff.toLocaleString()}-person workforce
            </p>
          </div>

          <div className="rounded-2xl border border-ink-600/60 bg-ink-850/50 p-4">
            <div className="flex items-baseline justify-between">
              <label
                htmlFor="severity"
                className="label-caps text-fog-500"
              >
                Cut severity
              </label>
              <span className="font-mono text-sm tabular text-signal-400">
                {Math.round(severity * 100)}%
              </span>
            </div>
            <input
              id="severity"
              type="range"
              min={20}
              max={50}
              step={1}
              value={Math.round(severity * 100)}
              onChange={(event) => setSeverity(Number(event.target.value) / 100)}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-alarm-400 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-alarm-400"
            />
            <p className="mt-2 text-[0.72rem] leading-5 text-fog-500">
              Sydney measured 40%. The range spans milder outcomes to the Australian precedent.
            </p>

            <button
              type="button"
              onClick={() => setProtections((value) => !value)}
              aria-pressed={protections}
              className={[
                "mt-4 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                protections
                  ? "border-runway-400/40 bg-runway-500/10"
                  : "border-alarm-400/40 bg-alarm-500/10",
              ].join(" ")}
            >
              <span
                className={[
                  "relative h-5 w-9 shrink-0 rounded-full transition",
                  protections ? "bg-runway-500/70" : "bg-ink-600",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-4 w-4 rounded-full bg-fog-100 transition-all",
                    protections ? "left-[1.15rem]" : "left-0.5",
                  ].join(" ")}
                />
              </span>
              <span className="text-[0.82rem] leading-5 text-fog-300">
                Job protections written into the deal
                <span className="mt-0.5 block text-[0.72rem] text-fog-500">
                  They reduce the cut while they last — in Sydney they expired, and the cuts did
                  not.
                </span>
              </span>
            </button>
          </div>

          <div className="rounded-2xl border border-ink-600/60 bg-ink-850/50 p-4">
            <p className="label-caps text-fog-500">why</p>
            <p className="mt-2 text-[0.82rem] leading-6 text-fog-400">
              Private investors would need <strong className="text-signal-400">15–20% more
              revenue</strong> for competitive returns. Cutting labour costs is one of the fastest
              ways to get there. <CitationMarker refId={14} />
            </p>
            <p className="mt-3 border-t border-ink-600/60 pt-3 text-[0.82rem] leading-6 text-fog-400">
              &ldquo;{FACTS.sydneyCuts.label}&rdquo; — measured at Sydney Airport.{" "}
              <CitationMarker refId={14} />
            </p>
            <p className="mt-3 border-t border-ink-600/60 pt-3 text-[0.72rem] leading-5 text-fog-500">
              Staffing is modelled at {STAFF_PER_MILLION} jobs per million annual passengers across{" "}
              {AIRPORT_TOTAL_PASSENGERS.toFixed(1)}M passengers — an illustrative density, not a
              published figure. The 40% severity and the 15–20% revenue requirement are from
              article.md.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
