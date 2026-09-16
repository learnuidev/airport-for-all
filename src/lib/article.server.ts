import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { parseArticle, type ParsedArticle } from "./article";

/**
 * Server-side loader. Kept separate from article.ts so the parser and its types
 * can be imported by client components without pulling in node:fs.
 *
 * `cache` dedupes the read within a single request, so the layout's metadata and
 * the page's props can never disagree — which matters because article.md is the
 * source of truth for both.
 */
export const getArticle = cache((): ParsedArticle => {
  const file = path.join(process.cwd(), "article.md");
  return parseArticle(fs.readFileSync(file, "utf8"));
});
