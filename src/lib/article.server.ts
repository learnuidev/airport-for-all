import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { cookies } from "next/headers";
import { parseArticle, type ParsedArticle } from "./article";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locales";

/**
 * Server-side loader. The article's prose is the one part of this project that
 * ships as translated text rather than as keys: it is a written essay, and a
 * reader in French, Spanish or Chinese should read the essay, not the English
 * one with a translated interface around it.
 *
 * Each locale reads its own file; a locale without one falls back to English.
 */
const SOURCE_FILES: Record<Locale, string> = {
  en: "article.md",
  fr: "article.fr.md",
  es: "article.es.md",
  zh: "article.zh.md",
};

function readSource(locale: Locale): { article: ParsedArticle; file: string } {
  const root = process.cwd();
  const preferred = path.join(root, SOURCE_FILES[locale]);
  const fallback = path.join(root, SOURCE_FILES[DEFAULT_LOCALE]);
  const file = fs.existsSync(preferred) ? preferred : fallback;
  return {
    article: parseArticle(fs.readFileSync(file, "utf8")),
    file: path.basename(file),
  };
}

/** The article for an explicit locale. Cached per request. */
export const getArticleFor = cache((locale: Locale) => readSource(locale));

/**
 * The article for the reader's stored locale. `cache` dedupes within a request,
 * so metadata and page props can never disagree.
 */
export const getArticle = cache(async () => {
  const cookie = await cookies();
  const raw = cookie.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { article, file } = getArticleFor(locale);

  return {
    article,
    locale,
    /** True when this locale has its own translation of the prose. */
    translated: file !== SOURCE_FILES[DEFAULT_LOCALE],
  };
});
