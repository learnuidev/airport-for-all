/**
 * Autocomplete for the formula language.
 *
 * The catalogue is derived from the same objects the evaluator runs against —
 * `PARAM_SPECS` for `P.*`, the real airport rows for `airport.*`, the model's
 * own steps for `yearly.*` — so a name that autocompletes is a name that works,
 * and a name that is renamed stops being offered at the same moment it stops
 * resolving.
 *
 * The tokenizer here is deliberately shallow: it only has to work out what the
 * caret is attached to (`P.` / `airport.` / nothing), not parse the formula.
 */

import { AIRPORTS } from "@/lib/sourced";
import {
  AIF_BY_AIRPORT,
  FUNCTION_REFERENCE,
  PARAM_SPECS,
  VARIABLE_SPECS,
  type FormulaModel,
  type ParamSpec,
} from "./formula";

export type Suggestion = {
  /** What the reader sees in the list. */
  label: string;
  /** What gets inserted. */
  insert: string;
  /** A call signature, when the name is callable. */
  signature?: string;
  /** One line on what it does. */
  detail: string;
  kind: "step" | "param" | "input" | "airport" | "table" | "series" | "switch" | "function" | "literal";
};

export type SuggestionContext = {
  /** Everything that can be typed at the top level. */
  roots: Suggestion[];
  /** Members keyed by the name of the object holding them. */
  members: Record<string, Suggestion[]>;
};

/* ------------------------------------------------------------------ *
 * The catalogue
 * ------------------------------------------------------------------ */

/** The fields of the airport object, read off a real row so they stay in step. */
const AIRPORT_FIELDS: Suggestion[] = AIRPORTS.length
  ? Object.keys(AIRPORTS[0]).map((field) => ({
      label: field,
      insert: field,
      detail: airportFieldDetail(field),
      kind: "airport" as const,
    }))
  : [];

function airportFieldDetail(field: string): string {
  const details: Record<string, string> = {
    code: "The IATA code, e.g. YYZ",
    name: "The airport's full name",
    city: "The city it serves",
    province: "Province or territory",
    passengers: "Annual passengers, millions",
    trafficShare: "Share of Canadian air traffic, percent",
    unionised: "Whether the unions in the reporting are active there",
    note: "The line the article carries about it",
    inScope: "True when the airport was named in the announcement",
    parkingPerDay: "Today's long-stay parking price, per day",
    freeDropOffMinutes: "Free kerbside minutes allowed today",
  };
  return details[field] ?? "A field of the airport record";
}

const paramSuggestion = (spec: ParamSpec): Suggestion => ({
  label: spec.key,
  insert: spec.key,
  detail: `${spec.label} — ${spec.unit || "a plain number"}. ${spec.note}`,
  kind: "param",
});

/** A description of a step, for the list. */
const stepSuggestion = (key: string, label: string, note: string, unit: string): Suggestion => ({
  label: key,
  insert: key,
  detail: `${label} — ${unit || "a number"}. ${note}`,
  kind: "step",
});

/**
 * Build the suggestion sets for one formula. Called on every render of the
 * editor, so it stays honest when the reader adds or renames a step.
 */
export function buildSuggestions(model: FormulaModel): SuggestionContext {
  const steps = model.groups.flatMap((group) => group.steps);
  const stepNames = steps.map((step) => stepSuggestion(step.key, step.label, step.note, step.unit));

  const members: Record<string, Suggestion[]> = {
    P: PARAM_SPECS.map(paramSuggestion),
    airport: AIRPORT_FIELDS,
    yearly: stepNames.length ? stepNames : [{ label: "…", insert: "", detail: "No steps yet", kind: "series" }],
    aifByAirport: Object.keys(AIF_BY_AIRPORT).map((code) => ({
      label: code,
      insert: code,
      detail: `The real 2025 Improvement Fee at ${code}`,
      kind: "table" as const,
    })),
  };

  const roots: Suggestion[] = [
    // The reader's own inputs, then this year's derived steps.
    ...VARIABLE_SPECS.map((spec) => ({
      label: spec.name,
      insert: spec.name,
      detail: spec.note,
      kind: spec.kind,
    })),
    ...stepNames,
    ...FUNCTION_REFERENCE.map((entry) => ({
      label: entry.name,
      insert: `${entry.name}(`,
      signature: entry.signature,
      detail: entry.note,
      kind: "function" as const,
    })),
    { label: "true", insert: "true", detail: "The boolean true", kind: "literal" },
    { label: "false", insert: "false", detail: "The boolean false", kind: "literal" },
  ];

  return { roots, members };
}

