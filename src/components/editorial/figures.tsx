"use client";

import { useState } from "react";
import { Cite } from "./Cite";
import { Figure, StatCallout, StatRow } from "./Shell";
import { useTrip } from "./ArticleContext";
import { LineChart } from "@/components/charts/LineChart";
import {
  ANNOUNCEMENT_YEAR,
  HORIZON,
  SYDNEY_CUT,
  cad,
  costsFor,
  seriesFor,
  staffEstimate,
} from "./model";
import { AIRPORTS, PRECEDENTS, PROMISES } from "@/lib/sourced";

const DATA_RED = "#d0021b";
const DATA_GREY = "#b8b8b8";
const DATA_GREEN = "#0f7b3e";

/* ------------------------------------------------------------------ *
 * Chapter 1 — the labour lever
 * ------------------------------------------------------------------ */

export function WorkforceFigure() {
  const inScope = AIRPORTS.filter((airport) => airport.inScope);
  const max = Math.max(...inScope.map((airport) => staffEstimate(airport).staff));
  const total = inScope.reduce((sum, airport) => sum + staffEstimate(airport).staff, 0);
  const cut = inScope.reduce((sum, airport) => sum + staffEstimate(airport).cut, 0);

  return (
    <Figure
      title="Cuts at Sydney's rate would remove about 3,400 jobs from the four airports"
      deck="Sydney's new owners cut 40 percent of the workforce once post-sale protections expired. Applied to the airports in scope at typical staffing density, that is the scale of the exposure."
      aside="Modelled"
      source={
        <>
          Staffing modelled at 62 jobs per million annual passengers. The 40 percent cut is the
          figure reported for Sydney Airport. <Cite id={14} />
        </>
      }
    >
      <div className="space-y-4">
        {inScope.map((airport) => {
          const { staff, cut: airportCut } = staffEstimate(airport);
          return (
            <div key={airport.code} className="grid grid-cols-[3.5rem_1fr] items-center gap-4 sm:grid-cols-[4rem_1fr_9rem]">
              <span className="font-mono text-[0.85rem] font-bold">{airport.code}</span>
              <div className="relative h-6 bg-cream">
                <div
                  className="absolute inset-y-0 left-0 bg-ink-4"
                  style={{ width: `${(staff / max) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-data-a"
                  style={{ width: `${(airportCut / max) * 100}%` }}
                />
              </div>
              <span className="col-start-2 font-sans text-[0.76rem] tabular text-ink-3 sm:col-start-3 sm:text-right">
                {staff.toLocaleString()} jobs ·{" "}
                <span className="font-semibold text-data-a">
                  −{airportCut.toLocaleString()}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-rule pt-3">
        <span className="flex items-center gap-2 font-sans text-[0.76rem] text-ink-3">
          <span className="h-3 w-4 bg-ink-4" /> workforce today
        </span>
        <span className="flex items-center gap-2 font-sans text-[0.76rem] text-ink-3">
          <span className="h-3 w-4 bg-data-a" /> in scope for a Sydney-scale cut
        </span>
        <span className="ml-auto font-sans text-[0.8rem] font-semibold tabular">
          {total.toLocaleString()} → {cut.toLocaleString()} at risk
        </span>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 2 — the ticket, and the whole trip
 * ------------------------------------------------------------------ */

export function TicketFigure() {
  const trip = useTrip();

  if (!trip.hasAirport || !trip.airport) {
    return (
      <Figure
        title="Your ticket against your whole trip"
        deck="Answer the two questions above to see this chart drawn with your airport and your fare."
        source={<>Anchored to the reported Perth (+60% per passenger over a decade) and UK parking and drop-off charges. <Cite id={14} /><Cite id={13} /></>}
      >
        <div className="flex h-40 items-center justify-center border border-dashed border-rule">
          <p className="font-sans text-[0.85rem] text-ink-4">
            Waiting for your answers…
          </p>
        </div>
      </Figure>
    );
  }

  const input = {
    airport: trip.airport,
    ticket: trip.ticket,
    days: trip.days,
    travellers: trip.travellers,
    dropOffMinutes: trip.dropOffMinutes,
  };
  const today = costsFor(input, 0);
  const now = costsFor(input, trip.year);
  const series = seriesFor(input, HORIZON);

  const parts = [
    { id: "airfare", label: "Airline fare", value: now.airfare, colour: DATA_GREY },
    { id: "aif", label: "Airport Improvement Fee", value: now.aif, colour: DATA_RED },
    { id: "aero", label: "Aeronautical charges", value: now.aeronautical, colour: "#e8828f" },
    { id: "taxes", label: "Taxes and fees", value: now.taxes, colour: "#555555" },
  ];
  const partsTotal = parts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div className="space-y-10">
      <Figure
        title={`The fare barely moves. Everything around it does.`}
        deck={`Your ${cad(trip.ticket)} fare at ${trip.airport.code} becomes a ${cad(now.tripTotal)} trip by ${now.calendar}. The green line is the ticket; the red line is everything you pay between the kerb and the gate.`}
        aside={`${trip.airport.code} · ${trip.airport.city}`}
        source={
          <>
            Green: airfare, Improvement Fee, aeronautical charges and taxes. Red adds parking,
            drop-off, food and retail. Aeronautical charges rise at the rate that reproduces
            Perth&rsquo;s reported +60 percent per passenger over a decade; non-ticket charges reach
            the levels documented in the UK. <Cite id={14} /><Cite id={13} />
          </>
        }
      >
        <LineChart
          ariaLabel="Ticket cost against total trip cost as the concession matures"
          height={300}
          hover={trip.year}
          onHover={(value) => {
            if (value !== null) trip.setYear(Math.min(HORIZON, Math.max(0, value)));
          }}
          formatX={(value) => String(ANNOUNCEMENT_YEAR + value)}
          formatY={(value) => `$${Math.round(value)}`}
          markers={[
            { x: 2, label: "protections end", color: "#767676" },
            { x: 10, label: "nickel-and-dime", color: "#767676" },
          ]}
          series={[
            {
              id: "ticket",
              label: "The ticket alone",
              color: DATA_GREEN,
              dashed: true,
              points: series.map((row) => ({ x: row.year, y: row.ticketTotal })),
            },
            {
              id: "trip",
              label: "The whole trip",
              color: DATA_RED,
              area: true,
              points: series.map((row) => ({ x: row.year, y: row.tripTotal })),
            },
          ]}
        />
      </Figure>

      <StatRow>
        <StatCallout
          value={cad(today.tripTotal)}
          label="Your trip today"
          detail={`${cad(trip.ticket)} fare, everything included`}
        />
        <StatCallout
          value={cad(now.tripTotal)}
          label={`Your trip in ${now.calendar}`}
          detail={trip.year === 0 ? "Move the year slider to see it change" : `Year ${trip.year} of the concession`}
        />
        <StatCallout
          tone="red"
          value={`+${cad(now.tripTotal - today.tripTotal)}`}
          label="Added by the concession"
          detail={`${(((now.tripTotal - today.tripTotal) / today.tripTotal) * 100).toFixed(0)} percent more than today`}
        />
      </StatRow>

      <Figure
        title={`Inside your ${cad(now.ticketTotal)} ticket`}
        deck="Reported figures, not projections: the Improvement Fee is $30–$40 a ticket and makes up 37 percent of large-airport revenue. Taxes and fees are 25–35 percent of a Canadian ticket and are set at 28 percent here."
        aside="Per traveller"
        source={
          <>
            Improvement Fee range and revenue share from the Canadian Centre for Policy
            Alternatives; tax and fee share and the affordability ranking from the Canadian Labour
            Congress. <Cite id={1} /><Cite id={14} />
          </>
        }
      >
        <div className="flex h-9 w-full overflow-hidden">
          {parts.map((part) => (
            <div
              key={part.id}
              title={`${part.label}: ${cad(part.value)}`}
              style={{ width: `${(part.value / partsTotal) * 100}%`, background: part.colour }}
              className="transition-all duration-500"
            />
          ))}
        </div>
        <ul className="mt-4 grid gap-x-10 gap-y-2 sm:grid-cols-2">
          {parts.map((part) => (
            <li key={`legend-${part.id}`} className="flex items-baseline gap-3">
              <span className="h-2.5 w-2.5 shrink-0" style={{ background: part.colour }} />
              <span className="flex-1 font-sans text-[0.82rem] text-ink-2">{part.label}</span>
              <span className="font-sans text-[0.82rem] font-semibold tabular">{cad(part.value)}</span>
              <span className="w-12 text-right font-sans text-[0.74rem] tabular text-ink-4">
                {((part.value / partsTotal) * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </Figure>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 3 — where the charges land, in travel order
 * ------------------------------------------------------------------ */

export function JourneyFigure() {
  const trip = useTrip();
  const [openId, setOpenId] = useState<string | null>("food");

  if (!trip.hasAirport || !trip.airport) return null;

  const input = {
    airport: trip.airport,
    ticket: trip.ticket,
    days: trip.days,
    travellers: trip.travellers,
    dropOffMinutes: trip.dropOffMinutes,
  };
  const today = costsFor(input, 0);
  const now = costsFor(input, trip.year);

  const stages = [
    {
      id: "drop",
      when: "Kerbside",
      title: "Drop-off charge",
      cost: now.dropOff,
      was: today.dropOff,
      detail:
        trip.dropOffMinutes > trip.airport.freeDropOffMinutes
          ? `${trip.dropOffMinutes} minutes at the kerb exceeds the ${trip.airport.freeDropOffMinutes} free minutes ${trip.airport.code} allows today. British airports charge up to $24 for exactly this.`
          : `${trip.airport.code} allows ${trip.airport.freeDropOffMinutes} free minutes, so your ${trip.dropOffMinutes}-minute stop is free. British airports charge up to $24 for the same stop.`,
      refs: [14],
      status: "modelled",
    },
    {
      id: "security",
      when: "Security",
      title: "Queue lengths and safety",
      cost: 0,
      was: 0,
      detail:
        "The charge that never appears on a receipt. The CCPA warns that cutting staff and staff pay “isn't only about comfort in an airport, it can also be about traveller safety.”",
      refs: [1],
      status: "warning",
    },
    {
      id: "food",
      when: "Concourse",
      title: "Food and retail",
      cost: now.food,
      was: today.food,
      detail:
        "Rents rise, so the sandwich does. Modelled from 6 percent of your ticket today to the 19 percent share UK travellers pay once retail is optimised for profit.",
      refs: [1, 13],
      status: "modelled",
    },
    {
      id: "parking",
      when: "On return",
      title: `Parking, ${trip.days} ${trip.days === 1 ? "day" : "days"}`,
      cost: now.parking,
      was: today.parking,
      detail: `${cad(trip.airport.parkingPerDay)} a day at ${trip.airport.code} today, moving toward Heathrow-scale pricing of $59 a day. Five English airports collected £751 million in parking fees in 2025 alone.`,
      refs: [13],
      status: "modelled",
    },
  ];

  return (
    <Figure
      title="The charges, in the order you meet them"
      deck="Privatisation does not raise one price. It raises a series of small ones, each of which is defensible on its own."
      aside="Tap a row"
      source={
        <>
          Drop-off and parking levels from the UK evidence; the safety warning from the Canadian
          Centre for Policy Alternatives. <Cite id={13} /><Cite id={1} />
        </>
      }
    >
      <ol className="divide-y divide-rule border-y border-rule">
        {stages.map((stage) => {
          const open = openId === stage.id;
          const added = stage.cost - stage.was;
          return (
            <li key={stage.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : stage.id)}
                aria-expanded={open}
                className="grid w-full cursor-pointer grid-cols-[5.5rem_1fr_auto] items-baseline gap-4 py-3 text-left transition hover:bg-cream sm:grid-cols-[7rem_1fr_8rem_5rem]"
              >
                <span className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ink-4">
                  {stage.when}
                </span>
                <span className="font-sans text-[0.9rem] font-medium">{stage.title}</span>
                <span className="hidden font-sans text-[0.78rem] tabular text-ink-4 sm:block sm:text-right">
                  {stage.was > 0 ? `was ${cad(stage.was)}` : "no charge"}
                </span>
                <span
                  className={[
                    "text-right font-sans text-[0.9rem] font-semibold tabular",
                    added > 1 ? "text-data-a" : "text-ink",
                  ].join(" ")}
                >
                  {stage.cost > 0 ? cad(stage.cost) : "—"}
                </span>
              </button>
              {open ? (
                <div className="bg-cream px-4 py-3.5">
                  <p className="max-w-[40rem] font-serif text-[0.98rem] leading-relaxed text-ink-2">
                    {stage.detail}
                  </p>
                  <p className="mt-2 flex items-center gap-2 font-sans text-[0.72rem] uppercase tracking-wide text-ink-4">
                    {stage.status === "warning" ? "Not priced" : stage.status}
                    <span className="flex gap-0.5 normal-case">
                      {stage.refs.map((id) => (
                        <Cite key={`${stage.id}-${id}`} id={id} />
                      ))}
                    </span>
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 font-sans text-[0.86rem] text-ink-2">
        Non-ticket charges on your trip:{" "}
        <span className="font-semibold tabular">{cad(now.extrasTotal)}</span> in {now.calendar},
        against <span className="font-semibold tabular">{cad(today.extrasTotal)}</span> today.
      </p>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 4 — who gets the money
 * ------------------------------------------------------------------ */

export function RevenueFigure() {
  const [year, setYear] = useState(10);
  const growth = Math.pow(1.03, year);
  const revenueB = 3.95 * growth;
  const requirement = 0.175;
  const perYear = revenueB * requirement * 1000;
  const cumulative = Array.from({ length: year + 1 }, (_, t) => 3.95 * Math.pow(1.03, t) * requirement * 1000).reduce(
    (sum, value) => sum + value,
    0,
  );

  return (
    <Figure
      title="A one-time windfall against a permanent extraction"
      deck="Airport authorities made no profit at all off the $3.95 billion they took in during 2022 — expenses and revenues were effectively identical. A private operator has to do the opposite."
      aside="Modelled"
      source={
        <>
          Revenue base and the $525 million annual rent from the reporting. The 15–20 percent
          investor return is the Canadian Labour Congress estimate; the 37 percent Improvement Fee
          share is the CCPA&rsquo;s. <Cite id={1} /><Cite id={14} />
        </>
      }
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="border-t-2 border-ink pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ink-4">
            Not-for-profit authority
          </p>
          <p className="mt-2 font-serif text-[2.4rem] font-bold leading-none tabular">
            $3.95B
          </p>
          <p className="mt-2 font-sans text-[0.84rem] leading-relaxed text-ink-3">
            Revenue in 2022. Surpluses go back into the airports, and about{" "}
            <strong className="font-semibold">$525 million a year</strong> returns to the federal
            government as rent.
          </p>
        </div>

        <div className="border-t-2 border-data-a pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-data-a">
            Under a private concession
          </p>
          <p className="mt-2 font-serif text-[2.4rem] font-bold leading-none tabular text-data-a">
            +${(revenueB * requirement).toFixed(2)}B
          </p>
          <p className="mt-2 font-sans text-[0.84rem] leading-relaxed text-ink-3">
            Extra revenue needed every year, at 17.5 percent of revenue — the midpoint of the
            15–20 percent band. That is{" "}
            <strong className="font-semibold">${Math.round(perYear).toLocaleString()} million</strong>{" "}
            a year, every year, found from airlines, retailers or passengers.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <label htmlFor="revenue-year" className="font-sans text-[0.86rem] font-semibold">
            Concession year
          </label>
          <span className="font-sans text-[0.8rem] tabular text-ink-3">
            Year {year} · {ANNOUNCEMENT_YEAR + year}
          </span>
        </div>
        <input
          id="revenue-year"
          type="range"
          min={1}
          max={25}
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="mt-2 h-1 w-full cursor-pointer appearance-none bg-rule [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
        />
        <div className="mt-4 grid grid-cols-2 gap-6 border-t border-rule pt-3">
          <p className="font-sans text-[0.84rem] text-ink-3">
            This year{" "}
            <span className="ml-1 font-serif text-[1.3rem] font-bold tabular text-ink">
              ${Math.round(perYear).toLocaleString()}M
            </span>
          </p>
          <p className="font-sans text-[0.84rem] text-ink-3">
            Since signing{" "}
            <span className="ml-1 font-serif text-[1.3rem] font-bold tabular text-data-a">
              ${Math.round(cumulative).toLocaleString()}M
            </span>
          </p>
        </div>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 5 — service quality
 * ------------------------------------------------------------------ */

export function ServiceFigure() {
  return (
    <Figure
      title="The study that cuts both ways"
      deck="A 2023 University of Alberta study is the strongest evidence in the article for privatisation. It found real improvements — and it found the bill."
      aside="Both effects, same study"
      source={
        <>
          University of Alberta study as reported, and the Canadian Labour Congress
          review. <Cite id={14} />
        </>
      }
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="border-t-2 border-data-green pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-data-green">
            What improved
          </p>
          <p className="mt-2 font-serif text-[2.6rem] font-bold leading-none tabular text-data-green">
            −50%
          </p>
          <p className="mt-2 font-sans text-[0.86rem] leading-relaxed text-ink-2">
            Flight cancellations under private equity ownership, alongside higher customer
            satisfaction and better terminals.
          </p>
        </div>
        <div className="border-t-2 border-data-a pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-data-a">
            What it cost
          </p>
          <p className="mt-2 font-serif text-[2.6rem] font-bold leading-none tabular text-data-a">
            +$20
          </p>
          <p className="mt-2 font-sans text-[0.86rem] leading-relaxed text-ink-2">
            More in fees per passenger, confirmed by the same research. The study did not show one
            effect without the other.
          </p>
        </div>
      </div>

      <div className="mt-7 border-t border-rule pt-4">
        <p className="max-w-[42rem] font-serif text-[1.05rem] leading-relaxed text-ink-2">
          The Australian Competition and Consumer Commission put the risk plainly: under price-cap
          regulation there may be incentives to increase profits by reducing costs, and
          &ldquo;in some cases such cost cutting may lead to a lower quality of service.&rdquo; The
          commission built service-quality monitoring specifically to detect it.{" "}
          <Cite id={4} /><Cite id={11} />
        </p>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 6 — the lock-in
 * ------------------------------------------------------------------ */

const TERMS = [50, 65, 75, 99];

export function LockInFigure() {
  const [term, setTerm] = useState(75);

  return (
    <Figure
      title="A contract longer than most careers, mortgages and governments"
      deck="The concessions described run 50 to 99 years. Once signed, buying the contract back is prohibitively expensive."
      aside="Reported term"
      source={
        <>
          Concession length and the P3 warning from the Canadian Centre for Policy Alternatives.{" "}
          <Cite id={1} />
        </>
      }
    >
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {TERMS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTerm(option)}
            aria-pressed={term === option}
            className={[
              "cursor-pointer border-b-2 pb-0.5 font-sans text-[0.9rem] transition",
              term === option
                ? "border-ink font-bold text-ink"
                : "border-transparent text-ink-4 hover:text-ink",
            ].join(" ")}
          >
            {option} years
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div className="relative h-8 bg-cream">
          <div
            className="absolute inset-y-0 left-0 bg-data-a transition-all duration-500"
            style={{ width: `${(term / 99) * 100}%` }}
          />
          <div
            className="absolute inset-y-0 border-l-2 border-dashed border-ink"
            style={{ left: `${(HORIZON / 99) * 100}%` }}
            title="Where this article's 20-year projection stops"
          />
        </div>
        <div className="mt-2 flex justify-between font-sans text-[0.72rem] tabular text-ink-4">
          <span>{ANNOUNCEMENT_YEAR} signed</span>
          <span className="hidden sm:inline">
            {ANNOUNCEMENT_YEAR + HORIZON} this article&rsquo;s horizon
          </span>
          <span>{ANNOUNCEMENT_YEAR + 99}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-4 border-t border-rule pt-4 sm:grid-cols-3">
        <p className="font-sans text-[0.84rem] text-ink-3">
          Concession ends{" "}
          <span className="ml-1 font-serif text-[1.2rem] font-bold tabular text-ink">
            {ANNOUNCEMENT_YEAR + term}
          </span>
        </p>
        <p className="font-sans text-[0.84rem] text-ink-3">
          Evidence covers{" "}
          <span className="ml-1 font-serif text-[1.2rem] font-bold tabular text-ink">
            {((HORIZON / term) * 100).toFixed(0)}%
          </span>{" "}
          of the term
        </p>
        <p className="font-sans text-[0.84rem] text-ink-3">
          Negotiation takes{" "}
          <span className="ml-1 font-serif text-[1.2rem] font-bold tabular text-ink">6–9</span>{" "}
          months
        </p>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * The evidence — international record
 * ------------------------------------------------------------------ */

export function EvidenceFigure() {
  const [direction, setDirection] = useState<"all" | "cost" | "benefit">("all");
  const rows = PRECEDENTS.filter((p) => direction === "all" || p.direction === direction);

  return (
    <Figure
      title="Five countries, three decades, one direction"
      deck="A consistent pattern across Australia, New Zealand, Portugal, the United Kingdom and the United States: higher charges, pressure on workers and the loss of long-term public value."
      aside={
        <span className="flex gap-3">
          {(["all", "cost", "benefit"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDirection(option)}
              className={[
                "cursor-pointer font-sans text-[0.72rem] uppercase tracking-wide transition",
                direction === option ? "font-bold text-ink" : "text-ink-4 hover:text-ink",
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </span>
      }
      source={
        <>
          All figures as reported. <Cite id={14} /><Cite id={13} /><Cite id={5} />
        </>
      }
    >
      <ul className="divide-y divide-rule border-y border-rule">
        {rows.map((row) => (
          <li
            key={`${row.country}-${row.asset}-${row.effect}`}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-3 sm:grid-cols-[11rem_1fr_8rem]"
          >
            <span className="font-sans text-[0.84rem] font-semibold">
              {row.country}
              <span className="mt-0.5 block font-normal text-[0.72rem] text-ink-4">{row.asset}</span>
            </span>
            <span className="col-span-2 font-sans text-[0.84rem] leading-relaxed text-ink-2 sm:col-span-1">
              {row.effect}
            </span>
            <span
              className={[
                "text-right font-sans text-[0.88rem] font-bold tabular",
                row.direction === "benefit" ? "text-data-green" : "text-data-a",
              ].join(" ")}
            >
              {row.amount.toLocaleString()} {row.unit}
            </span>
          </li>
        ))}
      </ul>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * The promises board
 * ------------------------------------------------------------------ */

const PROMISE_LABEL = {
  supported: { text: "Backed by evidence", colour: "text-data-green" },
  unproven: { text: "Unproven", colour: "text-ink-4" },
  "at-risk": { text: "At risk", colour: "text-data-a" },
} as const;

export function PromisesFigure() {
  const [openId, setOpenId] = useState<string | null>(null);
  const counts = {
    supported: PROMISES.filter((p) => p.status === "supported").length,
    unproven: PROMISES.filter((p) => p.status === "unproven").length,
    "at-risk": PROMISES.filter((p) => p.status === "at-risk").length,
  };

  return (
    <Figure
      title="Eight commitments, held against the record"
      deck={`${counts["at-risk"]} of the eight claims made for the deal have a documented failure mode in the record; ${counts.unproven} are unproven; ${counts.supported} are backed by evidence.`}
      aside="Tap a row"
      source={
        <>
          Statuses are this article&rsquo;s judgement, drawn from what the reporting shows about the
          same claims in Australia, the United Kingdom and Brazil.
        </>
      }
    >
      <ul className="divide-y divide-rule border-y border-rule">
        {PROMISES.map((promise) => {
          const open = openId === promise.id;
          const label = PROMISE_LABEL[promise.status];
          return (
            <li key={promise.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : promise.id)}
                aria-expanded={open}
                className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-3 text-left transition hover:bg-cream sm:grid-cols-[1fr_10rem]"
              >
                <span className="font-sans text-[0.88rem] leading-snug text-ink">
                  {promise.claim}
                  <span className="mt-0.5 block font-normal text-[0.74rem] text-ink-4">
                    — {promise.by}
                  </span>
                </span>
                <span
                  className={`text-left font-sans text-[0.72rem] font-bold uppercase tracking-wide sm:text-right ${label.colour}`}
                >
                  {label.text}
                </span>
              </button>
              {open ? (
                <div className="bg-cream px-4 py-3">
                  <p className="max-w-[40rem] font-serif text-[0.96rem] leading-relaxed text-ink-2">
                    {promise.reality}
                  </p>
                  <span className="mt-1.5 flex gap-0.5">
                    {promise.refs.map((id) => (
                      <Cite key={`${promise.id}-${id}`} id={id} />
                    ))}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Figure>
  );
}

