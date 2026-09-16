/**
 * The formula workbench.
 *
 * Everything the board projects is derived from `model.ts`. This module lifts
 * that model out of the source code and into data: every number is a parameter,
 * every step is an expression, and the reader can rewrite any of it from
 * /chart/formula and watch 21 years of the projection change underneath.
 *
 * The expressions are evaluated by `evaluate()` — a small recursive-descent
 * parser, not `eval` or `new Function`. Two reasons:
 *   - The workbench writes into the reader's own page, and a typo in a formula
 *     should print an error next to the field, not blank the screen.
 *   - A parser can name the mistake ("unknown name `taxs`") which is the whole
 *     point of an editor.
 *
 * `runModel()` mirrors the shipped model expression by expression, so the
 * default formula set reproduces `costsFor()` in `model.ts` exactly. The
 * workbench shows the two side by side and flags any drift.
 */

import { AIF_BY_AIRPORT, AIF_PER_TICKET, type TripInput, type YearCosts, costsFor, seriesFor } from "@/components/editorial/model";
import { AIRPORTS } from "@/lib/sourced";

/* ================================================================== *
 * 1. The evaluator
 * ================================================================== */

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "name"; value: string }
  | { kind: "op"; value: string }
  | { kind: "end" };

export class FormulaError extends Error {
  /** Index in the source expression where the problem was found. */
  at: number;
  constructor(message: string, at = 0) {
    super(message);
    this.name = "FormulaError";
    this.at = at;
  }
}

const OPERATORS = [
  "===",
  "!==",
  "==",
  "!=",
  "<=",
  ">=",
  "&&",
  "||",
  "**",
  "?",
  ":",
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "!",
  "(",
  ")",
  "[",
  "]",
  ",",
  ".",
  ";",
];

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      i += 1;
      continue;
    }
    if (/[0-9]/.test(char) || (char === "." && /[0-9]/.test(source[i + 1] ?? ""))) {
      const start = i;
      while (i < source.length && /[0-9]/.test(source[i])) i += 1;
      if (source[i] === ".") {
        i += 1;
        while (i < source.length && /[0-9]/.test(source[i])) i += 1;
      }
      if (source[i] === "e" || source[i] === "E") {
        const save = i;
        i += 1;
        if (source[i] === "+" || source[i] === "-") i += 1;
        if (/[0-9]/.test(source[i] ?? "")) {
          while (i < source.length && /[0-9]/.test(source[i])) i += 1;
        } else {
          i = save;
        }
      }
      tokens.push({ kind: "number", value: Number(source.slice(start, i)) });
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = i;
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i])) i += 1;
      tokens.push({ kind: "name", value: source.slice(start, i) });
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      let out = "";
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") {
          i += 1;
          const escaped = source[i] ?? "";
          out += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped;
        } else {
          out += source[i];
        }
        i += 1;
      }
      if (i >= source.length) throw new FormulaError("Unterminated string", i);
      i += 1;
      tokens.push({ kind: "string", value: out });
      continue;
    }
    const operator = OPERATORS.find((candidate) => source.startsWith(candidate, i));
    if (!operator) throw new FormulaError(`Unexpected character “${char}”`, i);
    i += operator.length;
    tokens.push({ kind: "op", value: operator });
  }
  tokens.push({ kind: "end" });
  return tokens;
}

type Node =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "name"; name: string; at: number }
  | { kind: "unary"; op: string; argument: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "logical"; op: "&&" | "||"; left: Node; right: Node }
  | { kind: "conditional"; test: Node; then: Node; otherwise: Node }
  | { kind: "call"; callee: Node; args: Node[]; at: number; name: string }
  | { kind: "member"; object: Node; property: string };

