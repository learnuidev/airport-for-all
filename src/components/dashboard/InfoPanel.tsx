"use client";

import { Cite } from "@/components/editorial/Cite";
import { useTrip } from "@/components/editorial/ArticleContext";
import { AIRPORTS, PRECEDENTS } from "@/lib/sourced";
import {
  ANNOUNCEMENT_YEAR,
  HORIZON,
  cad,
  costsFor,
  seriesFor,
  staffEstimate,
  type TripInput,
} from "@/components/editorial/model";
import { SERIES_COLOURS, SERIES_LABELS, type ChartView } from "./ChartCanvas";

export type ViewId = "cost" | "charges" | "jobs" | "revenue" | "record";

export const VIEWS: {
  id: ViewId;
  label: string;
  title: string;
  blurb: string;
  chart: ChartView;
  unit: string;
}[] = [
  {
    id: "cost",
    label: "Trip cost",
    title: "The fare barely moves. The trip does.",
    blurb:
      "Your ticket against everything else you pay — parking, drop-off, food and retail. The gap between the two lines is what a private operator adds.",
    chart: "waterline",
    unit: "$",
  },
  {
    id: "charges",
    label: "Charges",
    title: "Which charge grows, and how fast",
    blurb:
      "Each non-ticket charge on its own. Switch them on and off to see what the total depends on.",
    chart: "contribution",
    unit: "$",
  },
  {
    id: "jobs",
    label: "In your ticket",
    title: "Inside the ticket, year by year",
    blurb:
      "The four reported components of a Canadian fare, stacked. The Improvement Fee is 37 percent of large-airport revenue and taxes and fees are 25–35 percent of a ticket.",
    chart: "stacked",
    unit: "$",
  },
  {
    id: "revenue",
    label: "Where it goes",
    title: "A one-time windfall against a permanent extraction",
    blurb:
      "The authorities made no profit on $3.95 billion of 2022 revenue. A private operator has to find 15 to 20 percent more, every year.",
    chart: "contribution",
    unit: "$",
  },
  {
    id: "record",
    label: "The record",
    title: "Five countries, three decades, one direction",
    blurb:
      "Every measured outcome article.md reports, with the 2023 study's benefits included rather than buried.",
    chart: "contribution",
    unit: "$",
  },
];

/** Values drawn as the axis sparkline, one per view. */
export function axisValues(view: ViewId, input: TripInput | null, ticket: number): number[] {
  if (!input) {
    // Without answers, the axis still has to mean something: use the national arc.
    return Array.from({ length: HORIZON + 1 }, (_, year) => {
      const growth = Math.pow(1.055, year);
      const aero = Math.pow(1.6, Math.min(year, 9) / 9);
      return ticket * growth * aero * 0.35;
    });
  }
  const rows = seriesFor(input, HORIZON);
  switch (view) {
    case "charges":
      return rows.map((row) => row.extrasTotal);
    case "jobs":
      return rows.map((row) => row.ticketTotal);
    case "revenue":
      return rows.map((row, index) =>
        Array.from({ length: index + 1 }, (_, t) => Math.pow(1.03, t) * 3.95 * 0.175 * 1000).reduce(
          (sum, value) => sum + value,
          0,
        ),
      );
    case "record":
      return rows.map((row) => (row.tripTotal - row.ticketTotal) / row.tripTotal);
    default:
      return rows.map((row) => row.tripTotal);
  }
}

/* ------------------------------------------------------------------ *
 * The left-hand information column
 * ------------------------------------------------------------------ */

