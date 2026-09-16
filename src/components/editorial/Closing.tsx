"use client";

import { useState } from "react";
import type { ParsedArticle, Reference } from "@/lib/article";
import { Cite } from "./Cite";
import { useTrip } from "./ArticleContext";
import { Column, StatCallout, StatRow, Wide } from "./Shell";
import { ANNOUNCEMENT_YEAR, cad, costsFor, staffEstimate } from "./model";
import { AIRPORTS } from "@/lib/sourced";

/* ------------------------------------------------------------------ *
 * Verdict
 * ------------------------------------------------------------------ */

export function Verdict() {
  const trip = useTrip();

  const person = trip.hasAirport && trip.airport;
  const input = person
    ? {
        airport: trip.airport!,
        ticket: trip.ticket,
        days: trip.days,
        travellers: trip.travellers,
        dropOffMinutes: trip.dropOffMinutes,
      }
    : null;
  const today = input ? costsFor(input, 0) : null;
  const now = input ? costsFor(input, trip.year) : null;

  const inScope = AIRPORTS.filter((airport) => airport.inScope);
  const jobsAtRisk = inScope.reduce((sum, airport) => sum + staffEstimate(airport).cut, 0);

  return (
    <section id="verdict" className="scroll-mt-16 border-t-2 border-ink py-10 sm:py-14">
      <Column>
        <p className="font-sans text-[0.74rem] font-bold uppercase tracking-[0.1em] text-ink-4">
          The bottom line
        </p>
        <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.01em] sm:text-[2.2rem]">
          The costs land on the ticket, the wages and the concourse. The profits land somewhere
          else.
        </h2>

        <p className="mt-5 font-serif text-[1.22rem] leading-relaxed text-ink-2">
          Canada already ranks <strong className="font-semibold">101st of 116 countries</strong> for
          air travel affordability, with taxes and fees making up 25 to 35 percent of a ticket.{" "}
          <Cite id={14} /> The concessions on offer run{" "}
          <strong className="font-semibold">50 to 99 years</strong> with no viable exit.{" "}
          <Cite id={1} />
        </p>

        <p className="mt-5 font-serif text-[1.22rem] leading-relaxed text-ink-2">
          &ldquo;Any way you cut it, privatizing airports is a good deal for private buyers and a
          terrible deal for travellers and workers.&rdquo; <Cite id={1} />
        </p>
      </Column>

      <Wide className="mt-9">
        {person && today && now ? (
          <StatRow>
            <StatCallout
              value={cad(now.tripTotal)}
              label={`Your trip in ${now.calendar}`}
              detail={`${cad(today.tripTotal)} today at ${trip.airport!.code}`}
            />
            <StatCallout
              tone="red"
              value={`+${cad(now.tripTotal - today.tripTotal)}`}
              label="Added by the concession"
              detail={`${(((now.tripTotal - today.tripTotal) / today.tripTotal) * 100).toFixed(0)} percent above the current model`}
            />
            <StatCallout
              value={jobsAtRisk.toLocaleString()}
              label="Jobs at risk across the four airports"
              detail="At Sydney's measured 40 percent rate"
            />
          </StatRow>
        ) : (
          <StatRow>
            <StatCallout
              tone="red"
              value="101st of 116"
              label="Canada's rank for air travel affordability"
              detail="With taxes and fees at 25–35 percent of a ticket"
            />
            <StatCallout
              value="40%"
              label="Of Sydney's workforce cut after protections expired"
              detail={`About ${jobsAtRisk.toLocaleString()} jobs at the four airports in scope`}
            />
            <StatCallout
              value="50–99 years"
              label="Length of the concessions on offer"
              detail="With no viable exit once signed"
            />
          </StatRow>
        )}
      </Wide>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Sources index — the reference list, set the way a paper sets one
 * ------------------------------------------------------------------ */

const KIND_LABEL: Record<string, string> = {
  "think-tank": "Think tank",
  labour: "Labour",
  news: "News",
  academic: "Academic",
  government: "Government",
  legal: "Legal",
};

export function SourcesIndex({ references }: { references: Reference[] }) {
  const [filter, setFilter] = useState<"all" | "cited">("all");
  const visible = references.filter((reference) => filter === "all" || reference.cited);
  const citedCount = references.filter((reference) => reference.cited).length;

  return (
    <section id="sources" className="scroll-mt-16 border-t border-rule py-10 sm:py-14">
      <Column>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-sans text-[0.74rem] font-bold uppercase tracking-[0.1em] text-ink-4">
              Sources
            </p>
            <h2 className="mt-2 font-serif text-[1.6rem] font-bold leading-tight">
              {references.length} listed sources, {citedCount} cited in the reporting
            </h2>
          </div>
          <div className="flex gap-4">
            {(
              [
                { id: "all", label: `All ${references.length}` },
                { id: "cited", label: `Cited ${citedCount}` },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={[
                  "cursor-pointer border-b-2 pb-0.5 font-sans text-[0.8rem] transition",
                  filter === option.id
                    ? "border-ink font-bold text-ink"
                    : "border-transparent text-ink-4 hover:text-ink",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 font-serif text-[1rem] leading-relaxed text-ink-3">
          article.md carries two citation systems: a footnote block numbering 15 sources, used
          throughout the text, and a closing reference list numbering 20. Both are listed here.
        </p>

        <ol className="mt-6 divide-y divide-rule border-y border-rule">
          {visible.map((reference) => (
            <li key={reference.id} id={`source-${reference.id}`} className="flex gap-4 py-3">
              <span className="w-5 shrink-0 pt-0.5 font-sans text-[0.72rem] font-bold text-data-b">
                {reference.id}
              </span>
              <div className="min-w-0">
                <p className="font-sans text-[0.86rem] leading-snug">
                  <span className="font-semibold">{reference.publisher}</span>.{" "}
                  <span className="italic">{reference.title}</span>.{" "}
                  <span className="text-ink-4">{reference.date}.</span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-sans text-[0.68rem] font-bold uppercase tracking-wide text-ink-4">
                    {KIND_LABEL[reference.kind] ?? reference.kind}
                  </span>
                  {reference.cited ? null : (
                    <span className="font-sans text-[0.68rem] uppercase tracking-wide text-ink-4">
                      listed, not cited in the text
                    </span>
                  )}
                  {reference.url ? (
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-sans text-[0.74rem] text-data-b underline decoration-data-b/30 underline-offset-2"
                    >
                      Open
                    </a>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Column>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Methodology — the Gallup-style how-we-did-it box
 * ------------------------------------------------------------------ */

export function MethodBox({ article }: { article: ParsedArticle }) {
  const [open, setOpen] = useState(false);

  return (
    <section id="method" className="scroll-mt-16 border-t border-rule py-10 sm:py-14">
      <Column>
        <p className="font-sans text-[0.74rem] font-bold uppercase tracking-[0.1em] text-ink-4">
          Method
        </p>
        <h2 className="mt-2 font-serif text-[1.6rem] font-bold leading-tight">
          How these numbers were produced
        </h2>

        <div className="mt-5 border-y border-rule py-5">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="font-sans text-[0.72rem] font-bold uppercase tracking-wide text-ink-4">
                Source text
              </dt>
              <dd className="mt-1 font-sans text-[0.84rem] leading-relaxed text-ink-2">
                {article.stats.words.toLocaleString()} words parsed from{" "}
                <code className="font-mono text-[0.78rem]">article.md</code>, the single source of
                truth for this article.
              </dd>
            </div>
            <div>
              <dt className="font-sans text-[0.72rem] font-bold uppercase tracking-wide text-ink-4">
                Reported figures
              </dt>
              <dd className="mt-1 font-sans text-[0.84rem] leading-relaxed text-ink-2">
                {article.stats.citations} citation markers across{" "}
                {article.stats.distinctSources} distinct sources. Every number taken from the
                article carries its marker.
              </dd>
            </div>
            <div>
              <dt className="font-sans text-[0.72rem] font-bold uppercase tracking-wide text-ink-4">
                Projections
              </dt>
              <dd className="mt-1 font-sans text-[0.84rem] leading-relaxed text-ink-2">
                Annual growth derived from published evidence, labelled{" "}
                <em>modelled</em> wherever it appears.
              </dd>
            </div>
          </dl>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-5 cursor-pointer border-b-2 border-ink pb-0.5 font-sans text-[0.86rem] font-bold"
        >
          {open ? "Hide the full assumptions" : "Read the full assumptions"}
        </button>

        {open ? (
          <div className="mt-5 space-y-5 font-sans text-[0.84rem] leading-relaxed text-ink-2">
            <div>
              <p className="font-bold">Taken from article.md, unmodified</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink-3">
                <li>
                  Airport Improvement Fee of $30–$40 a ticket, 37 percent of large-airport revenue
                </li>
                <li>Taxes and fees at 25–35 percent of a Canadian ticket</li>
                <li>Aeronautical charges: +60 percent per passenger at Perth over a decade</li>
                <li>Airfares 3–3.5 percent higher on Brazilian routes with a privatised airport</li>
                <li>
                  UK parking at £98 a day for Heathrow short stay, £28 for 30 minutes at Stansted,
                  £751 million collected in 2025
                </li>
                <li>Workforce cut of 40 percent at Sydney Airport after protections expired</li>
                <li>Investor revenue requirement of 15–20 percent; Macquarie returns over 13 percent</li>
                <li>$3.95 billion of 2022 system revenue and $525 million of annual rent</li>
              </ul>
            </div>
            <div>
              <p className="font-bold">Modelled on top of them</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-ink-3">
                <li>
                  A representative $430 ticket decomposes into airline fare, Improvement Fee,
                  aeronautical charges and taxes at 28 percent. At year zero the parts sum back to
                  exactly the price entered.
                </li>
                <li>
                  Aeronautical charges rise at 5.36 percent a year — the annualised rate that
                  reproduces Perth&rsquo;s reported +60 percent across a decade — then ease to 2
                  percent.
                </li>
                <li>
                  Non-ticket charges ramp between years two and ten from today&rsquo;s levels to the
                  UK evidence: $59 a day parking, $24 drop-off, food and retail at 19 percent of a
                  ticket rather than 6.
                </li>
                <li>
                  Staffing at 62 jobs per million annual passengers, an illustrative density rather
                  than a published figure.
                </li>
                <li>
                  Airport concession revenue grows at 3 percent a year; the extraction is set at
                  17.5 percent, the midpoint of the reported band.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold">What this is not</p>
              <p className="mt-1.5 text-ink-3">
                No published study projects Canadian airport concessions year by year at this
                level of detail. These are direction-of-travel projections anchored to measured
                outcomes in other countries, not forecasts of a specific negotiated agreement. The
                build carries a source-integrity check that fails if any figure here stops
                matching the line it was taken from in article.md.
              </p>
            </div>
          </div>
        ) : null}

        <p className="mt-8 border-t border-rule pt-4 font-sans text-[0.76rem] leading-relaxed text-ink-4">
          Passenger volumes, staffing densities and the representative fare are context. Every
          reported figure, quotation and citation is attributed to the sources listed above.
          Announced {ANNOUNCEMENT_YEAR}.
        </p>
      </Column>
    </section>
  );
}
