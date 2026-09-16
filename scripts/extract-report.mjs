/**
 * Extracts the text of the Canadian Labour Congress report, page by page, and
 * caches it to JSON. Called by verify-sources.ts so that PDF anchors can be
 * checked the same way markdown anchors are.
 *
 * Usage:  node scripts/extract-report.mjs <pdf> <out.json>
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const [pdfPath, outPath] = process.argv.slice(2);
if (!pdfPath || !outPath) {
  console.error("usage: extract-report.mjs <pdf> <out.json>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const pdfjsPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
const { getDocument } = await import(pdfjsPath);

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data, useSystemFonts: true }).promise;

const pages = [];
for (let index = 1; index <= doc.numPages; index += 1) {
  const page = await doc.getPage(index);
  const content = await page.getTextContent();
  let text = "";
  let lastY = null;
  for (const item of content.items) {
    if (!("str" in item)) continue;
    const y = item.transform[5];
    if (lastY !== null && Math.abs(y - lastY) > 2) text += "\n";
    text += item.str;
    lastY = y;
  }
  pages.push(text);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(pages));
console.log(`  extracted ${pages.length} pages -> ${path.relative(process.cwd(), outPath)}`);
