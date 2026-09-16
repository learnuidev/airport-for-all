/**
 * Checks for the formula engine, its autocomplete, and the claim that matters
 * most: that the default formula set reproduces `costsFor()` in the shipped
 * model exactly. If a step ever drifts from `model.ts`, this fails.
 *
 * No dev server and no browser needed  —  node --experimental-strip-types scripts/verify-formula.ts
 */

import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": `${process.cwd()}/src` } });
const F: any = await jiti.import("../src/components/dashboard/formula.ts");
const S: any = await jiti.import("../src/components/dashboard/formula-suggestions.ts");
const M: any = await jiti.import("../src/components/editorial/model.ts");

let failures = 0;
const check = (name: string, fn: () => void | string) => {
  try {
    const note = fn();
    console.log(`✓ ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    failures += 1;
    console.log(`✗ ${name} — ${(error as Error).message}`);
  }
};

const equal = (actual: unknown, expected: unknown, what: string) => {
  if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`);
};

const close = (actual: number, expected: number, what: string, tolerance = 1e-6) => {
  if (!(Math.abs(actual - expected) <= tolerance)) {
    throw new Error(`${what}: expected ${expected}, got ${actual}`);
  }
};

const base = {
  airport: "YYZ",
  ticket: 430,
  days: 4,
  travellers: 1,
  dropOffMinutes: 25,
  year: 10,
  enabled: Object.fromEntries(
    ["trip", "ticket", "parking", "drop", "food", "aif", "airfare", "aeronautical", "taxes"].map((key) => [key, true]),
  ),
};

/* ---- 1. the default formula is the shipped model ------------------- */
check("the default formula reproduces the shipped model", () => {
  for (const code of ["YYZ", "YUL", "YVR", "YEG", "YYC", "YOW"]) {
    const run = F.runModel(F.defaultFormula(), { ...base, airport: code });
    close(run.drift, 0, `drift at ${code}`);
    equal(JSON.stringify(run.stepErrors), "{}", `step errors at ${code}`);
    equal(run.cycles.length, 0, `dependency cycles at ${code}`);
  }
  return "six airports, no difference to the cent";
});

check("every year matches costsFor() field by field", () => {
  const input = M.airportByCode("YYZ");
  const trip = { airport: input, ticket: 430, days: 4, travellers: 3, dropOffMinutes: 25 };
  const run = F.runModel(F.defaultFormula(), { ...base, travellers: 3 });
  for (let year = 0; year <= 20; year += 1) {
    const row = run.years[year];
    const reference = M.costsFor(trip, year);
    close(row.ticketTotal, reference.ticketTotal, `ticket, year ${year}`, 1e-9);
    close(row.extrasTotal, reference.extrasTotal, `extras, year ${year}`, 1e-9);
    close(row.tripTotal, reference.tripTotal, `trip, year ${year}`, 1e-9);
    close(row.values.extraRevenueNeeded, 3.95 * Math.pow(1.03, year) * 0.175 * 1000, `needed, year ${year}`, 1e-9);
  }
  return "21 years × ticket, extras, trip and the investor requirement";
});

check("the cumulative total in the formula matches extractionAt()", () => {
  const run = F.runModel(F.defaultFormula(), base);
  for (let year = 0; year <= 20; year += 1) {
    const expected = Array.from({ length: year + 1 }, (_, step) => Math.pow(1.03, step) * 3.95 * 0.175 * 1000).reduce(
      (sum, value) => sum + value,
      0,
    );
    close(run.years[year].values.extractedToDate, expected, `extracted, year ${year}`, 1e-9);
  }
  return "yearly.<step> sums match the shipped helper";
});

/* ---- 2. the evaluator --------------------------------------------- */
check("arithmetic follows the usual precedence", () => {
  equal(F.evaluate("1 + 2 * 3", {}), 7, "1 + 2 * 3");
  equal(F.evaluate("(1 + 2) * 3", {}), 9, "(1 + 2) * 3");
  equal(F.evaluate("2 ** 3 ** 2", {}), 512, "2 ** 3 ** 2 is right-associative");
  equal(F.evaluate("-2 ** 2", {}), -4, "unary minus binds looser than **");
});

check("conditions, logic and member access work", () => {
  equal(F.evaluate("year > 3 ? 'late' : 'early'", { year: 5 }), "late", "ternary");
  equal(F.evaluate("year > 3 && year < 8 ? 1 : 0", { year: 5 }), 1, "and");
  equal(F.evaluate("get(a, 'YYZ')", { a: { YYZ: 41.81 } }), 41.81, "get on a table");
  equal(F.evaluate("airport.parkingPerDay * days", { airport: { parkingPerDay: 32 }, days: 3 }), 96, "member access");
});

check("smoothstep is the ramp the shipped model uses", () => {
  equal(F.evaluate("smoothstep(2, 10, 2)", {}), 0, "at the start");
  equal(F.evaluate("smoothstep(2, 10, 10)", {}), 1, "at the end");
  close(F.evaluate("smoothstep(2, 10, 6)", {}), 0.5, "midpoint");
});

check("a typo is reported by name, not silently zeroed", () => {
  try {
    F.evaluate("ticket * P.taxShare + taxs", { ticket: 1, P: { taxShare: 0.28 } });
  } catch (error) {
    if (!String((error as Error).message).includes("taxs")) throw new Error("the wrong name was reported");
    return "names the missing name";
  }
  throw new Error("an unknown name did not throw");
});

check("a bad expression fails without taking the run down", () => {
  const model = F.defaultFormula();
  model.groups[0].steps[1].expression = "ticket * P.taxShare +"; // taxes, half-typed
  const run = F.runModel(model, base);
  if (!run.stepErrors.taxes) throw new Error("the broken step was not reported");
  close(run.years[10].values.taxes, 0, "the broken step falls back to zero");
  if (!(run.years[10].tripTotal > 0)) throw new Error("the rest of the projection stopped");
  return "one step marked, the run continues";
});

check("a cycle between two steps is reported, not hung on", () => {
  const model = F.defaultFormula();
  model.groups[0].steps[0].expression = "ticketTotal - taxes"; // feeToday reads a step that reads it
  const run = F.runModel(model, base);
  if (!run.cycles.length) throw new Error("the cycle was not reported");
  return `reported: ${run.cycles.join(", ")}`;
});

/* ---- 3. autocomplete ---------------------------------------------- */
const model = F.defaultFormula();
const context = S.buildSuggestions(model);

check("P. lists every parameter", () => {
  const request = S.completionAt("ticket * P.", 11, context);
  if (!request) throw new Error("no completion offered after P.");
  equal(request.owner, "P", "owner");
  equal(request.items.length, F.PARAM_SPECS.length, "member count");
  if (!request.items.some((item: any) => item.label === "taxShare")) throw new Error("taxShare is not offered");
  return `${request.items.length} members, taxShare among them`;
});

check("typing after the dot filters the list", () => {
  const request = S.completionAt("ticket * P.tax", 14, context);
  equal(request.items[0].label, "taxShare", "first match for “tax”");
  equal(request.prefix, "tax", "prefix");
  equal(request.from, 11, "replace from");
  return `“tax” → ${request.items.map((item: any) => item.label).join(", ")}`;
});

check("deleting the member and typing the dot again brings the list back", () => {
  // What the reader described: the member is gone, only "P." remains.
  const request = S.completionAt("ticket * P.", 11, context);
  if (!request) throw new Error("nothing offered after deleting the member");
  const tax = request.items.find((item: any) => item.label === "taxShare");
  if (!tax) throw new Error("taxShare is not offered again");
  const applied = S.applyCompletion("ticket * P.", request, tax);
  equal(applied.text, "ticket * P.taxShare", "the completed text");
  equal(applied.caret, 19, "caret lands after the member");
  return `P. → P.taxShare`;
});

check("airport. lists the record's fields", () => {
  const request = S.completionAt("days * airport.", 15, context);
  const labels = request.items.map((item: any) => item.label);
  for (const field of ["parkingPerDay", "freeDropOffMinutes", "passengers", "inScope"]) {
    if (!labels.includes(field)) throw new Error(`${field} is not offered`);
  }
  return `${request.items.length} fields`;
});

check("yearly. lists the steps", () => {
  const request = S.completionAt("sum(yearly.", 11, context);
  const labels = request.items.map((item: any) => item.label);
  if (!labels.includes("extraRevenueNeeded")) throw new Error("extraRevenueNeeded is not offered");
  return `${request.items.length} series`;
});

check("a partially typed top-level name is offered too", () => {
  const request = S.completionAt("ticket * taxS", 12, context);
  equal(request.owner, "", "top-level, not a member");
  equal(request.items[0].label, "taxes", "the closest step name");
  return `“taxS” → ${request.items.slice(0, 3).map((item: any) => item.label).join(", ")}`;
});

check("a bare dot or an empty field does not open a list", () => {
  equal(S.completionAt("ticket + ", 9, context), null, "after a space");
  equal(S.completionAt("", 0, context), null, "in an empty field");
  equal(S.completionAt("foo.", 4, context), null, "after an unknown owner");
  return "no list where it would be noise";
});

check("every offered name is one the evaluator accepts", () => {
  const known = new Set<string>();
  context.roots.forEach((item: any) => known.add(item.label));
  const scope: Record<string, unknown> = Object.fromEntries([...known].map((name) => [name, 1]));
  scope.P = new Proxy({}, { get: () => 1 });
  scope.airport = { code: "YYZ" };
  scope.yearly = new Proxy({}, { get: () => [1] });
  scope.aifByAirport = { YYZ: 41.81 };
  const rejected: string[] = [];
  for (const item of context.roots) {
    const expression = item.kind === "function" ? `${item.label}(1)` : item.label;
    try {
      F.evaluate(expression, scope);
    } catch (error) {
      if (!/Unknown name|Unknown function/.test(String((error as Error).message))) continue;
      rejected.push(`${item.label}: ${(error as Error).message}`);
    }
  }
  if (rejected.length) throw new Error(rejected.join("; "));
  return `${context.roots.length} names, all resolvable`;
});

/* ---- 4. presets and serialisation --------------------------------- */
check("every preset runs without an error", () => {
  for (const preset of F.PRESETS) {
    const run = F.runModel(F.applyPreset(preset, F.defaultFormula()), base);
    equal(JSON.stringify(run.stepErrors), "{}", `step errors in “${preset.id}”`);
    equal(run.cycles.length, 0, `cycles in “${preset.id}”`);
    if (!(run.years[run.horizon].tripTotal > 0)) throw new Error(`“${preset.id}” produced no trip total`);
  }
  return `${F.PRESETS.length} presets`;
});

check("the shipped preset restores the shipped numbers", () => {
  const shipped = () => F.PRESETS.find((preset: any) => preset.id === "shipped");
  const aggressive = F.PRESETS.find((preset: any) => preset.id === "aggressive");
  const before = F.runModel(F.defaultFormula(), base).years[10].tripTotal;
  const moved = F.runModel(F.applyPreset(aggressive, F.defaultFormula()), base).years[10].tripTotal;
  if (moved <= before) throw new Error("the aggressive preset did not move the model");
  const back = F.applyPreset(shipped(), F.applyPreset(aggressive, F.defaultFormula()));
  close(F.runModel(back, base).drift, 0, "drift after restoring the shipped preset");
  return `through ${Math.round(moved - before)} and back to zero drift`;
});

check("applying a preset twice does not compound", () => {
  const aggressive = F.PRESETS.find((preset: any) => preset.id === "aggressive");
  const once = F.applyPreset(aggressive, F.defaultFormula());
  const twice = F.applyPreset(aggressive, once);
  equal(JSON.stringify(twice.params), JSON.stringify(once.params), "parameters after applying twice");
  return "idempotent";
});

check("a formula survives the round trip through a link", () => {
  const edited = F.applyPreset(F.PRESETS.find((preset: any) => preset.id === "linear"), F.defaultFormula());
  const encoded = Buffer.from(JSON.stringify(edited), "utf8").toString("base64url");
  const decoded = F.sanitizeModel(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
  if (!decoded) throw new Error("the decoded model was rejected");
  equal(
    JSON.stringify(decoded.groups[0].steps[0].expression),
    JSON.stringify(edited.groups[0].steps[0].expression),
    "the first expression",
  );
  return "encodes and decodes unchanged";
});

check("a malformed stored model is rejected rather than half-loaded", () => {
  equal(F.sanitizeModel(null), null, "null");
  equal(F.sanitizeModel({ groups: "nope" }), null, "a string where groups belong");
  equal(F.sanitizeModel({ groups: [{ id: "x", steps: [{ key: 3 }] }] }), null, "a step without a key");
  return "three bad shapes refused";
});

console.log(failures ? `\n${failures} check(s) failed` : "\n✓ formula engine, model parity and autocomplete all check out");
process.exit(failures ? 1 : 0);
