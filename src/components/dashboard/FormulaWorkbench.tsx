"use client";

/**
 * The formula workbench — /chart/formula.
 *
 * The board on /chart picks two answers and shows one projection. This page
 * opens the projection itself: every parameter, every step of the arithmetic,
 * and the order the steps run in. Change a number, rewrite an expression, and
 * the chart, the figures and the year table all follow.
 *
 * Deliberate shapes in here:
 *   - Nothing runs until you press Run. Editing a half-typed expression should
 *     not throw the projection around while you are still typing it.
 *   - The expression you are editing stays on screen exactly as you typed it,
 *     even when it is wrong. A field that rewrites itself fights the person
 *     using it.
 *   - Every step is compared with the shipped model, so a rewrite can be seen
 *     for what it is rather than trusted.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { AIRPORTS } from "@/lib/sourced";
import { localeTag, money } from "@/components/editorial/model";
import {
  applyCompletion,
  browseAt,
  buildSuggestions,
  completionAt,
  type Suggestion,
  type SuggestionContext,
} from "./formula-suggestions";
import {
  DEFAULT_PARAMS,
  FORMULA_STORAGE_KEY,
  FUNCTION_REFERENCE,
  PARAM_SPECS,
  PRESETS,
  applyPreset,
  decodeModel,
  defaultFormula,
  encodeModel,
  evaluate,
  referencedNames,
  runModel,
  VARIABLE_SPECS,
  sanitizeModel,
  type FormulaGroup,
  type FormulaModel,
  type FormulaStep,
  type FormulaRun,
  type WorkbenchInput,
} from "./formula";

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

const fmtInt = (value: number) => (Number.isFinite(value) ? Math.round(value).toLocaleString("en-CA") : "—");
const fmtDec = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toLocaleString("en-CA", { minimumFractionDigits: digits, maximumFractionDigits: digits }) : "—";
const fmtPct = (value: number) => (Number.isFinite(value) ? `${value.toFixed(1)}%` : "—");

/** The value of a step, read the way that step is used. */
function formatValue(step: FormulaStep, value: number): string {
  const unit = step.unit.trim();
  if (!Number.isFinite(value)) return "—";
  if (unit === "$") return `$${fmtDec(value)}`;
  if (unit === "$/day") return `$${fmtDec(value)}/day`;
  if (unit === "$M") return `$${fmtInt(value)}M`;
  if (unit === "$B") return `$${fmtDec(value)}B`;
  if (unit === "×") return `${fmtDec(value, 3)}×`;
  if (unit === "share" || unit === "rate") return fmtDec(value, 4);
  if (unit === "share of ticket") return fmtDec(value, 4);
  if (unit === "jobs") return fmtInt(value);
  if (unit === "year") return fmtInt(value);
  if (unit === "years") return fmtInt(value);
  if (unit === "%") return fmtPct(value);
  return unit ? `${fmtDec(value)} ${unit}` : fmtDec(value);
}

/** Same, but for a parameter, whose unit is a label rather than a symbol. */
function formatParam(spec: (typeof PARAM_SPECS)[number], value: number): string {
  if (spec.unit === "$" || spec.unit === "$/day") return `$${fmtDec(value)}`;
  if (spec.unit === "$B") return `$${fmtDec(value)}B`;
  if (spec.unit === "×") return `${fmtDec(value, 3)}×`;
  if (spec.unit === "share" || spec.unit === "rate" || spec.unit === "share of ticket") return fmtDec(value, 4);
  return fmtInt(value);
}

/* ------------------------------------------------------------------ *
 * The page body
 * ------------------------------------------------------------------ */

const DEFAULT_INPUT: WorkbenchInput = {
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

/** Which panel was open, which lines were drawn — part of "the settings". */
type StoredUi = {
  tab?: Tab;
  openGroups?: string[];
  chartKeys?: string[];
  showShipped?: boolean;
  savedAt?: string;
};

type StoredSettings = {
  version: number;
  model: FormulaModel;
  input: WorkbenchInput;
  ui: StoredUi;
};

/**
 * What this browser last had open. Anything malformed is dropped rather than
 * repaired: a stored formula from an older shape should not half-load.
 */
function readStoredSettings(): { model: FormulaModel | null; input: WorkbenchInput | null; ui: StoredUi | null } | null {
  try {
    const raw = window.localStorage.getItem(FORMULA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSettings> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      model: sanitizeModel(parsed.model),
      input: sanitizeInput(parsed.input),
      ui: parsed.ui && typeof parsed.ui === "object" ? parsed.ui : null,
    };
  } catch {
    return null;
  }
}

/** The trip state is only trusted where it is the right shape. */
function sanitizeInput(raw: unknown): WorkbenchInput | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<WorkbenchInput>;
  const number = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const code = AIRPORTS.some((airport) => airport.code === candidate.airport)
    ? (candidate.airport as string)
    : DEFAULT_INPUT.airport;
  const enabled: Record<string, boolean> = { ...DEFAULT_INPUT.enabled };
  if (candidate.enabled && typeof candidate.enabled === "object") {
    for (const [key, value] of Object.entries(candidate.enabled)) {
      if (typeof value === "boolean") enabled[key] = value;
    }
  }
  return {
    airport: code,
    ticket: number(candidate.ticket, DEFAULT_INPUT.ticket),
    days: number(candidate.days, DEFAULT_INPUT.days),
    travellers: Math.max(1, number(candidate.travellers, DEFAULT_INPUT.travellers)),
    dropOffMinutes: number(candidate.dropOffMinutes, DEFAULT_INPUT.dropOffMinutes),
    year: Math.max(0, number(candidate.year, DEFAULT_INPUT.year)),
    enabled,
  };
}

/** A shared link carries the trip too, next to the formula in `?f=`. */
function readSharedInput(params: URLSearchParams): WorkbenchInput | null {
  const fromUrl = params.get("i");
  if (!fromUrl) return null;
  try {
    return sanitizeInput(JSON.parse(atob(fromUrl)));
  } catch {
    return null;
  }
}

type Tab = "params" | "formulas" | "reference";

