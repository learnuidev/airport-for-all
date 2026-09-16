"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ParsedArticle } from "@/lib/article";
import { ArticleProvider, TripProvider, useTrip } from "@/components/editorial/ArticleContext";
import { ArticleOverlay } from "./ArticleOverlay";
import {
  Chart,
  SERIES,
  VIEWS,
  YearAxis,
  axisValues,
  extractionAt,
  summaryFor,
  usePlayback,
  useYearKeys,
  type ViewId,
} from "./Board";
import { AIRPORTS, PRECEDENTS } from "@/lib/sourced";
import {
  ANNOUNCEMENT_YEAR,
  cad,
  costsFor,
  seriesFor,
  staffEstimate,
  type TripInput,
  type YearCosts,
} from "@/components/editorial/model";

/* ------------------------------------------------------------------ *
 * The board: information on the left, the chart on the right, the years
 * along the bottom. One screen, everything reachable.
 * ------------------------------------------------------------------ */

export function Dashboard({ article }: { article: ParsedArticle }) {
  const params = useSearchParams();

  const initial = useMemo(() => {
    const number = (key: string) => {
      const raw = Number(params.get(key));
      return params.get(key) !== null && Number.isFinite(raw) ? raw : null;
    };
    return {
      airport: params.get("airport"),
      ticket: number("ticket"),
      days: number("days"),
      travellers: number("pax"),
      year: number("year"),
    };
  }, [params]);

  return (
    <ArticleProvider references={article.references}>
      <TripProvider initial={initial}>
        <Board article={article} />
      </TripProvider>
    </ArticleProvider>
  );
}

