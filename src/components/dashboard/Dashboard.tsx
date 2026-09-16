"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ParsedArticle } from "@/lib/article";
import { ArticleProvider, TripProvider, useTrip } from "@/components/editorial/ArticleContext";
import { ChartCanvas } from "./ChartCanvas";
import { InfoPanel, VIEWS, axisValues, type ViewId } from "./InfoPanel";
import { TripControls, YearControl } from "./TripControls";
import { PlaybackButton, YearAxis, usePlayback, useYearKeys } from "./YearAxis";
import { ArticleOverlay } from "./ArticleOverlay";
import { cad, seriesFor, HORIZON, type TripInput } from "@/components/editorial/model";

/**
 * The board.
 *
 * One screen: information on the left, the chart on the right, the whole
 * timeline along the bottom. The year axis is the primary control and every
 * panel reacts to it, so nothing here requires scrolling to reach.
 */
export function Dashboard({ article }: { article: ParsedArticle }) {
  const params = useSearchParams();

  // Links carry the board state, so the first paint is already populated.
  const initial = useMemo(() => {
    const number = (key: string) => {
      const raw = Number(params.get(key));
      return Number.isFinite(raw) && params.get(key) !== null ? raw : null;
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
  const router = useRouter();
  const [view, setView] = useState<ViewId>("cost");
  const [enabled, setEnabled] = useState<string[]>(["trip", "ticket", "parking", "drop", "food"]);
  const [articleOpen, setArticleOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const playback = usePlayback(trip.year, trip.setYear);
  useYearKeys(trip.year, trip.setYear, !articleOpen);

  // Keep the address bar in step so any board state can be shared.
  useEffect(() => {
    if (!trip.hasAirport || !trip.airport) return;
    const params = new URLSearchParams({
      airport: trip.airport.code,
      ticket: String(trip.ticket),
      days: String(trip.days),
      pax: String(trip.travellers),
      year: String(trip.year),
    });
    router.replace(`/?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.hasAirport, trip.airport?.code, trip.ticket, trip.days, trip.travellers, trip.year]);

  // Stop playback the moment the reader takes manual control.
  useEffect(() => {
    const onPointer = () => playback.stop();
    window.addEventListener("pointerdown", onPointer, { passive: true });
    return () => window.removeEventListener("pointerdown", onPointer);
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

  const rows = useMemo(() => (input ? seriesFor(input, HORIZON) : null), [input]);
  const active = useMemo(
    () =>
      input
        ? (rows ?? seriesFor(input, HORIZON))[Math.min(trip.year, HORIZON)]
        : null,
    [input, rows, trip.year],
  );

  const activeView = VIEWS.find((item) => item.id === view) ?? VIEWS[0];
  const axis = useMemo(
    () => axisValues(view, input, trip.ticket),
    [view, input, trip.ticket],
  );

  const toggle = useCallback((key: string) => {
    setEnabled((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }, []);

  /* Chart sizing: the SVG viewBox tracks real pixels so axis labels stay crisp. */
  const plotRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 720, height: 360 });
  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: Math.max(320, rect.width), height: Math.max(220, rect.height) });
    });
    observer.observe(node);
    setSize({ width: node.clientWidth, height: node.clientHeight });
    return () => observer.disconnect();
  }, []);

  const headline = article.title.split(":")[0];

  return (
    <div className="flex min-h-screen flex-col bg-paper lg:h-screen lg:min-h-0 lg:overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Masthead                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-ink">
        <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[1.05rem] font-bold tracking-tight">
              Airport for All
            </span>
            <span className="hidden font-sans text-[0.7rem] uppercase tracking-[0.09em] text-ink-4 sm:inline">
              The concession dossier
            </span>
          </div>

          <p className="hidden max-w-[34rem] flex-1 truncate font-sans text-[0.78rem] text-ink-3 lg:block">
            {headline}
          </p>

          <div className="ml-auto flex items-center gap-3">
            <PlaybackButton playing={playback.playing} onToggle={playback.toggle} />
            <button
              type="button"
              onClick={() => setMapOpen((value) => !value)}
              aria-expanded={mapOpen}
              className="cursor-pointer border-b-2 border-transparent pb-0.5 font-sans text-[0.78rem] text-ink-3 transition hover:border-ink hover:text-ink"
            >
              The record
            </button>
            <button
              type="button"
              onClick={() => setArticleOpen(true)}
              className="cursor-pointer border border-ink px-3 py-1 font-sans text-[0.76rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
            >
              Read the article
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Board                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto flex w-full max-w-[110rem] flex-1 flex-col px-4 sm:px-6 lg:min-h-0">
        <div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-6 py-5 lg:min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
          {/* Left: information */}
          <aside className="flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
            <TripControls />
            <YearControl />
            <InfoPanel view={view} setView={setView} enabled={enabled} toggle={toggle} />
          </aside>

          {/* Right: the chart */}
          <section className="flex min-h-[26rem] flex-col pb-40 lg:min-h-0 lg:pb-44">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-sans text-[0.68rem] font-bold uppercase tracking-[0.09em] text-ink-4">
                {activeView.label}
                {trip.hasAirport && trip.airport ? ` · ${trip.airport.code}` : ""}
                {` · ${2026 + trip.year}`}
              </p>
              <p className="font-sans text-[0.7rem] text-ink-4">
                {activeView.chart === "stacked"
                  ? "Per-traveller ticket, stacked"
                  : activeView.chart === "contribution"
                    ? "Each charge on its own scale"
                    : "Ticket against whole trip"}
              </p>
            </div>

            <div ref={plotRef} className="mt-3 min-h-[20rem] flex-1">
              {active ? (
                <ChartCanvas
                  title={activeView.title}
                  rows={rows ?? []}
                  view={activeView.chart}
                  year={trip.year}
                  setYear={trip.setYear}
                  enabled={enabled}
                  width={size.width}
                  height={size.height}
                />
              ) : (
                <EmptyBoard onOpen={() => setArticleOpen(true)} />
              )}
            </div>

            {active ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-rule pt-2.5">
                <span className="font-sans text-[0.8rem] text-ink-3">
                  {trip.year === 0 ? "At signing" : `Year ${trip.year}`} ·{" "}
                  <span className="font-bold tabular text-ink">{cad(active.tripTotal)}</span> whole
                  trip
                  <span className="text-ink-4"> · </span>
                  <span className="font-bold tabular text-ink">{cad(active.ticketTotal)}</span>{" "}
                  ticket
                  {active.extrasTotal > 0 ? (
                    <>
                      <span className="text-ink-4"> · </span>
                      <span className="font-bold tabular text-data-a">
                        {cad(active.extrasTotal)}
                      </span>{" "}
                      off-ticket
                    </>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => trip.setYear(0)}
                  className="ml-auto cursor-pointer font-sans text-[0.72rem] text-data-b hover:underline"
                >
                  Reset to signing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.location.href;
                    void navigator.clipboard?.writeText(url);
                  }}
                  className="cursor-pointer font-sans text-[0.72rem] text-data-b hover:underline"
                >
                  Copy link to this board
                </button>
              </div>
            ) : null}
          </section>
        </div>

      </div>

      {/* ------------------------------------------------------------------ */}
      {/* The timeline, pinned to the bottom of the screen                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t-2 border-ink bg-paper z-20 lg:fixed lg:inset-x-0 lg:bottom-0">
        <div className="mx-auto w-full max-w-[110rem] px-4 pb-4 pt-3 sm:px-6">
          <YearAxis
            year={trip.year}
            setYear={trip.setYear}
            values={axis}
            unit={activeView.unit}
            highlight={[2, 10]}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* The record drawer — the international evidence, still one page       */}
      {/* ------------------------------------------------------------------ */}
      {mapOpen ? <RecordDrawer onClose={() => setMapOpen(false)} /> : null}

      {/* ------------------------------------------------------------------ */}
      {/* The written article as a full-screen reading pane                    */}
      {/* ------------------------------------------------------------------ */}
      {articleOpen ? (
        <ArticleOverlay article={article} onClose={() => setArticleOpen(false)} />
      ) : null}
    </div>
  );
}

function EmptyBoard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center border border-dashed border-rule px-6 text-center">
      <p className="font-serif text-[1.4rem] font-bold leading-tight">
        Two answers and this board comes alive
      </p>
      <p className="mt-2 max-w-md font-sans text-[0.84rem] leading-relaxed text-ink-3">
        Choose an airport and enter what you paid for a round trip. Every panel, the chart and the
        timeline below will use your numbers, and the year axis will show twenty years of them at
        once.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-5 cursor-pointer border border-ink px-3.5 py-1.5 font-sans text-[0.78rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white"
      >
        Or read the article first
      </button>
    </div>
  );
}

function RecordDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto border-t-2 border-ink bg-paper shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
      <div className="mx-auto max-w-[110rem] px-4 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-[1.3rem] font-bold">
            What the record shows, in the order it happened
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer font-sans text-[0.76rem] text-data-b hover:underline"
          >
            Close
          </button>
        </div>
        <RecordTimeline />
      </div>
    </div>
  );
}

function RecordTimeline() {
  return <TimelineList />;
}

function TimelineList() {
  const trip = useTrip();
  return (
    <ol className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {TIMELINE.map((entry) => (
        <li key={entry.title} className="border-t border-rule pt-2.5">
          <p className="font-sans text-[0.66rem] font-bold uppercase tracking-wide text-ink-4">
            {entry.when}
          </p>
          <p className="mt-1 font-sans text-[0.84rem] leading-snug text-ink">{entry.title}</p>
          <p className="mt-1 font-sans text-[0.76rem] leading-relaxed text-ink-4">{entry.detail}</p>
        </li>
      ))}
      <li className="border-t border-rule pt-2.5">
        <p className="font-sans text-[0.66rem] font-bold uppercase tracking-wide text-ink-4">
          Your board
        </p>
        <p className="mt-1 font-sans text-[0.84rem] leading-snug text-ink">
          {trip.year === 0 ? "At signing" : `Year ${trip.year} of the concession`}
        </p>
        <p className="mt-1 font-sans text-[0.76rem] leading-relaxed text-ink-4">
          The timeline above is the projection this board draws from.
        </p>
      </li>
    </ol>
  );
}

const TIMELINE = [
  {
    when: "1997–2002 · Australia",
    title: "Sydney cut 40 percent of its workforce",
    detail: "The cuts came after post-sale job protections expired. The protections were temporary.",
  },
  {
    when: "A decade · Australia",
    title: "Perth's airline revenue rose 60 percent per passenger",
    detail: "Aeronautical charges are controlled by the operator and passed straight to the ticket.",
  },
  {
    when: "2021 · Brazil",
    title: "Airfares 3–3.5 percent higher on privatised routes",
    detail: "An econometric study found market dominance enforces the effect.",
  },
  {
    when: "2025 · United Kingdom",
    title: "£751 million in parking, £2 million a day",
    detail: "Heathrow charges up to £98 a day; Stansted £28 for 30 minutes at the kerb.",
  },
  {
    when: "2023 · global study",
    title: "50 percent fewer cancellations — and $20 more in fees",
    detail: "The University of Alberta research found both halves of the trade, not one.",
  },
  {
    when: "2026 · Canada",
    title: "Four airports opened to private investment",
    detail: "Concessions of 50 to 99 years, with the land and assets kept in public hands.",
  },
];
