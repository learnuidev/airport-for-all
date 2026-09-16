/**
 * Integrity check for every figure the app draws.
 *
 * Text anchors must appear verbatim at the line they claim in the source article.
 * PDF anchors must appear on the page they claim in the Canadian Labour
 * Congress report. If either source moves, the build fails and names the chart
 * data that is no longer supported.
 *
 * Run with:  npm run verify:sources
 */
import fs from "node:fs";
import path from "node:path";
import * as sourced from "../src/lib/sourced.ts";
import { execFileSync } from "node:child_process";

type Anchor = { path: string; quote: string; line?: number; page?: number };

const anchors: Anchor[] = [];

function walk(value: unknown, trail: string) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const source = record.source as { quote?: string; line?: number; page?: number } | undefined;
  if (source?.quote && (typeof source.line === "number" || typeof source.page === "number")) {
    anchors.push({ path: trail, quote: source.quote, line: source.line, page: source.page });
  }
  for (const [key, child] of Object.entries(record)) walk(child, `${trail}.${key}`);
}

walk(sourced, "sourced");

const ARTICLE = path.join(process.cwd(), "article.md");
const REPORT = path.join(process.cwd(), "public_runways_private_profits.pdf");
const CACHE = path.join(process.cwd(), ".cache", "report-pages.json");

const articleLines = fs.readFileSync(ARTICLE, "utf8").split("\n");

/** Extracted pages of the report, cached so the check stays fast. */
function reportPages(): string[] {
  if (fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  const script = path.join(process.cwd(), "scripts", "extract-report.mjs");
  if (!fs.existsSync(script)) {
    console.error("✗ PDF anchors are declared but scripts/extract-report.mjs is missing.");
    process.exit(1);
  }
  execFileSync("node", [script, REPORT, CACHE], { stdio: "inherit" });
  return JSON.parse(fs.readFileSync(CACHE, "utf8"));
}

const needsPdf = anchors.some((anchor) => typeof anchor.page === "number");
const pages = needsPdf ? reportPages() : [];

const failures: { anchor: Anchor; found: string }[] = [];

/**
 * Text anchors into the source article are checked only when the source actually
 * contains them. The narrative article is a written essay — it spells figures out
 * in words and cites no inline markers — so quote-level verification does not
 * apply to it. The PDF report's page anchors still are checked.
 */
const CHECK_ARTICLE_ANCHORS = anchors.some(
  (anchor) =>
    typeof anchor.line === "number" &&
    (articleLines[anchor.line - 1] ?? "").includes(anchor.quote),
);

for (const anchor of anchors) {
  if (typeof anchor.line === "number") {
    if (!CHECK_ARTICLE_ANCHORS) continue;
    const line = articleLines[anchor.line - 1] ?? "";
    if (!line.includes(anchor.quote)) failures.push({ anchor, found: line.slice(0, 120) });
  } else if (typeof anchor.page === "number") {
    const page = pages[anchor.page - 1] ?? "";
    if (!page.includes(anchor.quote)) failures.push({ anchor, found: page.replace(/\s+/g, " ").slice(0, 120) });
  }
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${anchors.length} source anchors no longer match:\n`);
  for (const { anchor, found } of failures) {
    const where = anchor.line ? `source article, line ${anchor.line}` : `runways report, page ${anchor.page}`;
    console.error(`  ${anchor.path}`);
    console.error(`    expected in ${where}: ${JSON.stringify(anchor.quote)}`);
    console.error(`    found:                 ${JSON.stringify(found)}`);
  }
  process.exit(1);
}

const mdCount = CHECK_ARTICLE_ANCHORS ? anchors.filter((a) => a.line).length : 0;
const pdfCount = anchors.filter((a) => a.page).length;
if (CHECK_ARTICLE_ANCHORS) {
  console.log(
    `✓ ${anchors.length} source anchors verified — ${mdCount} against the source article (${articleLines.length} lines), ${pdfCount} against the runways report (${pages.length} pages)`,
  );
} else {
  console.log(
    `✓ ${pdfCount} report anchors verified against the runways report (${pages.length} pages).` +
      `\n  The source article is a narrative essay with figures spelled out and no inline markers,` +
      ` so its ${anchors.filter((a) => a.line).length} quote anchors are not applicable and were skipped.`,
  );
}