/** Parser for the small expression language. Precedence follows JavaScript. */
export function parse(source: string): Node {
  const tokens = tokenize(source);
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];
  const isOp = (value: string) => {
    const token = peek();
    return token.kind === "op" && token.value === value;
  };
  const eat = (value: string) => {
    if (!isOp(value)) return false;
    position += 1;
    return true;
  };
  const expect = (value: string) => {
    if (!eat(value)) throw new FormulaError(`Expected “${value}”`, position);
  };

  const parsePrimary = (): Node => {
    const token = next();
    if (token.kind === "number") return { kind: "number", value: token.value };
    if (token.kind === "string") return { kind: "string", value: token.value };
    if (token.kind === "name") return { kind: "name", name: token.value, at: position };
    if (token.kind === "op" && token.value === "(") {
      const inner = parseExpression();
      expect(")");
      return inner;
    }
    if (token.kind === "op" && token.value === "[") {
      // A bare list, so `[1, 2, 3]` works for lookups and switches.
      const items: Node[] = [];
      if (!isOp("]")) {
        do {
          items.push(parseExpression());
        } while (eat(","));
      }
      expect("]");
      return {
        kind: "call",
        callee: { kind: "name", name: "__list", at: 0 },
        args: items,
        at: 0,
        name: "__list",
      };
    }
    if (token.kind === "end") throw new FormulaError("Unexpected end of expression", position);
    throw new FormulaError(`Unexpected token “${token.value}”`, position);
  };

  const parseCall = (): Node => {
    let node = parsePrimary();
    for (;;) {
      if (eat(".")) {
        const property = next();
        if (property.kind !== "name") throw new FormulaError("Expected a property name after “.”", position);
        node = { kind: "member", object: node, property: property.value };
        continue;
      }
      if (isOp("(")) {
        let name = "";
        if (node.kind === "name") name = node.name;
        else if (node.kind === "member") name = node.property;
        else throw new FormulaError("Only named functions can be called", position);
        eat("(");
        const args: Node[] = [];
        if (!isOp(")")) {
          do {
            args.push(parseExpression());
          } while (eat(","));
        }
        expect(")");
        node = { kind: "call", callee: node, args, at: position, name };
        continue;
      }
      return node;
    }
  };

  const parseUnary = (): Node => {
    if (isOp("-") || isOp("+") || isOp("!")) {
      const op = (next() as { value: string }).value;
      return { kind: "unary", op, argument: parseUnary() };
    }
    return parseCall();
  };

  const parseExponent = (): Node => {
    const left = parseUnary();
    if (eat("**")) return { kind: "binary", op: "**", left, right: parseExponent() };
    return left;
  };

  const parseMultiplicative = (): Node => {
    let node = parseExponent();
    for (;;) {
      if (isOp("*") || isOp("/") || isOp("%")) {
        const op = (next() as { value: string }).value;
        node = { kind: "binary", op, left: node, right: parseExponent() };
        continue;
      }
      return node;
    }
  };

  const parseAdditive = (): Node => {
    let node = parseMultiplicative();
    for (;;) {
      if (isOp("+") || isOp("-")) {
        const op = (next() as { value: string }).value;
        node = { kind: "binary", op, left: node, right: parseMultiplicative() };
        continue;
      }
      return node;
    }
  };

  const parseRelational = (): Node => {
    let node = parseAdditive();
    for (;;) {
      if (isOp("<") || isOp(">") || isOp("<=") || isOp(">=")) {
        const op = (next() as { value: string }).value;
        node = { kind: "binary", op, left: node, right: parseAdditive() };
        continue;
      }
      return node;
    }
  };

  const parseEquality = (): Node => {
    let node = parseRelational();
    for (;;) {
      if (isOp("==") || isOp("!=") || isOp("===") || isOp("!==")) {
        const op = (next() as { value: string }).value;
        node = { kind: "binary", op, left: node, right: parseRelational() };
        continue;
      }
      return node;
    }
  };

  const parseLogicalAnd = (): Node => {
    let node = parseEquality();
    for (;;) {
      if (isOp("&&")) {
        next();
        node = { kind: "logical", op: "&&", left: node, right: parseEquality() };
        continue;
      }
      return node;
    }
  };

  const parseLogicalOr = (): Node => {
    let node = parseLogicalAnd();
    for (;;) {
      if (isOp("||")) {
        next();
        node = { kind: "logical", op: "||", left: node, right: parseLogicalAnd() };
        continue;
      }
      return node;
    }
  };

  const parseConditional = (): Node => {
    const test = parseLogicalOr();
    if (eat("?")) {
      const then = parseExpression();
      expect(":");
      return { kind: "conditional", test, then, otherwise: parseExpression() };
    }
    return test;
  };

  function parseExpression(): Node {
    return parseConditional();
  }

  const tree = parseExpression();
  if (peek().kind !== "end") {
    const token = peek() as { kind: string; value?: string };
    throw new FormulaError(`Unexpected “${token.value ?? token.kind}” after the end of the expression`, position);
  }
  return tree;
}

/** Names available to a formula, plus the values they hold. */
export type Scope = Record<string, unknown>;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  if (value === null || value === undefined) return Number.NaN;
  return Number.NaN;
};

const toBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  if (typeof value === "string") return value.length > 0;
  return value !== null && value !== undefined;
};

