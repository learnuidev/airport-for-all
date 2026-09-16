"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import type { ParsedArticle } from "@/lib/article";
import { ArticleProvider, TripProvider, useTrip } from "@/components/editorial/ArticleContext";
import { ArticleOverlay } from "./ArticleOverlay";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
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
import { AIRPORTS, FINANCIALS, PRECEDENTS } from "@/lib/sourced";
import {
  ANNOUNCEMENT_YEAR,
  cad,
  localeTag,
  money,
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

/** Currency and number formatting follow the reading language. */
function useMoney() {
  const { i18n } = useTranslation();
  const tag = localeTag(i18n.language);
  return useMemo(
    () => ({
      money: (value: number, decimals = 0) => money(value, decimals, tag),
      number: (value: number) => new Intl.NumberFormat(tag).format(value),
    }),
    [tag],
  );
}

export function Dashboard({
  article,
  locale,
  translated,
}: {
  article: ParsedArticle;
  /** Which locale's prose was loaded. */
  locale: string;
  /** False when this locale has no translated article and English is shown. */
  translated: boolean;
}) {
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
        <Board article={article} locale={locale} translated={translated} />
      </TripProvider>
    </ArticleProvider>
  );
}

function Board({
  article,
  locale,
  translated,
}: {
  article: ParsedArticle;
  locale: string;
  translated: boolean;
}) {
  const trip = useTrip();
  const { t } = useTranslation();
  const { money } = useMoney();
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
    () => (rows ? summaryFor(view, rows, trip.year, t, money) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [view, rows, trip.year, t],
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
            {t("app.title")}
          </span>
          <span className="hidden font-sans text-[0.68rem] uppercase tracking-[0.09em] text-ink-4 md:inline">
            {t("app.kicker")}
          </span>

          <label className="flex items-center gap-2">
            <span className="font-sans text-[0.7rem] font-bold text-ink-4">1</span>
            <select
              value={trip.airport?.code ?? ""}
              onChange={(event) => trip.setAirport(event.target.value)}
              aria-label={t("controls.airportAria")}
              className="cursor-pointer border-b border-ink bg-transparent py-0.5 font-sans text-[0.86rem] outline-none"
            >
              <option value="">{t("controls.airport")}</option>
              <optgroup label={t("controls.inScope")}>
                {AIRPORTS.filter((a) => a.inScope).map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.city}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t("controls.notNamed")}>
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
              aria-label={t("controls.ticketAria")}
              className="w-20 border-b border-ink bg-transparent py-0.5 font-sans text-[0.86rem] tabular outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => setArticleOpen(true)}
            className="ml-auto cursor-pointer border border-ink px-3 py-1 font-sans text-[0.74rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
          >
            {t("controls.readArticle")}
          </button>
          <LanguageSwitcher />
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
                {t(`views.${activeView.id}`)}
                {trip.airport ? ` · ${trip.airport.code}` : ""} · {ANNOUNCEMENT_YEAR + trip.year}
              </p>
              <p className="font-sans text-[0.72rem] text-ink-4">
                {t("controls.chartHint")}
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
                  ariaLabel={t("chart.aria")}
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
            ariaLabel={t("axis.label")}
            labels={{
              play: t("axis.play"),
              pause: t("axis.pause"),
              drag: t("axis.drag"),
              year: (value: number) => t("axis.yearAria", { year: value }),
            }}
          />
        </div>
      </div>

      {articleOpen ? (
        <ArticleOverlay
          article={article}
          locale={locale}
          translated={translated}
          onClose={() => setArticleOpen(false)}
        />
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
  const { t } = useTranslation();
  const { money } = useMoney();
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
          aria-label={t("controls.concessionYear")}
          className="mt-2 h-1 w-full cursor-pointer appearance-none bg-rule [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
        />
      </div>

      {/* Trip detail */}
      <div className="grid grid-cols-3 gap-3">
        <Mini label={t("controls.daysParked")} value={trip.days} min={0} max={21} onChange={trip.setDays} />
        <Mini label={t("controls.travellers")} value={trip.travellers} min={1} max={6} onChange={trip.setTravellers} />
        <Mini
          label={t("controls.kerbside")}
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
            {t(`views.${item.id}`)}
          </button>
        ))}
      </div>

      <div>
        <h2 className="font-serif text-[1.28rem] font-bold leading-tight">{t(`viewTitles.${activeView.id}`)}</h2>
        <p className="mt-1.5 font-sans text-[0.78rem] leading-relaxed text-ink-3">
          {t(`viewBlurbs.${activeView.id}`)}
        </p>
      </div>

      <Figures view={view} active={active} atSigning={atSigning} />

      {/* Charge switches */}
      {active && (view === "cost" || view === "charges") ? (
        <div className="border-t border-rule pt-3">
          <p className="font-sans text-[0.66rem] font-bold uppercase tracking-[0.09em] text-ink-4">
            {t("panels.charges")}
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
                      {t(`series.${key}`)}
                    </span>
                    <span className="font-sans text-[0.8rem] font-semibold tabular">
                      {value > 0 ? money(value) : "—"}
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
            {t("panels.insideFare")}
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
                      {t(`series.${key}`)}
                    </span>
                    <span className="font-sans text-[0.8rem] font-semibold tabular">
                      {money(value)}
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
      {view === "books" ? <Books /> : null}

      <p className="mt-auto border-t border-rule pt-2.5 font-sans text-[0.68rem] leading-relaxed text-ink-4">
        {t("sources.anchors")}
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
  const { t } = useTranslation();
  const { money } = useMoney();

  const cells: { value: string; label: string; tone?: "red" | "green" }[] =
    view === "record"
      ? [
          { value: "101st/116", label: t("metrics.canadaRank"), tone: "red" },
          { value: "40%", label: t("metrics.sydneyCut"), tone: "red" },
          { value: "+60%", label: t("metrics.perthPerPax") },
          { value: "+$20", label: t("metrics.studyFees"), tone: "green" },
        ]
      : view === "books"
        ? [
            { value: "$2.08B", label: t("metrics.pearsonRevenue") },
            { value: "$961M", label: t("metrics.trudeauRevenue") },
            { value: "$717M", label: t("metrics.vancouverRevenue") },
            { value: "$7.3B", label: t("metrics.rentSince1994"), tone: "red" },
          ]
      : view === "revenue"
        ? [
            { value: "$3.95B", label: t("metrics.revenue2022") },
            { value: "$525M", label: t("metrics.annualRent") },
            {
              value: `+$${Math.round(3.95 * Math.pow(1.03, trip.year) * 0.175 * 1000).toLocaleString()}M`,
              label: t("metrics.revenueNeeded", { calendar: ANNOUNCEMENT_YEAR + trip.year }),
              tone: "red",
            },
            {
              value: `$${Math.round(extractionAt(trip.year)).toLocaleString()}M`,
              label: t("metrics.extractedSinceSigning"),
              tone: "red",
            },
          ]
        : !active || !atSigning
          ? [
              { value: "101st/116", label: t("metrics.canadaRank"), tone: "red" },
              { value: "25–35%", label: t("metrics.taxShareOfTicket") },
              { value: "37%", label: t("metrics.revenueShareAif") },
              { value: "50–99", label: t("metrics.concessionYears") },
            ]
          : view === "charges"
            ? [
                { value: money(active.parking), label: t("metrics.parking"), tone: "red" },
                { value: active.dropOff > 0 ? money(active.dropOff) : t("metrics.free"), label: t("metrics.dropOff") },
                { value: money(active.food), label: t("metrics.foodRetail") },
                {
                  value: `+${money(active.extrasTotal - atSigning.extrasTotal)}`,
                  label: t("metrics.addedSinceSigning"),
                  tone: "red",
                },
              ]
            : view === "ticket"
              ? [
                  { value: money(active.ticketTotal), label: t("metrics.ticketIn", { calendar: active.calendar }) },
                  {
                    value: `+${money(active.ticketTotal - atSigning.ticketTotal)}`,
                    label: t("metrics.addedToFare"),
                    tone: "red",
                  },
                  { value: money(active.aif), label: t("metrics.improvementFee") },
                  { value: money(active.taxes), label: t("metrics.taxesAndFees") },
                ]
              : [
                  { value: money(active.tripTotal), label: t("metrics.tripIn", { calendar: active.calendar }), tone: "red" },
                  { value: money(atSigning.tripTotal), label: t("metrics.sameTripAtSigning"), tone: "green" },
                  {
                    value: `+${money(active.tripTotal - atSigning.tripTotal)}`,
                    label: t("metrics.addedByConcession"),
                    tone: "red",
                  },
                  {
                    value: `${(((active.tripTotal - atSigning.tripTotal) / atSigning.tripTotal) * 100).toFixed(0)}%`,
                    label: t("metrics.aboveCurrent"),
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
  const { t } = useTranslation();
  return (
    <div>
      <p className="font-sans text-[0.62rem] uppercase tracking-wide text-ink-4">{label}</p>
      <div className="mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={t("controls.decrease", { label })}
          className="h-5 w-5 cursor-pointer border border-rule font-sans text-[0.7rem] transition hover:border-ink"
        >
          −
        </button>
        <span className="w-6 text-center font-sans text-[0.8rem] tabular">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          aria-label={t("controls.increase", { label })}
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

/**
 * The report's own tables: what each airport earned in 2025 and what it spent,
 * with the share of revenue and of operating expenses. The CLC compiled these
 * from the 2025 consolidated statements — the disclosure that public,
 * non-profit ownership requires and private ownership would not.
 */
function Books() {
  const { t } = useTranslation();
  const { number: group } = useMoney();
  const [tab, setTab] = useState<"revenue" | "expenses">("revenue");

  const rowsFor = (airport: (typeof FINANCIALS)[number]) =>
    tab === "revenue"
      ? [
          { label: t("books.aeronautical"), value: airport.aeronautical, base: airport.totalRevenue, colour: "#1a5fb4" },
          { label: t("books.nonAeronautical"), value: airport.nonAeronautical, base: airport.totalRevenue, colour: "#4a90d9" },
          { label: t("books.improvementFees"), value: airport.aif, base: airport.totalRevenue, colour: "#d0021b" },
        ]
      : [
          { label: t("books.wages"), value: airport.wages, base: airport.totalExpenses, colour: "#7a3fa0" },
          { label: t("books.rent"), value: airport.rent, base: airport.totalExpenses, colour: "#e8853f" },
        ];

  return (
    <div className="border-t border-rule pt-3">
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-[0.66rem] font-bold uppercase tracking-[0.09em] text-ink-4">
          {t("books.title")}
        </p>
        <div className="flex gap-3">
          {(["revenue", "expenses"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTab(option)}
              aria-pressed={tab === option}
              className={[
                "cursor-pointer border-b pb-0.5 font-sans text-[0.72rem] transition",
                tab === option
                  ? "border-ink font-bold text-ink"
                  : "border-transparent text-ink-4 hover:text-ink",
              ].join(" ")}
            >
              {option === "revenue" ? t("books.revenue") : t("books.expenses")}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-2 space-y-3">
        {FINANCIALS.map((airport) => {
          const total = tab === "revenue" ? airport.totalRevenue : airport.totalExpenses;
          return (
            <li key={airport.code}>
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[0.72rem] font-semibold">{airport.code}</span>
                <span className="font-sans text-[0.72rem] tabular text-ink-3">
                  ${group(total)}M
                </span>
              </div>
              <div className="mt-1 flex h-2.5 w-full overflow-hidden">
                {rowsFor(airport).map((row) => (
                  <div
                    key={row.label}
                    title={`${row.label}: $${group(row.value)}M`}
                    style={{ width: `${(row.value / total) * 100}%`, background: row.colour }}
                  />
                ))}
              </div>
              <ul className="mt-1 space-y-0.5">
                {rowsFor(airport).map((row) => (
                  <li key={`${airport.code}-${row.label}`} className="flex items-baseline gap-2">
                    <span className="h-2 w-2 shrink-0" style={{ background: row.colour }} />
                    <span className="flex-1 font-sans text-[0.68rem] text-ink-3">{row.label}</span>
                    <span className="font-sans text-[0.68rem] tabular text-ink-2">
                      ${group(row.value)}M
                    </span>
                    <span className="w-9 text-right font-sans text-[0.66rem] tabular text-ink-4">
                      {Math.round((row.value / row.base) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
              {tab === "revenue" ? (
                <p className="mt-1 font-sans text-[0.64rem] text-ink-4">
                  {t("books.feePerPassenger", { fee: `$${airport.aifPerTicket.toFixed(2)}` })}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 font-sans text-[0.64rem] leading-relaxed text-ink-4">
        {t("books.source")}
      </p>
    </div>
  );
}

function Airports() {
  const { t } = useTranslation();
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
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center border border-dashed border-rule px-6 text-center">
      <p className="font-serif text-[1.3rem] font-bold">{t("controls.emptyHeading")}</p>
      <p className="mt-2 max-w-sm font-sans text-[0.82rem] leading-relaxed text-ink-3">
        {t("controls.emptyBody")}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 cursor-pointer font-sans text-[0.8rem] text-data-b hover:underline"
      >
        {t("controls.emptyAction")}
      </button>
    </div>
  );
}
