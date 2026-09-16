/**
 * Locale integrity check.
 *
 * Catches the two failures that actually bit this project:
 *  1. A locale file missing keys, so the UI silently falls back to English.
 *  2. A money amount that lost its currency symbol — which happened once when the
 *     English catalogue was written through a shell heredoc and unquoted `$3`
 *     and `$5` were expanded to empty, leaving ".95 billion" and "25 million".
 *
 * Run with:  npm run verify:locales
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "locales");
const BASE = "en";
const LOCALES = ["en", "fr", "es", "zh"];

const flat = (obj, prefix = "", out = {}) => {
  for (const key of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (obj[key] && typeof obj[key] === "object") flat(obj[key], next, out);
    else out[next] = obj[key];
  }
  return out;
};

const read = (locale) => JSON.parse(fs.readFileSync(path.join(DIR, `${locale}.json`), "utf8"));

const base = flat(read(BASE));
const baseKeys = Object.keys(base);
const problems = [];

/* ---- 1. key parity -------------------------------------------------- */
for (const locale of LOCALES.filter((l) => l !== BASE)) {
  let file;
  try {
    file = flat(read(locale));
  } catch (error) {
    problems.push(`${locale}.json could not be parsed: ${error.message}`);
    continue;
  }
  const missing = baseKeys.filter((key) => !(key in file));
  const extra = Object.keys(file).filter((key) => !(key in base));
  if (missing.length) problems.push(`${locale}.json is missing ${missing.length} keys: ${missing.slice(0, 8).join(", ")}${missing.length > 8 ? " …" : ""}`);
  if (extra.length) problems.push(`${locale}.json has ${extra.length} keys absent from ${BASE}.json: ${extra.slice(0, 8).join(", ")}`);

  // Placeholders must survive translation, or interpolation silently drops data.
  for (const key of baseKeys) {
    const expected = (String(base[key]).match(/\{\{\w+\}\}/g) ?? []).sort().join(",");
    const actual = (String(file[key] ?? "").match(/\{\{\w+\}\}/g) ?? []).sort().join(",");
    if (expected !== actual) {
      problems.push(`${locale}.json ${key}: placeholders differ (expected ${expected || "none"}, got ${actual || "none"})`);
    }
  }
}

/* ---- 2. amounts keep their currency symbol -------------------------- */
// A "million"/"billion" figure with no currency mark anywhere in the string is a
// stripped amount, not a stylistic choice.
const AMOUNT = /(?:^|[^$\d.,])(?:\.\d+|\b\d{1,3}(?:[.,]\d+)?) ?(?:million|billion|millions|milliard|亿)\b/;
for (const locale of LOCALES) {
  const file = flat(read(locale));
  for (const [key, value] of Object.entries(file)) {
    const text = String(value);
    if (!AMOUNT.test(text)) continue;
    if (/\$\s?\d/.test(text) || /M\$|\$\s?\d/.test(text)) continue;
    problems.push(`${locale}.json ${key}: amount without a currency symbol — ${JSON.stringify(text.slice(0, 90))}`);
  }
}

/* ---- 3. report ------------------------------------------------------ */
if (problems.length) {
  console.error(`\n✗ ${problems.length} locale problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `✓ locales OK — ${baseKeys.length} keys across ${LOCALES.length} languages, placeholders and currency symbols intact`,
);
