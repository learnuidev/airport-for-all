"use client";

import { useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { BASE_AERONAUTICAL, BASE_AIRFARE, BASE_TAX, TICKET, cad } from "@/lib/sourced";
import { useAnimatedNumber } from "@/lib/hooks";

type Slice = {
  id: string;
  label: string;
  value: number;
  color: string;
  refs: number[];
  note: string;
  restricted: boolean;
};

export function TicketAnatomy() {
  const [focus, setFocus] = useState<string | null>(null);

  const slices: Slice[] = [
    {
      id: "airfare",
      label: "Base airfare",
      value: BASE_AIRFARE,
      color: "var(--color-jet-400)",
      refs: [],
      note: "Airline revenue: crew, fuel, aircraft. Carney argues airport retail “has nothing to do with the price of tickets”, but article.md shows aeronautical charges feed straight into this line.",
      restricted: false,
    },
    {
      id: "aif",
      label: "Airport Improvement Fee",
      value: TICKET.aif,
      color: "var(--color-signal-500)",
      refs: [1],
      note: "37% of large-airport revenue and $30–$40 per ticket. Today it is legally restricted to capital improvements — the constraint a private operator would most want lifted.",
      restricted: true,
    },
    {
      id: "aeronautical",
      label: "Aeronautical charges",
      value: BASE_AERONAUTICAL,
      color: "var(--color-haze-400)",
      refs: [1, 14],
      note: "Landing, gates and passenger handling. At Perth these rose more than 60% per passenger in a decade. Airlines simply pass them through to the ticket.",
      restricted: false,
    },
    {
      id: "tax",
      label: "Taxes and other fees",
      value: BASE_TAX,
      color: "var(--color-ink-500)",
      refs: [14],
      note: "25–35% of a Canadian ticket already. Canada ranks 101st of 116 countries for air travel affordability.",
      restricted: false,
    },
  ];

  const total = useAnimatedNumber(TICKET.total, { duration: 1000 });
  const active = slices.find((slice) => slice.id === focus) ?? null;

  return (
    <div className="rounded-3xl border border-ink-600/70 bg-ink-900/60 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps text-fog-500">Anatomy of one ticket</p>
          <p className="mt-1 text-sm text-fog-400">
            A representative domestic return fare, modelled inside article.md&rsquo;s reported ranges.
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl font-bold tabular text-fog-100">
            {cad(total)}
          </div>
          <p className="label-caps text-fog-500">total</p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="mt-6">
        <div className="flex h-16 w-full overflow-hidden rounded-2xl border border-ink-600/70">
          {slices.map((slice) => {
            const share = (slice.value / TICKET.total) * 100;
            const isActive = focus === slice.id;
            return (
              <button
                key={slice.id}
                type="button"
                onMouseEnter={() => setFocus(slice.id)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(slice.id)}
                onBlur={() => setFocus(null)}
                onClick={() => setFocus((current) => (current === slice.id ? null : slice.id))}
                aria-label={`${slice.label}: ${cad(slice.value)}`}
                style={{ width: `${share}%`, background: slice.color }}
                className={[
                  "group relative flex cursor-pointer items-center justify-center transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-80 hover:opacity-100",
                  isActive ? "" : "saturate-[0.85]",
                ].join(" ")}
              >
                <span
                  className={[
                    "font-mono text-[11px] font-semibold tabular transition",
                    slice.id === "tax" ? "text-fog-300" : "text-ink-950",
                  ].join(" ")}
                >
                  {share >= 9 ? `${Math.round(share)}%` : ""}
                </span>
                {slice.restricted ? (
                  <span className="absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rotate-45 bg-ink-950/70" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {slices.map((slice) => (
            <button
              key={`legend-${slice.id}`}
              type="button"
              onMouseEnter={() => setFocus(slice.id)}
              onMouseLeave={() => setFocus(null)}
              onClick={() => setFocus((current) => (current === slice.id ? null : slice.id))}
              className={[
                "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition",
                focus === slice.id
                  ? "border-fog-500/50 bg-ink-700/70"
                  : "border-ink-600/60 bg-ink-850/50 hover:border-ink-500",
              ].join(" ")}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: slice.color }}
                />
                <span className="text-[0.84rem] text-fog-300">{slice.label}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-mono text-[0.84rem] tabular text-fog-100">
                  {cad(slice.value)}
                </span>
                {slice.refs.map((ref) => (
                  <CitationMarker key={`${slice.id}-${ref}`} refId={ref} />
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={[
          "mt-5 grid gap-3 overflow-hidden rounded-2xl border border-ink-600/60 bg-ink-850/60 p-4 transition-all duration-300",
          active ? "min-h-[5.5rem]" : "min-h-0 border-transparent bg-transparent p-0",
        ].join(" ")}
      >
        {active ? (
          <>
            <p className="flex items-center gap-2 text-[0.9rem] font-semibold text-fog-100">
              {active.label}
              {active.restricted ? (
                <span className="label-caps rounded-full border border-runway-400/40 bg-runway-500/10 px-2 py-0.5 text-runway-400">
                  ring-fenced today
                </span>
              ) : null}
            </p>
            <p className="text-[0.92rem] leading-7 text-fog-400">{active.note}</p>
          </>
        ) : (
          <p className="text-[0.88rem] text-fog-500">
            Hover or tap a band to see which part of the fare a private operator can reach.
          </p>
        )}
      </div>
    </div>
  );
}
