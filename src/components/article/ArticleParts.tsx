import Link from "next/link";
import { Prose } from "@/components/citations/Prose";
import { CitationMarker } from "@/components/citations/CitationMarker";
import type { ParsedArticle, Section } from "@/lib/article";
import { ANNOUNCEMENT_YEAR, FACTS, PHASES } from "@/lib/sourced";
import {
  ConcessionStrip,
  FeeScenarios,
  StudyResult,
  TicketMini,
} from "@/components/inline/InlineModules";
import { CommitmentList } from "@/components/inline/CommitmentList";

/* ------------------------------------------------------------------ *
 * Masthead
 * ------------------------------------------------------------------ */

export function Masthead({ article }: { article: ParsedArticle }) {
  const [headline, subhead] = article.title.split(":");

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-caps rounded-full bg-accent-soft px-2.5 py-1 text-accent">
            Projection
          </span>
          <span className="text-[0.78rem] text-ink-4">
            15 September {ANNOUNCEMENT_YEAR} · {article.stats.readingMinutes} min read
          </span>
        </div>

        <h1 className="mt-5 font-display text-[2.1rem] font-semibold leading-[1.13] tracking-[-0.015em] text-ink sm:text-[2.75rem]">
          {headline}:
          <span className="block text-ink-2">{subhead}</span>
        </h1>

        <p className="mt-6 border-l-2 border-accent pl-4 text-[1.12rem] leading-relaxed text-ink-2">
          {article.deck}
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[0.8rem] text-ink-4">
            {article.stats.readingMinutes} min read · {article.stats.citations} citations, all
            linked
          </p>
          <Link href="/sources" className="text-[0.8rem] text-blue hover:underline">
            Source ledger →
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ *
 * Ledger strip: the four airports, stated once
 * ------------------------------------------------------------------ */

export function AirportStrip() {
  return (
    <section className="pb-2">
      <p className="prose-body">
        Four airports are on the table: <strong className="text-ink">Toronto Pearson</strong>,{" "}
        <strong className="text-ink">Vancouver International</strong>,{" "}
        <strong className="text-ink">Montréal–Trudeau</strong> and{" "}
        <strong className="text-ink">Calgary International</strong>. Together they carry the great
        majority of Canadian air traffic — and two of them, Vancouver and Calgary, are represented
        by a union that says it was never consulted. <CitationMarker refId={8} />
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter
 * ------------------------------------------------------------------ */

function ChapterBody({
  section,
  index,
  children,
}: {
  section: Section;
  index: number;
  children?: React.ReactNode;
}) {
  const phase = PHASES.find((item) => item.id === section.id);
  const start = section.startYear;
  const window =
    start === null
      ? null
      : section.endYear !== null
        ? `${ANNOUNCEMENT_YEAR + start}–${ANNOUNCEMENT_YEAR + section.endYear}`
        : `${ANNOUNCEMENT_YEAR + start} and beyond`;

  return (
    <section id={section.id} className="scroll-mt-20 border-t border-line py-12 first:border-t-0">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem]">
        <span className="label-caps text-accent">{section.kicker}</span>
        {window ? <span className="text-ink-4">{window}</span> : null}
        {phase && phase.lever !== "Guardrails" ? (
          <span className="text-ink-4">· {index + 1} of 6</span>
        ) : null}
      </p>

      <h2 className="mt-2 font-display text-[1.65rem] font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[1.95rem]">
        {section.title}
      </h2>

      {phase ? (
        <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-3">{phase.mechanism}</p>
      ) : null}

      <div className="mt-6">
        <Prose blocks={section.blocks} />
      </div>

      {section.pullQuote ? (
        <blockquote className="mt-8 border-l-2 border-line-strong pl-5">
          <p className="font-display text-[1.2rem] leading-relaxed text-ink">
            {section.pullQuote.text}
          </p>
        </blockquote>
      ) : null}

      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Chapters with their one visual each
 * ------------------------------------------------------------------ */

export function ArticleBody() {
  return null;
}

export function ChapterWorkforce({ section, index }: { section: Section; index: number }) {
  return (
    <ChapterBody section={section} index={index}>
      <div className="border-l-2 border-accent pl-4">
        <p className="text-[0.95rem] leading-relaxed text-ink-2">
          Sydney&rsquo;s owners cut <strong className="text-ink">40% of the workforce</strong> once
          post-sale protections expired. At typical staffing density that is roughly{" "}
          <strong className="text-ink">3,400 jobs</strong> across these four airports — and private
          investors need <strong className="text-ink">15–20% more revenue</strong> than the
          non-profit model generates. <CitationMarker refId={14} />
        </p>
        <Link href="/airports" className="mt-2 inline-flex text-[0.82rem] font-medium text-blue hover:underline">
          Compare the four airports →
        </Link>
      </div>
    </ChapterBody>
  );
}

export function ChapterFirstFees({ section, index }: { section: Section; index: number }) {
  return (
    <ChapterBody section={section} index={index}>
      <TicketMini />
    </ChapterBody>
  );
}

export function ChapterNickel({ section, index }: { section: Section; index: number }) {
  return (
    <ChapterBody section={section} index={index}>
      <FeeScenarios />
    </ChapterBody>
  );
}

export function ChapterProfits({ section, index }: { section: Section; index: number }) {
  return (
    <ChapterBody section={section} index={index}>
      <p className="border-l-2 border-line-strong pl-4 text-[0.95rem] leading-relaxed text-ink-2">
        In 2022 the airport authorities took in <strong className="text-ink">$3.95 billion</strong>{" "}
        and made no profit at all — expenses and revenues were effectively identical. They also
        return about <strong className="text-ink">$525 million a year</strong> in rent to the
        federal government. A privatised authority would instead drive revenue up and costs down to
        create a profit it could pay to shareholders. <CitationMarker refId={1} />
      </p>
    </ChapterBody>
  );
}

export function ChapterService({ section, index }: { section: Section; index: number }) {
  return (
    <ChapterBody section={section} index={index}>
      <StudyResult />
    </ChapterBody>
  );
}

export function ChapterLockIn({ section, index }: { section: Section; index: number }) {
  return (
    <ChapterBody section={section} index={index}>
      <ConcessionStrip />
    </ChapterBody>
  );
}

export function ChapterCounterargument({ section, index }: { section: Section; index: number }) {
  return (
    <ChapterBody section={section} index={index}>
      <CommitmentList />
    </ChapterBody>
  );
}

/* ------------------------------------------------------------------ *
 * Closing
 * ------------------------------------------------------------------ */

export function Closing() {
  return (
    <section className="border-t border-line py-14">
      <h2 className="font-display text-[1.65rem] font-semibold text-ink">The bottom line</h2>

      <p className="prose-body mt-4">
        Canada already ranks <strong className="text-ink">101st of 116 countries</strong> for air
        travel affordability, with taxes and fees making up 25–35% of a ticket.{" "}
        <CitationMarker refId={14} /> The concessions on offer run{" "}
        <strong className="text-ink">50 to 99 years</strong> with no viable exit.{" "}
        <CitationMarker refId={1} />
      </p>

      <p className="prose-body mt-4">
        &ldquo;Any way you cut it, privatizing airports is a good deal for private buyers and a
        terrible deal for travellers and workers.&rdquo; <CitationMarker refId={1} />
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/ticket"
          className="rounded-lg bg-ink px-4 py-2.5 text-[0.85rem] font-medium text-white transition hover:bg-ink-2"
        >
          Work out your own ticket
        </Link>
        <Link
          href="/projection"
          className="rounded-lg border border-line-strong px-4 py-2.5 text-[0.85rem] font-medium text-ink transition hover:bg-paper-3"
        >
          See the projection
        </Link>
      </div>
    </section>
  );
}
