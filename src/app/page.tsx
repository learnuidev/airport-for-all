import { getArticle, type Section } from "@/lib/article";
import { ArticleProvider } from "@/components/editorial/ArticleContext";
import { Chapter, Column, Headline, Masthead, TripRibbon, Wide } from "@/components/editorial/Shell";
import { TripSetup } from "@/components/editorial/TripSetup";
import { Prose } from "@/components/editorial/Prose";
import {
  EvidenceFigure,
  JourneyFigure,
  LockInFigure,
  PromisesFigure,
  RevenueFigure,
  ServiceFigure,
  TicketFigure,
  WorkforceFigure,
} from "@/components/editorial/figures";
import { MethodBox, SourcesIndex, Verdict } from "@/components/editorial/Closing";

/**
 * One article. article.md is the source of truth for every word of narrative;
 * the figures and the two opening questions are wired to the same reported
 * numbers, so the piece reads as a single argument rather than a set of tools.
 */
export default function ArticlePage() {
  const article = getArticle();
  const bySlug = new Map(article.sections.map((section) => [section.id, section]));
  const pick = (id: string) => bySlug.get(id as Section["id"]);

  const workforce = pick("year-1-2");
  const firstFees = pick("year-3-5");
  const nickel = pick("year-5-10");
  const profits = pick("year-10-15");
  const service = pick("year-15-25");
  const lockIn = pick("year-25-plus");
  const counterargument = pick("counterargument");

  const [headline, subhead] = article.title.split(":");

  return (
    <ArticleProvider references={article.references}>
      <Masthead />

      <Headline
        kicker="The concession dossier"
        title={`${headline}:${subhead}`}
        deck={article.deck}
        byline="The Data Desk"
        dateline="15 September 2026"
        meta={`${article.stats.words.toLocaleString()} words · ${article.stats.citations} citations from ${article.stats.distinctSources} sources · ${article.stats.readingMinutes} minute read`}
      />

      <TripRibbon />

      <Column className="pb-4">
        <Prose blocks={article.standfirst} lead />
      </Column>

      <TripSetup />

      {workforce ? (
        <Chapter
          id="year-1-2"
          eyebrow={`Chapter one · ${workforce.kicker}`}
          title={workforce.title}
          standfirst="The concession agreements are negotiated and signed. Initial promises of investment and efficiency dominate headlines. The fine print that matters is the duration of any job protection clauses."
          figures={<WorkforceFigure />}
        >
          <Prose blocks={workforce.blocks} />
        </Chapter>
      ) : null}

      {firstFees ? (
        <Chapter
          id="year-3-5"
          eyebrow={`Chapter two · ${firstFees.kicker}`}
          title={firstFees.title}
          standfirst="The new operators begin optimising revenue. The most immediate lever is aeronautical charges — the fees airports charge airlines for landing, gates and passenger handling."
          figures={<TicketFigure />}
        >
          <Prose blocks={firstFees.blocks} />
        </Chapter>
      ) : null}

      {nickel ? (
        <Chapter
          id="year-5-10"
          eyebrow={`Chapter three · ${nickel.kicker}`}
          title={nickel.title}
          standfirst="Privatised operators, needing to grow profits beyond aeronautical charges, turn to non-aeronautical revenue — charging for things Canadians currently get for free."
          figures={<JourneyFigure />}
        >
          <Prose blocks={nickel.blocks} />
        </Chapter>
      ) : null}

      {profits ? (
        <Chapter
          id="year-10-15"
          eyebrow={`Chapter four · ${profits.kicker}`}
          title={profits.title}
          standfirst="The airport becomes a profitable asset generating consistent returns for its private owners — often foreign pension funds and infrastructure investors. Dividends are paid."
          figures={<RevenueFigure />}
        >
          <Prose blocks={profits.blocks} />
        </Chapter>
      ) : null}

      {service ? (
        <Chapter
          id="year-15-25"
          eyebrow={`Chapter five · ${service.kicker}`}
          title={service.title}
          standfirst="Investment priorities diverge from passenger needs. Private operators favour capital spending that generates revenue over spending that does not."
          figures={<ServiceFigure />}
        >
          <Prose blocks={service.blocks} />
        </Chapter>
      ) : null}

      {lockIn ? (
        <Chapter
          id="year-25-plus"
          eyebrow={`Chapter six · ${lockIn.kicker}`}
          title={lockIn.title}
          standfirst="The concession agreement, often spanning 50 to 99 years, creates a private monopoly with no viable exit. The public loses the ability to influence airport governance through democratic means."
          figures={<LockInFigure />}
        >
          <Prose blocks={lockIn.blocks} />
        </Chapter>
      ) : null}

      <section id="evidence" className="scroll-mt-16 border-t border-rule py-10 sm:py-14">
        <Column>
          <p className="font-sans text-[0.74rem] font-bold uppercase tracking-[0.1em] text-ink-4">
            The evidence
          </p>
          <h2 className="mt-2.5 font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.01em] sm:text-[2.1rem]">
            What the record shows
          </h2>
          <p className="mt-4 font-serif text-[1.22rem] leading-relaxed text-ink-2">
            The projection above rests on what happened elsewhere. article.md reviews five
            countries and three decades; the pattern is consistent, and one academic study shows
            genuine benefits alongside the bill.
          </p>
        </Column>
        <Wide className="mt-9 space-y-10">
          <EvidenceFigure />
          <PromisesFigure />
        </Wide>
      </section>

      {counterargument ? (
        <Chapter
          id="counterargument"
          eyebrow="The counterargument"
          title={counterargument.title}
          standfirst="The case for the deal is in the article too, and it depends on conditions that have rarely held."
        >
          <Prose blocks={counterargument.blocks} />
        </Chapter>
      ) : null}

      <Verdict />

      <SourcesIndex references={article.references} />
      <MethodBox article={article} />
    </ArticleProvider>
  );
}
