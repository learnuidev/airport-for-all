"use client";

import { useId } from "react";
import { AIRPORTS } from "@/lib/sourced";
import { useTrip } from "@/components/editorial/ArticleContext";
import { ANNOUNCEMENT_YEAR, HORIZON, cad } from "@/components/editorial/model";

/**
 * The two questions, set as a compact control block rather than a modal flow:
 * this page is a dashboard, so the inputs stay visible and the whole board
 * reacts to them immediately.
 */
export function TripControls() {
  const trip = useTrip();
  const uid = useId();

  return (
    <div className="border-b border-rule pb-4">
      <p className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.09em] text-ink-4">
        Your trip
      </p>

      {/* Question 1 */}
      <label htmlFor={`${uid}-airport`} className="mt-2 block font-sans text-[0.84rem] font-semibold">
        1. Airport
      </label>
      <select
        id={`${uid}-airport`}
        value={trip.airport?.code ?? ""}
        onChange={(event) => trip.setAirport(event.target.value)}
        className="mt-1.5 w-full cursor-pointer border border-ink bg-paper px-2 py-1.5 font-sans text-[0.84rem] outline-none focus:border-data-b"
      >
        <option value="">Choose an airport…</option>
        <optgroup label="In scope for the concession">
          {AIRPORTS.filter((airport) => airport.inScope).map((airport) => (
            <option key={airport.code} value={airport.code}>
              {airport.code} — {airport.city}
            </option>
          ))}
        </optgroup>
        <optgroup label="Not named in the announcement">
          {AIRPORTS.filter((airport) => !airport.inScope).map((airport) => (
            <option key={airport.code} value={airport.code}>
              {airport.code} — {airport.city}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Question 2 */}
      <label htmlFor={`${uid}-ticket`} className="mt-3 block font-sans text-[0.84rem] font-semibold">
        2. Round-trip ticket
      </label>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="font-serif text-[1.2rem]">$</span>
        <input
          id={`${uid}-ticket`}
          type="number"
          min={80}
          max={3000}
          value={trip.ticket}
          onChange={(event) =>
            trip.setTicket(Math.min(3000, Math.max(80, Number(event.target.value) || 0)))
          }
          className="w-24 border-b-2 border-ink bg-transparent py-0.5 font-serif text-[1.2rem] tabular outline-none focus:border-data-b"
        />
        <div className="ml-auto flex gap-2">
          {[199, 430, 680].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => trip.setTicket(preset)}
              className={[
                "cursor-pointer font-sans text-[0.72rem] underline-offset-2 transition",
                trip.ticket === preset
                  ? "font-bold text-ink underline"
                  : "text-ink-4 hover:text-ink hover:underline",
              ].join(" ")}
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary detail */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Mini
          id={`${uid}-days`}
          label="Days parked"
          value={trip.days}
          min={0}
          max={21}
          onChange={trip.setDays}
        />
        <Mini
          id={`${uid}-pax`}
          label="Travellers"
          value={trip.travellers}
          min={1}
          max={6}
          onChange={trip.setTravellers}
        />
        <Mini
          id={`${uid}-drop`}
          label="Kerbside min"
          value={trip.dropOffMinutes}
          min={0}
          max={90}
          onChange={trip.setDropOffMinutes}
        />
      </div>

      <p className="mt-2 font-sans text-[0.68rem] leading-relaxed text-ink-4">
        {trip.airport
          ? `${trip.airport.code} allows ${trip.airport.freeDropOffMinutes} free kerbside minutes today and charges ${cad(trip.airport.parkingPerDay)} a day to park.`
          : "Pick an airport to see how every figure on this board changes."}
      </p>
    </div>
  );
}

function Mini({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-sans text-[0.66rem] uppercase tracking-wide text-ink-4">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
          className="h-5 w-5 cursor-pointer border border-rule font-sans text-[0.7rem] transition hover:border-ink"
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
          className="w-9 border-b border-ink-4 bg-transparent text-center font-sans text-[0.8rem] tabular outline-none focus:border-data-b"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={`Increase ${label}`}
          className="h-5 w-5 cursor-pointer border border-rule font-sans text-[0.7rem] transition hover:border-ink"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Year control
 * ------------------------------------------------------------------ */

export function YearControl() {
  const trip = useTrip();
  const uid = useId();

  return (
    <div className="border-b border-rule py-4">
      <div className="flex items-baseline justify-between">
        <label htmlFor={`${uid}-year`} className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.09em] text-ink-4">
          Concession year
        </label>
        <span className="font-sans text-[0.8rem] tabular">
          {trip.year === 0 ? "Signed" : `Year ${trip.year}`}
          <span className="ml-1 text-ink-4">{ANNOUNCEMENT_YEAR + trip.year}</span>
        </span>
      </div>
      <input
        id={`${uid}-year`}
        type="range"
        min={0}
        max={HORIZON}
        value={trip.year}
        onChange={(event) => trip.setYear(Number(event.target.value))}
        className="mt-2 h-1 w-full cursor-pointer appearance-none bg-rule [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
      />
    </div>
  );
}
