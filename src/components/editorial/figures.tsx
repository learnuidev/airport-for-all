"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cite } from "./Cite";
import { Figure, StatCallout, StatRow } from "./Shell";
import { useTrip } from "./ArticleContext";
import { LineChart } from "@/components/charts/LineChart";
import {
  ANNOUNCEMENT_YEAR,
  localeTag,
  money as moneyFor,
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
  const { t } = useTranslation();
  const inScope = AIRPORTS.filter((airport) => airport.inScope);
  const max = Math.max(...inScope.map((airport) => staffEstimate(airport).staff));
  const total = inScope.reduce((sum, airport) => sum + staffEstimate(airport).staff, 0);
  const cut = inScope.reduce((sum, airport) => sum + staffEstimate(airport).cut, 0);

  return (
    <Figure
      title={t("figures.workforce.title")}
      deck={t("figures.workforce.deck")}
      aside={t("figures.modelled")}
      source={
        <>
          {t("figures.workforce.source")} <Cite id={14} />
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
          <span className="h-3 w-4 bg-ink-4" /> {t("figures.workforce.legendToday")}
        </span>
        <span className="flex items-center gap-2 font-sans text-[0.76rem] text-ink-3">
          <span className="h-3 w-4 bg-data-a" /> {t("figures.workforce.legendCut")}
        </span>
        <span className="ml-auto font-sans text-[0.8rem] font-semibold tabular">
          {total.toLocaleString()} → {cut.toLocaleString()} {t("figures.workforce.atRisk")}
        </span>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter 2 — the ticket, and the whole trip
 * ------------------------------------------------------------------ */

export function TicketFigure() {
  const { t } = useTranslation();
  const trip = useTrip();

  if (!trip.hasAirport || !trip.airport) {
    return (
      <Figure
        title={t("figures.ticketTitle")}
        deck={t("figures.ticketEmpty")}
        source={<>{t("figures.precedentNote")} <Cite id={14} /><Cite id={13} /></>}
      >
        <div className="flex h-40 items-center justify-center border border-dashed border-rule">
          <p className="font-sans text-[0.85rem] text-ink-4">
            {t("figures.waiting")}
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
    { id: "airfare", label: t("figures.ticketParts.airfare"), value: now.airfare, colour: DATA_GREY },
    { id: "aif", label: t("figures.ticketParts.aif"), value: now.aif, colour: DATA_RED },
    { id: "aero", label: t("figures.ticketParts.aeronautical"), value: now.aeronautical, colour: "#e8828f" },
    { id: "taxes", label: t("figures.ticketParts.taxes"), value: now.taxes, colour: "#555555" },
  ];
  const partsTotal = parts.reduce((sum, part) => sum + part.value, 0);

  return (
    <div className="space-y-10">
      <Figure
        title={t("figures.tripTitle")}
        deck={t("figures.tripDeck", {
          ticket: cad(trip.ticket),
          code: trip.airport.code,
          total: cad(now.tripTotal),
          calendar: now.calendar,
        })}
        aside={`${trip.airport.code} · ${trip.airport.city}`}
        source={
          <>
            {t("figures.tripSource")} <Cite id={14} /><Cite id={13} />
          </>
        }
      >
        <LineChart
          ariaLabel={t("figures.series.ticketAria")}
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
              label: t("figures.series.ticket"),
              color: DATA_GREEN,
              dashed: true,
              points: series.map((row) => ({ x: row.year, y: row.ticketTotal })),
            },
            {
              id: "trip",
              label: t("figures.series.trip"),
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
          label={t("figures.stats.yourTripToday")}
          detail={t("figures.stats.fareIncluded", { ticket: cad(trip.ticket) })}
        />
        <StatCallout
          value={cad(now.tripTotal)}
          label={t("figures.stats.yourTripIn", { calendar: now.calendar })}
          detail={
            trip.year === 0
              ? t("figures.stats.moveSlider")
              : t("figures.stats.yearOfConcession", { count: trip.year })
          }
        />
        <StatCallout
          tone="red"
          value={`+${cad(now.tripTotal - today.tripTotal)}`}
          label={t("figures.stats.addedByConcession")}
          detail={t("figures.stats.percentMore", {
            percent: (((now.tripTotal - today.tripTotal) / today.tripTotal) * 100).toFixed(0),
          })}
        />
      </StatRow>

      <Figure
        title={t("figures.insideTitle", { total: cad(now.ticketTotal) })}
        deck={t("figures.insideDeck")}
        aside={t("figures.perTraveller")}
        source={
          <>
            {t("figures.insideSource")} <Cite id={1} /><Cite id={14} />
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
  const { t } = useTranslation();
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
      when: t("figures.detail.kerbside"),
      title: t("figures.detail.dropTitle"),
      cost: now.dropOff,
      was: today.dropOff,
      detail:
        trip.dropOffMinutes > trip.airport.freeDropOffMinutes
          ? t("figures.detail.dropPaid", {
              minutes: trip.dropOffMinutes,
              free: trip.airport.freeDropOffMinutes,
              code: trip.airport.code,
            })
          : t("figures.detail.dropFree", {
              minutes: trip.dropOffMinutes,
              free: trip.airport.freeDropOffMinutes,
              code: trip.airport.code,
            }),
      refs: [14],
      status: "modelled",
    },
    {
      id: "security",
      when: t("figures.detail.security"),
      title: t("figures.detail.securityTitle"),
      cost: 0,
      was: 0,
      detail:
        t("figures.detail.securityBody"),
      refs: [1],
      status: "warning",
    },
    {
      id: "food",
      when: t("figures.detail.concourse"),
      title: t("figures.detail.foodTitle"),
      cost: now.food,
      was: today.food,
      detail:
        t("figures.detail.foodBody"),
      refs: [1, 13],
      status: "modelled",
    },
    {
      id: "parking",
      when: t("figures.detail.onReturn"),
      title: t("figures.detail.parkingTitle", {
        days: trip.days,
        unit: t(trip.days === 1 ? "figures.detail.day" : "figures.detail.days"),
      }),
      cost: now.parking,
      was: today.parking,
      detail: t("figures.detail.parkingBody", {
        price: cad(trip.airport.parkingPerDay),
        code: trip.airport.code,
      }),
      refs: [13],
      status: "modelled",
    },
  ];

  return (
    <Figure
      title={t("figures.journeyTitle")}
      deck={t("figures.journeyDeck")}
      aside={t("figures.tapRow")}
      source={
        <>
          {t("figures.journeySource")} <Cite id={13} /><Cite id={1} />
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
                    {stage.status === "warning" ? t("figures.detail.notPriced") : t(`figures.detail.${stage.status}`)}
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
  const { t, i18n } = useTranslation();
  /** Compact currency for the headline billions, e.g. $3.95B / 3,95 G$. */
  const compact = (value: number) =>
    new Intl.NumberFormat(localeTag(i18n.language), {
      style: "currency",
      currency: "CAD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  // The interpolated amount is formatted for the reading language, so French
  // reads "691 M$" and English "$691M" without a hardcoded symbol in JSX.
  const money = (value: number) => moneyFor(value, 0, localeTag(i18n.language));
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
      title={t("figures.revenueTitle")}
      deck={t("figures.revenueDeck")}
      aside={t("figures.modelled")}
      source={
        <>
          {t("figures.revenueSource")} <Cite id={1} /><Cite id={14} />
        </>
      }
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="border-t-2 border-ink pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ink-4">
            {t("figures.revenue.public")}
          </p>
          <p className="mt-2 font-serif text-[2.4rem] font-bold leading-none tabular">
            {compact(3.95e9)}
          </p>
          <p className="mt-2 font-sans text-[0.84rem] leading-relaxed text-ink-3">
            {t("figures.revenue.publicBodyA")}{" "}
            <strong className="font-semibold">{t("figures.revenue.publicBodyStrong")}</strong>{" "}
            {t("figures.revenue.publicBodyB")}
          </p>
        </div>

        <div className="border-t-2 border-data-a pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-data-a">
            {t("figures.revenue.private")}
          </p>
          <p className="mt-2 font-serif text-[2.4rem] font-bold leading-none tabular text-data-a">
            +{compact(revenueB * requirement * 1e9)}
          </p>
          <p className="mt-2 font-sans text-[0.84rem] leading-relaxed text-ink-3">
            {t("figures.revenue.privateBodyA")}{" "}
            <strong className="font-semibold">{money(perYear * 1e6)}</strong>{" "}
            {t("figures.revenue.privateBodyB")}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-baseline justify-between">
          <label htmlFor="revenue-year" className="font-sans text-[0.86rem] font-semibold">
            {t("controls.concessionYear")}
          </label>
          <span className="font-sans text-[0.8rem] tabular text-ink-3">
            {t("figures.yearOf", { year, calendar: ANNOUNCEMENT_YEAR + year })}
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
            {t("figures.thisYear")}{" "}
            <span className="ml-1 font-serif text-[1.3rem] font-bold tabular text-ink">
              ${Math.round(perYear).toLocaleString()}M
            </span>
          </p>
          <p className="font-sans text-[0.84rem] text-ink-3">
            {t("figures.sinceSigning")}{" "}
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
  const { t } = useTranslation();
  return (
    <Figure
      title={t("figures.serviceTitle")}
      deck={t("figures.serviceDeck")}
      aside={t("figures.bothEffects")}
      source={
        <>
          {t("figures.serviceSource")} <Cite id={14} />
        </>
      }
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div className="border-t-2 border-data-green pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-data-green">
            {t("figures.improved")}
          </p>
          <p className="mt-2 font-serif text-[2.6rem] font-bold leading-none tabular text-data-green">
            −50%
          </p>
          <p className="mt-2 font-sans text-[0.86rem] leading-relaxed text-ink-2">
            {t("figures.serviceImprovedBody")}
          </p>
        </div>
        <div className="border-t-2 border-data-a pt-3">
          <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-data-a">
            {t("figures.cost")}
          </p>
          <p className="mt-2 font-serif text-[2.6rem] font-bold leading-none tabular text-data-a">
            +$20
          </p>
          <p className="mt-2 font-sans text-[0.86rem] leading-relaxed text-ink-2">
            {t("figures.serviceCostBody")}
          </p>
        </div>
      </div>

      <div className="mt-7 border-t border-rule pt-4">
        <p className="max-w-[42rem] font-serif text-[1.05rem] leading-relaxed text-ink-2">
          {t("figures.serviceAccc")} <Cite id={4} /><Cite id={11} />
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
  const { t } = useTranslation();
  const [term, setTerm] = useState(75);

  return (
    <Figure
      title={t("figures.lockTitle")}
      deck={t("figures.lockDeck")}
      aside={t("figures.reportedTerm")}
      source={
        <>
          {t("figures.lockSource")} <Cite id={1} />
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
            {t("figures.yearsOption", { count: option })}
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
            title={t("figures.projectionStops")}
          />
        </div>
        <div className="mt-2 flex justify-between font-sans text-[0.72rem] tabular text-ink-4">
          <span>{t("figures.signedYear", { year: ANNOUNCEMENT_YEAR })}</span>
          <span className="hidden sm:inline">
            {t("figures.horizon", { year: ANNOUNCEMENT_YEAR + HORIZON })}
          </span>
          <span>{ANNOUNCEMENT_YEAR + 99}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-4 border-t border-rule pt-4 sm:grid-cols-3">
        <p className="font-sans text-[0.84rem] text-ink-3">
          {t("figures.concessionEnds")}{" "}
          <span className="ml-1 font-serif text-[1.2rem] font-bold tabular text-ink">
            {ANNOUNCEMENT_YEAR + term}
          </span>
        </p>
        <p className="font-sans text-[0.84rem] text-ink-3">
          {t("figures.evidenceCovers")}{" "}
          <span className="ml-1 font-serif text-[1.2rem] font-bold tabular text-ink">
            {((HORIZON / term) * 100).toFixed(0)}%
          </span>{" "}
          {t("figures.ofTerm")}
        </p>
        <p className="font-sans text-[0.84rem] text-ink-3">
          {t("figures.negotiationTakes")}{" "}
          <span className="ml-1 font-serif text-[1.2rem] font-bold tabular text-ink">6–9</span>{" "}
          {t("figures.months")}
        </p>
      </div>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * The evidence — international record
 * ------------------------------------------------------------------ */

export function EvidenceFigure() {
  const { t } = useTranslation();
  const [direction, setDirection] = useState<"all" | "cost" | "benefit">("all");
  const rows = PRECEDENTS.filter((p) => direction === "all" || p.direction === direction);

  return (
    <Figure
      title={t("viewTitles.record")}
      deck={t("figures.evidenceDeck")}
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
              {t(`figures.filter.${option}`)}
            </button>
          ))}
        </span>
      }
      source={
        <>
          {t("figures.evidenceSource")} <Cite id={14} /><Cite id={13} /><Cite id={5} />
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
  supported: { key: "figures.promises.supported", colour: "text-data-green" },
  unproven: { key: "figures.promises.unproven", colour: "text-ink-4" },
  "at-risk": { key: "figures.promises.atRisk", colour: "text-data-a" },
} as const;

export function PromisesFigure() {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const counts = {
    supported: PROMISES.filter((p) => p.status === "supported").length,
    unproven: PROMISES.filter((p) => p.status === "unproven").length,
    "at-risk": PROMISES.filter((p) => p.status === "at-risk").length,
  };

  return (
    <Figure
      title={t("figures.promisesTitle", { total: PROMISES.length })}
      deck={t("figures.promisesDeck", {
        total: PROMISES.length,
        atRisk: counts["at-risk"],
        unproven: counts.unproven,
        supported: counts.supported,
      })}
      aside={t("figures.tapRow")}
      source={
        <>
          {t("figures.promisesSource")}
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
                  {t(label.key)}
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

