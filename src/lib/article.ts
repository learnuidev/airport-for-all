/**
 * The source document is the single source of truth for this app.
 *
 * This module parses it at build time and produces a fully structured
 * representation (blocks + inline runs + citations). Nothing in the narrative
 * — headlines, decks, paragraph text, quotes, bullets, year ranges — is
 * hard-coded in a component. If you edit the source, the page changes.
 */

export type SectionId =
  | "year-1-2"
  | "year-3-5"
  | "year-5-10"
  | "year-10-15"
  | "year-15-25"
  | "year-25-plus"
  | "counterargument";

/* ------------------------------------------------------------------ *
 * Inline runs
 * ------------------------------------------------------------------ */

export type InlineRun =
  | { kind: "text"; value: string }
  | { kind: "strong"; value: string }
  | { kind: "em"; value: string }
  | {
      kind: "citation";
      refId: number;
      /** The marker exactly as written in the source, e.g. "[^14]" or "[citation:2]". */
      raw: string;
    }
  | { kind: "link"; value: string; href: string };

/* ------------------------------------------------------------------ *
 * Blocks
 * ------------------------------------------------------------------ */

export type BlockRole =
  /* plain prose */
  | "prose"
  /* a `**Label:**` lead paragraph — the spine of the year-by-year structure */
  | "lede-label"
  /* a labelled block whose label came from a `**Label:**` line */
  | "labelled"
  /* a blockquote */
  | "quote";

export type Block =
  | {
      type: "paragraph";
      role: BlockRole;
      /** e.g. "What happens", "International precedent", "Canada projection". */
      label: string | null;
      runs: InlineRun[];
      /** Plain-text flattening, handy for search, alt text and analytics. */
      text: string;
      /** Canonical reference ids cited by this block, in order of appearance. */
      refs: number[];
    }
  | {
      type: "list";
      items: { runs: InlineRun[]; text: string; refs: number[] }[];
      refs: number[];
    }
  | { type: "divider" };

export type Section = {
  id: SectionId;
  index: number;
  /** Full heading as written, e.g. "Year 3–5: The First Fee Increases". */
  heading: string;
  /** Part before the colon, e.g. "Year 3–5". */
  kicker: string;
  /** Part after the colon, e.g. "The First Fee Increases". */
  title: string;
  /** Numeric bounds parsed from the kicker when present. */
  startYear: number | null;
  endYear: number | null;
  /** True for the section that accumulates every year from its start onward. */
  openEnded: boolean;
  blocks: Block[];
  refs: number[];
  wordCount: number;
  /** Short pull-quote candidate: the boldest sentence in the section. */
  pullQuote: { text: string; refs: number[] } | null;
};

export type Reference = {
  id: number;
  publisher: string;
  title: string;
  date: string;
  url: string | null;
  kind: "think-tank" | "labour" | "news" | "academic" | "government" | "legal";
  /** True when this reference is cited by the prose that this app renders. */
  cited: boolean;
  /** Alternate marker used in the source's second draft, if any. */
  legacyId: number | null;
  /**
   * Groups references that point at the same underlying work (the source lists
   * the Brazilian airfare study twice, as [^5] and [^12]). Used so counts in the
   * source ledger do not double-count a single source.
   */
  groupKey: string;
};

export type ParsedArticle = {
  title: string;
  deck: string;
  /** Opening standfirst paragraphs before the first section. */
  standfirst: Block[];
  sections: Section[];
  references: Reference[];
  stats: {
    words: number;
    paragraphs: number;
    sections: number;
    citations: number;
    uniqueSources: number;
    /** Unique sources after collapsing duplicate listings of the same work. */
    distinctSources: number;
    readingMinutes: number;
  };
  /** Raw markdown, exposed for a built-in "read the source" view. */
  raw: string;
  rawLineCount: number;
};

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const CITATION_PATTERN = /\[\^(\d+)\]|\[citation:(\d+)\]/g;