function Board({ article }: { article: ParsedArticle }) {
  const trip = useTrip();
  const [view, setView] = useState<ViewId>("cost");
  const [enabled, setEnabled] = useState<string[]>(["trip", "ticket", "parking", "drop", "food"]);
  const [articleOpen, setArticleOpen] = useState(false);

  const playback = usePlayback(trip.year, trip.setYear);
  useYearKeys(trip.year, trip.setYear, !articleOpen);

  useEffect(() => {
    const stop = () => playback.stop();
    window.addEventListener("pointerdown", stop, { passive: true });
    return () => window.removeEventListener("pointerdown", stop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const rows = useMemo(() => (input ? seriesFor(input, 20) : null), [input]);
  const active = rows?.[Math.min(trip.year, rows.length - 1)] ?? null;
  const atSigning = useMemo(() => (input ? costsFor(input, 0) : null), [input]);
  const activeView = VIEWS.find((item) => item.id === view) ?? VIEWS[0];
  const axis = useMemo(() => axisValues(view, rows, trip.ticket), [view, rows, trip.ticket]);
  const summary = useMemo(
    () => (rows ? summaryFor(view, rows, trip.year) : undefined),
    [view, rows, trip.year],
  );

  const toggle = useCallback((key: string) => {
    setEnabled((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }, []);

  const plotRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 900, height: 400 });
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: Math.max(320, rect.width), height: Math.max(200, rect.height) });
    });
    observer.observe(node);
    setSize({ width: node.clientWidth, height: node.clientHeight });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-paper lg:h-screen lg:overflow-hidden">
      {/* Header: the two questions, and the article. */}
      <header className="border-b border-ink">
        <div className="mx-auto flex w-full max-w-[104rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
          <span className="font-serif text-[0.98rem] font-bold tracking-tight">
            Airport for All
          </span>
          <span className="hidden font-sans text-[0.68rem] uppercase tracking-[0.09em] text-ink-4 md:inline">
            The concession dossier
          </span>

          <label className="flex items-center gap-2">
            <span className="font-sans text-[0.7rem] font-bold text-ink-4">1</span>
            <select
              value={trip.airport?.code ?? ""}
              onChange={(event) => trip.setAirport(event.target.value)}
              aria-label="Airport"
              className="cursor-pointer border-b border-ink bg-transparent py-0.5 font-sans text-[0.86rem] outline-none"
            >
              <option value="">Choose an airport</option>
              <optgroup label="In scope for the concession">
                {AIRPORTS.filter((a) => a.inScope).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.city}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Not named in the announcement">
                {AIRPORTS.filter((a) => !a.inScope).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.city}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="font-sans text-[0.7rem] font-bold text-ink-4">2</span>
            <span className="font-sans text-[0.86rem]">$</span>
            <input
              type="number"
              min={80}
              max={3000}
              value={trip.ticket}
              onChange={(event) =>
                trip.setTicket(Math.min(3000, Math.max(80, Number(event.target.value) || 0)))
              }
              aria-label="Round-trip ticket price"
              className="w-20 border-b border-ink bg-transparent py-0.5 font-sans text-[0.86rem] tabular outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => setArticleOpen(true)}
            className="ml-auto cursor-pointer border border-ink px-3 py-1 font-sans text-[0.74rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
          >
            Read the article
          </button>
        </div>
      </header>

      {/* Left: information. Right: the chart. */}
      <div className="mx-auto flex w-full max-w-[104rem] flex-1 flex-col px-4 sm:px-6 lg:min-h-0">
        <div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-6 py-4 lg:min-h-0 lg:grid-cols-[21rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pb-32 lg:pr-1">
            <Info
              view={view}
              setView={setView}
              enabled={enabled}
              toggle={toggle}
              rows={rows}
              active={active}
              atSigning={atSigning}
            />
          </aside>

          <section className="flex min-h-[26rem] flex-col pb-4 lg:min-h-0 lg:pb-32">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.09em] text-ink-4">
                {activeView.label}
                {trip.airport ? ` · ${trip.airport.code}` : ""} · {ANNOUNCEMENT_YEAR + trip.year}
              </p>
              <p className="font-sans text-[0.72rem] text-ink-4">
                drag the plot or the years · arrow keys
              </p>
            </div>

            <div ref={plotRef} className="mt-2 flex-1 lg:min-h-0">
              {rows && active ? (
                <Chart
                  rows={rows}
                  view={activeView.chart}
                  year={trip.year}
                  setYear={trip.setYear}
                  enabled={enabled}
                  summary={summary}
                  width={size.width}
                  height={size.height}
                />
              ) : (
                <EmptyBoard onOpen={() => setArticleOpen(true)} />
              )}
            </div>
          </section>
        </div>
      </div>

      {/* The years, pinned along the bottom. */}
      <div className="z-20 border-t-2 border-ink bg-paper lg:fixed lg:inset-x-0 lg:bottom-0">
        <div className="mx-auto w-full max-w-[104rem] px-4 pb-3 pt-2 sm:px-6">
          <YearAxis
            year={trip.year}
            setYear={trip.setYear}
            values={axis}
            playing={playback.playing}
            onPlay={playback.toggle}
          />
        </div>
      </div>

      {articleOpen ? (
        <ArticleOverlay article={article} onClose={() => setArticleOpen(false)} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The information column
 * ------------------------------------------------------------------ */

function Info({
  view,
  setView,
  enabled,
  toggle,
  rows,
  active,
  atSigning,
}: {
  view: ViewId;
  setView: (view: ViewId) => void;
  enabled: string[];
  toggle: (key: string) => void;
  rows: YearCosts[] | null;
  active: YearCosts | null;
  atSigning: YearCosts | null;
}) {
  const trip = useTrip();
  const activeView = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  return (
    <>
      {/* Year */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.09em] text-ink-4">
            Concession year
          </span>
          <span className="font-sans text-[0.82rem] tabular">
            {trip.year === 0 ? "Signed" : trip.year}
            <span className="ml-1 text-ink-4">{ANNOUNCEMENT_YEAR + trip.year}</span>
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          value={trip.year}
          onChange={(event) => trip.setYear(Number(event.target.value))}
          aria-label="Concession year"
          className="mt-2 h-1 w-full cursor-pointer appearance-none bg-rule [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
        />
      </div>

      {/* Trip detail */}
      <div className="grid grid-cols-3 gap-3">
        <Mini label="Days parked" value={trip.days} min={0} max={21} onChange={trip.setDays} />
        <Mini label="Travellers" value={trip.travellers} min={1} max={6} onChange={trip.setTravellers} />
        <Mini
          label="Kerbside"
          value={trip.dropOffMinutes}
          min={0}
          max={90}
          onChange={trip.setDropOffMinutes}
        />
      </div>

      {/* Views */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-rule pt-3">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            aria-pressed={view === item.id}
            className={[
              "cursor-pointer border-b-2 pb-0.5 font-sans text-[0.78rem] transition",
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
        <h2 className="font-serif text-[1.28rem] font-bold leading-tight">{activeView.title}</h2>
        <p className="mt-1.5 font-sans text-[0.78rem] leading-relaxed text-ink-3">
          {activeView.blurb}
        </p>
      </div>

      <Figures view={view} active={active} atSigning={atSigning} />

      {/* Charge switches */}
      {active && (view === "cost" || view === "charges") ? (
        <div className="border-t border-rule pt-3">
          <p className="font-sans text-[0.66rem] font-bold uppercase tracking-[0.09em] text-ink-4">
            Charges
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {(["parking", "drop", "food"] as const).map((key) => {
              const on = enabled.includes(key);
              const value =
                key === "parking" ? active.parking : key === "drop" ? active.dropOff : active.food;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={on}
                    className="flex w-full cursor-pointer items-center gap-2 py-0.5 text-left transition hover:bg-cream"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 border"
                      style={{
                        background: on ? SERIES[key].colour : "transparent",
                        borderColor: on ? SERIES[key].colour : "#767676",
                      }}
                    />
                    <span
                      className={[
                        "flex-1 font-sans text-[0.8rem]",
                        on ? "text-ink" : "text-ink-4 line-through",
                      ].join(" ")}
                    >
                      {SERIES[key].label}
                    </span>
                    <span className="font-sans text-[0.8rem] font-semibold tabular">
                      {value > 0 ? cad(value) : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Ticket component switches */}
      {active && view === "ticket" ? (
        <div className="border-t border-rule pt-3">
          <p className="font-sans text-[0.66rem] font-bold uppercase tracking-[0.09em] text-ink-4">
            Inside the fare
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {(["airfare", "aif", "aeronautical", "taxes"] as const).map((key) => {
              const on = enabled.includes(key);
              const value =
                key === "airfare"
                  ? active.airfare
                  : key === "aif"
                    ? active.aif
                    : key === "aeronautical"
                      ? active.aeronautical
                      : active.taxes;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-pressed={on}
                    className="flex w-full cursor-pointer items-center gap-2 py-0.5 text-left transition hover:bg-cream"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 border"
                      style={{
                        background: on ? SERIES[key].colour : "transparent",
                        borderColor: on ? SERIES[key].colour : "#767676",
                      }}
                    />
                    <span
                      className={[
                        "flex-1 font-sans text-[0.8rem]",
                        on ? "text-ink" : "text-ink-4 line-through",
                      ].join(" ")}
                    >
                      {SERIES[key].label}
                    </span>
                    <span className="font-sans text-[0.8rem] font-semibold tabular">
                      {cad(value)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {view === "record" ? <Record /> : null}
      {view === "ticket" ? <Airports /> : null}

      <p className="mt-auto border-t border-rule pt-2.5 font-sans text-[0.68rem] leading-relaxed text-ink-4">
        Reported anchors in article.md: Perth +60 percent per passenger over a decade, UK parking
        at £98 a day and £28 for 30 minutes at Stansted, a 15–20 percent investor requirement, and
        a 40 percent workforce cut at Sydney.
      </p>
    </>
  );
}

function Figures({
  view,
  active,
  atSigning,
}: {
  view: ViewId;
  active: YearCosts | null;
  atSigning: YearCosts | null;
}) {
  const trip = useTrip();

  const cells: { value: string; label: string; tone?: "red" | "green" }[] =
    view === "record"
      ? [
          { value: "101st/116", label: "Canada's affordability rank", tone: "red" },
          { value: "40%", label: "Sydney's workforce cut", tone: "red" },
          { value: "+60%", label: "Perth per passenger, one decade" },
          { value: "+$20", label: "2023 study fees — with 50% fewer cancellations", tone: "green" },
        ]
      : view === "revenue"
        ? [
            { value: "$3.95B", label: "2022 revenue, no profit at all" },
            { value: "$525M", label: "Annual rent to Ottawa" },
            {
              value: `+$${Math.round(3.95 * Math.pow(1.03, trip.year) * 0.175 * 1000).toLocaleString()}M`,
              label: `Needed in ${ANNOUNCEMENT_YEAR + trip.year}`,
              tone: "red",
            },
            {
              value: `$${Math.round(extractionAt(trip.year)).toLocaleString()}M`,
              label: "Extracted since signing",
              tone: "red",
            },
          ]
        : !active || !atSigning
          ? [
              { value: "101st/116", label: "Canada's affordability rank", tone: "red" },
              { value: "25–35%", label: "Of a ticket is taxes and fees" },
              { value: "37%", label: "Of revenue is the Improvement Fee" },
              { value: "50–99", label: "Years of concession" },
            ]
          : view === "charges"
            ? [
                { value: cad(active.parking), label: "Parking", tone: "red" },
                { value: active.dropOff > 0 ? cad(active.dropOff) : "Free", label: "Drop-off" },
                { value: cad(active.food), label: "Food and retail" },
                {
                  value: `+${cad(active.extrasTotal - atSigning.extrasTotal)}`,
                  label: "Added since signing",
                  tone: "red",
                },
              ]
            : view === "ticket"
              ? [
                  { value: cad(active.ticketTotal), label: `Ticket in ${active.calendar}` },
                  {
                    value: `+${cad(active.ticketTotal - atSigning.ticketTotal)}`,
                    label: "Added to the fare",
                    tone: "red",
                  },
                  { value: cad(active.aif), label: "Improvement Fee" },
                  { value: cad(active.taxes), label: "Taxes and fees" },
                ]
              : [
                  { value: cad(active.tripTotal), label: `Trip in ${active.calendar}`, tone: "red" },
                  { value: cad(atSigning.tripTotal), label: "The same trip at signing", tone: "green" },
                  {
                    value: `+${cad(active.tripTotal - atSigning.tripTotal)}`,
                    label: "Added by the concession",
                    tone: "red",
                  },
                  {
                    value: `${(((active.tripTotal - atSigning.tripTotal) / atSigning.tripTotal) * 100).toFixed(0)}%`,
                    label: "Above the current model",
                    tone: "red",
                  },
                ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-rule py-3.5">
      {cells.map((cell) => (
        <div key={cell.label}>
          <p
            className={[
              "font-serif text-[1.4rem] font-bold leading-none tabular",
              cell.tone === "red" ? "text-data-a" : cell.tone === "green" ? "text-data-d" : "text-ink",
            ].join(" ")}
          >
            {cell.value}
          </p>
          <p className="mt-1 font-sans text-[0.68rem] leading-snug text-ink-4">{cell.label}</p>
        </div>
      ))}
    </div>
  );
}

function Mini({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <p className="font-sans text-[0.62rem] uppercase tracking-wide text-ink-4">{label}</p>
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
          className="h-5 w-5 cursor-pointer border border-rule font-sans text-[0.7rem] transition hover:border-ink"
        >
          −
        </button>
        <span className="w-6 text-center font-sans text-[0.8rem] tabular">{value}</span>
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

function Record() {
  return (
    <ul className="space-y-1.5 border-t border-rule pt-3">
      {PRECEDENTS.slice(0, 6).map((precedent) => (
        <li
          key={`${precedent.country}-${precedent.asset}`}
          className="flex items-baseline gap-3"
        >
          <span className="flex-1 font-sans text-[0.74rem] leading-snug text-ink-3">
            {precedent.country} · {precedent.asset}
          </span>
          <span
            className={[
              "font-sans text-[0.76rem] font-bold tabular",
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

function Airports() {
  const inScope = AIRPORTS.filter((airport) => airport.inScope);
  return (
    <ul className="space-y-1.5 border-t border-rule pt-3">
      {inScope.map((airport) => {
        const { staff, cut } = staffEstimate(airport);
        return (
          <li key={airport.code} className="flex items-baseline justify-between">
            <span className="font-mono text-[0.74rem] font-semibold">
              {airport.code}
              <span className="ml-2 font-sans font-normal text-ink-4">
                {staff.toLocaleString()}
              </span>
            </span>
            <span className="font-sans text-[0.76rem] font-bold tabular text-data-a">
              −{cut.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyBoard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center border border-dashed border-rule px-6 text-center">
      <p className="font-serif text-[1.3rem] font-bold">Choose an airport to begin</p>
      <p className="mt-2 max-w-sm font-sans text-[0.82rem] leading-relaxed text-ink-3">
        Then enter what you paid. The board shows your ticket against the whole trip, twenty years
        out.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 cursor-pointer font-sans text-[0.8rem] text-data-b hover:underline"
      >
        Read the article instead
      </button>
    </div>
  );
}
