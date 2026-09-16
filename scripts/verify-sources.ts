/**
 * Integrity check: every `source` anchor declared in src/lib/sourced.ts must
 * exist verbatim in article.md at the line it claims.
 *
 * Run with:  npm run verify:sources
 *
 * This is what keeps "article.md is the source of truth" honest — if the
 * markdown moves, the build tells you which chart data is now unsupported.
 */
import fs from "node:fs";
import path from "node:path";
import * as sourced from "../src/lib/sourced.ts";

type Anchor = { path: string; quote: string; line: number };

const anchors: Anchor[] = [];

function walk(value: unknown, trail: string) {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const source = record.source as { quote?: string; line?: number } | undefined;
  if (source?.quote && typeof source.line === "number") {
    anchors.push({ path: trail, quote: source.quote, line: source.line });
  }
  for (const [key, child] of Object.entries(record)) walk(child, `${trail}.${key}`);
}

walk(sourced, "sourced");

const articlePath = path.join(process.cwd(), "article.md");
const lines = fs.readFileSync(articlePath, "utf8").split("\n");

const failures = anchors.filter((anchor) => {
  const line = lines[anchor.line - 1] ?? "";
  return !line.includes(anchor.quote);
});

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${anchors.length} source anchors no longer match article.md:\n`);
  for (const failure of failures) {
    console.error(`  ${failure.path}`);
    console.error(`    expected on line ${failure.line}: ${JSON.stringify(failure.quote)}`);
    console.error(`    found:                          ${JSON.stringify((lines[failure.line - 1] ?? "").slice(0, 120))}`);
  }
  process.exit(1);
}

console.log(`✓ ${anchors.length} source anchors verified against article.md (${lines.length} lines)`);