/** Flatten runs to plain text. */
export function runsToText(runs: InlineRun[]): string {
  return runs
    .map((r) => {
      switch (r.kind) {
        case "citation":
          return "";
        case "link":
        case "text":
        case "strong":
        case "em":
          return r.value;
      }
    })
    .join("")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function collectRefs(runs: InlineRun[]): number[] {
  const seen: number[] = [];
  for (const run of runs) {
    if (run.kind === "citation" && !seen.includes(run.refId)) seen.push(run.refId);
  }
  return seen;
}

/**
 * Parse a single line of markdown into inline runs.
 * Supports **strong**, *em*, `[text](href)`, `[^n]` and `[citation:n]`.
 */
function parseInline(input: string): InlineRun[] {
  const runs: InlineRun[] = [];
  // One alternation, ordered so that citations win over emphasis.
  const tokenizer =
    /(\[\^\d+\]|\[citation:\d+\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (value: string) => {
    if (!value) return;
    const previous = runs[runs.length - 1];
    if (previous && previous.kind === "text") previous.value += value;
    else runs.push({ kind: "text", value });
  };

  while ((match = tokenizer.exec(input)) !== null) {
    pushText(input.slice(lastIndex, match.index));
    const [token] = match;

    if (match[1]) {
      const foot = /\[\^(\d+)\]/.exec(token);
      const modern = /\[citation:(\d+)\]/.exec(token);
      runs.push({
        kind: "citation",
        refId: Number(foot?.[1] ?? modern?.[1]),
        raw: token,
      });
    } else if (match[2]) {
      runs.push({ kind: "strong", value: match[2].slice(2, -2) });
    } else if (match[3]) {
      runs.push({ kind: "em", value: match[3].slice(1, -1) });
    } else if (match[4]) {
      const linked = /\[([^\]]+)\]\(([^)]+)\)/.exec(match[4]);
      if (linked) runs.push({ kind: "link", value: linked[1], href: linked[2] });
    }

    lastIndex = match.index + token.length;
  }

  pushText(input.slice(lastIndex));
  return runs;
}

/* ------------------------------------------------------------------ *
 * Reference numbering
 * ------------------------------------------------------------------ */

/**
 * The source ships two drafts. The first uses footnote markers `[^n]`
 * (15 sources); the second uses `[citation:n]` (20 sources). This app renders
 * the first draft's prose, so its `[^n]` numbering is canonical, and the
 * second draft's numbers are tracked as `legacyId` for cross-checking.
 */
const LEGACY_BY_CANONICAL: Record<number, number> = {
  1: 14,
  2: 12,
  3: 5,
  4: 2,
  5: 8,
  6: 21,
  7: 13,
  8: 30,
  9: 7,
  10: 15,
  11: 26,
  12: 5,
  13: 11,
  14: 2,
  15: 6,
};

const LEGACY_CITED = new Set(Object.values(LEGACY_BY_CANONICAL));

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

const SECTION_IDS: Record<string, SectionId> = {
  "Year 1–2: The Deal is Signed, Protections Expire": "year-1-2",
  "Year 3–5: The First Fee Increases": "year-3-5",
  'Year 5–10: The "Nickel-and-Dime" Era': "year-5-10",
  "Year 10–15: Profits Flow Out, Investment Flows In (Selectively)": "year-10-15",
  "Year 15–25: The Service Quality Question": "year-15-25",
  "Year 25+: The Monopoly Locks In": "year-25-plus",
  "The Counterargument: What Could Go Right": "counterargument",
};

function parseKicker(kicker: string): {
  startYear: number | null;
  endYear: number | null;
  openEnded: boolean;
} {
  const clean = kicker.replace(/[—–]/g, "-").replace(/\s/g, "");
  const plus = /^Year(\d+)\+$/i.exec(clean);
  if (plus) return { startYear: Number(plus[1]), endYear: null, openEnded: true };
  const range = /^Year(\d+)-(\d+)$/i.exec(clean);
  if (range)
    return { startYear: Number(range[1]), endYear: Number(range[2]), openEnded: false };
  return { startYear: null, endYear: null, openEnded: false };
}

/**
 * The boldest sentence in a section, used for the pull-quote treatment.
 * Prefers a sentence containing a number or a direct quotation.
 */
function pickPullQuote(blocks: Block[]): { text: string; refs: number[] } | null {
  const candidates: { text: string; refs: number[]; score: number }[] = [];

  for (const block of blocks) {
    if (block.type !== "paragraph") continue;
    const strongish = block.runs.filter((r) => r.kind === "strong").map((r) => r.value);
    // Drop a leading "**Label:**" so the pull-quote is a sentence, not a field name.
    const body = block.text.replace(/^[A-Z][^:]{0,40}:\s*/, "");
    const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z"“])/);
    for (const sentence of sentences) {
      if (sentence.length < 45 || sentence.length > 210) continue;
      if (/^[A-Z][^:]{0,40}:/.test(sentence)) continue; // still a label
      const isStrong = strongish.some((s) => sentence.includes(s.slice(0, 24)));
      const hasNumber = /\d/.test(sentence);
      const score = (isStrong ? 4 : 0) + (hasNumber ? 2 : 0);
      if (score > 0) candidates.push({ text: sentence, refs: block.refs, score });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || b.text.length - a.text.length);
  return { text: candidates[0].text, refs: candidates[0].refs };
}

/* ------------------------------------------------------------------ *
 * Main parser
 * ------------------------------------------------------------------ */

export function parseArticle(markdown: string): ParsedArticle {
  const raw = markdown.replace(/\r\n/g, "\n");
  const lines = raw.split("\n");

  let title = "";
  let deck = "";
  const standfirst: Block[] = [];
  const sections: Section[] = [];

  let current: Section | null = null;
  const citedRefIds = new Set<number>();
  let paragraphCount = 0;

  const pushBlock = (block: Block) => {
    if (current) current.blocks.push(block);
    else standfirst.push(block);
  };

  const makeParagraph = (text: string): Block => {
    const runs = parseInline(text.trim());
    const labelMatch = /^\*\*([^*]+):\*\*\s*(.*)$/s.exec(text.trim());
    const text_ = runsToText(runs);
    const refs = collectRefs(runs);
    refs.forEach((r) => citedRefIds.add(r));
    paragraphCount += 1;
    if (labelMatch) {
      return {
        type: "paragraph",
        role: "labelled",
        label: labelMatch[1].trim(),
        runs,
        text: text_,
        refs,
      };
    }
    return { type: "paragraph", role: "prose", label: null, runs, text: text_, refs };
  };

  let listBuffer: string[] = [];
  const flushList = () => {
    if (!listBuffer.length) return;
    const items = listBuffer.map((item) => {
      const runs = parseInline(item);
      const refs = collectRefs(runs);
      refs.forEach((r) => citedRefIds.add(r));
        return { runs, text: runsToText(runs), refs };
    });
    const refs = [...new Set(items.flatMap((i) => i.refs))];
    pushBlock({ type: "list", items, refs });
    listBuffer = [];
  };

  const flushSection = () => {
    if (!current) return;
    const wordCount = current.blocks.reduce((total, block) => {
      if (block.type === "paragraph") return total + block.text.split(/\s+/).length;
      if (block.type === "list")
        return total + block.items.reduce((t, i) => t + i.text.split(/\s+/).length, 0);
      return total;
    }, 0);
    current.wordCount = wordCount;
    current.refs = [...new Set(current.blocks.flatMap((b) => (b.type === "divider" ? [] : b.refs)))];
    current.pullQuote = pickPullQuote(current.blocks);
    sections.push(current);
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // The file contains the article twice (two research drafts). Everything
    // from the second H1 onward is ignored: it is the same reporting with a
    // different citation style, and its numbering is captured in refs.ts.
    if (trimmed.startsWith("# ") && sections.length > 0) break;

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim();
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      flushSection();
      const heading = trimmed.slice(3).trim();
      // The trailing "## References" heading opens the source's footnote block;
      // that block is already captured by refs.ts, so parsing stops there.
      if (/^references$/i.test(heading)) break;
      const [kickerRaw, ...rest] = heading.split(":");
      const kicker = kickerRaw.trim();
      const { startYear, endYear, openEnded } = parseKicker(kicker);
      current = {
        id: SECTION_IDS[heading] ?? "counterargument",
        index: sections.length,
        heading,
        kicker,
        title: rest.join(":").trim() || heading,
        startYear,
        endYear,
        openEnded,
        blocks: [],
        refs: [],
        wordCount: 0,
        pullQuote: null,
      };
      continue;
    }

    if (trimmed === "---") {
      flushList();
      pushBlock({ type: "divider" });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      listBuffer.push(trimmed.slice(2).trim());
      continue;
    }

    if (/^\*\*[^*]+\*\*$/.test(trimmed) && !current) {
      deck = trimmed.slice(2, -2).trim();
      continue;
    }

    flushList();
    pushBlock(makeParagraph(trimmed));
  }

  flushList();
  flushSection();

  const wordCount =
    standfirst.reduce(
      (total, block) =>
        total + (block.type === "paragraph" ? block.text.split(/\s+/).length : 0),
      0,
    ) + sections.reduce((total, s) => total + s.wordCount, 0);

  const references = buildReferences(citedRefIds);

  // Recount citations from the final block tree so the number reported in the
  // byline matches exactly what is rendered.
  const countCitations = (runs: InlineRun[]) =>
    runs.reduce((total, run) => total + (run.kind === "citation" ? 1 : 0), 0);
  const renderable = [
    ...standfirst,
    ...sections.flatMap((section) => section.blocks),
  ];
  const renderedCitations = renderable.reduce((total, block) => {
    if (block.type === "paragraph") return total + countCitations(block.runs);
    if (block.type === "list")
      return total + block.items.reduce((t, item) => t + countCitations(item.runs), 0);
    return total;
  }, 0);

  return {
    title,
    deck,
    standfirst,
    sections,
    references,
    stats: {
      words: wordCount,
      paragraphs: paragraphCount,
      sections: sections.length,
      citations: renderedCitations,
      uniqueSources: citedRefIds.size,
      distinctSources: countDistinctSources(references),
      readingMinutes: Math.max(1, Math.round(wordCount / 225)),
    },
    raw,
    rawLineCount: lines.length,
  };
}

/* ------------------------------------------------------------------ *
 * References
 * ------------------------------------------------------------------ */

type RefSeed = Omit<Reference, "cited" | "legacyId" | "id" | "groupKey">;

/** Order matches the first draft's footnote markers — the canonical numbering. */
const REF_SEEDS: RefSeed[] = [
  {
    publisher: "Canadian Centre for Policy Alternatives",
    title: "Air travel in Canada is about to get more expensive",
    date: "September 14, 2026",
    url: "https://www.policyalternatives.ca/news-research/air-travel-in-canada-is-about-to-get-more-expensive/",
    kind: "think-tank",
  },
  {
    publisher: "Canadian Labour Congress",
    title: "Airport privatization would cost workers and passengers, CLC report warns",
    date: "September 10, 2026",
    url: "https://canadianlabour.ca/airport-privatization-would-cost-workers-and-passengers-clc-report-warns/",
    kind: "labour",
  },
  {
    publisher: "iPolitics",
    title: "Airport sales and tax breaks: Carney's play to lure global investment",
    date: "September 15, 2026",
    url: "https://www.ipolitics.ca/2026/09/15/investment-summit-effective-tax-rate-pipelines-canada-strong-fund/",
    kind: "news",
  },
  {
    publisher: "Australian Competition and Consumer Commission",
    title: "Regulatory report — Phase II airports",
    date: "April 2000",
    url: null,
    kind: "government",
  },
  {
    publisher: "Transport Policy",
    title:
      "An econometric study of the effects of airport privatization on airfares in Brazil (Brito, Oliveira & Dresner)",
    date: "December 2021",
    url: null,
    kind: "academic",
  },
  {
    publisher: "UK Parliament",
    title: "Written Questions and Answers",
    date: "October 31, 2025",
    url: null,
    kind: "government",
  },
  {
    publisher: "PAXnews",
    title: "'Canadians already pay too much to fly': CLC warns against airport privatization",
    date: "September 13, 2026",
    url: "https://www.paxnews.com/news/airline/canadians-already-pay-too-much-fly-clc-warns-against-airport-privatization",
    kind: "news",
  },
  {
    publisher: "The Hill Times",
    title:
      "'We're not even part of the discussion,' says transport union after Carney opens airports to private investment",
    date: "September 15, 2026",
    url: "https://www.hilltimes.com/2026/09/15/were-not-even-part-of-the-discussion-says-transport-union-after-carney-opens-airports-to-private-investment/518229/",
    kind: "news",
  },
  {
    publisher: "House of Commons",
    title: "Order Paper Question Q-1227, 45th Parliament, 1st Session",
    date: "May 2026",
    url: null,
    kind: "government",
  },
  {
    publisher: "98.5 Montréal",
    title: "Aéroports privatisés : « C'est un changement radical dans les façons de faire »",
    date: "September 2026",
    url: null,
    kind: "news",
  },
  {
    publisher: "Australian Competition and Consumer Commission",
    title: "Privatised airports rate strong on quality of service",
    date: "April 1999",
    url: null,
    kind: "government",
  },
  {
    publisher: "Brito, Oliveira & Dresner",
    title: "Working Paper",
    date: "2021",
    url: null,
    kind: "academic",
  },
  {
    publisher: "LBC",
    title: "Holidaymakers hit with £2m a day airport parking bill at five major UK hubs",
    date: "March 2026",
    url: "https://www.lbc.co.uk/news/airport-parking-fees-2m-a-day/",
    kind: "news",
  },
  {
    publisher: "Canadian Labour Congress",
    title: "Public Runways, Private Profits: Why Airport Privatization Would Be Risky and Costly for Canadians",
    date: "September 2026",
    url: null,
    kind: "labour",
  },
  {
    publisher: "Gowling WLG",
    title: "Airport Privatization in Canada: Models and Legal Issues",
    date: "September 13, 2026",
    url: "https://gowlingwlg.com/en/insights-resources/articles/2026/airport-privatization",
    kind: "legal",
  },
];

/**
 * The report that carries the financial statements and the international
 * record: the Canadian Labour Congress's full case.
 */
const REPORT_SEEDS: RefSeed[] = [
  {
    publisher: "Canadian Labour Congress",
    title:
      "Public Runways, Private Profits: Why Airport Privatization Would Be Risky and Costly for Canadians",
    date: "2026",
    url: null,
    kind: "labour",
  },
];

/** Sources carried only by the second draft's reference list. */
const SECOND_DRAFT_SEEDS: RefSeed[] = [
  {
    publisher: "University of Alberta / Troy Media",
    title: "Airports perform better when owned by private equity funds",
    date: "March 29, 2023",
    url: "https://admin.troymedia.com/blog/business/private-ownership/",
    kind: "academic",
  },
  {
    publisher: "The Globe and Mail",
    title: "Ottawa urged to end airport rent fees",
    date: "April 17, 2013",
    url: "https://www.theglobeandmail.com/report-on-business/ottawa-urged-to-end-airport-rent-fees/article11391376/",
    kind: "news",
  },
  {
    publisher: "The Canadian Press",
    title: "What you need to know about Carney's pitch for private investment in airports",
    date: "September 14, 2026",
    url: "https://www.thecanadianpressnews.ca/national/what-you-need-to-know-about-carneys-pitch-for-private-investment-in-airports/article_1e9e4eab-51a7-5578-9897-937935fa1bd3.html",
    kind: "news",
  },
  {
    publisher: "Phys.org",
    title: "Airports perform better when owned by private equity funds, study finds",
    date: "March 29, 2023",
    url: "https://phys.org/news/2023-03-airports-private-equity-funds.html",
    kind: "news",
  },
  {
    publisher: "iPolitics",
    title: "There is no free money in airport privatization",
    date: "September 14, 2026",
    url: "https://www.ipolitics.ca/2026/09/15/there-is-no-free-money-in-airport-privatization/",
    kind: "news",
  },
  {
    publisher: "UK Parliament Hansard",
    title: "Airport Drop-off Charges",
    date: "January 12, 2026",
    url: "https://hansard.parliament.uk/Commons/2026-01-13/debates/A6D0F47F-8DC4-403B-9A66-59092928897D/details",
    kind: "government",
  },
  {
    publisher: "Mirage News",
    title: "Research: Private Equity Ownership Boosts Airport Performance",
    date: "March 28, 2023",
    url: "https://www.miragenews.com/research-private-equity-ownership-boosts-976765/",
    kind: "news",
  },
  {
    publisher: "CBC News",
    title: "Carney says government to open up Canada's 4 largest airports to private investment",
    date: "September 15, 2026",
    url: "https://www.cbc.ca/lite/story/9.7344327",
    kind: "news",
  },
  {
    publisher: "CTV News",
    title: "Federal government expected to announce legislation on future of Canadian airports",
    date: "September 14, 2026",
    url: "https://www.ctvnews.ca/politics/article/federal-liberal-caucus-holds-call-to-discuss-canadian-airports-sources/",
    kind: "news",
  },
  {
    publisher: "Les Affaires",
    title: "La privatisation des aéroports coûterait davantage au personnel et au public voyageur, selon le CTC",
    date: "September 10, 2026",
    url: "https://www.lesaffaires.com/communique-de-presse/la-privatisation-des-aeroports-couterait-davantage-au-personnel-et-au-public-voyageur-selon-le-ctc/",
    kind: "news",
  },
  {
    publisher: "Canadian Centre for Policy Alternatives",
    title: "Keep Canadian airports public",
    date: "May 7, 2026",
    url: "https://www.policyalternatives.ca/news-research/keep-canadian-airports-public/",
    kind: "think-tank",
  },
  {
    publisher: "Annex Business Media",
    title: "Cover Stories: Landing opportunities, the push for private investment in Canadian airports",
    date: "April 4, 2026",
    url: "https://cdn.annexbusinessmedia.com/WG/etrending/2026/04/05/ANXCD260402021-mail.html",
    kind: "news",
  },
];

function buildReferences(cited: Set<number>): Reference[] {
  const canonical: Reference[] = REF_SEEDS.map((seed, i) => ({
    ...seed,
    id: i + 1,
    cited: cited.has(i + 1),
    legacyId: LEGACY_BY_CANONICAL[i + 1] ?? null,
    groupKey: "",
  }));

  const report: Reference[] = REPORT_SEEDS.map((seed, i) => ({
    ...seed,
    id: REF_SEEDS.length + i + 1,
    cited: false,
    legacyId: null,
    groupKey: "",
  }));

  const extras: Reference[] = SECOND_DRAFT_SEEDS.filter(
    (_, i) => !LEGACY_CITED.has(i + 1),
  ).map((seed, i) => ({
    ...seed,
    id: REF_SEEDS.length + REPORT_SEEDS.length + i + 1,
    cited: false,
    legacyId: null,
    groupKey: "",
  }));

  const all = [...canonical, ...report, ...extras];

  // The source lists the Brazilian airfare study twice ([^5] in prose, [^12] in
  // the footnote block). Collapse references that share a legacy marker or a URL
  // onto one group key so the ledger can report an honest distinct-source count.
  const byLegacy = new Map<number, number>();
  for (const ref of all) {
    if (ref.legacyId === null) continue;
    if (!byLegacy.has(ref.legacyId)) byLegacy.set(ref.legacyId, ref.id);
  }
  for (const ref of all) {
    const twin = ref.legacyId !== null ? byLegacy.get(ref.legacyId) : undefined;
    ref.groupKey = ref.url ?? slugKey(`${ref.publisher} ${ref.title}`);
    if (twin !== undefined && twin !== ref.id) ref.groupKey = `legacy:${ref.legacyId}`;
  }

  return all;
}

function slugKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Distinct works behind the reference list, collapsing duplicate listings. */
export function countDistinctSources(references: Reference[]): number {
  const works = new Set<string>();
  for (const ref of references) {
    works.add(
      ref.groupKey.startsWith("legacy:")
        ? // Both members of a duplicate pair collapse to the same work.
          `work:${ref.groupKey}`
        : `work:${slugKey(`${ref.publisher}|${ref.title}`)}`,
    );
  }
  return works.size;
}