export function InfoPanel({
  view,
  setView,
  enabled,
  toggle,
}: {
  view: ViewId;
  setView: (view: ViewId) => void;
  enabled: string[];
  toggle: (key: string) => void;
}) {
  const trip = useTrip();
  const input: TripInput | null =
    trip.hasAirport && trip.airport
      ? {
          airport: trip.airport,
          ticket: trip.ticket,
          days: trip.days,
          travellers: trip.travellers,
          dropOffMinutes: trip.dropOffMinutes,
        }
      : null;

  const today = input ? costsFor(input, 0) : null;
  const now = input ? costsFor(input, trip.year) : null;
  const active = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  return (
    <div className="flex flex-col gap-4">
      {/* View switcher */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            aria-pressed={view === item.id}
            className={[
              "cursor-pointer border-b-2 pb-0.5 font-sans text-[0.8rem] transition",
              view === item.id
                ? "border-ink font-bold text-ink"
                : "border-transparent text-ink-4 hover:text-ink",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="font-serif text-[1.4rem] font-bold leading-tight">{active.title}</h2>
        <p className="mt-2 font-sans text-[0.82rem] leading-relaxed text-ink-3">{active.blurb}</p>
      </div>

      {/* Headline figures for this year */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-rule py-4">
        {view === "record" ? (
          <>
            <Metric value="101st/116" label="Canada's rank for air-travel affordability" tone="red" />
            <Metric value="40%" label="Of Sydney's workforce cut after protections expired" tone="red" />
            <Metric value="+60%" label="Perth's airline revenue per passenger, one decade" />
            <Metric value="+$20" label="Fees per passenger, 2023 study — with 50% fewer cancellations" tone="green" />
          </>
        ) : view === "revenue" ? (
          <>
            <Metric value="$3.95B" label="2022 revenue, with no profit at all" />
            <Metric value="$525M" label="Annual rent returned to Ottawa" />
            <Metric
              value={`+$${Math.round(3.95 * Math.pow(1.03, trip.year) * 0.175 * 1000).toLocaleString()}M`}
              label={`Revenue investors need in ${ANNOUNCEMENT_YEAR + trip.year}`}
              tone="red"
            />
            <Metric
              value={`$${Math.round(
                Array.from({ length: trip.year + 1 }, (_, t) => Math.pow(1.03, t) * 3.95 * 0.175 * 1000).reduce(
                  (sum, value) => sum + value,
                  0,
                ),
              ).toLocaleString()}M`}
              label="Extracted since signing"
              tone="red"
            />
          </>
        ) : !input || !today || !now ? (
          <>
            <Metric value="101st/116" label="Canada's affordability rank today" tone="red" />
            <Metric value="25–35%" label="Of a Canadian ticket is taxes and fees" />
            <Metric value="37%" label="Of large-airport revenue is the Improvement Fee" />
            <Metric value="50–99 yrs" label="Length of the concessions on offer" />
          </>
        ) : view === "charges" ? (
          <>
            <Metric value={cad(now.parking)} label="Parking this year" tone="red" />
            <Metric value={now.dropOff > 0 ? cad(now.dropOff) : "Free"} label="Kerbside drop-off" />
            <Metric value={cad(now.food)} label="Food and retail" />
            <Metric
              value={`+${cad(now.extrasTotal - today.extrasTotal)}`}
              label="Added since signing"
              tone="red"
            />
          </>
        ) : view === "jobs" ? (
          <>
            <Metric value={cad(now.ticketTotal)} label={`Your ticket in ${now.calendar}`} />
            <Metric
              value={`+${cad(now.ticketTotal - today.ticketTotal)}`}
              label="Added to the fare"
              tone="red"
            />
            <Metric value={cad(now.aif)} label="Improvement Fee" />
            <Metric value={cad(now.taxes)} label={`Taxes and fees in ${now.calendar}`} />
          </>
        ) : (
          <>
            <Metric value={cad(now.tripTotal)} label={`Whole trip in ${now.calendar}`} tone="red" />
            <Metric
              value={cad(today.tripTotal)}
              label={`The same trip at signing, ${today.calendar}`}
              tone="green"
            />
            <Metric
              value={`+${cad(now.tripTotal - today.tripTotal)}`}
              label="Added by the concession"
              tone="red"
            />
            <Metric
              value={`${(((now.tripTotal - today.tripTotal) / today.tripTotal) * 100).toFixed(0)}%`}
              label="Above the current model"
              tone="red"
            />
          </>
        )}
      </div>

      {/* Component switches — only meaningful where components exist */}
      {input && (view === "cost" || view === "charges") ? (
        <div>
          <p className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.09em] text-ink-4">
            Switch a charge on or off
          </p>
          <ul className="mt-2 space-y-1.5">
            {(["parking", "drop", "food"] as const).map((key) => {
              const on = enabled.includes(key);
              const value =
                key === "parking" ? now!.parking : key === "drop" ? now!.dropOff : now!.food;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={on}
                    className="flex w-full cursor-pointer items-center gap-2.5 py-1 text-left transition hover:bg-cream"
                  >
                    <span
                      className="h-3 w-3 shrink-0 border"
                      style={{
                        background: on ? SERIES_COLOURS[key] : "transparent",
                        borderColor: on ? SERIES_COLOURS[key] : "#767676",
                      }}
                    />
                    <span
                      className={[
                        "flex-1 font-sans text-[0.82rem]",
                        on ? "text-ink" : "text-ink-4 line-through",
                      ].join(" ")}
                    >
                      {SERIES_LABELS[key]}
                    </span>
                    <span className="font-sans text-[0.82rem] font-semibold tabular">
                      {value > 0 ? cad(value) : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {input && view === "cost" ? (
        <div className="flex items-center gap-4 border-t border-rule pt-3">
          <span className="flex items-center gap-2 font-sans text-[0.76rem] text-ink-3">
            <span className="h-0.5 w-5 bg-data-d" /> Ticket
          </span>
          <span className="flex items-center gap-2 font-sans text-[0.76rem] text-ink-3">
            <span className="h-0.5 w-5 bg-data-a" /> Whole trip
          </span>
        </div>
      ) : null}

      {/* Small multiples for the record view */}
      {view === "record" ? <RecordList /> : null}

      {/* Airport exposure, shown alongside the jobs-relevant views */}
      {input && view === "jobs" ? <AirportTable /> : null}

      {/* Provenance */}
      <p className="mt-auto border-t border-rule pt-3 font-sans text-[0.7rem] leading-relaxed text-ink-4">
        {view === "cost" || view === "charges" ? (
          <>
            Modelled from reported anchors: Perth +60 percent per passenger over a decade, UK
            parking at £98 a day, £28 for 30 minutes at Stansted, and the CCPA&rsquo;s warning on
            retail rents. <Cite id={14} />
            <Cite id={13} />
            <Cite id={1} />
          </>
        ) : view === "revenue" ? (
          <>
            Reported: $3.95 billion of 2022 revenue, $525 million of annual rent, a 15–20 percent
            investor revenue requirement, and Macquarie returns above 13 percent.{" "}
            <Cite id={1} />
            <Cite id={14} />
          </>
        ) : (
          <>
            Reported figures from article.md, including the 2023 University of Alberta study and
            the ACCC&rsquo;s service-quality monitoring. <Cite id={14} />
            <Cite id={4} />
          </>
        )}
      </p>
    </div>
  );
}

function Metric({
  value,
  label,
  tone = "ink",
}: {
  value: string;
  label: string;
  tone?: "ink" | "red" | "green";
}) {
  return (
    <div>
      <p
        className={[
          "font-serif text-[1.5rem] font-bold leading-none tabular",
          tone === "red" ? "text-data-a" : tone === "green" ? "text-data-d" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-1 font-sans text-[0.7rem] leading-snug text-ink-4">{label}</p>
    </div>
  );
}

function RecordList() {
  return (
    <ul className="space-y-1.5 border-t border-rule pt-3">
      {PRECEDENTS.slice(0, 6).map((precedent) => (
        <li
          key={`${precedent.country}-${precedent.asset}-${precedent.effect}`}
          className="flex items-baseline gap-3"
        >
          <span className="flex-1 font-sans text-[0.76rem] leading-snug text-ink-3">
            {precedent.country} · {precedent.asset}
          </span>
          <span
            className={[
              "font-sans text-[0.78rem] font-bold tabular",
              precedent.direction === "benefit" ? "text-data-d" : "text-data-a",
            ].join(" ")}
          >
            {precedent.amount.toLocaleString()} {precedent.unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AirportTable() {
  const inScope = AIRPORTS.filter((airport) => airport.inScope);
  return (
    <ul className="space-y-1.5 border-t border-rule pt-3">
      <li className="flex items-baseline justify-between font-sans text-[0.66rem] uppercase tracking-wide text-ink-4">
        <span>Airport</span>
        <span>Staff → cut</span>
      </li>
      {inScope.map((airport) => {
        const { staff, cut } = staffEstimate(airport);
        return (
          <li key={airport.code} className="flex items-baseline justify-between">
            <span className="font-mono text-[0.75rem] font-semibold">
              {airport.code}
              <span className="ml-2 font-sans font-normal text-ink-4">
                {staff.toLocaleString()}
              </span>
            </span>
            <span className="font-sans text-[0.78rem] font-bold tabular text-data-a">
              −{cut.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
