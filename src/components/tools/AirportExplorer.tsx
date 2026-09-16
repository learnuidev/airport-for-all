"use client";

import { useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { ReferenceNote } from "@/components/ui/ReferenceNote";
import { AIRPORTS, cad } from "@/lib/sourced";
import { useAnimatedNumber } from "@/lib/hooks";

const STAFF_PER_MILLION = 62;
const SYDNEY_CUT = 0.4;

/** The three revenue streams article.md names, with the reported AIF share. */
const STREAMS = [
  { id: "aif", label: "Airport Improvement Fees", share: 37, note: "Ring-fenced to capital improvements today." },
  { id: "aero", label: "Aeronautical charges", share: 33, note: "Landing, gates, handling — passed to the ticket." },
  { id: "non-aero", label: "Non-aeronautical", share: 30, note: "Parking, rent, retail, food, ground transport." },
];

export function AirportExplorer() {
  const [activeCode, setActiveCode] = useState(AIRPORTS[0].code);
  const [year, setYear] = useState(10);
  const airport = AIRPORTS.find((item) => item.code === activeCode) ?? AIRPORTS[0];

  const staff = Math.round(airport.passengers * STAFF_PER_MILLION);
  const cut = Math.round(staff * SYDNEY_CUT);
  const animatedCut = useAnimatedNumber(cut, { duration: 400 });

  const ramp = Math.min(1, year / 10);
  const extras = (118 + 24 + 10) * ramp;
  const animatedExtras = useAnimatedNumber(extras, { duration: 400 });

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-4">
        {AIRPORTS.map((item) => {
          const active = item.code === activeCode;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => setActiveCode(item.code)}
              aria-pressed={active}
              className={[
                "cursor-pointer rounded-xl border p-4 text-left transition",
                active ? "border-ink bg-paper" : "border-line bg-paper/60 hover:bg-paper",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[1rem] font-semibold tracking-wider text-ink">
                  {item.code}
                </span>
                {item.unionised ? (
                  <span className="label-caps rounded bg-blue-soft px-1.5 py-0.5 text-blue">
                    UCTE
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-[0.82rem] text-ink-2">{item.city}</p>
              <p className="font-mono text-[0.7rem] text-ink-4">{item.passengers}M pax</p>
            </button>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="font-display text-[1.3rem] font-semibold text-ink">{airport.name}</h2>
            <p className="text-[0.85rem] text-ink-3">
              {airport.city}, {airport.province} · {airport.trafficShare}% of Canadian traffic
            </p>
          </div>
          <p className="max-w-md text-[0.85rem] leading-relaxed text-ink-3">{airport.note}</p>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="airport-year" className="label-caps text-ink-4">
              Year of the concession
            </label>
            <span className="font-mono text-[0.8rem] tabular text-ink-2">
              year {year} · {2026 + year}
            </span>
          </div>
          <input
            id="airport-year"
            type="range"
            min={1}
            max={25}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-accent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-paper-2 p-4">
            <p className="label-caps text-ink-4">Estimated airport jobs</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular text-ink">
              {staff.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-paper-2 p-4">
            <p className="label-caps text-ink-4">At Sydney&rsquo;s 40% rate</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular text-accent">
              −{Math.round(animatedCut).toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-paper-2 p-4">
            <p className="label-caps text-ink-4">Non-ticket charges per trip</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular text-blue">
              {cad(animatedExtras)}
            </p>
          </div>
        </div>

        <ReferenceNote>
          Staffing is modelled at {STAFF_PER_MILLION} jobs per million passengers — an illustrative
          density, not a published figure. The 40% cut and the parking and drop-off charges are
          from article.md. <CitationMarker refId={14} />
          <CitationMarker refId={13} />
        </ReferenceNote>
      </div>

      <div className="card p-5">
        <h2 className="font-display text-[1.05rem] font-semibold text-ink">
          Where an airport gets its money
        </h2>
        <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-3">
          The Airport Improvement Fee is 37% of large-airport revenue and is currently restricted
          to capital improvements. The other two streams are where a private company
          &ldquo;would look for new revenue&rdquo;. <CitationMarker refId={1} />
        </p>

        <div className="mt-4 flex h-8 w-full overflow-hidden rounded-md">
          {STREAMS.map((stream) => (
            <div
              key={stream.id}
              title={`${stream.label}: ${stream.share}%`}
              style={{ width: `${stream.share}%` }}
              className={[
                "flex items-center justify-center transition-all duration-300",
                stream.id === "aif"
                  ? "bg-accent"
                  : stream.id === "aero"
                    ? "bg-accent-line"
                    : "bg-blue/70",
              ].join(" ")}
            >
              <span className="font-mono text-[0.68rem] font-semibold text-white">
                {stream.share}%
              </span>
            </div>
          ))}
        </div>
        <ul className="mt-3 space-y-2">
          {STREAMS.map((stream) => (
            <li key={`n-${stream.id}`} className="flex gap-3 text-[0.85rem]">
              <span
                className={[
                  "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm",
                  stream.id === "aif"
                    ? "bg-accent"
                    : stream.id === "aero"
                      ? "bg-accent-line"
                      : "bg-blue/70",
                ].join(" ")}
              />
              <span className="text-ink-3">
                <span className="font-medium text-ink">{stream.label}</span> — {stream.note}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-[0.8rem] leading-relaxed text-ink-3">
          In 2022 the airport authorities took in{" "}
          <strong className="text-ink">$3.95 billion</strong> and made no profit at all — expenses
          and revenues were effectively identical. A privatised authority would instead drive
          revenue up and costs down to create a profit for shareholders.{" "}
          <CitationMarker refId={1} />
        </p>
      </div>
    </div>
  );
}
