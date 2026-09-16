"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTrip } from "./ArticleContext";
import { Cite } from "./Cite";
import { AIRPORTS } from "@/lib/sourced";
import { ANNOUNCEMENT_YEAR, HORIZON, cad, costsFor } from "./model";

/**
 * The article's opening instrument.
 *
 * Two questions, asked once. Their answers become the basis of every projection
 * later in the piece, which is why they open it rather than sitting in a
 * separate tool.
 */
export function TripSetup() {
  const trip = useTrip();
  const [step, setStep] = useState<"airport" | "ticket">(trip.hasAirport ? "ticket" : "airport");
  const [query, setQuery] = useState("");
  const ticketRef = useRef<HTMLDivElement | null>(null);
  const fieldId = useId();

  useEffect(() => {
    if (step === "ticket" && trip.hasAirport) {
      ticketRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Only when the airport is chosen, not on every ticket keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const matches = AIRPORTS.filter((airport) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${airport.code} ${airport.name} ${airport.city} ${airport.province}`
      .toLowerCase()
      .includes(needle);
  });

  // What the reader's own trip looks like once answered.
  const answered = trip.hasAirport && trip.airport;
  const today = answered
    ? costsFor(
        {
          airport: trip.airport!,
          ticket: trip.ticket,
          days: trip.days,
          travellers: trip.travellers,
          dropOffMinutes: trip.dropOffMinutes,
        },
        0,
      )
    : null;
  const atYear = answered
    ? costsFor(
        {
          airport: trip.airport!,
          ticket: trip.ticket,
          days: trip.days,
          travellers: trip.travellers,
          dropOffMinutes: trip.dropOffMinutes,
        },
        trip.year,
      )
    : null;

  return (
    <section id="your-trip" className="scroll-mt-16 border-y-2 border-ink py-8">
      <div className="mx-auto max-w-[42rem] px-4 sm:px-6">
        <p className="font-sans text-[0.74rem] font-bold uppercase tracking-[0.1em] text-ink-4">
          Two questions
        </p>
        <h2 className="mt-2 font-serif text-[1.55rem] font-bold leading-tight sm:text-[1.85rem]">
          Work out what this costs your trip
        </h2>
        <p className="mt-2.5 font-serif text-[1.08rem] leading-relaxed text-ink-3">
          Answer these and the rest of the article will use your numbers alongside the national
          ones. You can change them at any point.
        </p>

        {/* -------------------- Question 1 -------------------- */}
        <div className="mt-7">
          <div className="flex items-baseline gap-3">
            <span
              className={[
                "flex h-6 w-6 items-center justify-center rounded-full font-sans text-[0.72rem] font-bold",
                trip.hasAirport ? "bg-ink text-white" : "bg-ink text-white",
              ].join(" ")}
            >
              1
            </span>
            <label htmlFor={fieldId} className="font-sans text-[0.95rem] font-semibold">
              Which airport are you flying from?
            </label>
          </div>

          {!trip.hasAirport || step === "airport" ? (
            <div className="mt-4">
              <input
                id={fieldId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type a city or airport code — Toronto, YVR, Halifax…"
                className="field w-full font-sans text-[1.05rem] placeholder:text-ink-4"
              />
              <ul className="mt-4 divide-y divide-rule border-y border-rule">
                {matches.map((airport) => (
                  <li key={airport.code}>
                    <button
                      type="button"
                      onClick={() => {
                        trip.setAirport(airport.code);
                        setStep("ticket");
                      }}
                      className="group flex w-full cursor-pointer items-center gap-4 py-2.5 text-left transition hover:bg-cream"
                    >
                      <span className="w-12 font-mono text-[0.85rem] font-bold">{airport.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sans text-[0.88rem]">
                          {airport.city}
                        </span>
                        <span className="block truncate font-sans text-[0.74rem] text-ink-4">
                          {airport.name}
                        </span>
                      </span>
                      <span
                        className={[
                          "font-sans text-[0.68rem] font-bold uppercase tracking-wide",
                          airport.inScope ? "text-data-a" : "text-ink-4",
                        ].join(" ")}
                      >
                        {airport.inScope ? "In scope" : "Not named"}
                      </span>
                    </button>
                  </li>
                ))}
                {!matches.length ? (
                  <li className="py-4 font-sans text-[0.82rem] text-ink-4">
                    No airport matches that. Only Canadian airports are modelled here.
                  </li>
                ) : null}
              </ul>
              <p className="mt-3 font-sans text-[0.74rem] leading-relaxed text-ink-4">
                Four airports are in scope for the concession. The rest are included for
                comparison — article.md says the proceeds are promised to them.{" "}
                <Cite id={1} />
              </p>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule pb-2">
              <span className="font-mono text-[0.9rem] font-bold">{trip.airport?.code}</span>
              <span className="font-sans text-[0.88rem]">{trip.airport?.name}</span>
              {trip.airport?.inScope ? (
                <span className="font-sans text-[0.68rem] font-bold uppercase tracking-wide text-data-a">
                  In scope
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setStep("airport")}
                className="ml-auto cursor-pointer font-sans text-[0.76rem] text-data-b hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* -------------------- Question 2 -------------------- */}
        {trip.hasAirport ? (
          <div ref={ticketRef} className="mt-8">
            <div className="flex items-baseline gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-sans text-[0.72rem] font-bold text-white">
                2
              </span>
              <label htmlFor={`${fieldId}-ticket`} className="font-sans text-[0.95rem] font-semibold">
                What does your round-trip ticket cost, all in?
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-3">
              <span className="flex items-baseline gap-1">
                <span className="font-serif text-[2rem] leading-none">$</span>
                <input
                  id={`${fieldId}-ticket`}
                  type="number"
                  min={80}
                  max={3000}
                  value={trip.ticket}
                  onChange={(event) =>
                    trip.setTicket(Math.min(3000, Math.max(80, Number(event.target.value) || 0)))
                  }
                  className="field w-32 font-serif text-[2rem] leading-none tabular"
                />
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {[199, 299, 430, 680, 1100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => trip.setTicket(preset)}
                    className={[
                      "cursor-pointer font-sans text-[0.82rem] underline-offset-4 transition",
                      trip.ticket === preset
                        ? "font-bold underline decoration-2"
                        : "text-ink-4 hover:text-ink hover:underline",
                    ].join(" ")}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel details */}
            <div className="mt-6 grid gap-x-8 gap-y-4 border-t border-rule pt-5 sm:grid-cols-3">
              <Stepper
                id={`${fieldId}-days`}
                label="Days parked"
                value={trip.days}
                min={0}
                max={21}
                onChange={trip.setDays}
                hint="Zero if you are not driving"
              />
              <Stepper
                id={`${fieldId}-pax`}
                label="Travellers"
                value={trip.travellers}
                min={1}
                max={6}
                onChange={trip.setTravellers}
              />
              <Stepper
                id={`${fieldId}-dropoff`}
                label="Minutes at the kerb"
                value={trip.dropOffMinutes}
                min={0}
                max={90}
                onChange={trip.setDropOffMinutes}
                hint={`${trip.airport?.code} allows ${trip.airport?.freeDropOffMinutes} free minutes today`}
              />
            </div>

            {/* Year of the concession */}
            <div className="mt-6 border-t border-rule pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={`${fieldId}-year`} className="font-sans text-[0.86rem] font-semibold">
                  How far into the concession should the article show?
                </label>
                <span className="font-sans text-[0.8rem] tabular text-ink-3">
                  {trip.year === 0 ? "Today" : `Year ${trip.year} · ${ANNOUNCEMENT_YEAR + trip.year}`}
                </span>
              </div>
              <input
                id={`${fieldId}-year`}
                type="range"
                min={0}
                max={HORIZON}
                value={trip.year}
                onChange={(event) => trip.setYear(Number(event.target.value))}
                className="mt-3 h-1 w-full cursor-pointer appearance-none bg-rule accent-data-a [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
              />
              <div className="mt-1 flex justify-between font-sans text-[0.7rem] text-ink-4">
                <span>{ANNOUNCEMENT_YEAR}</span>
                <span>2036</span>
                <span>{ANNOUNCEMENT_YEAR + HORIZON}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* -------------------- Live readout -------------------- */}
        {answered && today && atYear ? (
          <div className="mt-7 border-t-2 border-ink pt-4">
            <p className="font-sans text-[0.74rem] font-bold uppercase tracking-[0.1em] text-ink-4">
              Your trip, as the article will use it
            </p>
            <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-3">
              <div>
                <p className="font-serif text-[1.9rem] font-bold leading-none tabular">
                  {cad(atYear.tripTotal)}
                </p>
                <p className="mt-1.5 font-sans text-[0.78rem] leading-snug text-ink-3">
                  whole trip in {atYear.calendar}
                  {trip.travellers > 1 ? ` for ${trip.travellers} travellers` : ""}
                </p>
              </div>
              <div>
                <p className="font-serif text-[1.9rem] font-bold leading-none tabular text-data-a">
                  {cad(atYear.tripTotal - today.tripTotal)}
                </p>
                <p className="mt-1.5 font-sans text-[0.78rem] leading-snug text-ink-3">
                  added by the concession, against {cad(today.tripTotal)} today
                </p>
              </div>
              <div>
                <p className="font-serif text-[1.9rem] font-bold leading-none tabular">
                  {cad(atYear.ticketTotal)}
                </p>
                <p className="mt-1.5 font-sans text-[0.78rem] leading-snug text-ink-3">
                  per-traveller ticket, from {cad(today.ticketTotal)} today
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stepper({
  id,
  label,
  value,
  min,
  max,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-sans text-[0.86rem] font-semibold">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
          className="h-7 w-7 cursor-pointer border border-ink font-sans text-sm leading-none transition hover:bg-ink hover:text-white"
        >
          −
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(Math.min(max, Math.max(min, Number(event.target.value) || 0)))
          }
          className="field w-14 text-center font-sans text-[1rem] tabular"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
          className="h-7 w-7 cursor-pointer border border-ink font-sans text-sm leading-none transition hover:bg-ink hover:text-white"
        >
          +
        </button>
      </div>
      {hint ? (
        <p className="mt-1.5 font-sans text-[0.72rem] leading-snug text-ink-4">{hint}</p>
      ) : null}
    </div>
  );
}