export function FormulaWorkbench() {
  const { t, i18n } = useTranslation();
  const tag = localeTag(i18n.language);
  const cad = useCallback((value: number, decimals = 0) => money(value, decimals, tag), [tag]);

  const [model, setModel] = useState<FormulaModel>(() => defaultFormula());
  const [draftInput, setDraftInput] = useState<WorkbenchInput>(DEFAULT_INPUT);
  const [input, setInput] = useState<WorkbenchInput>(DEFAULT_INPUT);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("formulas");
  const [openGroups, setOpenGroups] = useState<string[]>(() => defaultFormula().groups.map((group) => group.id));
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showShipped, setShowShipped] = useState(true);
  const [chartKeys, setChartKeys] = useState<string[]>(["tripTotal", "ticketTotal", "extrasTotal", "aif", "parking", "food"]);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  /**
   * Set while "Restore default" is putting the model back, so the autosave
   * below does not immediately re-create the record that was just deleted.
   */
  const restoring = useRef(false);

  /* ---- restore: a shared link first, then this browser's last session ---- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("f");
    const link = encoded ? decodeModel(encoded) : null;
    const stored = link ? null : readStoredSettings();
    const restored = link ?? stored?.model ?? null;
    // A shared link carries the trip as well as the formula.
    const restoredInput = (link ? readSharedInput(params) : null) ?? stored?.input ?? null;

    if (restored) setModel(restored);
    if (restoredInput) {
      setDraftInput((current) => ({ ...current, ...restoredInput }));
      setInput((current) => ({ ...current, ...restoredInput }));
    }
    if (stored?.ui) {
      const ui = stored.ui;
      if (ui.tab) setTab(ui.tab);
      if (Array.isArray(ui.openGroups)) setOpenGroups(ui.openGroups);
      if (Array.isArray(ui.chartKeys) && ui.chartKeys.length) setChartKeys(ui.chartKeys);
      if (typeof ui.showShipped === "boolean") setShowShipped(ui.showShipped);
      if (ui.savedAt) setSavedAt(ui.savedAt);
    }
    setHydrated(true);
  }, []);

  /* ---- persist: every setting, debounced so a dragged slider writes once -- */
  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      if (restoring.current) {
        // The reset has just cleared this browser's copy on purpose: leave it
        // clear. Editing anything afterwards saves normally again.
        restoring.current = false;
        return;
      }
      // Only settings already applied are stored, so the browser never comes
      // back holding a trip the projection was never run against.
      const ui: StoredUi = { tab, openGroups, chartKeys, showShipped };
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      try {
        window.localStorage.setItem(
          FORMULA_STORAGE_KEY,
          JSON.stringify({ version: 1, model, input, ui: { ...ui, savedAt: stamp } } satisfies StoredSettings),
        );
        setSavedAt(stamp);
      } catch {
        // A full or blocked localStorage is not worth interrupting the work for;
        // the page keeps running on the formula held in memory.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [model, input, hydrated, tab, openGroups, chartKeys, showShipped]);

  /**
   * "Restore default": the shipped formula, the shipped parameters, the
   * shipped trip, and this browser's saved copy deleted — so a reload comes
   * back to the defaults rather than to the formula that was just discarded.
   */
  const resetAll = useCallback(() => {
    restoring.current = true;
    setModel(defaultFormula());
    setDraftInput(DEFAULT_INPUT);
    setInput(DEFAULT_INPUT);
    setDirty(false);
    setShareNote(t("formula.restoreCleared"));
    setSelectedStep(null);
    setTab("formulas");
    setOpenGroups(defaultFormula().groups.map((group) => group.id));
    setChartKeys(["tripTotal", "ticketTotal", "extrasTotal", "aif", "parking", "food"]);
    setShowShipped(true);
    setSavedAt(null);
    try {
      window.localStorage.removeItem(FORMULA_STORAGE_KEY);
    } catch {
      // Nothing to do: the in-memory reset has already happened.
    }
    // The address bar may still carry a shared formula; drop it too.
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, [t]);

  /* ---- the run --------------------------------------------------- */
  const run: FormulaRun & { stepErrors: Record<string, string>; cycles: string[] } = useMemo(
    () => runModel(model, input),
    [model, input],
  );

  const stepByKey = useMemo(() => {
    const map = new Map<string, FormulaStep>();
    model.groups.forEach((group) => group.steps.forEach((step) => map.set(step.key, step)));
    return map;
  }, [model]);

  const shippedRun = useMemo(() => runModel(defaultFormula(), input), [input]);
  const changedSteps = useMemo(() => {
    const original = new Map<string, string>();
    defaultFormula().groups.forEach((group) => group.steps.forEach((step) => original.set(step.key, step.expression)));
    const changed = new Set<string>();
    model.groups.forEach((group) =>
      group.steps.forEach((step) => {
        if (original.get(step.key) !== step.expression) changed.add(step.key);
        if (!original.has(step.key)) changed.add(step.key);
      }),
    );
    return changed;
  }, [model]);

  const changedParams = useMemo(
    () => PARAM_SPECS.filter((spec) => Math.abs((model.params[spec.key] ?? 0) - DEFAULT_PARAMS[spec.key]) > 1e-9),
    [model.params],
  );

  /* ---- editing --------------------------------------------------- */
  const editExpression = useCallback((key: string, expression: string) => {
    setModel((current) => ({
      ...current,
      groups: current.groups.map((group) => ({
        ...group,
        steps: group.steps.map((step) => (step.key === key ? { ...step, expression } : step)),
      })),
    }));
  }, []);

  const editParam = useCallback((key: string, value: number) => {
    setModel((current) => ({ ...current, params: { ...current.params, [key]: value } }));
  }, []);

  const setEnabled = useCallback((key: string, on: boolean) => {
    setDraftInput((current) => ({ ...current, enabled: { ...current.enabled, [key]: on } }));
    setDirty(true);
  }, []);

  const runNow = useCallback(() => {
    setInput({ ...draftInput, enabled: { ...draftInput.enabled } });
    setDirty(false);
  }, [draftInput]);

  const share = useCallback(() => {
    const encoded = encodeModel(model);
    const url = `${window.location.origin}/chart/formula?f=${encoded}&i=${btoa(JSON.stringify(input))}`;
    window.history.replaceState(null, "", url);
    navigator.clipboard?.writeText(url).then(
      () => setShareNote(t("formula.copied")),
      () => setShareNote(t("formula.copyHint")),
    );
  }, [model, input, t]);

  /* ---- derived figures ------------------------------------------- */
  const active = run.active;
  const signing = run.atSigning;
  const last = run.years[run.years.length - 1];
  const shippedActive = shippedRun.active;

  const errorKeys = Object.keys(run.stepErrors);
  const growth = signing.tripTotal > 0 ? ((active.tripTotal - signing.tripTotal) / signing.tripTotal) * 100 : 0;
  const extrasShare = active.tripTotal > 0 ? (active.extrasTotal / active.tripTotal) * 100 : 0;

  const chartSeries = useMemo(
    () => chartKeys.filter((key) => stepByKey.has(key)),
    [chartKeys, stepByKey],
  );

  // Rebuilt whenever a step or a parameter is renamed, so the list can never
  // offer a name the evaluator would reject.
  const suggestions = useMemo(() => buildSuggestions(model), [model]);

  return (
    <div className="min-h-screen bg-paper">
      {/* ---------------- header ---------------- */}
      <header className="sticky top-0 z-30 border-b border-ink bg-paper/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[112rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link href="/" className="font-serif text-[0.98rem] font-bold tracking-tight">
            {t("app.title")}
          </Link>
          <span className="font-sans text-[0.68rem] uppercase tracking-[0.09em] text-ink-4">
            {t("formula.kicker")}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={[
                "border px-2 py-1 font-sans text-[0.68rem] font-bold uppercase tracking-wide",
                dirty ? "border-data-a text-data-a" : "border-rule text-ink-4",
              ].join(" ")}
            >
              {dirty ? t("formula.dirty") : t("formula.applied")}
            </span>
            <button
              type="button"
              onClick={() => setTab("formulas")}
              className={tabClass(tab === "formulas")}
            >
              {t("formula.tabs.formulas")}
            </button>
            <button type="button" onClick={() => setTab("params")} className={tabClass(tab === "params")}>
              {t("formula.tabs.params")}
            </button>
            <button type="button" onClick={() => setTab("reference")} className={tabClass(tab === "reference")}>
              {t("formula.tabs.reference")}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="cursor-pointer border border-data-a px-3 py-1 font-sans text-[0.72rem] font-bold uppercase tracking-wide text-data-a transition hover:bg-data-a hover:text-white"
            >
              {t("formula.restore")}
            </button>
            <Link href="/chart" className={actionClass}>
              {t("formula.backToBoard")}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[112rem] grid-cols-1 gap-x-8 gap-y-6 px-4 py-5 sm:px-6 lg:grid-cols-[30rem_minmax(0,1fr)]">
        {/* ---------------- editor ---------------- */}
        <aside className="flex flex-col gap-4 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-1">
          {tab === "params" ? (
            <ParamsPanel model={model} changed={changedParams} editParam={editParam} />
          ) : tab === "reference" ? (
            <ReferencePanel />
          ) : (
            <>
              <Presets current={model} apply={(next) => setModel(next)} />
              {model.groups.map((group) => (
                <StepGroup
                  key={group.id}
                  group={group}
                  open={openGroups.includes(group.id)}
                  toggle={() =>
                    setOpenGroups((current) =>
                      current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id],
                    )
                  }
                  values={active.values}
                  errors={run.stepErrors}
                  changed={changedSteps}
                  selected={selectedStep}
                  select={setSelectedStep}
                  edit={editExpression}
                  knownNames={knownNamesFor(model)}
                  suggestions={suggestions}
                />
              ))}
            </>
          )}
        </aside>

        {/* ---------------- results ---------------- */}
        <main className="flex flex-col gap-5">
          {run.cycles.length ? (
            <Banner tone="bad" title={t("formula.cyclesTitle")}>
              {t("formula.cyclesBody", { keys: run.cycles.join(", ") })}
            </Banner>
          ) : null}
          {errorKeys.length ? (
            <Banner tone="bad" title={t("formula.errorsTitle", { count: errorKeys.length })}>
              {t("formula.errorsBody")}
            </Banner>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <InputPanel
              draft={draftInput}
              set={(patch) => {
                setDraftInput((current) => ({ ...current, ...patch }));
                setDirty(true);
              }}
              setSwitch={setEnabled}
              onRun={runNow}
              dirty={dirty}
              onReset={resetAll}
              onShare={share}
              shareNote={shareNote}
              savedAt={savedAt}
            />
            <FigureGrid
              active={active}
              signing={signing}
              last={last}
              shippedActive={shippedActive}
              growth={growth}
              extrasShare={extrasShare}
              run={run}
              cad={cad}
              showShipped={showShipped}
            />
          </section>

          <section className="border border-ink">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3 py-2">
              <h2 className="font-serif text-[1.05rem] font-bold">{t("formula.chartTitle")}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {["tripTotal", "ticketTotal", "extrasTotal", "aif", "aero", "airfare", "parking", "dropOff", "food"].map(
                  (key) => {
                    const on = chartKeys.includes(key);
                    return (
                      <label key={key} className="flex cursor-pointer items-center gap-1.5 font-sans text-[0.7rem]">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setChartKeys((current) =>
                              current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
                            )
                          }
                          className="h-3 w-3 cursor-pointer accent-black"
                        />
                        <span className={on ? "text-ink" : "text-ink-4"}>{t(`formula.stepLabels.${key}`)}</span>
                      </label>
                    );
                  },
                )}
                <label className="flex cursor-pointer items-center gap-1.5 border-l border-rule pl-3 font-sans text-[0.7rem]">
                  <input
                    type="checkbox"
                    checked={showShipped}
                    onChange={() => setShowShipped((value) => !value)}
                    className="h-3 w-3 cursor-pointer accent-black"
                  />
                  <span className="text-ink-4">{t("formula.showShipped")}</span>
                </label>
              </div>
            </div>

            <FormulaChart
              run={run}
              shipped={shippedRun}
              showShipped={showShipped}
              series={chartSeries}
              steps={stepByKey}
              cad={cad}
            />
          </section>

          <YearTable run={run} steps={stepByKey} cad={cad} />
        </main>
      </div>
    </div>
  );
}

const tabClass = (on: boolean) =>
  [
    "cursor-pointer border-b-2 pb-0.5 font-sans text-[0.74rem] font-bold uppercase tracking-wide transition",
    on ? "border-ink text-ink" : "border-transparent text-ink-4 hover:text-ink",
  ].join(" ");

const actionClass =
  "cursor-pointer border border-ink px-3 py-1 font-sans text-[0.72rem] font-bold uppercase tracking-wide transition hover:bg-ink hover:text-white";

/** Every name a formula may read without a typo warning. */
function knownNamesFor(model: FormulaModel): Set<string> {
  const names = new Set<string>();
  PARAM_SPECS.forEach((spec) => names.add(spec.key));
  model.groups.forEach((group) => group.steps.forEach((step) => names.add(step.key)));
  [
    "year",
    "step",
    "ticket",
    "days",
    "travellers",
    "dropOffMinutes",
    "airportCode",
    "airport",
    "aifByAirport",
    "horizon",
    "P",
    "yearly",
    "enabledParking",
    "enabledDrop",
    "enabledFood",
    "enabledTicket",
    "enabledTrip",
    "enabledAif",
    "enabledAirfare",
    "enabledAeronautical",
    "enabledTaxes",
    "true",
    "false",
    "null",
  ].forEach((name) => names.add(name));
  FUNCTION_REFERENCE.forEach((entry) => names.add(entry.name));
  return names;
}

/* ------------------------------------------------------------------ *
 * Panels
 * ------------------------------------------------------------------ */

function Banner({ tone, title, children }: { tone: "bad" | "warn"; title: string; children: React.ReactNode }) {
  return (
    <div
      className={[
        "border-l-4 bg-cream px-3 py-2",
        tone === "bad" ? "border-data-a" : "border-ink-4",
      ].join(" ")}
    >
      <p className="font-sans text-[0.76rem] font-bold text-ink">{title}</p>
      <p className="mt-0.5 font-sans text-[0.72rem] leading-relaxed text-ink-3">{children}</p>
    </div>
  );
}

function Presets({ current, apply }: { current: FormulaModel; apply: (next: FormulaModel) => void }) {
  const { t } = useTranslation();
  return (
    <section className="border border-ink">
      <h2 className="border-b border-rule px-3 py-2 font-serif text-[1.02rem] font-bold">
        {t("formula.presetsTitle")}
      </h2>
      <ul className="divide-y divide-rule">
        {PRESETS.map((preset) => (
          <li key={preset.id} className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-sans text-[0.8rem] font-bold">{preset.name}</span>
              <button type="button" onClick={() => apply(applyPreset(preset, current))} className={actionClass}>
                {t("formula.apply")}
              </button>
            </div>
            <p className="mt-1 font-sans text-[0.72rem] leading-relaxed text-ink-3">{preset.blurb}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ParamsPanel({
  model,
  changed,
  editParam,
}: {
  model: FormulaModel;
  changed: (typeof PARAM_SPECS)[number][];
  editParam: (key: string, value: number) => void;
}) {
  const { t } = useTranslation();
  const changedKeys = new Set(changed.map((spec) => spec.key));
  return (
    <section className="border border-ink">
      <div className="border-b border-rule px-3 py-2">
        <h2 className="font-serif text-[1.02rem] font-bold">{t("formula.paramsTitle")}</h2>
        <p className="mt-1 font-sans text-[0.72rem] leading-relaxed text-ink-3">{t("formula.paramsBody")}</p>
      </div>
      <ul className="divide-y divide-rule">
        {PARAM_SPECS.map((spec) => {
          const value = model.params[spec.key] ?? DEFAULT_PARAMS[spec.key];
          return (
            <li key={spec.key} className="px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-sans text-[0.76rem] font-bold">
                  {spec.label}
                  {changedKeys.has(spec.key) ? <span className="ml-1.5 text-data-a">•</span> : null}
                </span>
                <span className="font-mono text-[0.74rem] tabular">{formatParam(spec, value)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={value}
                  onChange={(event) => editParam(spec.key, Number(event.target.value))}
                  aria-label={spec.label}
                  className="h-1 flex-1 cursor-pointer appearance-none bg-rule [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ink"
                />
                <input
                  type="number"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={value}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) editParam(spec.key, next);
                  }}
                  className="w-24 border-b border-ink bg-transparent py-0.5 text-right font-mono text-[0.74rem] tabular outline-none"
                />
                <span className="w-20 font-sans text-[0.66rem] text-ink-4">{spec.unit}</span>
              </div>
              <p className="mt-1 font-sans text-[0.68rem] leading-snug text-ink-4">
                {spec.note}
                <span className="ml-1 font-mono text-ink-4">
                  {t("formula.shippedValue", { value: formatParam(spec, DEFAULT_PARAMS[spec.key]) })}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReferencePanel() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <section className="border border-ink">
        <h2 className="border-b border-rule px-3 py-2 font-serif text-[1.02rem] font-bold">
          {t("formula.varsTitle")}
        </h2>
        <ul className="divide-y divide-rule">
          {VARIABLE_SPECS.map((entry) => (
            <li key={entry.name} className="flex items-baseline gap-3 px-3 py-1.5">
              <code className="w-44 shrink-0 font-mono text-[0.74rem] font-semibold">{entry.name}</code>
              <span className="font-sans text-[0.72rem] leading-snug text-ink-3">{entry.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-ink">
        <h2 className="border-b border-rule px-3 py-2 font-serif text-[1.02rem] font-bold">
          {t("formula.functionsTitle")}
        </h2>
        <ul className="divide-y divide-rule">
          {FUNCTION_REFERENCE.map((entry) => (
            <li key={entry.name} className="flex items-baseline gap-3 px-3 py-1.5">
              <code className="w-44 shrink-0 font-mono text-[0.74rem] font-semibold">{entry.signature}</code>
              <span className="font-sans text-[0.72rem] leading-snug text-ink-3">{entry.note}</span>
            </li>
          ))}
        </ul>
        <p className="border-t border-rule px-3 py-2 font-sans text-[0.7rem] leading-relaxed text-ink-4">
          {t("formula.functionsNote")}
        </p>
      </section>

      <section className="border border-ink px-3 py-2">
        <h2 className="font-serif text-[1.02rem] font-bold">{t("formula.syntaxTitle")}</h2>
        <ul className="mt-1.5 space-y-1 font-sans text-[0.72rem] leading-relaxed text-ink-3">
          <li>
            <code className="font-mono">a + b − * / % **</code> — {t("formula.syntax.math")}
          </li>
          <li>
            <code className="font-mono">a &gt; b ? x : y</code> — {t("formula.syntax.ternary")}
          </li>
          <li>
            <code className="font-mono">a &amp;&amp; b</code>, <code className="font-mono">a || b</code>,{" "}
            <code className="font-mono">!a</code> — {t("formula.syntax.logic")}
          </li>
          <li>
            <code className="font-mono">airport.parkingPerDay</code>, <code className="font-mono">P.rampEnd</code> —{" "}
            {t("formula.syntax.member")}
          </li>
          <li>
            <code className="font-mono">yearly.aif</code> — {t("formula.syntax.yearly")}
          </li>
        </ul>
      </section>
    </div>
  );
}


/* ------------------------------------------------------------------ *
 * The step editor
 * ------------------------------------------------------------------ */

function StepGroup({
  group,
  open,
  toggle,
  values,
  errors,
  changed,
  selected,
  select,
  edit,
  knownNames,
  suggestions,
}: {
  group: FormulaGroup;
  open: boolean;
  toggle: () => void;
  values: Record<string, number>;
  errors: Record<string, string>;
  changed: Set<string>;
  selected: string | null;
  select: (key: string | null) => void;
  edit: (key: string, expression: string) => void;
  knownNames: Set<string>;
  suggestions: SuggestionContext;
}) {
  const groupErrors = group.steps.filter((step) => errors[step.key]).length;
  const groupChanged = group.steps.filter((step) => changed.has(step.key)).length;

  return (
    <section className="border border-ink">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-cream"
      >
        <span className="font-serif text-[1.02rem] font-bold">{group.title}</span>
        <span className="ml-auto font-sans text-[0.66rem] uppercase tracking-wide text-ink-4">
          {groupChanged ? <span className="mr-2 text-data-b">{groupChanged} edited</span> : null}
          {groupErrors ? <span className="mr-2 text-data-a">{groupErrors} error</span> : null}
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="border-t border-rule">
          <p className="px-3 py-2 font-sans text-[0.72rem] leading-relaxed text-ink-3">{group.blurb}</p>
          <ul className="divide-y divide-rule">
            {group.steps.map((step) => (
              <li key={step.key} className={selected === step.key ? "bg-cream" : undefined}>
                <StepField
                  step={step}
                  value={values[step.key]}
                  error={errors[step.key]}
                  edited={changed.has(step.key)}
                  selected={selected === step.key}
                  select={() => select(selected === step.key ? null : step.key)}
                  edit={edit}
                  knownNames={knownNames}
                  suggestions={suggestions}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/**
 * One editable expression, with a completion list.
 *
 * What is typed is kept verbatim — including a half-finished expression — while
 * the value beside it comes from the applied formula, so the two never pretend
 * to be the same thing. Typing a dot opens the members of whatever it follows
 * (`P.` lists every parameter, `airport.` every field), which is what makes the
 * reference tab feel optional rather than necessary.
 */
function StepField({
  step,
  value,
  error,
  edited,
  selected,
  select,
  edit,
  knownNames,
  suggestions,
}: {
  step: FormulaStep;
  value: number | undefined;
  error?: string;
  edited: boolean;
  selected: boolean;
  select: () => void;
  edit: (key: string, expression: string) => void;
  knownNames: Set<string>;
  suggestions: SuggestionContext;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(step.expression);
  /** Where the caret last was, read from the element; null when unfocused. */
  const [caret, setCaret] = useState<number | null>(null);
  /** True when the dropdown button asked for the list, rather than a keystroke. */
  const [browsing, setBrowsing] = useState(false);
  const [active, setActive] = useState(0);
  /** The caret position Escape was pressed at: the list stays shut until it moves. */
  const dismissed = useRef<number | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastApplied = useRef(step.expression);

  // A preset or a reset rewrites the expression underneath us; follow it, but
  // never while the field is the thing that just changed.
  useEffect(() => {
    if (step.expression !== lastApplied.current) {
      lastApplied.current = step.expression;
      setDraft(step.expression);
      setCaret(null);
      setBrowsing(false);
      dismissed.current = null;
    }
  }, [step.expression]);

  const local = useMemo(() => validate(draft, knownNames), [draft, knownNames]);
  const shownError = local.error ?? error;

  /**
   * Track the caret through `selectionchange`, which the browser fires for
   * every way a caret can move — typing, clicking, an arrow key, a paste — and
   * does so on the document, so it keeps working while the field is being
   * re-rendered. Reading the caret on each change instead means a field whose
   * text React just committed would report no caret at all.
   */
  useEffect(() => {
    const onSelectionChange = () => {
      const node = areaRef.current;
      if (!node) return;
      if (document.activeElement !== node) {
        setCaret(null);
        return;
      }
      const at = node.selectionStart ?? draft.length;
      setCaret((current) => (current === at ? current : at));
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [draft.length]);

  /**
   * `typed` is what the caret is attached to right now — `P.`, `airport.pop`.
   * `browse` is the same thing widened to everything available, which is what
   * the ▾ button opens. Everything the reader sees comes from one of the two,
   * and Enter always takes the highlighted row from whichever is showing.
   */
  const typed = useMemo(
    () => (caret === null ? null : completionAt(draft, caret, suggestions)),
    [draft, caret, suggestions],
  );
  const browse = useMemo(
    () => (browsing ? browseAt(draft, caret ?? draft.length, suggestions) : null),
    [browsing, draft, caret, suggestions],
  );
  const request = browse ?? typed;
  const items = request?.items.slice(0, 40) ?? [];
  // Escape silences the list until the caret moves, so a keystroke reopens it.
  const open = items.length > 0 && dismissed.current !== caret;

  // In development, publish what this field believes about itself. It makes the
  // caret state inspectable from a test harness without guessing.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const debug = ((window as unknown as { __formulaFields?: Record<string, unknown> }).__formulaFields ??= {});
    debug[step.key] = {
      draft,
      caret,
      browsing,
      dismissed: dismissed.current,
      owner: request?.owner ?? null,
      prefix: request?.prefix ?? "",
      suggestions: items.length,
      open,
    };
  });

  // Keep the highlighted row inside the list as it is filtered by typing.
  useEffect(() => {
    setActive(0);
  }, [request?.owner, request?.prefix]);

  const commit = useCallback(
    (next: string, nextCaret: number) => {
      setDraft(next);
      edit(step.key, next);
      setCaret(nextCaret);
      setBrowsing(false);
      dismissed.current = null;
      // Put the caret back where the completion left it, after React's paint.
      window.requestAnimationFrame(() => {
        const node = areaRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [edit, step.key],
  );

  const accept = useCallback(
    (suggestion: Suggestion) => {
      if (!request) return;
      const applied = applyCompletion(draft, request, suggestion);
      commit(applied.text, applied.caret);
    },
    [commit, draft, request],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => (current + 1) % items.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => (current - 1 + items.length) % items.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        accept(items[active]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setBrowsing(false);
        dismissed.current = caret;
        return;
      }
    }
    // Enter without a list open leaves the field; Shift+Enter writes arithmetic.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      setCaret(null);
      setBrowsing(false);
      event.currentTarget.blur();
    }
  };

  return (
    <div className="px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <button
          type="button"
          onClick={select}
          className="cursor-pointer text-left font-sans text-[0.78rem] font-bold hover:underline"
        >
          {step.label}
          {edited ? <span className="ml-1.5 text-data-b">✎</span> : null}
        </button>
        <span className="font-mono text-[0.76rem] tabular">
          {step.component ? <span className="mr-1 text-ink-4">=</span> : null}
          {value === undefined ? "—" : formatValue(step, value)}
        </span>
      </div>

      <div className="relative mt-1">
        <div className="flex items-start gap-2">
          <code className="shrink-0 pt-1 font-mono text-[0.7rem] text-ink-4">{step.key} =</code>
          <textarea
            ref={areaRef}
            value={draft}
            spellCheck={false}
            rows={Math.max(1, Math.ceil(draft.length / 52))}
            onChange={(event) => {
              setDraft(event.target.value);
              edit(step.key, event.target.value);
              if (dismissed.current !== null && dismissed.current !== event.target.selectionStart) {
                dismissed.current = null;
              }
            }}
            onKeyDown={onKeyDown}
            onBlur={() =>
              window.setTimeout(() => {
                setCaret(null);
                setBrowsing(false);
                dismissed.current = null;
              }, 120)
            }
            aria-label={step.label}
            aria-autocomplete="list"
            aria-expanded={open}
            className={[
              "w-full resize-y border bg-transparent px-1.5 py-1 font-mono text-[0.72rem] leading-relaxed outline-none",
              shownError ? "border-data-a" : "border-rule focus:border-ink",
            ].join(" ")}
          />
          <button
            type="button"
            onMouseDown={(event) => {
              // Keep the caret where it is; the list describes that position.
              event.preventDefault();
            }}
            onClick={() => {
              if (open) {
                setBrowsing(false);
                dismissed.current = caret;
                return;
              }
              dismissed.current = null;
              setBrowsing(true);
              areaRef.current?.focus();
            }}
            aria-label={t("formula.browse")}
            aria-expanded={open}
            title={t("formula.browse")}
            className={[
              "mt-0.5 shrink-0 cursor-pointer border px-1.5 py-1 font-sans text-[0.7rem] leading-none transition",
              open ? "border-ink bg-ink text-white" : "border-rule text-ink-4 hover:border-ink hover:text-ink",
            ].join(" ")}
          >
            ▾
          </button>
        </div>

        {open && request ? (
          <CompletionList
            owner={request.owner}
            prefix={request.prefix}
            items={items}
            active={active}
            setActive={setActive}
            choose={accept}
            heading={
              request.owner
                ? t("formula.completionsUnder", { owner: request.owner })
                : browse
                  ? t("formula.completionsAll")
                  : t("formula.completions")
            }
          />
        ) : null}
      </div>

      {shownError ? (
        <p className="mt-1 font-sans text-[0.68rem] leading-snug text-data-a">{shownError}</p>
      ) : (
        <p className="mt-1 font-sans text-[0.68rem] leading-snug text-ink-4">
          {step.note}
          {step.unit ? <span className="ml-1 font-mono">{step.unit}</span> : null}
        </p>
      )}
    </div>
  );
}

/**
 * The completion list. Absolutely positioned under the field rather than
 * portalled, so it travels with the editor it belongs to.
 */
function CompletionList({
  owner,
  prefix,
  items,
  active,
  setActive,
  choose,
  heading,
}: {
  owner: string;
  prefix: string;
  items: Suggestion[];
  active: number;
  setActive: (index: number) => void;
  choose: (suggestion: Suggestion) => void;
  heading: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="listbox"
      aria-label={heading}
      // Prevent the blur that would close the list before the click lands.
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      className="absolute left-0 right-0 z-40 mt-1 max-h-72 overflow-y-auto border border-ink bg-paper shadow-[4px_4px_0_rgba(18,18,18,0.12)]"
    >
      <p className="sticky top-0 border-b border-rule bg-cream px-2 py-1 font-sans text-[0.62rem] font-bold uppercase tracking-[0.09em] text-ink-4">
        {heading}
        {prefix ? <span className="ml-1.5 normal-case text-ink-3">“{prefix}”</span> : null}
        <span className="ml-2 font-normal normal-case tracking-normal text-ink-4">
          {t("formula.completionKeys")}
        </span>
      </p>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.kind}-${item.label}`} role="option" aria-selected={index === active}>
            <button
              type="button"
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item)}
              className={[
                "flex w-full cursor-pointer items-baseline gap-2 px-2 py-1 text-left",
                index === active ? "bg-ink text-white" : "hover:bg-cream",
              ].join(" ")}
            >
              <code
                className={[
                  "shrink-0 font-mono text-[0.72rem] font-semibold",
                  index === active ? "text-white" : "text-ink",
                ].join(" ")}
              >
                {owner ? `${owner}.` : ""}
                {item.label}
              </code>
              <span
                className={[
                  "font-sans text-[0.68rem] leading-snug",
                  index === active ? "text-white/80" : "text-ink-3",
                ].join(" ")}
              >
                {item.detail}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Parse a draft expression and name the first problem, without running it.
 *
 * The scope below is a stand-in with the right *shape* — `P` is an object,
 * `airport` an object, `yearly` a table of lists — so a formula that reads a
 * property parses, while a misspelt name is still caught here rather than
 * showing up as a silent zero in the table.
 */
function validate(draft: string, knownNames: Set<string>): { error?: string } {
  if (!draft.trim()) return { error: "Empty expression" };
  try {
    const names = referencedNames(draft);
    const unknown = names.filter((name) => !knownNames.has(name));
    if (unknown.length) return { error: `Unknown name “${unknown[0]}” — see the Reference tab` };

    const scope: Record<string, unknown> = {};
    knownNames.forEach((name) => {
      scope[name] = 1;
    });
    scope.P = new Proxy({}, { get: () => 1 });
    scope.airport = { code: "YYZ", parkingPerDay: 32, freeDropOffMinutes: 18, passengers: 50.5, trafficShare: 36, inScope: true };
    scope.aifByAirport = { YYZ: 41.81 };
    scope.yearly = new Proxy({}, { get: () => [1, 2, 3] });
    scope.airportCode = "YYZ";

    evaluate(draft, scope);
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/* ------------------------------------------------------------------ *
 * Inputs and switches
 * ------------------------------------------------------------------ */

function InputPanel({
  draft,
  set,
  setSwitch,
  onRun,
  dirty,
  onReset,
  onShare,
  shareNote,
  savedAt,
}: {
  draft: WorkbenchInput;
  set: (patch: Partial<WorkbenchInput>) => void;
  setSwitch: (key: string, on: boolean) => void;
  onRun: () => void;
  dirty: boolean;
  onReset: () => void;
  onShare: () => void;
  shareNote: string | null;
  savedAt: string | null;
}) {
  const { t } = useTranslation();
  return (
    <section className="border border-ink">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-3 py-2">
        <h2 className="font-serif text-[1.02rem] font-bold">{t("formula.inputsTitle")}</h2>
        <p className="font-sans text-[0.66rem] text-ink-4">
          {savedAt ? t("formula.savedAt", { time: savedAt }) : t("formula.saved")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2">
        <Field label={t("formula.airport")}>
          <select
            value={draft.airport}
            onChange={(event) => set({ airport: event.target.value })}
            className="w-full cursor-pointer border-b border-ink bg-transparent py-0.5 font-sans text-[0.8rem] outline-none"
          >
            {AIRPORTS.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.code} — {airport.city}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("formula.ticket")}>
          <NumberInput value={draft.ticket} min={0} max={10000} step={1} onChange={(value) => set({ ticket: value })} />
        </Field>
        <Field label={t("formula.days")}>
          <NumberInput value={draft.days} min={0} max={60} step={1} onChange={(value) => set({ days: value })} />
        </Field>
        <Field label={t("formula.travellers")}>
          <NumberInput value={draft.travellers} min={1} max={12} step={1} onChange={(value) => set({ travellers: value })} />
        </Field>
        <Field label={t("formula.dropOff")}>
          <NumberInput
            value={draft.dropOffMinutes}
            min={0}
            max={240}
            step={1}
            onChange={(value) => set({ dropOffMinutes: value })}
          />
        </Field>
        <Field label={t("formula.year")}>
          <NumberInput value={draft.year} min={0} max={runHorizonCap} step={1} onChange={(value) => set({ year: value })} />
        </Field>
      </div>

      <div className="border-t border-rule px-3 py-2">
        <p className="font-sans text-[0.66rem] font-bold uppercase tracking-[0.09em] text-ink-4">
          {t("formula.switchesTitle")}
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {SWITCHES.map((entry) => (
            <li key={entry.key}>
              <label className="flex cursor-pointer items-center gap-1.5 font-sans text-[0.74rem]">
                <input
                  type="checkbox"
                  checked={draft.enabled[entry.key] !== false}
                  onChange={(event) => setSwitch(entry.key, event.target.checked)}
                  className="h-3 w-3 cursor-pointer accent-black"
                />
                <span>{entry.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 font-sans text-[0.66rem] leading-snug text-ink-4">{t("formula.switchesNote")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-rule px-3 py-2">
        <button
          type="button"
          onClick={onRun}
          disabled={!dirty}
          className={[
            "border px-3 py-1 font-sans text-[0.72rem] font-bold uppercase tracking-wide transition",
            dirty ? "cursor-pointer border-ink bg-ink text-white hover:bg-ink-2" : "border-rule text-ink-4",
          ].join(" ")}
        >
          {t("formula.run")}
        </button>
        <button type="button" onClick={onShare} className={actionClass}>
          {t("formula.share")}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="cursor-pointer border border-data-a px-3 py-1 font-sans text-[0.72rem] font-bold uppercase tracking-wide text-data-a transition hover:bg-data-a hover:text-white"
        >
          {t("formula.restore")}
        </button>
        <span className="font-sans text-[0.68rem] leading-snug text-ink-4">
          {shareNote ?? t("formula.runHint")}
        </span>
      </div>

      <p className="border-t border-rule px-3 py-2 font-sans text-[0.66rem] leading-relaxed text-ink-4">
        {t("formula.savedNote")}
      </p>
    </section>
  );
}

const runHorizonCap = 120;

const SWITCHES: { key: string; label: string }[] = [
  { key: "trip", label: "Whole trip" },
  { key: "ticket", label: "Ticket" },
  { key: "aif", label: "Improvement Fee" },
  { key: "airfare", label: "Airline fare" },
  { key: "aeronautical", label: "Aeronautical" },
  { key: "taxes", label: "Taxes" },
  { key: "parking", label: "Parking" },
  { key: "drop", label: "Drop-off" },
  { key: "food", label: "Food and retail" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-sans text-[0.64rem] font-bold uppercase tracking-wide text-ink-4">{label}</span>
      <span className="mt-0.5 block">{children}</span>
    </label>
  );
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(next);
      }}
      className="w-full border-b border-ink bg-transparent py-0.5 font-sans text-[0.8rem] tabular outline-none"
    />
  );
}

/* ------------------------------------------------------------------ *
 * Figures
 * ------------------------------------------------------------------ */

function FigureGrid({
  active,
  signing,
  last,
  shippedActive,
  growth,
  extrasShare,
  run,
  cad,
  showShipped,
}: {
  active: FormulaRun["active"];
  signing: FormulaRun["atSigning"];
  last: FormulaRun["active"];
  shippedActive: FormulaRun["active"];
  growth: number;
  extrasShare: number;
  run: ReturnType<typeof runModel>;
  cad: (value: number, decimals?: number) => string;
  showShipped: boolean;
}) {
  const { t } = useTranslation();
  const added = active.tripTotal - signing.tripTotal;
  const delta = active.tripTotal - shippedActive.tripTotal;

  const cells = [
    {
      value: cad(active.tripTotal),
      label: t("formula.figures.trip", { calendar: active.calendar }),
      tone: "red" as const,
    },
    { value: `+${growth.toFixed(0)}%`, label: t("formula.figures.growth"), tone: "red" as const },
    { value: cad(signing.tripTotal), label: t("formula.figures.atSigning"), tone: "muted" as const },
    {
      value: `${extrasShare.toFixed(0)}%`,
      label: t("formula.figures.extrasShare"),
      tone: "muted" as const,
    },
    { value: cad(active.ticketTotal), label: t("formula.figures.ticket"), tone: "muted" as const },
    { value: cad(active.extrasTotal), label: t("formula.figures.extras"), tone: "muted" as const },
    {
      // The books group works in $ millions, so these two are read as millions.
      value: `$${fmtInt(active.values.extraRevenueNeeded)}M`,
      label: t("formula.figures.needed", { calendar: active.calendar }),
      tone: "red" as const,
    },
    {
      value: `$${fmtInt(active.values.extractedToDate ?? 0)}M`,
      label: t("formula.figures.extracted"),
      tone: "muted" as const,
    },
    {
      value: cad(last.tripTotal),
      label: t("formula.figures.finalYear", { calendar: last.calendar }),
      tone: "muted" as const,
    },
    {
      value: `+${cad(added)}`,
      label: t("formula.figures.added"),
      tone: "red" as const,
    },
  ];

  return (
    <section className="border border-ink">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-3 py-2">
        <h2 className="font-serif text-[1.02rem] font-bold">{t("formula.figuresTitle")}</h2>
        <p className="font-sans text-[0.7rem] text-ink-4">
          {t("formula.drift", { amount: cad(run.drift, 2) })}
          {showShipped ? (
            <span className="ml-2">
              {delta === 0
                ? t("formula.matchesShipped")
                : t("formula.versusShipped", { amount: `${delta > 0 ? "+" : "−"}${cad(Math.abs(delta))}` })}
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-3 py-3 sm:grid-cols-3 xl:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label}>
            <p
              className={[
                "font-serif text-[1.25rem] font-bold leading-none tabular",
                cell.tone === "red" ? "text-data-a" : "text-ink",
              ].join(" ")}
            >
              {cell.value}
            </p>
            <p className="mt-1 font-sans text-[0.66rem] leading-snug text-ink-4">{cell.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * The chart
 * ------------------------------------------------------------------ */

const PALETTE: Record<string, string> = {
  tripTotal: "#d0021b",
  ticketTotal: "#0f7b3e",
  extrasTotal: "#7a3fa0",
  aif: "#1a5fb4",
  aero: "#4a90d9",
  airfare: "#9a9a9a",
  taxes: "#666666",
  parking: "#e8853f",
  dropOff: "#b06ad0",
  food: "#c9a227",
};

function FormulaChart({
  run,
  shipped,
  showShipped,
  series,
  steps,
  cad,
}: {
  run: ReturnType<typeof runModel>;
  shipped: ReturnType<typeof runModel>;
  showShipped: boolean;
  series: string[];
  steps: Map<string, FormulaStep>;
  cad: (value: number, decimals?: number) => string;
}) {
  const { t } = useTranslation();
  const W = 1000;
  const H = 420;
  const PAD = { top: 18, right: 116, bottom: 30, left: 78 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const horizon = run.horizon;

  const max = useMemo(() => {
    let peak = 0;
    for (const row of run.years) {
      for (const key of series) peak = Math.max(peak, Math.abs(row.values[key] ?? 0));
    }
    if (showShipped) for (const row of shipped.years) peak = Math.max(peak, row.tripTotal);
    // With every line switched off there is nothing to scale to; 1 keeps the
    // axes finite rather than drawing NaN across the plot.
    return peak > 0 ? peak * 1.06 : 1;
  }, [run.years, shipped.years, series, showShipped]);

  const sx = (year: number) => PAD.left + (year / Math.max(1, horizon)) * plotW;
  const sy = (value: number) => PAD.top + plotH - (value / max) * plotH;
  const line = (pick: (index: number) => number) =>
    run.years
      .map((row, index) => `${index === 0 ? "M" : "L"}${sx(row.year).toFixed(1)},${sy(pick(index)).toFixed(1)}`)
      .join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="px-1 pb-2 pt-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={t("formula.chartAria")}>
        {ticks.map((fraction) => (
          <g key={`grid-${fraction}`}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={sy(max * fraction)}
              y2={sy(max * fraction)}
              stroke={fraction === 0 ? "#121212" : "#ececec"}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={sy(max * fraction)}
              dy="0.32em"
              textAnchor="end"
              className="fill-ink-4 font-sans text-[10px] tabular"
            >
              {cad(max * fraction)}
            </text>
          </g>
        ))}

        {run.years
          .filter((row) => row.year % Math.max(1, Math.round(horizon / 10)) === 0 || row.year === horizon)
          .map((row) => (
            <text
              key={`x-${row.year}`}
              x={sx(row.year)}
              y={H - 8}
              textAnchor="middle"
              className="fill-ink-4 font-sans text-[10px] tabular"
            >
              {row.calendar}
            </text>
          ))}

        {/* The year being read, drawn under the lines. */}
        <line
          x1={sx(run.active.year)}
          x2={sx(run.active.year)}
          y1={PAD.top}
          y2={PAD.top + plotH}
          stroke="#121212"
          strokeWidth={1}
        />

        {/* The shipped model, for comparison: same trip, unedited formula. */}
        {showShipped ? (
          <path
            d={shipped.years
              .map((row, index) => `${index === 0 ? "M" : "L"}${sx(row.year).toFixed(1)},${sy(row.tripTotal).toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke="#121212"
            strokeWidth={1.2}
            strokeDasharray="5 4"
            opacity={0.55}
          />
        ) : null}

        {series.map((key) => {
          const step = steps.get(key);
          const colour = PALETTE[key] ?? "#333333";
          const isTotal = key === "tripTotal" || key === "ticketTotal" || key === "extrasTotal";
          return (
            <g key={key}>
              <path
                d={line((index) => run.years[index].values[key] ?? 0)}
                fill="none"
                stroke={colour}
                strokeWidth={isTotal ? 2.6 : 1.8}
              />
              <circle
                cx={sx(run.active.year)}
                cy={sy(run.active.values[key] ?? 0)}
                r={isTotal ? 4.5 : 3.5}
                fill={colour}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={PAD.left + plotW + 8}
                y={sy(run.years[run.years.length - 1].values[key] ?? 0)}
                dy="0.32em"
                className="font-sans text-[10px] font-semibold"
                fill={colour}
              >
                {step ? step.label.slice(0, 20) : key}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The year table
 * ------------------------------------------------------------------ */

function YearTable({
  run,
  steps,
  cad,
}: {
  run: ReturnType<typeof runModel>;
  steps: Map<string, FormulaStep>;
  cad: (value: number, decimals?: number) => string;
}) {
  const { t } = useTranslation();
  const columns = ["tripTotal", "ticketTotal", "extrasTotal", "aif", "aero", "airfare", "parking", "dropOff", "food"].filter(
    (key) => steps.has(key),
  );

  return (
    <section className="border border-ink">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-3 py-2">
        <h2 className="font-serif text-[1.02rem] font-bold">{t("formula.tableTitle")}</h2>
        <p className="font-sans text-[0.7rem] text-ink-4">{t("formula.tableNote", { horizon: run.horizon })}</p>
      </div>
      <div className="max-h-[26rem] overflow-auto">
        <table className="w-full border-collapse text-right">
          <thead className="sticky top-0 bg-cream">
            <tr>
              <th className="border-b border-rule px-2 py-1.5 text-left font-sans text-[0.66rem] font-bold uppercase tracking-wide text-ink-4">
                {t("formula.tableYear")}
              </th>
              {columns.map((key) => (
                <th
                  key={key}
                  className="border-b border-rule px-2 py-1.5 font-sans text-[0.66rem] font-bold uppercase tracking-wide text-ink-4"
                >
                  {steps.get(key)?.label ?? key}
                </th>
              ))}
              <th className="border-b border-rule px-2 py-1.5 font-sans text-[0.66rem] font-bold uppercase tracking-wide text-ink-4">
                {t("formula.tableVsShipped")}
              </th>
            </tr>
          </thead>
          <tbody>
            {run.years.map((row) => {
              const reference = run.shipped[row.year];
              const gap = reference ? row.tripTotal - reference.tripTotal : 0;
              return (
                <tr
                  key={row.year}
                  className={row.year === run.active.year ? "bg-cream" : undefined}
                >
                  <th className="border-b border-rule px-2 py-1 text-left font-sans text-[0.72rem] font-semibold tabular">
                    {row.year === 0 ? t("formula.signed") : row.year}
                    <span className="ml-1.5 font-normal text-ink-4">{row.calendar}</span>
                  </th>
                  {columns.map((key) => (
                    <td key={key} className="border-b border-rule px-2 py-1 font-mono text-[0.72rem] tabular">
                      {cad(row.values[key] ?? 0, key === "tripTotal" ? 0 : 2).replace(/^\$/, "")}
                    </td>
                  ))}
                  <td
                    className={[
                      "border-b border-rule px-2 py-1 font-mono text-[0.72rem] tabular",
                      Math.abs(gap) < 0.005 ? "text-ink-4" : gap > 0 ? "text-data-a" : "text-data-d",
                    ].join(" ")}
                  >
                    {Math.abs(gap) < 0.005 ? "—" : `${gap > 0 ? "+" : "−"}${cad(Math.abs(gap), 2).replace(/^\$/, "")}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-rule px-3 py-2 font-sans text-[0.68rem] leading-relaxed text-ink-4">
        {t("formula.tableFooter")}
      </p>
    </section>
  );
}
