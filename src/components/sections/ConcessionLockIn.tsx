"use client";

import { useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { ANNOUNCEMENT_YEAR, FACTS, PHASES } from "@/lib/sourced";

/** Landmarks that make a 50–99 year term legible. */
const LANDMARKS = [
  { year: 2026, label: "Deal signed", note: "Announcement, then six to nine months of negotiation." },
  { year: 2036, label: "First decade", note: "Perth's +60% charge increase would be fully realised." },
  { year: 2051, label: "Model horizon", note: "The point where this projection's charts end." },
  { year: 2076, label: "50-year floor", note: "The shortest concession article.md describes." },
  { year: 2125, label: "99-year ceiling", note: "The longest. A child born today turns 99." },
];

const TERMS = [
  { years: 50, label: "50 years", note: "The floor described in article.md." },
  { years: 65, label: "65 years", note: "A mid-range term." },
  { years: 75, label: "75 years", note: "Common for mature infrastructure concessions." },
  { years: 99, label: "99 years", note: "The ceiling — effectively permanent." },
];

export function ConcessionLockIn() {
  const [term, setTerm] = useState(75);
  const [horizon, setHorizon] = useState(25);

  const maxYear = 99;
  const endYear = ANNOUNCEMENT_YEAR + term;
  const pct = (year: number) => (year / maxYear) * 100;

  return (
    <div className="rounded-3xl border border-ink-600/70 bg-ink-900/60 p-5 sm:p-7">
      <header>
        <p className="label-caps text-fog-500">Year 25+ · the exit problem</p>
        <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          A lock-in longer than most mortgages, careers and governments
        </h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-fog-400">
          article.md describes concessions of <strong className="text-signal-400">50 to 99 years</strong>.
          Within that window the airport is operated for a return, not for a community — and buying
          the contract back, once private capital is embedded, is prohibitively expensive.
        </p>
      </header>

      {/* Term chooser */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TERMS.map((option) => (
          <button
            key={option.years}
            type="button"
            onClick={() => setTerm(option.years)}
            className={[
              "rounded-xl border px-3.5 py-2 text-left transition",
              term === option.years
                ? "border-signal-500/60 bg-signal-500/15"
                : "border-ink-600/70 bg-ink-850/50 hover:border-ink-500",
            ].join(" ")}
          >
            <span
              className={[
                "block font-display text-base font-bold tabular",
                term === option.years ? "text-signal-400" : "text-fog-200",
              ].join(" ")}
            >
              {option.label}
            </span>
            <span className="mt-0.5 block max-w-[11rem] text-[0.68rem] leading-4 text-fog-500">
              {option.note}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="mt-8">
        <div className="mb-16 flex items-baseline justify-between">
          <span className="font-mono text-xs text-fog-500">{ANNOUNCEMENT_YEAR}</span>
          <span className="font-mono text-xs font-semibold tabular text-signal-400">
            concession ends {endYear}
          </span>
          <span className="font-mono text-xs text-fog-500">{ANNOUNCEMENT_YEAR + 99}</span>
        </div>

        <div className="relative h-24">
          {/* Rail */}
          <div className="absolute inset-x-0 top-7 h-2 rounded-full bg-ink-800" />

          {/* Full concession runway */}
          <div
            className="absolute top-7 h-2 rounded-full bg-gradient-to-r from-signal-600 via-signal-500 to-signal-400"
            style={{ width: `${pct(term)}%` }}
          />

          {/* Phase bands */}
          <div className="absolute inset-x-0 top-12">
            <div className="relative h-6">
              {PHASES.filter((phase) => phase.id !== "counterargument").map((phase) => {
                const start = phase.concessionStart ?? 0;
                const end = phase.id === "year-25-plus" ? 99 : (phase.concessionEnd ?? 99);
                const width = pct(end - start);
                if (width <= 0.4) return null;
                return (
                  <div
                    key={phase.id}
                    className="absolute h-6 overflow-hidden rounded-md border border-ink-600/70 bg-ink-850/70"
                    style={{ left: `${pct(start)}%`, width: `${width}%` }}
                    title={`${phase.kicker} · ${phase.lever}`}
                  >
                    <span className="flex h-full items-center justify-center px-1 font-mono text-[0.6rem] uppercase tracking-wider text-fog-500">
                      {width > 8 ? phase.lever : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modelled horizon marker */}
          <button
            type="button"
            onClick={() => setHorizon(horizon === 25 ? 99 : 25)}
            aria-label="Toggle the modelled horizon"
            className="group absolute top-0 -translate-x-1/2 cursor-pointer"
            style={{ left: `${pct(horizon)}%` }}
          >
            <span className="block h-3 w-3 rounded-full border-2 border-ink-950 bg-jet-400 shadow-[0_0_16px_var(--color-jet-400)]" />
            <span className="mt-1 block whitespace-nowrap font-mono text-[0.6rem] uppercase tracking-wider text-jet-400">
              year {horizon}
            </span>
          </button>

          {/* Landmarks */}
          {LANDMARKS.map((landmark) => {
            const offset = landmark.year - ANNOUNCEMENT_YEAR;
            const isPast = offset > term;
            return (
              <div
                key={landmark.year}
                className="absolute top-20 -translate-x-1/2 text-center"
                style={{ left: `${pct(offset)}%` }}
              >
                <span
                  className={[
                    "mx-auto block h-2 w-px",
                    isPast ? "bg-alarm-400/70" : "bg-ink-500",
                  ].join(" ")}
                />
                <span
                  className={[
                    "mt-1 block max-w-[7rem] text-[0.62rem] leading-4",
                    isPast ? "text-alarm-400" : "text-fog-500",
                  ].join(" ")}
                >
                  {landmark.label}
                  <span className="mt-0.5 block font-mono opacity-80">{landmark.year}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Readout */}
      <div className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-ink-600/70 bg-ink-600/40 sm:grid-cols-3">
        <div className="bg-ink-900/90 p-4">
          <p className="label-caps text-fog-500">Concession length</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular text-signal-400">
            {term} years
          </p>
        </div>
        <div className="bg-ink-900/90 p-4">
          <p className="label-caps text-fog-500">Projection in this article</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular text-jet-400">
            {((horizon / term) * 100).toFixed(0)}% of term
          </p>
          <p className="mt-1 text-[0.68rem] text-fog-500">
            {horizon} of {term} years covered
          </p>
        </div>
        <div className="bg-ink-900/90 p-4">
          <p className="label-caps text-fog-500">Anti-inflation guardrail</p>
          <p className="mt-1.5 font-display text-2xl font-bold tabular text-fog-100">
            {FACTS.negotiationWindow.value}
          </p>
          <p className="mt-1 text-[0.68rem] text-fog-500">to negotiate the agreement</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border-l-2 border-haze-400 bg-ink-850/60 p-4">
        <p className="text-[0.9rem] leading-7 text-fog-300">
          Reporting in article.md notes that governments recoil from the word
          &ldquo;privatization&rdquo; because the asset stays in public hands — while private
          interests gain its <strong className="text-haze-400">operation and control</strong> for
          what are often 50 to 99 year-long concessions.{" "}
          <CitationMarker refId={1} />
        </p>
      </div>
    </div>
  );
}
