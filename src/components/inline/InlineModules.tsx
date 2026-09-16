"use client";

import { useState } from "react";
import Link from "next/link";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { ReferenceNote } from "@/components/ui/ReferenceNote";
import { FACTS, cad } from "@/lib/sourced";
import { useAnimatedNumber } from "@/lib/hooks";

/* ------------------------------------------------------------------ *
 * Ticket anatomy: a small slider over the fare
 * ------------------------------------------------------------------ */

const BASE_AIRFARE = 266;
const BASE_AIF = 35;
const BASE_AERO = 22;
const BASE_TAX = 107;

export function TicketMini() {
  const [t, setT] = useState(10);

  // Anchored to the reported Perth rate: +60% per passenger over a decade.
  const aero = t === 0 ? BASE_AERO : BASE_AERO * Math.pow(1.06, Math.min(t, 10)) * Math.pow(1.02, Math.max(0, t - 10));
  const aif = t === 0 ? BASE_AIF : BASE_AIF * Math.pow(t < 3 ? 1.035 : 1.055, t);
  const total = BASE_AIRFARE + aif + aero + BASE_TAX;
  const animatedTotal = useAnimatedNumber(total, { duration: 400 });
  const added = total - (BASE_AIRFARE + BASE_AIF + BASE_AERO + BASE_TAX);

  const parts = [
    { id: "fare", label: "Airfare", value: BASE_AIRFARE, className: "bg-ink-4" },
    { id: "aif", label: "Improvement fee", value: aif, className: "bg-accent" },
    { id: "aero", label: "Aeronautical", value: aero, className: "bg-accent-line" },
    { id: "tax", label: "Taxes", value: BASE_TAX, className: "bg-line-strong" },
  ];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-[1.05rem] font-semibold text-ink">
            What a $430 ticket becomes
          </h3>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-3">
            Aeronautical charges are passed straight through to the ticket. Perth&rsquo;s
            airlines paid <strong className="text-ink">60% more per passenger</strong> within a
            decade of privatisation. <CitationMarker refId={14} />
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-semibold tabular text-ink">{cad(animatedTotal)}</p>
          <p className="text-[0.75rem] text-ink-4">
            {added > 1 ? `+${cad(added)} on today` : "today's fare"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-9 w-full overflow-hidden rounded-md">
        {parts.map((part) => (
          <div
            key={part.id}
            title={`${part.label}: ${cad(part.value)}`}
            style={{ width: `${(part.value / total) * 100}%` }}
            className={`${part.className} transition-all duration-300`}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((part) => (
          <span key={`l-${part.id}`} className="flex items-center gap-1.5 text-[0.75rem] text-ink-3">
            <span className={`h-2.5 w-2.5 rounded-sm ${part.className}`} />
            {part.label}
            <span className="font-mono tabular text-ink-4">{cad(part.value)}</span>
          </span>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="mini-year" className="label-caps text-ink-4">
            Years after privatisation
          </label>
          <span className="font-mono text-[0.8rem] tabular text-ink-2">
            {t === 0 ? "signed" : `year ${t}`} · {2026 + t}
          </span>
        </div>
        <input
          id="mini-year"
          type="range"
          min={0}
          max={25}
          value={t}
          onChange={(event) => setT(Number(event.target.value))}
          className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line-strong accent-accent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent"
        />
      </div>

      <ReferenceNote>
        Airfare, Improvement Fee and tax bands are inside article.md&rsquo;s reported ranges
        ($30–$40 fee, 25–35% taxes and fees). The Improvement Fee stays restricted to capital
        improvements today — lifting that restriction is the quiet part of the deal.{" "}
        <CitationMarker refId={1} />
      </ReferenceNote>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Fee scenarios from the international record
 * ------------------------------------------------------------------ */

const SCENARIOS = [
  {
    place: "Perth, Australia",
    claim: "+60%",
    detail:
      "Revenue collected from airlines per passenger rose by more than 60 percent over a decade after privatisation. Airlines pass aeronautical charges straight to the ticket.",
    refs: [14],
  },
  {
    place: "Brazil",
    claim: "3–3.5%",
    detail:
      "A 2021 econometric study found airfares on routes with at least one privatised airport were 3–3.5 percent higher than between two publicly managed airports.",
    refs: [5],
  },
  {
    place: "United Kingdom",
    claim: "£751m",
    detail:
      "Five English airports collected £751 million in parking fees in 2025 alone. Dropping someone off can cost as much as $24; Heathrow charges up to £98 a day.",
    refs: [14, 13],
  },
];

export function FeeScenarios() {
  return (
    <div className="space-y-4">
      <p className="text-[0.95rem] leading-relaxed text-ink-2">
        The pattern repeats across three countries: the money is found somewhere the passenger
        cannot avoid.
      </p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {SCENARIOS.map((scenario) => (
          <li key={scenario.place} className="card p-4">
            <p className="label-caps text-ink-4">{scenario.place}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular text-accent">
              {scenario.claim}
            </p>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-3">{scenario.detail}</p>
          </li>
        ))}
      </ul>
      <Link href="/ticket" className="inline-flex text-[0.82rem] font-medium text-blue hover:underline">
        Model the whole ticket →
      </Link>
    </div>
  );
}

export function StudyResult() {
  return (
    <div className="card p-5">
      <h3 className="font-display text-[1.05rem] font-semibold text-ink">
        The study that cuts both ways
      </h3>
      <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-2">
        A 2023 University of Alberta study is the strongest evidence in article.md for
        privatisation — and it found the bill too. Privately operated airports had{" "}
        <strong className="text-ink">50% fewer cancellations</strong> and higher customer
        satisfaction, and they charged about <strong className="text-ink">$20 more per
        passenger</strong>. <CitationMarker refId={14} />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Concession length
 * ------------------------------------------------------------------ */

const TERMS = [50, 65, 75, 99];

export function ConcessionStrip() {
  const [term, setTerm] = useState(75);

  return (
    <div className="card p-5">
      <h3 className="font-display text-[1.05rem] font-semibold text-ink">
        How long is the lock-in?
      </h3>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-3">
        article.md describes concessions of 50 to 99 years. Once signed, buying the contract back
        is prohibitively expensive.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TERMS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTerm(option)}
            aria-pressed={term === option}
            className={[
              "cursor-pointer rounded-md border px-3 py-1.5 text-[0.82rem] transition",
              term === option
                ? "border-ink bg-ink text-white"
                : "border-line-strong text-ink-2 hover:bg-paper-3",
            ].join(" ")}
          >
            {option} years
          </button>
        ))}
      </div>

      {/* Bar from 2026 to 2125 */}
      <div className="mt-5">
        <div className="relative h-7 overflow-hidden rounded-md bg-paper-3">
          <div
            className="absolute inset-y-0 left-0 bg-accent transition-all duration-500"
            style={{ width: `${(term / 99) * 100}%` }}
          />
          <div
            className="absolute inset-y-0 border-l-2 border-dashed border-ink-3"
            style={{ left: `${(25 / 99) * 100}%` }}
            title="Where this article's 25-year projection stops"
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[0.68rem] text-ink-4">
          <span>2026</span>
          <span>2125</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-paper-2 p-3">
            <p className="font-display text-xl font-semibold tabular text-ink">
              2026–{2026 + term}
            </p>
            <p className="mt-0.5 text-[0.78rem] text-ink-3">concession window</p>
          </div>
          <div className="rounded-lg bg-paper-2 p-3">
            <p className="font-display text-xl font-semibold tabular text-ink">
              {((25 / term) * 100).toFixed(0)}%
            </p>
            <p className="mt-0.5 text-[0.78rem] text-ink-3">
              of the term covered by this projection
            </p>
          </div>
        </div>
      </div>

      <ReferenceNote>
        Lengthening the term does not lengthen the evidence: the international record in
        article.md covers roughly three decades, and the projection here stops at 25 years.{" "}
        <CitationMarker refId={1} />
      </ReferenceNote>
    </div>
  );
}
