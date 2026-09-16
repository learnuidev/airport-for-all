"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var article_exports = {};
__export(article_exports, {
  countDistinctSources: () => countDistinctSources,
  getArticle: () => getArticle,
  parseArticle: () => parseArticle,
  runsToText: () => runsToText
});
module.exports = __toCommonJS(article_exports);
const CITATION_PATTERN = /\[\^(\d+)\]|\[citation:(\d+)\]/g;
function runsToText(runs) {
  return runs.map((r) => {
    switch (r.kind) {
      case "citation":
        return "";
      case "link":
      case "text":
      case "strong":
      case "em":
        return r.value;
    }
  }).join("").replace(/\s+([.,;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
}
function collectRefs(runs) {
  const seen = [];
  for (const run of runs) {
    if (run.kind === "citation" && !seen.includes(run.refId)) seen.push(run.refId);
  }
  return seen;
}
function parseInline(input) {
  const runs = [];
  const tokenizer = /(\[\^\d+\]|\[citation:\d+\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  const pushText = (value) => {
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
        raw: token
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
const LEGACY_BY_CANONICAL = {
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
  15: 6
};
const LEGACY_CITED = new Set(Object.values(LEGACY_BY_CANONICAL));
const SECTION_IDS = {
  "Year 1\u20132: The Deal is Signed, Protections Expire": "year-1-2",
  "Year 3\u20135: The First Fee Increases": "year-3-5",
  'Year 5\u201310: The "Nickel-and-Dime" Era': "year-5-10",
  "Year 10\u201315: Profits Flow Out, Investment Flows In (Selectively)": "year-10-15",
  "Year 15\u201325: The Service Quality Question": "year-15-25",
  "Year 25+: The Monopoly Locks In": "year-25-plus",
  "The Counterargument: What Could Go Right": "counterargument"
};
function parseKicker(kicker) {
  const clean = kicker.replace(/[—–]/g, "-").replace(/\s/g, "");
  const plus = /^Year(\d+)\+$/i.exec(clean);
  if (plus) return { startYear: Number(plus[1]), endYear: null, openEnded: true };
  const range = /^Year(\d+)-(\d+)$/i.exec(clean);
  if (range)
    return { startYear: Number(range[1]), endYear: Number(range[2]), openEnded: false };
  return { startYear: null, endYear: null, openEnded: false };
}
function pickPullQuote(blocks) {
  const candidates = [];
  for (const block of blocks) {
    if (block.type !== "paragraph") continue;
    const strongish = block.runs.filter((r) => r.kind === "strong").map((r) => r.value);
    const body = block.text.replace(/^[A-Z][^:]{0,40}:\s*/, "");
    const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z"“])/);
    for (const sentence of sentences) {
      if (sentence.length < 45 || sentence.length > 210) continue;
      if (/^[A-Z][^:]{0,40}:/.test(sentence)) continue;
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
function parseArticle(markdown) {
  const raw = markdown.replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  let title = "";
  let deck = "";
  const standfirst = [];
  const sections = [];
  let current = null;
  const citedRefIds = /* @__PURE__ */ new Set();
  let paragraphCount = 0;
  const pushBlock = (block) => {
    if (current) current.blocks.push(block);
    else standfirst.push(block);
  };
  const makeParagraph = (text) => {
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
        refs
      };
    }
    return { type: "paragraph", role: "prose", label: null, runs, text: text_, refs };
  };
  let listBuffer = [];
  const flushList = () => {
    if (!listBuffer.length) return;
    const items = listBuffer.map((item) => {
      const runs = parseInline(item);
      const refs2 = collectRefs(runs);
      refs2.forEach((r) => citedRefIds.add(r));
      return { runs, text: runsToText(runs), refs: refs2 };
    });
    const refs = [...new Set(items.flatMap((i) => i.refs))];
    pushBlock({ type: "list", items, refs });
    listBuffer = [];
  };
  const flushSection = () => {
    if (!current) return;
    const wordCount2 = current.blocks.reduce((total, block) => {
      if (block.type === "paragraph") return total + block.text.split(/\s+/).length;
      if (block.type === "list")
        return total + block.items.reduce((t, i) => t + i.text.split(/\s+/).length, 0);
      return total;
    }, 0);
    current.wordCount = wordCount2;
    current.refs = [...new Set(current.blocks.flatMap((b) => b.type === "divider" ? [] : b.refs))];
    current.pullQuote = pickPullQuote(current.blocks);
    sections.push(current);
    current = null;
  };
  for (const line of lines) {
    const trimmed = line.trim();
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
        pullQuote: null
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
  const wordCount = standfirst.reduce(
    (total, block) => total + (block.type === "paragraph" ? block.text.split(/\s+/).length : 0),
    0
  ) + sections.reduce((total, s) => total + s.wordCount, 0);
  const references = buildReferences(citedRefIds);
  const countCitations = (runs) => runs.reduce((total, run) => total + (run.kind === "citation" ? 1 : 0), 0);
  const renderable = [
    ...standfirst,
    ...sections.flatMap((section) => section.blocks)
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
      readingMinutes: Math.max(1, Math.round(wordCount / 225))
    },
    raw,
    rawLineCount: lines.length
  };
}
const REF_SEEDS = [
  {
    publisher: "Canadian Centre for Policy Alternatives",
    title: "Air travel in Canada is about to get more expensive",
    date: "September 14, 2026",
    url: "https://www.policyalternatives.ca/news-research/air-travel-in-canada-is-about-to-get-more-expensive/",
    kind: "think-tank"
  },
  {
    publisher: "Canadian Labour Congress",
    title: "Airport privatization would cost workers and passengers, CLC report warns",
    date: "September 10, 2026",
    url: "https://canadianlabour.ca/airport-privatization-would-cost-workers-and-passengers-clc-report-warns/",
    kind: "labour"
  },
  {
    publisher: "iPolitics",
    title: "Airport sales and tax breaks: Carney's play to lure global investment",
    date: "September 15, 2026",
    url: "https://www.ipolitics.ca/2026/09/15/investment-summit-effective-tax-rate-pipelines-canada-strong-fund/",
    kind: "news"
  },
  {
    publisher: "Australian Competition and Consumer Commission",
    title: "Regulatory report \u2014 Phase II airports",
    date: "April 2000",
    url: null,
    kind: "government"
  },
  {
    publisher: "Transport Policy",
    title: "An econometric study of the effects of airport privatization on airfares in Brazil (Brito, Oliveira & Dresner)",
    date: "December 2021",
    url: null,
    kind: "academic"
  },
  {
    publisher: "UK Parliament",
    title: "Written Questions and Answers",
    date: "October 31, 2025",
    url: null,
    kind: "government"
  },
  {
    publisher: "PAXnews",
    title: "'Canadians already pay too much to fly': CLC warns against airport privatization",
    date: "September 13, 2026",
    url: "https://www.paxnews.com/news/airline/canadians-already-pay-too-much-fly-clc-warns-against-airport-privatization",
    kind: "news"
  },
  {
    publisher: "The Hill Times",
    title: "'We're not even part of the discussion,' says transport union after Carney opens airports to private investment",
    date: "September 15, 2026",
    url: "https://www.hilltimes.com/2026/09/15/were-not-even-part-of-the-discussion-says-transport-union-after-carney-opens-airports-to-private-investment/518229/",
    kind: "news"
  },
  {
    publisher: "House of Commons",
    title: "Order Paper Question Q-1227, 45th Parliament, 1st Session",
    date: "May 2026",
    url: null,
    kind: "government"
  },
  {
    publisher: "98.5 Montr\xE9al",
    title: "A\xE9roports privatis\xE9s : \xAB C'est un changement radical dans les fa\xE7ons de faire \xBB",
    date: "September 2026",
    url: null,
    kind: "news"
  },
  {
    publisher: "Australian Competition and Consumer Commission",
    title: "Privatised airports rate strong on quality of service",
    date: "April 1999",
    url: null,
    kind: "government"
  },
  {
    publisher: "Brito, Oliveira & Dresner",
    title: "Working Paper",
    date: "2021",
    url: null,
    kind: "academic"
  },
  {
    publisher: "LBC",
    title: "Holidaymakers hit with \xA32m a day airport parking bill at five major UK hubs",
    date: "March 2026",
    url: "https://www.lbc.co.uk/news/airport-parking-fees-2m-a-day/",
    kind: "news"
  },
  {
    publisher: "Canadian Labour Congress",
    title: "Public Runways, Private Profits: Why Airport Privatization Would Be Risky and Costly for Canadians",
    date: "September 2026",
    url: null,
    kind: "labour"
  },
  {
    publisher: "Gowling WLG",
    title: "Airport Privatization in Canada: Models and Legal Issues",
    date: "September 13, 2026",
    url: "https://gowlingwlg.com/en/insights-resources/articles/2026/airport-privatization",
    kind: "legal"
  }
];
const SECOND_DRAFT_SEEDS = [
  {
    publisher: "University of Alberta / Troy Media",
    title: "Airports perform better when owned by private equity funds",
    date: "March 29, 2023",
    url: "https://admin.troymedia.com/blog/business/private-ownership/",
    kind: "academic"
  },
  {
    publisher: "The Globe and Mail",
    title: "Ottawa urged to end airport rent fees",
    date: "April 17, 2013",
    url: "https://www.theglobeandmail.com/report-on-business/ottawa-urged-to-end-airport-rent-fees/article11391376/",
    kind: "news"
  },
  {
    publisher: "The Canadian Press",
    title: "What you need to know about Carney's pitch for private investment in airports",
    date: "September 14, 2026",
    url: "https://www.thecanadianpressnews.ca/national/what-you-need-to-know-about-carneys-pitch-for-private-investment-in-airports/article_1e9e4eab-51a7-5578-9897-937935fa1bd3.html",
    kind: "news"
  },
  {
    publisher: "Phys.org",
    title: "Airports perform better when owned by private equity funds, study finds",
    date: "March 29, 2023",
    url: "https://phys.org/news/2023-03-airports-private-equity-funds.html",
    kind: "news"
  },
  {
    publisher: "iPolitics",
    title: "There is no free money in airport privatization",
    date: "September 14, 2026",
    url: "https://www.ipolitics.ca/2026/09/15/there-is-no-free-money-in-airport-privatization/",
    kind: "news"
  },
  {
    publisher: "UK Parliament Hansard",
    title: "Airport Drop-off Charges",
    date: "January 12, 2026",
    url: "https://hansard.parliament.uk/Commons/2026-01-13/debates/A6D0F47F-8DC4-403B-9A66-59092928897D/details",
    kind: "government"
  },
  {
    publisher: "Mirage News",
    title: "Research: Private Equity Ownership Boosts Airport Performance",
    date: "March 28, 2023",
    url: "https://www.miragenews.com/research-private-equity-ownership-boosts-976765/",
    kind: "news"
  },
  {
    publisher: "CBC News",
    title: "Carney says government to open up Canada's 4 largest airports to private investment",
    date: "September 15, 2026",
    url: "https://www.cbc.ca/lite/story/9.7344327",
    kind: "news"
  },
  {
    publisher: "CTV News",
    title: "Federal government expected to announce legislation on future of Canadian airports",
    date: "September 14, 2026",
    url: "https://www.ctvnews.ca/politics/article/federal-liberal-caucus-holds-call-to-discuss-canadian-airports-sources/",
    kind: "news"
  },
  {
    publisher: "Les Affaires",
    title: "La privatisation des a\xE9roports co\xFBterait davantage au personnel et au public voyageur, selon le CTC",
    date: "September 10, 2026",
    url: "https://www.lesaffaires.com/communique-de-presse/la-privatisation-des-aeroports-couterait-davantage-au-personnel-et-au-public-voyageur-selon-le-ctc/",
    kind: "news"
  },
  {
    publisher: "Canadian Centre for Policy Alternatives",
    title: "Keep Canadian airports public",
    date: "May 7, 2026",
    url: "https://www.policyalternatives.ca/news-research/keep-canadian-airports-public/",
    kind: "think-tank"
  },
  {
    publisher: "Annex Business Media",
    title: "Cover Stories: Landing opportunities, the push for private investment in Canadian airports",
    date: "April 4, 2026",
    url: "https://cdn.annexbusinessmedia.com/WG/etrending/2026/04/05/ANXCD260402021-mail.html",
    kind: "news"
  }
];
function buildReferences(cited) {
  const canonical = REF_SEEDS.map((seed, i) => ({
    ...seed,
    id: i + 1,
    cited: cited.has(i + 1),
    legacyId: LEGACY_BY_CANONICAL[i + 1] ?? null,
    groupKey: ""
  }));
  const extras = SECOND_DRAFT_SEEDS.filter(
    (_, i) => !LEGACY_CITED.has(i + 1)
  ).map((seed, i) => ({
    ...seed,
    id: REF_SEEDS.length + i + 1,
    cited: false,
    legacyId: null,
    groupKey: ""
  }));
  const all = [...canonical, ...extras];
  const byLegacy = /* @__PURE__ */ new Map();
  for (const ref of all) {
    if (ref.legacyId === null) continue;
    if (!byLegacy.has(ref.legacyId)) byLegacy.set(ref.legacyId, ref.id);
  }
  for (const ref of all) {
    const twin = ref.legacyId !== null ? byLegacy.get(ref.legacyId) : void 0;
    ref.groupKey = ref.url ?? slugKey(`${ref.publisher} ${ref.title}`);
    if (twin !== void 0 && twin !== ref.id) ref.groupKey = `legacy:${ref.legacyId}`;
  }
  return all;
}
function slugKey(input) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}
function countDistinctSources(references) {
  const works = /* @__PURE__ */ new Set();
  for (const ref of references) {
    works.add(
      ref.groupKey.startsWith("legacy:") ? (
        // Both members of a duplicate pair collapse to the same work.
        `work:${ref.groupKey}`
      ) : `work:${slugKey(`${ref.publisher}|${ref.title}`)}`
    );
  }
  return works.size;
}
let cached = null;
function getArticle() {
  if (cached) return cached;
  const fs = require("node:fs");
  const path = require("node:path");
  const file = path.join(process.cwd(), "article.md");
  cached = parseArticle(fs.readFileSync(file, "utf8"));
  return cached;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  countDistinctSources,
  getArticle,
  parseArticle,
  runsToText
});