/* ------------------------------------------------------------------ *
 * Finding what the caret is attached to
 * ------------------------------------------------------------------ */

export type CompletionRequest = {
  /** The members on offer. */
  items: Suggestion[];
  /** What has already been typed after the dot, to filter by. */
  prefix: string;
  /** Where the typed fragment starts, so it can be replaced. */
  from: number;
  /** Where the caret is. */
  to: number;
  /** The name of the object being read, for the heading. */
  owner: string;
};

const NAME = /[A-Za-z0-9_$]/;

/**
 * What should be offered at `caret`.
 *
 * Returns members when the caret sits in `owner.partial`, and the top-level
 * names when it sits in a bare word — so deleting `taxShare` from
 * `ticket * P.taxShare` and typing `P.` again brings the list back.
 */
export function completionAt(
  text: string,
  caret: number,
  context: SuggestionContext,
): CompletionRequest | null {
  const position = Math.max(0, Math.min(caret, text.length));

  // Walk back over the partial word under the caret.
  let start = position;
  while (start > 0 && NAME.test(text[start - 1])) start -= 1;
  const prefix = text.slice(start, position);

  // Is that word attached to an owner by a dot?
  const owner = start > 0 && text[start - 1] === "." ? wordEndingAt(text, start - 1) : null;
  if (owner && owner.name in context.members) {
    return {
      items: filter(context.members[owner.name], prefix),
      prefix,
      from: start,
      to: position,
      owner: owner.name,
    };
  }

  // A bare word: offer the top-level names, but never mid-identifier inside a
  // longer path (`P.tax` belongs to the member list, not this one).
  if (owner) return null;
  const before = text.slice(0, start).trimEnd();
  if (before.endsWith(".")) return null;
  if (!prefix) return null; // An empty field should not open a list on its own.
  return {
    items: filter(context.roots, prefix),
    prefix,
    from: start,
    to: position,
    owner: "",
  };
}

/** The identifier immediately before `index` (which points at a dot). */
function wordEndingAt(text: string, index: number): { name: string } | null {
  let end = index;
  while (end > 0 && /\s/.test(text[end - 1])) end -= 1;
  let start = end;
  while (start > 0 && NAME.test(text[start - 1])) start -= 1;
  if (start === end) return null;
  return { name: text.slice(start, end) };
}

/** Case-insensitive prefix match, then anything containing it, without repeats. */
function filter(items: Suggestion[], prefix: string): Suggestion[] {
  if (!prefix) return dedupe(items);
  const needle = prefix.toLowerCase();
  const starts = items.filter((item) => item.label.toLowerCase().startsWith(needle));
  const contains = items.filter(
    (item) => !item.label.toLowerCase().startsWith(needle) && item.label.toLowerCase().includes(needle),
  );
  return dedupe([...starts, ...contains]);
}

/**
 * One entry per name. A name can be reachable two ways — every switch is both a
 * variable and a step-like name — and the list should read as a list.
 */
function dedupe(items: Suggestion[]): Suggestion[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });
}

/**
 * What to offer when the reader asks for the list outright — the dropdown
 * button rather than a keystroke.
 *
 * It stays in context: inside `P.tax…` it browses `P`'s members, otherwise it
 * browses every name a formula can read.
 */
export function browseAt(text: string, caret: number, context: SuggestionContext): CompletionRequest {
  const inContext = completionAt(text, caret, context);
  if (inContext) return inContext;
  return {
    items: context.roots,
    prefix: "",
    from: caret,
    to: caret,
    owner: "",
  };
}

/** Apply a completion, returning the new text and where the caret should sit. */
export function applyCompletion(
  text: string,
  request: CompletionRequest,
  suggestion: Suggestion,
): { text: string; caret: number } {
  const next = `${text.slice(0, request.from)}${suggestion.insert}${text.slice(request.to)}`;
  return { text: next, caret: request.from + suggestion.insert.length };
}
