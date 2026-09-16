"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTrip } from "./ArticleContext";

/* ------------------------------------------------------------------ *
 * Reading progress — a hairline under the masthead, as news sites do
 * ------------------------------------------------------------------ */

function useProgress() {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setValue(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return value;
}

/* ------------------------------------------------------------------ *
 * Site masthead
 * ------------------------------------------------------------------ */

const SECTIONS = [
  { id: "years", label: "Year by year" },
  { id: "evidence", label: "The evidence" },
  { id: "sources", label: "Sources" },
  { id: "method", label: "Method" },
];

export function Masthead() {
  const progress = useProgress();

  return (
    <header className="sticky top-0 z-40 bg-paper">
      <div className="border-b border-rule">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-5 px-4 sm:px-6">
          <a href="#top" className="font-serif text-[1.05rem] font-bold tracking-tight">
            Airport for All
          </a>
          <nav className="ml-auto flex items-center gap-4 overflow-x-auto">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="whitespace-nowrap font-sans text-[0.78rem] text-ink-3 transition hover:text-ink"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
      <div className="h-[3px] w-full bg-transparent">
        <div className="h-full bg-data-a" style={{ width: `${progress * 100}%` }} />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Headline block
 * ------------------------------------------------------------------ */

export function Headline({
  kicker,
  title,
  deck,
  byline,
  dateline,
  meta,
}: {
  kicker: string;
  title: string;
  deck: string;
  byline: string;
  dateline: string;
  meta: string;
}) {
  return (
    <header id="top" className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
      <div className="mx-auto max-w-[46rem]">
        <p className="font-sans text-[0.75rem] font-bold uppercase tracking-[0.1em] text-data-a">
          {kicker}
        </p>

        <h1 className="mt-4 font-serif text-[2.15rem] font-bold leading-[1.08] tracking-[-0.015em] sm:text-[3rem] lg:text-[3.35rem]">
          {title}
        </h1>

        <p className="mt-5 font-serif text-[1.3rem] leading-snug text-ink-2 sm:text-[1.45rem]">
          {deck}
        </p>

        <div className="mt-7 flex flex-wrap items-baseline justify-between gap-3 border-t border-ink pt-3">
          <p className="font-sans text-[0.8rem] text-ink-2">
            By <span className="font-semibold">{byline}</span>
          </p>
          <p className="font-sans text-[0.78rem] text-ink-4">{dateline}</p>
        </div>
        <p className="mt-2 font-sans text-[0.76rem] text-ink-4">{meta}</p>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Narrative column
 * ------------------------------------------------------------------ */

/** The measure. Running text is deliberately narrow, as newspapers set it. */
export function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto max-w-[42rem] px-4 sm:px-6 ${className}`}>{children}</div>
  );
}

/** Figures break out of the measure to the full reading width. */
export function Wide({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------------ *
 * Chapter
 * ------------------------------------------------------------------ */

export function Chapter({
  id,
  eyebrow,
  title,
  standfirst,
  children,
  figures,
}: {
  id: string;
  eyebrow: string;
  title: string;
  standfirst?: string;
  children: ReactNode;
  figures?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-rule py-10 first:border-t-0 sm:py-14">
      <Column>
        <p className="font-sans text-[0.74rem] font-bold uppercase tracking-[0.1em] text-ink-4">
          {eyebrow}
        </p>
        <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.01em] sm:text-[2.1rem]">
          {title}
        </h2>
        {standfirst ? (
          <p className="mt-4 font-serif text-[1.22rem] leading-relaxed text-ink-2">{standfirst}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </Column>
      {figures ? <Wide className="mt-9">{figures}</Wide> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Figure
 * ------------------------------------------------------------------ */

/**
 * Newspaper chart furniture: a bold sans headline, a deck, the graphic, then a
 * source line underneath. No boxes, no shadows, no rounded corners.
 */
export function Figure({
  title,
  deck,
  source,
  children,
  aside,
  id,
}: {
  title: string;
  deck?: string;
  source?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  id?: string;
}) {
  return (
    <figure id={id} className="scroll-mt-16">
      <div className="rule-top-thick pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h3 className="max-w-[38rem] font-sans text-[1.02rem] font-bold leading-snug text-ink">
            {title}
          </h3>
          {aside ? (
            <p className="font-sans text-[0.74rem] uppercase tracking-wide text-ink-4">{aside}</p>
          ) : null}
        </div>
        {deck ? (
          <p className="mt-1.5 max-w-[42rem] font-serif text-[0.98rem] leading-relaxed text-ink-3">
            {deck}
          </p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
      {source ? <SourceNote>{source}</SourceNote> : null}
    </figure>
  );
}

function SourceNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-t border-rule pt-2.5 font-sans text-[0.75rem] leading-relaxed text-ink-4">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * Big stat — the Gallup-style callout
 * ------------------------------------------------------------------ */

export function StatCallout({
  value,
  label,
  detail,
  tone = "ink",
}: {
  value: string;
  label: string;
  detail?: string;
  tone?: "ink" | "red" | "blue" | "green";
}) {
  return (
    <div className="border-t-2 border-ink pt-3">
      <p
        className={[
          "font-serif text-[2.6rem] font-bold leading-none tabular sm:text-[3rem]",
          tone === "red"
            ? "text-data-a"
            : tone === "blue"
              ? "text-data-b"
              : tone === "green"
                ? "text-data-d"
                : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-2 font-sans text-[0.86rem] font-semibold leading-snug text-ink">{label}</p>
      {detail ? (
        <p className="mt-1 font-sans text-[0.78rem] leading-relaxed text-ink-4">{detail}</p>
      ) : null}
    </div>
  );
}

/** A row of stat callouts, separated by hairlines. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-x-8 gap-y-6 border-y border-rule py-6 sm:grid-cols-3">{children}</div>
  );
}

/* ------------------------------------------------------------------ *
 * Reader's trip ribbon — keeps their answers visible as they read on
 * ------------------------------------------------------------------ */

export function TripRibbon() {
  const { airport, ticket, year, hasAirport } = useTrip();
  if (!hasAirport || !airport) return null;

  return (
    <div className="sticky top-[3.05rem] z-30 border-y border-rule bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
        <span className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ink-4">
          Your trip
        </span>
        <span className="font-sans text-[0.78rem] text-ink-2">
          <span className="font-mono font-semibold">{airport.code}</span> · {airport.city} ·{" "}
          {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(ticket)}{" "}
          ticket
        </span>
        <span className="font-sans text-[0.78rem] text-ink-3">
          shown at {year === 0 ? "today" : `year ${year} (${2026 + year})`}
        </span>
        <a
          href="#your-trip"
          className="ml-auto font-sans text-[0.76rem] text-data-b hover:underline"
        >
          Change
        </a>
      </div>
    </div>
  );
}