function callFunction(name: string, args: unknown[]): unknown {
  const num = (index: number) => toNumber(args[index]);
  switch (name) {
    case "__list":
      return args;
    case "min":
      return Math.min(...args.map(toNumber));
    case "max":
      return Math.max(...args.map(toNumber));
    case "abs":
      return Math.abs(num(0));
    case "floor":
      return Math.floor(num(0));
    case "ceil":
      return Math.ceil(num(0));
    case "round": {
      const digits = args.length > 1 ? Math.trunc(num(1)) : 0;
      const factor = Math.pow(10, digits);
      return Math.round(num(0) * factor) / factor;
    }
    case "pow":
      return Math.pow(num(0), num(1));
    case "sqrt":
      return Math.sqrt(num(0));
    case "exp":
      return Math.exp(num(0));
    case "log":
      return Math.log(num(0));
    case "sign":
      return Math.sign(num(0));
    case "clamp":
      return Math.min(Math.max(num(0), num(1)), num(2));
    case "lerp":
      return num(0) + (num(1) - num(0)) * num(2);
    case "sum": {
      const list = Array.isArray(args[0]) ? args[0] : args;
      return list.reduce((total: number, value) => total + toNumber(value), 0);
    }
    case "list":
      return args;
    case "get": {
      const source = args[0];
      const key = args[1];
      if (Array.isArray(source)) {
        const index = toNumber(key);
        return source[Number.isFinite(index) ? index : 0];
      }
      if (source && typeof source === "object") {
        return (source as Record<string, unknown>)[String(key)];
      }
      return undefined;
    }
    case "if":
      return toBoolean(args[0]) ? args[1] : args[2];
    case "safe": {
      // Guards a division or a log: returns the fallback when the value is not finite.
      const value = toNumber(args[0]);
      return Number.isFinite(value) ? value : (args.length > 1 ? args[1] : 0);
    }
    case "smoothstep": {
      const [edge0, edge1, raw] = [num(0), num(1), num(2)];
      if (edge1 === edge0) return raw >= edge1 ? 1 : 0;
      const t = Math.min(1, Math.max(0, (raw - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    }
    case "step": {
      const [edge, raw] = [num(0), num(1)];
      return raw >= edge ? 1 : 0;
    }
    default:
      throw new FormulaError(`Unknown function “${name}()”`);
  }
}

/** Every function a formula may call, for the reference panel. */
export const FUNCTION_REFERENCE: { name: string; signature: string; note: string }[] = [
  { name: "min", signature: "min(a, b, …)", note: "Smallest value" },
  { name: "max", signature: "max(a, b, …)", note: "Largest value" },
  { name: "abs", signature: "abs(x)", note: "Absolute value" },
  { name: "round", signature: "round(x, digits?)", note: "Round, digits optional" },
  { name: "floor", signature: "floor(x)", note: "Round down" },
  { name: "ceil", signature: "ceil(x)", note: "Round up" },
  { name: "pow", signature: "pow(x, y)", note: "x to the power y" },
  { name: "sqrt", signature: "sqrt(x)", note: "Square root" },
  { name: "exp", signature: "exp(x)", note: "e to the power x" },
  { name: "log", signature: "log(x)", note: "Natural logarithm" },
  { name: "sign", signature: "sign(x)", note: "−1, 0 or 1" },
  { name: "clamp", signature: "clamp(x, lo, hi)", note: "Hold x inside a band" },
  { name: "lerp", signature: "lerp(a, b, t)", note: "Move from a to b by t" },
  { name: "smoothstep", signature: "smoothstep(lo, hi, x)", note: "S-curve from 0 to 1 — the ramp" },
  { name: "step", signature: "step(edge, x)", note: "1 once x reaches edge" },
  { name: "sum", signature: "sum(a, b, …)", note: "Add a list up" },
  { name: "get", signature: "get(list, i)", note: "Nth item of a list, or a key of a table" },
  { name: "if", signature: "if(test, a, b)", note: "Branch between two values" },
  { name: "safe", signature: "safe(x, fallback?)", note: "Fallback when x is not a finite number" },
  { name: "list", signature: "[a, b, …]", note: "Make a list" },
];

function evaluateNode(node: Node, scope: Scope): unknown {
  switch (node.kind) {
    case "number":
      return node.value;
    case "string":
      return node.value;
    case "name": {
      // `true` / `false` / `null` read as literals so a formula can carry a flag.
      if (node.name === "true") return true;
      if (node.name === "false") return false;
      if (node.name === "null") return null;
      if (!(node.name in scope)) {
        throw new FormulaError(`Unknown name “${node.name}” — check the variable reference`);
      }
      return scope[node.name];
    }
    case "unary": {
      const value = evaluateNode(node.argument, scope);
      if (node.op === "-") return -toNumber(value);
      if (node.op === "+") return toNumber(value);
      return !toBoolean(value);
    }
    case "binary": {
      const left = evaluateNode(node.left, scope);
      const right = evaluateNode(node.right, scope);
      switch (node.op) {
        case "+":
          return toNumber(left) + toNumber(right);
        case "-":
          return toNumber(left) - toNumber(right);
        case "*":
          return toNumber(left) * toNumber(right);
        case "/":
          return toNumber(left) / toNumber(right);
        case "%":
          return toNumber(left) % toNumber(right);
        case "**":
          return Math.pow(toNumber(left), toNumber(right));
        case "<":
          return toNumber(left) < toNumber(right);
        case ">":
          return toNumber(left) > toNumber(right);
        case "<=":
          return toNumber(left) <= toNumber(right);
        case ">=":
          return toNumber(left) >= toNumber(right);
        case "==":
        case "===":
          return left === right;
        case "!=":
        case "!==":
          return left !== right;
        default:
          throw new FormulaError(`Unsupported operator “${node.op}”`);
      }
    }
    case "logical": {
      const left = evaluateNode(node.left, scope);
      if (node.op === "&&") return toBoolean(left) ? evaluateNode(node.right, scope) : left;
      return toBoolean(left) ? left : evaluateNode(node.right, scope);
    }
    case "conditional":
      return toBoolean(evaluateNode(node.test, scope))
        ? evaluateNode(node.then, scope)
        : evaluateNode(node.otherwise, scope);
    case "member": {
      const object = evaluateNode(node.object, scope);
      if (object && typeof object === "object") {
        return (object as Record<string, unknown>)[node.property];
      }
      throw new FormulaError(`“${node.property}” read from a value that has no properties`);
    }
    case "call": {
      const args = node.args.map((argument) => evaluateNode(argument, scope));
      return callFunction(node.name, args);
    }
  }
}

/** Evaluate one expression against a scope. Throws `FormulaError` on a typo. */
export function evaluate(source: string, scope: Scope): unknown {
  if (!source.trim()) throw new FormulaError("Empty expression");
  return evaluateNode(parse(source), scope);
}

/** Evaluate and coerce to a number; a non-finite result becomes 0. */
export function evaluateNumber(source: string, scope: Scope): number {
  const value = evaluate(source, scope);
  return toNumber(value);
}

/**
 * Collect the names an expression reads. Used to order the calculation so a
 * formula may reference any step defined above it, whichever order the reader
 * typed them in, and to warn about names that do not exist at all.
 */
export function referencedNames(source: string): string[] {
  const names: string[] = [];
  const walk = (node: Node) => {
    switch (node.kind) {
      case "name":
        names.push(node.name);
        return;
      case "unary":
        walk(node.argument);
        return;
      case "binary":
      case "logical":
        walk(node.left);
        walk(node.right);
        return;
      case "conditional":
        walk(node.test);
        walk(node.then);
        walk(node.otherwise);
        return;
      case "member":
        walk(node.object);
        return;
      case "call":
        node.args.forEach(walk);
        return;
      default:
        return;
    }
  };
  try {
    walk(parse(source));
  } catch {
    return names;
  }
  return names;
}

/* ================================================================== *
 * 2. The editable model
 * ================================================================== */

export type ParamSpec = {
  key: string;
  label: string;
  /** Unit shown after the value. */
  unit: string;
  min: number;
  max: number;
  step: number;
  /** What this number is for, and where the shipped value came from. */
  note: string;
};

/** One named step of the calculation. */
export type FormulaStep = {
  key: string;
  label: string;
  /** The expression, as the reader edits it. */
  expression: string;
  /** Short unit label shown beside the computed value. */
  unit: string;
  /** What this step does. */
  note: string;
  /** True when the value is additive into a total and can be switched off. */
  component?: boolean;
};

export type FormulaGroup = {
  id: string;
  title: string;
  blurb: string;
  steps: FormulaStep[];
};

export type FormulaModel = {
  params: Record<string, number>;
  groups: FormulaGroup[];
};

/** Inputs the workbench reads off the board's own state. */
export type WorkbenchInput = {
  airport: string;
  ticket: number;
  days: number;
  travellers: number;
  dropOffMinutes: number;
  year: number;
  /** Which components count toward the totals. */
  enabled: Record<string, boolean>;
};

/* ---- parameters --------------------------------------------------- */

export const PARAM_SPECS: ParamSpec[] = [
  {
    key: "horizon",
    label: "Projection horizon",
    unit: "years",
    min: 1,
    max: 60,
    step: 1,
    note: "Years drawn from signing. The board uses 20.",
  },
  {
    key: "announcementYear",
    label: "Signing year",
    unit: "",
    min: 2000,
    max: 2100,
    step: 1,
    note: "Calendar year of the concession. The board uses 2026.",
  },
  {
    key: "aifFallback",
    label: "Improvement Fee, no figure on file",
    unit: "$",
    min: 0,
    max: 200,
    step: 0.01,
    note: "Used for airports the report does not price. The board uses $35.",
  },
  {
    key: "taxShare",
    label: "Taxes and fees, share of ticket",
    unit: "share",
    min: 0,
    max: 1,
    step: 0.005,
    note: "0.28 on the board — inside the reported 25–35 percent band.",
  },
  {
    key: "aeroCap",
    label: "Aeronautical charge ceiling today",
    unit: "$",
    min: 0,
    max: 400,
    step: 0.5,
    note: "A floor on what must remain in the fare. The board uses $22.",
  },
  {
    key: "aeroCapShare",
    label: "…and its share of the ticket",
    unit: "share",
    min: 0,
    max: 1,
    step: 0.005,
    note: "The charge never exceeds this share of a cheap fare. 0.25 on the board.",
  },
  {
    key: "feeEarlyGrowth",
    label: "Improvement Fee growth, first years",
    unit: "rate",
    min: 0,
    max: 0.5,
    step: 0.001,
    note: "Applied while the year is below the switch. 0.035 on the board.",
  },
  {
    key: "feeGrowth",
    label: "Improvement Fee growth after that",
    unit: "rate",
    min: 0,
    max: 0.5,
    step: 0.001,
    note: "The steady rate. 0.055 on the board — the fastest climber.",
  },
  {
    key: "feeGrowthSwitch",
    label: "…from this year onward",
    unit: "year",
    min: 0,
    max: 30,
    step: 1,
    note: "The board switches at year 3.",
  },
  {
    key: "aeroAnchorYears",
    label: "Aeronautical anchor",
    unit: "years",
    min: 1,
    max: 40,
    step: 1,
    note: "The decade Perth's +60 percent per passenger is measured over. 9.",
  },
  {
    key: "aeroMultiplier",
    label: "Aeronautical multiple at the anchor",
    unit: "×",
    min: 1,
    max: 10,
    step: 0.01,
    note: "1.6 reproduces Perth's reported rise.",
  },
  {
    key: "aeroEase",
    label: "Aeronautical growth after the anchor",
    unit: "rate",
    min: 0,
    max: 0.5,
    step: 0.001,
    note: "Slows to this. 0.02 on the board.",
  },
  {
    key: "fareAnnual",
    label: "Airline fare inflation",
    unit: "rate",
    min: 0,
    max: 0.5,
    step: 0.001,
    note: "The fare moves with inflation, not the concession. 0.025.",
  },
  {
    key: "rampStart",
    label: "Ramp begins",
    unit: "year",
    min: 0,
    max: 40,
    step: 1,
    note: "First year non-ticket charges start moving toward UK levels. 2.",
  },
  {
    key: "rampEnd",
    label: "Ramp completes",
    unit: "year",
    min: 0,
    max: 60,
    step: 1,
    note: "Fully ramped from here. 10 on the board.",
  },
  {
    key: "parkingTarget",
    label: "Parking, fully ramped",
    unit: "$/day",
    min: 0,
    max: 400,
    step: 0.5,
    note: "Heathrow-scale short-stay pricing. $59 on the board.",
  },
  {
    key: "dropOffTarget",
    label: "Drop-off, fully ramped",
    unit: "$",
    min: 0,
    max: 200,
    step: 0.5,
    note: "The British kerbside charge. $24 on the board.",
  },
  {
    key: "foodTodayShare",
    label: "Food spend today",
    unit: "share of ticket",
    min: 0,
    max: 1,
    step: 0.005,
    note: "0.06 — the CCPA's reading of what a traveller spends inside today.",
  },
  {
    key: "foodUKShare",
    label: "Food spend, fully ramped",
    unit: "share of ticket",
    min: 0,
    max: 1,
    step: 0.005,
    note: "0.19 — the share UK travellers pay once retail is optimised.",
  },
  {
    key: "revenueBaseBn",
    label: "System revenue base",
    unit: "$B",
    min: 0,
    max: 100,
    step: 0.05,
    note: "What the authorities took in and made no profit on. $3.95B.",
  },
  {
    key: "revenueGrowth",
    label: "System revenue growth",
    unit: "rate",
    min: 0,
    max: 0.5,
    step: 0.001,
    note: "0.03 on the board.",
  },
  {
    key: "returnRequired",
    label: "Investor return required",
    unit: "share of revenue",
    min: 0,
    max: 1,
    step: 0.005,
    note: "0.175 — the midpoint of the reported 15–20 percent band.",
  },
  {
    key: "staffPerMillion",
    label: "Staffing density",
    unit: "per M passengers",
    min: 0,
    max: 500,
    step: 1,
    note: "62 jobs per million annual passengers.",
  },
  {
    key: "sydneyCut",
    label: "Sydney-scale workforce cut",
    unit: "share",
    min: 0,
    max: 1,
    step: 0.01,
    note: "0.40 — the cut reported at Sydney Airport.",
  },
];

/** Shipped values, in one place so a preset can restore them. */
const DEFAULT_PARAM_VALUES: Record<string, number> = {
  horizon: 20,
  announcementYear: 2026,
  aifFallback: 35,
  taxShare: 0.28,
  aeroCap: 22,
  aeroCapShare: 0.25,
  feeEarlyGrowth: 0.035,
  feeGrowth: 0.055,
  feeGrowthSwitch: 3,
  aeroAnchorYears: 9,
  aeroMultiplier: 1.6,
  aeroEase: 0.02,
  fareAnnual: 0.025,
  rampStart: 2,
  rampEnd: 10,
  parkingTarget: 59,
  dropOffTarget: 24,
  foodTodayShare: 0.06,
  foodUKShare: 0.19,
  revenueBaseBn: 3.95,
  revenueGrowth: 0.03,
  returnRequired: 0.175,
  staffPerMillion: 62,
  sydneyCut: 0.4,
};

/**
 * Every parameter the workbench edits, at its shipped value. Derived from
 * `PARAM_SPECS` so a spec with no value cannot slip in unnoticed.
 */
export const DEFAULT_PARAMS: Record<string, number> = Object.fromEntries(
  PARAM_SPECS.map((spec) => {
    const value = DEFAULT_PARAM_VALUES[spec.key];
    if (typeof value !== "number") throw new Error(`Parameter “${spec.key}” has no shipped value`);
    return [spec.key, value];
  }),
);

/* ---- formula groups ----------------------------------------------- */

/**
 * The default set. Each expression is the shipped model written out in the
 * workbench's language; `runModel()` reproduces `costsFor()` to the cent.
 */
export const DEFAULT_GROUPS: FormulaGroup[] = [
  {
    id: "ticket",
    title: "Inside the ticket",
    blurb:
      "The four reported components of a Canadian fare. The Improvement Fee is the airport's real 2025 figure where the report gives one; the aeronautical charge is the slice of the fare that reaches the operator, rising at the rate that reproduces Perth.",
    steps: [
      {
        key: "feeToday",
        label: "Improvement Fee today",
        expression: "get(aifByAirport, airportCode) !== null ? get(aifByAirport, airportCode) : P.aifFallback",
        unit: "$",
        note: "Per departing passenger, 2025. $41.81 at Pearson, $45.99 at Montréal-Trudeau.",
      },
      {
        key: "taxes",
        label: "Taxes and fees",
        expression: "ticket * P.taxShare",
        unit: "$",
        note: "A flat share of the fare, inside the reported 25–35 percent band.",
      },
      {
        key: "aeroToday",
        label: "Aeronautical charge today",
        expression: "min(P.aeroCap, ticket * P.aeroCapShare)",
        unit: "$",
        note: "Capped so a cheap fare is not swallowed by the charge.",
      },
      {
        key: "airfareToday",
        label: "Airline fare today",
        expression: "max(0, ticket - feeToday - aeroToday - taxes)",
        unit: "$",
        note: "What is left of the ticket once the airport and the tax collector take their share.",
      },
      {
        key: "fee",
        label: "Improvement Fee, later",
        expression: "feeToday * pow(1 + (year < P.feeGrowthSwitch ? P.feeEarlyGrowth : P.feeGrowth), year)",
        unit: "$",
        note: "Compounds. The fastest climber in the model.",
      },
      {
        key: "aero",
        label: "Aeronautical charge, later",
        expression:
          "year <= P.aeroAnchorYears ? aeroToday * pow(P.aeroMultiplier, year / P.aeroAnchorYears) : aeroToday * P.aeroMultiplier * pow(1 + P.aeroEase, year - P.aeroAnchorYears)",
        unit: "$",
        note: "Reaches the Perth multiple at the anchor, then eases.",
      },
      {
        key: "airfare",
        label: "Airline fare, later",
        expression: "airfareToday * pow(1 + P.fareAnnual, year)",
        unit: "$",
        note: "Inflation only: the concession does not move this line.",
      },
    ],
  },
  {
    id: "extras",
    title: "Off the ticket",
    blurb:
      "Parking, the kerbside and the concourse. Each is charged per traveller or per party, ramped from today's price to the documented UK level. Switch one off in the totals to see what the trip depends on.",
    steps: [
      {
        key: "ramp",
        label: "The ramp",
        expression: "smoothstep(P.rampStart, P.rampEnd, year)",
        unit: "share",
        note: "0 at signing, 1 once the charges have reached UK levels. A smooth S, not a step.",
      },
      {
        key: "parking",
        label: "Parking, for the party",
        expression: "days * lerp(airport.parkingPerDay, P.parkingTarget, ramp)",
        unit: "$",
        note: "Days parked, at today's price moving toward Heathrow-scale pricing.",
      },
      {
        key: "dropOff",
        label: "Kerbside drop-off",
        expression: "dropOffMinutes > airport.freeDropOffMinutes ? P.dropOffTarget * ramp : 0",
        unit: "$",
        note: "Free while the stop fits inside the airport's free minutes; charged after that.",
      },
      {
        key: "food",
        label: "Food and retail, per traveller",
        expression: "ticket * lerp(P.foodTodayShare, P.foodUKShare, ramp)",
        unit: "$",
        note: "Spend inside the terminal, following the share UK travellers pay.",
      },
      {
        key: "extrasTotal",
        label: "Non-ticket total",
        expression: "(enabledParking ? parking : 0) + (enabledDrop ? dropOff : 0) + food * travellers * (enabledFood ? 1 : 0)",
        unit: "$",
        note: "Parking and drop-off are per party; food is per traveller, so it multiplies.",
        component: true,
      },
    ],
  },
  {
    id: "totals",
    title: "The two totals",
    blurb: "What the fare comes to, and what the trip comes to. These are the two lines the board draws.",
    steps: [
      {
        key: "ticketTotal",
        label: "Ticket, per traveller",
        expression: "enabledTrip ? airfare + fee + aero + taxes : airfare + aero",
        unit: "$",
        note: "The airport's own charges switched off fall back to the fare plus the aeronautical slice.",
        component: true,
      },
      {
        key: "tripTotal",
        label: "Whole trip, for the party",
        expression: "ticketTotal * travellers + extrasTotal",
        unit: "$",
        note: "Everything between the kerb and the gate, for everyone travelling.",
        component: true,
      },
      {
        key: "travellerAverage",
        label: "Per traveller",
        expression: "safe(tripTotal / travellers)",
        unit: "$",
        note: "The trip divided by the party, for comparing a solo trip with a family one.",
      },
    ],
  },
  {
    id: "books",
    title: "Where it goes",
    blurb:
      "The system-wide case, independent of any one trip: what the authorities made no profit on, what a private operator has to find, and what has been taken out by a given year.",
    steps: [
      {
        key: "extraRevenueNeeded",
        label: "Extra revenue needed, this year",
        expression: "P.revenueBaseBn * pow(1 + P.revenueGrowth, year) * P.returnRequired * 1000",
        unit: "$M",
        note: "17.5 percent of the revenue base, growing every year.",
      },
      {
        key: "systemRevenue",
        label: "System revenue, this year",
        expression: "P.revenueBaseBn * pow(1 + P.revenueGrowth, year) * 1000",
        unit: "$M",
        note: "What the airports take in, before any profit.",
      },
      {
        key: "extractedToDate",
        label: "Taken out since signing",
        expression: "sum(yearly.extraRevenueNeeded)",
        unit: "$M",
        note: "Every year's requirement, added up from signing to the selected year.",
      },
      {
        key: "staff",
        label: "Workforce at this airport",
        expression: "round(airport.passengers * P.staffPerMillion)",
        unit: "jobs",
        note: "Modelled at a typical staffing density.",
      },
      {
        key: "jobsAtRisk",
        label: "Jobs at risk at Sydney's rate",
        expression: "round(staff * P.sydneyCut)",
        unit: "jobs",
        note: "The 40 percent cut reported at Sydney, applied here.",
      },
    ],
  },
];

/** A deep copy that is safe to hand to React state. */
export function defaultFormula(): FormulaModel {
  return {
    params: { ...DEFAULT_PARAMS },
    groups: DEFAULT_GROUPS.map((group) => ({ ...group, steps: group.steps.map((step) => ({ ...step })) })),
  };
}

export const ALL_STEPS = (formula: FormulaModel): FormulaStep[] => formula.groups.flatMap((group) => group.steps);

export const FORMULA_STORAGE_KEY = "aifa:formula:v1";

/** Keys of the steps that switch in and out of the totals. */
export const COMPONENT_KEYS = DEFAULT_GROUPS.flatMap((group) =>
  group.steps.filter((step) => step.component).map((step) => step.key),
);

/* ================================================================== *
 * 3. Running the model
 * ================================================================== */

export type FormulaRow = {
  year: number;
  calendar: number;
  /** Every step's value for this year, by key. */
  values: Record<string, number>;
  ticketTotal: number;
  extrasTotal: number;
  tripTotal: number;
};

export type FormulaRun = {
  horizon: number;
  years: FormulaRow[];
  /** The selected year. */
  active: FormulaRow;
  /** The year of signing, for comparison. */
  atSigning: FormulaRow;
  /** The shipped model over the same horizon, to check the default set against. */
  shipped: YearCosts[];
  /** Largest absolute difference between this formula and the shipped model, per row. */
  drift: number;
  params: Record<string, number>;
};

const ORDER_HINT = ["feeToday", "taxes", "aeroToday", "airfareToday"];

/**
 * Order the steps so that a step is evaluated after anything it reads.
 * Cycles are reported rather than silently resolved.
 */
export function resolveOrder(steps: FormulaStep[]): { order: FormulaStep[]; cycles: string[] } {
  const byKey = new Map(steps.map((step) => [step.key, step]));
  const order: FormulaStep[] = [];
  const state = new Map<string, "visiting" | "done">();
  const cycles: string[] = [];

  const visit = (step: FormulaStep) => {
    const status = state.get(step.key);
    if (status === "done") return;
    if (status === "visiting") {
      if (!cycles.includes(step.key)) cycles.push(step.key);
      return;
    }
    state.set(step.key, "visiting");
    for (const name of referencedNames(step.expression)) {
      if (name === step.key) {
        if (!cycles.includes(step.key)) cycles.push(step.key);
        continue;
      }
      const dependency = byKey.get(name);
      if (dependency) visit(dependency);
    }
    state.set(step.key, "done");
    order.push(step);
  };

  // Steps named in ORDER_HINT first, so a step the reader did not rewrite
  // still finds its inputs ready; everything else follows declaration order.
  // Anything the reader added moves after the steps it references.
  const hinted = ORDER_HINT.map((key) => byKey.get(key)).filter((step): step is FormulaStep => Boolean(step));
  const rest = steps.filter((step) => !ORDER_HINT.includes(step.key));
  [...hinted, ...rest].forEach(visit);

  return { order, cycles };
}

const enabledFlag = (enabled: Record<string, boolean>, key: string) => enabled[key] !== false;

/**
 * Run the edited formula across the whole horizon.
 *
 * `stepErrors` are returned per step so the editor can point at the field that
 * is wrong while the rest of the projection keeps working.
 */
export function runModel(
  formula: FormulaModel,
  input: WorkbenchInput,
): FormulaRun & { stepErrors: Record<string, string>; cycles: string[] } {
  const params = { ...DEFAULT_PARAMS, ...formula.params };
  const horizon = Math.max(1, Math.min(120, Math.round(params.horizon)));
  const steps = ALL_STEPS(formula);
  const { order, cycles } = resolveOrder(steps);
  const stepErrors: Record<string, string> = {};

  const flags = {
    enabledParking: enabledFlag(input.enabled, "parking"),
    enabledDrop: enabledFlag(input.enabled, "drop"),
    enabledFood: enabledFlag(input.enabled, "food"),
    enabledTicket: enabledFlag(input.enabled, "ticket"),
    enabledTrip: enabledFlag(input.enabled, "trip"),
    enabledAif: enabledFlag(input.enabled, "aif"),
    enabledAirfare: enabledFlag(input.enabled, "airfare"),
    enabledAeronautical: enabledFlag(input.enabled, "aeronautical"),
    enabledTaxes: enabledFlag(input.enabled, "taxes"),
  };

  const airport = {
    code: input.airport,
    parkingPerDay: airportParking(input.airport),
    freeDropOffMinutes: airportFreeDropOff(input.airport),
    passengers: airportPassengers(input.airport),
    trafficShare: airportTrafficShare(input.airport),
    inScope: airportInScope(input.airport),
  };

  /** Everything a formula can read, for one year. */
  const scopeFor = (year: number, series: Record<string, number[]>): Scope => ({
    year,
    step: year,
    ticket: input.ticket,
    days: input.days,
    travellers: Math.max(1, input.travellers),
    dropOffMinutes: input.dropOffMinutes,
    airportCode: input.airport,
    airport,
    aifByAirport: AIF_BY_AIRPORT,
    horizon,
    ...flags,
    P: params,
    ...params,
    yearly: series,
  });

  const years: FormulaRow[] = [];

  for (let year = 0; year <= horizon; year += 1) {
    const values: Record<string, number> = {};
    // `yearly.<key>` holds every year from signing up to and including this one,
    // so a step can sum, average or difference the series — a cumulative total
    // uses the earlier years' values and updates itself after the fact.
    const scope = scopeFor(year, seriesScope(order, years, year));

    for (const step of order) {
      try {
        values[step.key] = evaluateNumber(step.expression, scope);
      } catch (error) {
        values[step.key] = 0;
        if (!stepErrors[step.key]) {
          stepErrors[step.key] =
            error instanceof FormulaError
              ? `${error.message}${error.at ? ` (position ${error.at})` : ""}`
              : String(error);
        }
      }
      // Each step is visible to the steps after it, in the order `resolveOrder`
      // worked out from what they read.
      scope[step.key] = values[step.key];
    }

    years.push({
      year,
      calendar: Math.round(params.announcementYear) + year,
      values,
      ticketTotal: values.ticketTotal ?? 0,
      extrasTotal: values.extrasTotal ?? 0,
      tripTotal: values.tripTotal ?? values.ticketTotal ?? 0,
    });
  }

  const active = years[Math.min(Math.max(0, input.year), years.length - 1)];
  const shipped = seriesFor(tripInputFor(input), horizon);
  const drift = years.reduce((worst, row, index) => {
    const reference = shipped[index];
    if (!reference) return worst;
    return Math.max(
      worst,
      Math.abs(row.tripTotal - reference.tripTotal),
      Math.abs(row.ticketTotal - reference.ticketTotal),
      Math.abs(row.extrasTotal - reference.extrasTotal),
    );
  }, 0);

  return {
    horizon,
    years,
    active,
    atSigning: years[0],
    shipped,
    drift,
    params,
    stepErrors,
    cycles,
  };
}

/** `yearly.<key>` — one step's value for each year from signing to `upto`. */
function seriesScope(order: FormulaStep[], years: FormulaRow[], upto: number): Record<string, number[]> {
  const series: Record<string, number[]> = {};
  for (const step of order) {
    series[step.key] = years.slice(0, upto + 1).map((row) => row.values[step.key] ?? 0);
  }
  return series;
}

/** The board's own input shape, so the workbench can run the shipped model too. */
function tripInputFor(input: WorkbenchInput): TripInput {
  return {
    airport: {
      code: input.airport,
      name: input.airport,
      city: input.airport,
      province: "",
      passengers: airportPassengers(input.airport),
      trafficShare: airportTrafficShare(input.airport),
      unionised: false,
      note: "",
      inScope: airportInScope(input.airport),
      parkingPerDay: airportParking(input.airport),
      freeDropOffMinutes: airportFreeDropOff(input.airport),
    },
    ticket: input.ticket,
    days: input.days,
    travellers: input.travellers,
    dropOffMinutes: input.dropOffMinutes,
  };
}

/* Airport lookups kept in one place, so the workbench does not import the
 * dataset twice for the same field. */
const airportField = <T>(code: string, pick: (airport: (typeof AIRPORTS)[number]) => T, fallback: T): T => {
  const airport = AIRPORTS.find((item) => item.code === code);
  return airport ? pick(airport) : fallback;
};

export const airportParking = (code: string) => airportField(code, (airport) => airport.parkingPerDay, 28);
export const airportFreeDropOff = (code: string) => airportField(code, (airport) => airport.freeDropOffMinutes, 20);
export const airportPassengers = (code: string) => airportField(code, (airport) => airport.passengers, 20);
export const airportTrafficShare = (code: string) => airportField(code, (airport) => airport.trafficShare, 15);
export const airportInScope = (code: string) => airportField(code, (airport) => airport.inScope, false);

/** The official model's own answer for one input and year, for the comparison column. */
export function shippedCosts(input: WorkbenchInput, year: number): YearCosts {
  return costsFor(tripInputFor(input), year);
}

export const SHIPPED_AIF = AIF_PER_TICKET;

/* ================================================================== *
 * 4. Presets and serialisation
 * ================================================================== */

export type Preset = {
  id: string;
  name: string;
  blurb: string;
  /** Applied over the default set. */
  params?: Record<string, number>;
  /** Replaces the whole set when present. */
  build?: () => FormulaModel;
};

export const PRESETS: Preset[] = [
  {
    id: "shipped",
    name: "The shipped model",
    blurb: "The formula the article uses, restored to the letter.",
  },
  {
    id: "aggressive",
    name: "Aggressive operator",
    blurb:
      "The same structure with the levers the reporting found pushed harder: an earlier ramp, dearer parking and kerbside, a faster Improvement Fee, and a bigger return requirement.",
    params: {
      feeGrowth: 0.08,
      feeEarlyGrowth: 0.06,
      aeroMultiplier: 2.1,
      rampStart: 0,
      rampEnd: 6,
      parkingTarget: 98,
      dropOffTarget: 35,
      foodUKShare: 0.25,
      returnRequired: 0.2,
      fareAnnual: 0.035,
    },
  },
  {
    id: "guarded",
    name: "Guardrails honoured",
    blurb:
      "The counterargument taken seriously: a regulator holds the Improvement Fee near inflation, the ramp is slow, and the negotiated return sits at the bottom of the reported band.",
    params: {
      feeGrowth: 0.02,
      feeEarlyGrowth: 0.02,
      aeroMultiplier: 1.2,
      rampStart: 5,
      rampEnd: 20,
      parkingTarget: 40,
      dropOffTarget: 12,
      returnRequired: 0.15,
    },
  },
  {
    id: "deflate",
    name: "Do nothing",
    blurb:
      "A null hypothesis: the concession is signed and nothing changes. Useful as a floor — any formula above it is measuring the concession, not inflation.",
    params: {
      feeGrowth: 0.025,
      feeEarlyGrowth: 0.025,
      aeroMultiplier: 1,
      fareAnnual: 0.025,
      rampStart: 40,
      rampEnd: 60,
    },
  },
  {
    id: "linear",
    name: "Linear charges",
    blurb:
      "A different algorithm, not just different numbers: the ramp becomes a straight line instead of a smooth S, and the Improvement Fee grows by a fixed dollar amount rather than compounding. Edit any expression on top of this to go further.",
    build: () => {
      const model = defaultFormula();
      const replace = (key: string, expression: string) => {
        for (const group of model.groups) {
          for (const step of group.steps) {
            if (step.key === key) step.expression = expression;
          }
        }
      };
      replace("ramp", "clamp((year - P.rampStart) / max(0.001, P.rampEnd - P.rampStart), 0, 1)");
      replace("fee", "feeToday + year * P.feeGrowth * 10");
      replace("aero", "aeroToday * lerp(1, P.aeroMultiplier, clamp(year / P.aeroAnchorYears, 0, 1))");
      return model;
    },
  },
];

export function applyPreset(preset: Preset, current: FormulaModel): FormulaModel {
  if (preset.build) return preset.build();
  return {
    params: { ...DEFAULT_PARAMS, ...current.params, ...(preset.params ?? {}) },
    groups: current.groups.map((group) => ({ ...group, steps: group.steps.map((step) => ({ ...step })) })),
  };
}

/** Keep only what the workbench owns, so a stale `?f=` cannot break the page. */
export function sanitizeModel(raw: unknown): FormulaModel | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<FormulaModel>;
  if (!Array.isArray(candidate.groups)) return null;
  const groups: FormulaGroup[] = [];
  for (const group of candidate.groups) {
    if (!group || typeof group.id !== "string" || !Array.isArray(group.steps)) return null;
    const steps: FormulaStep[] = [];
    for (const step of group.steps) {
      if (!step || typeof step.key !== "string" || typeof step.expression !== "string") return null;
      steps.push({
        key: step.key,
        label: typeof step.label === "string" ? step.label : step.key,
        expression: step.expression,
        unit: typeof step.unit === "string" ? step.unit : "",
        note: typeof step.note === "string" ? step.note : "",
        component: Boolean(step.component),
      });
    }
    groups.push({
      id: group.id,
      title: typeof group.title === "string" ? group.title : group.id,
      blurb: typeof group.blurb === "string" ? group.blurb : "",
      steps,
    });
  }
  if (!groups.length) return null;
  const params: Record<string, number> = {};
  for (const spec of PARAM_SPECS) {
    const value = candidate.params?.[spec.key];
    params[spec.key] = typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_PARAMS[spec.key];
  }
  return { params, groups };
}

/** Formula state as a URL-safe string, for the share button. */
export function encodeModel(model: FormulaModel): string {
  const json = JSON.stringify(model);
  if (typeof window === "undefined") return "";
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeModel(encoded: string): FormulaModel | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return sanitizeModel(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
