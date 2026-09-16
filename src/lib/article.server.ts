import fs from "node:fs";
import path from "node:path";
import { parseArticle, type ParsedArticle } from "./article";

/**
 * Server-side loader. Kept separate from article.ts so the parser and its types
 * can be imported by client components without pulling in node:fs.
 */
let cached: ParsedArticle | null = null;

export function getArticle(): ParsedArticle {
  if (cached) return cached;
  const file = path.join(process.cwd(), "article.md");
  cached = parseArticle(fs.readFileSync(file, "utf8"));
  return cached;
}
