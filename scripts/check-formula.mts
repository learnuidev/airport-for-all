import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": process.cwd() + "/src" } });
const F: any = await jiti.import("../src/components/dashboard/formula.ts");
const M: any = await jiti.import("../src/components/editorial/model.ts");

const base = {
  airport: "YYZ", ticket: 430, days: 4, travellers: 1, dropOffMinutes: 25, year: 7,
  enabled: { trip: true, ticket: true, parking: true, drop: true, food: true, aif: true, airfare: true, aeronautical: true, taxes: true },
};

for (const code of ["YYZ", "YUL", "YVR", "YEG", "YOW"]) {
  const run = F.runModel(F.defaultFormula(), { ...base, airport: code });
  console.log(code, "drift:", run.drift.toFixed(6), "errors:", JSON.stringify(run.stepErrors), "cycles:", run.cycles);
}

const run = F.runModel(F.defaultFormula(), base);
console.log("\nyear | formula ticket / shipped | formula extras / shipped | formula trip / shipped | needed | extracted");
for (const y of [0, 1, 3, 9, 10, 20]) {
  const row = run.years[y];
  const ref = M.costsFor({ airport: M.airportByCode("YYZ"), ticket: 430, days: 4, travellers: 1, dropOffMinutes: 25 }, y);
  console.log(
    String(y).padStart(4),
    row.ticketTotal.toFixed(4), ref.ticketTotal.toFixed(4),
    "|", row.extrasTotal.toFixed(4), ref.extrasTotal.toFixed(4),
    "|", row.tripTotal.toFixed(4), ref.tripTotal.toFixed(4),
    "|", row.values.extraRevenueNeeded.toFixed(3),
    "|", row.values.extractedToDate.toFixed(3),
  );
}
console.log("\npresets:");
for (const p of F.PRESETS) {
  const r = F.runModel(F.applyPreset(p, F.defaultFormula()), base);
  console.log(" ", p.id.padEnd(12), "trip@20", r.years[20].tripTotal.toFixed(2), "errors", JSON.stringify(r.stepErrors));
}
console.log("\nevaluator:");
const { evaluate, FormulaError } = jiti.import ? F : F;
console.log(" 1+2*3 =", evaluate("1+2*3", {}));
console.log(" ternary =", evaluate("year > 3 ? 'late' : 'early'", { year: 5 }));
console.log(" smoothstep =", evaluate("smoothstep(2, 10, 6)", {}));
console.log(" member =", evaluate("airport.parkingPerDay * 2", { airport: { parkingPerDay: 32 } }));
try { evaluate("taxs * 2", {}); } catch (e) { console.log(" unknown name →", (e as Error).message); }
try { evaluate("min(1,", {}); } catch (e) { console.log(" syntax error →", (e as Error).message); }
