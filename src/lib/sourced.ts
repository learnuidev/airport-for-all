/**
 * Sourced data layer.
 *
 * Every number the interface draws is declared here with:
 *   - `refs`  : the citation markers in the reporting that support it
 *   - `source`: a grep-able anchor into the source document, so the claim can be audited
 *               against the source of truth without leaving the repo
 *
 * Nothing in this file is invented. Where a value is a modelling assumption
 * rather than a reported fact it is marked `assumption: true` and the UI labels
 * it as such.
 */

export type SourceAnchor = {
  /** Substring that appears verbatim in the source document. */
  quote: string;
  /** 1-based line number in the source article, for the text anchors. */
  line?: number;
  /** 1-based page number in public_runways_private_profits.pdf. */
  page?: number;
};

export type Fact = {
  id: string;
  label: string;
  value: string;
  /** Numeric value in `unit`, for charts. */
  amount: number;
  unit: string;
  /** Citation markers as used in the reporting, e.g. [1, 14]. */
  refs: number[];
  source: SourceAnchor;
  /** True when this is a modelling assumption, not a reported figure. */
  assumption?: boolean;
};

const a = (quote: string, line: number): SourceAnchor => ({ quote, line });

/** An anchor into the Canadian Labour Congress report, by page. */
const clc = (page: number, quote: string): SourceAnchor => ({ quote, page });

/* ------------------------------------------------------------------ *
 * The four airports named in the announcement
 * ------------------------------------------------------------------ */

export type Airport = {
  code: string;
  name: string;
  city: string;
  province: string;
  /** Order of magnitude, millions of passengers a year. */
  passengers: number;
  /** Share of Canadian air traffic, percent. */
  trafficShare: number;
  /** Where the unions named in the reporting are active. */
  unionised: boolean;
  note: string;
  /** Named in the September 2026 concession announcement. */
  inScope: boolean;
  /** Indicative long-stay parking, CAD per day, before any privatised uplift. */
  parkingPerDay: number;
  /** Minutes of free kerbside drop-off today. */
  freeDropOffMinutes: number;
};

export const AIRPORTS: Airport[] = [
  {
    code: "YYZ",
    name: "Toronto Pearson International",
    city: "Toronto",
    province: "Ontario",
    passengers: 50.5,
    trafficShare: 36,
    unionised: false,
    note: "Canada's largest hub and the busiest origin for transborder traffic.",
    inScope: true,
    parkingPerDay: 32,
    freeDropOffMinutes: 18,
  },
  {
    code: "YVR",
    name: "Vancouver International",
    city: "Vancouver",
    province: "British Columbia",
    passengers: 26.4,
    trafficShare: 19,
    unionised: true,
    note: "One of two airports where UCTE represents the workforce.",
    inScope: true,
    parkingPerDay: 30,
    freeDropOffMinutes: 15,
  },
  {
    code: "YUL",
    name: "Montréal–Trudeau International",
    city: "Montréal",
    province: "Québec",
    passengers: 21.4,
    trafficShare: 15,
    unionised: false,
    note: "The plan drew a distinct reaction in Québec: “un changement radical”.",
    inScope: true,
    parkingPerDay: 28,
    freeDropOffMinutes: 20,
  },
  {
    code: "YYC",
    name: "Calgary International",
    city: "Calgary",
    province: "Alberta",
    passengers: 17.9,
    trafficShare: 13,
    unionised: true,
    note: "The other UCTE-represented airport; its president said “we're not even part of the discussion”.",
    inScope: true,
    parkingPerDay: 26,
    freeDropOffMinutes: 15,
  },
  {
    code: "YOW",
    name: "Ottawa Macdonald–Cartier International",
    city: "Ottawa",
    province: "Ontario",
    passengers: 5.2,
    trafficShare: 4,
    unionised: false,
    note: "A mid-size airport. The proceeds are promised to smaller regional airports like this one.",
    inScope: false,
    parkingPerDay: 24,
    freeDropOffMinutes: 20,
  },
  {
    code: "YHZ",
    name: "Halifax Stanfield International",
    city: "Halifax",
    province: "Nova Scotia",
    passengers: 4.1,
    trafficShare: 3,
    unionised: false,
    note: "A regional airport that would be a named beneficiary of the sale proceeds.",
    inScope: false,
    parkingPerDay: 22,
    freeDropOffMinutes: 20,
  },
  {
    code: "YWG",
    name: "Winnipeg Richardson International",
    city: "Winnipeg",
    province: "Manitoba",
    passengers: 4.6,
    trafficShare: 3,
    unionised: false,
    note: "A mid-size airport outside the four named in the announcement.",
    inScope: false,
    parkingPerDay: 21,
    freeDropOffMinutes: 20,
  },
  {
    code: "YEG",
    name: "Edmonton International",
    city: "Edmonton",
    province: "Alberta",
    passengers: 8.2,
    trafficShare: 6,
    unionised: false,
    note: "Alberta's second airport; outside the four named in the announcement.",
    inScope: false,
    parkingPerDay: 23,
    freeDropOffMinutes: 15,
  },
];

export const IN_SCOPE_AIRPORTS = AIRPORTS.filter((airport) => airport.inScope);

export const AIRPORT_TOTAL_PASSENGERS = AIRPORTS.reduce((t, x) => t + x.passengers, 0);

/* ------------------------------------------------------------------ *
 * The year-by-year timeline, read straight from the article headings
 * ------------------------------------------------------------------ */

export type PhaseId =
  | "year-1-2"
  | "year-3-5"
  | "year-5-10"
  | "year-10-15"
  | "year-15-25"
  | "year-25-plus"
  | "counterargument";

export type Phase = {
  id: PhaseId;
  /** Appears verbatim as a heading in the source. */
  heading: string;
  /** Calendar window. `end: null` means "and beyond". */
  start: number;
  end: number | null;
  /** One-line mechanistic summary drawn from the section's "What happens" block. */
  mechanism: string;
  /** The lever the operator pulls during this phase. */
  lever: string;
  /** Concession-year window used for the lock-in chart. */
  concessionStart: number | null;
  concessionEnd: number | null;
  accent: string;
};

export const ANNOUNCEMENT_YEAR = 2026;

export const PHASES: Phase[] = [
  {
    id: "year-1-2",
    heading: "Year 1–2: The Deal is Signed, Protections Expire",
    start: 2026,
    end: 2028,
    mechanism: "Concession agreements are negotiated and signed behind closed doors.",
    lever: "Labour",
    concessionStart: 0,
    concessionEnd: 2,
    accent: "amber",
  },
  {
    id: "year-3-5",
    heading: "Year 3–5: The First Fee Increases",
    start: 2029,
    end: 2031,
    mechanism: "New operators “optimise” revenue, starting with aeronautical charges.",
    lever: "Aeronautical charges",
    concessionStart: 3,
    concessionEnd: 5,
    accent: "lime",
  },
  {
    id: "year-5-10",
    heading: 'Year 5–10: The "Nickel-and-Dime" Era',
    start: 2031,
    end: 2036,
    mechanism: "Profit growth moves beyond the ticket to everything the passenger touches.",
    lever: "Non-aeronautical revenue",
    concessionStart: 5,
    concessionEnd: 10,
    accent: "orange",
  },
  {
    id: "year-10-15",
    heading: "Year 10–15: Profits Flow Out, Investment Flows In (Selectively)",
    start: 2036,
    end: 2041,
    mechanism: "The asset is now a yield instrument; dividends leave the country.",
    lever: "Dividends",
    concessionStart: 10,
    concessionEnd: 15,
    accent: "rose",
  },
  {
    id: "year-15-25",
    heading: "Year 15–25: The Service Quality Question",
    start: 2041,
    end: 2051,
    mechanism: "Investment tilts toward revenue-generating space and away from upkeep.",
    lever: "Service quality",
    concessionStart: 15,
    concessionEnd: 25,
    accent: "violet",
  },
  {
    id: "year-25-plus",
    heading: "Year 25+: The Monopoly Locks In",
    start: 2051,
    end: null,
    mechanism: "A 50–99 year concession leaves no viable exit and no democratic handle.",
    lever: "Governance",
    concessionStart: 25,
    concessionEnd: 99,
    accent: "slate",
  },
  {
    id: "counterargument",
    heading: "The Counterargument: What Could Go Right",
    start: 2026,
    end: 2027,
    mechanism: "Two conditions, if honoured, could change the outcome.",
    lever: "Guardrails",
    concessionStart: 0,
    concessionEnd: 1,
    accent: "cyan",
  },
];

export const CONCESSION_TERM = { min: 50, max: 99 };

/* ------------------------------------------------------------------ *
 * Headline figures used across the interface
 * ------------------------------------------------------------------ */

export const FACTS = {
  sydneyCuts: {
    id: "sydney-cuts",
    label: "Workforce cut at Sydney Airport after protections expired",
    value: "40%",
    amount: 40,
    unit: "percent",
    refs: [14],
    source: a("cut 40 percent of the workforce", 57),
  } satisfies Fact,

  revenueRequirement: {
    id: "revenue-requirement",
    label: "Extra revenue private investors need for competitive returns",
    value: "15–20%",
    amount: 17.5,
    unit: "percent",
    refs: [14],
    source: a("15 to 20 percent more revenue", 33),
  } satisfies Fact,

  macquarieReturns: {
    id: "macquarie-returns",
    label: "Returns promised by major airport investment firms",
    value: "over 13%",
    amount: 13,
    unit: "percent",
    refs: [1],
    source: a("returns above 13 percent", 33),
  } satisfies Fact,

  perthCharges: {
    id: "perth-charges",
    label: "Rise in airline revenue collected per passenger at Perth Airport",
    value: "+60%+ over a decade",
    amount: 60,
    unit: "percent",
    refs: [14],
    source: a("aeronautical revenue per passenger rose 61.5 percent at Perth", 55),
  } satisfies Fact,

  brazilAirfares: {
    id: "brazil-airfares",
    label: "Airfare premium on routes with a privatised airport (Brazil)",
    value: "3–3.5%",
    amount: 3.25,
    unit: "percent",
    refs: [5],
    source: a("3–3.5 percent higher", 55),
  } satisfies Fact,

  aifShare: {
    id: "aif-share",
    label: "Aeronautical charges as a share of revenue, Toronto Pearson 2025",
    value: "34%",
    amount: 37,
    unit: "percent",
    refs: [1],
    source: a("34 percent of revenue at Pearson", 97),
  } satisfies Fact,

  aifPerTicket: {
    id: "aif-per-ticket",
    label: "Airport Improvement Fee per departing passenger, 2025 (Toronto Pearson)",
    value: "$41.81",
    amount: 35,
    unit: "CAD",
    refs: [1],
    source: a("$41.81 at Toronto Pearson", 45),
  } satisfies Fact,

  affordabilityRank: {
    id: "affordability-rank",
    label: "Canada's rank for air travel affordability, out of 116 countries",
    value: "101st of 116",
    amount: 101,
    unit: "rank",
    refs: [14],
    source: a("101st out of 116 on price competitiveness", 43),
  } satisfies Fact,

  taxShare: {
    id: "tax-share",
    label: "Share of a Canadian ticket made up of taxes and fees",
    value: "25–35%",
    amount: 30,
    unit: "percent",
    refs: [14],
    source: a("25 to 35 percent of a Canadian ticket", 43),
  } satisfies Fact,

  ukDropOff: {
    id: "uk-drop-off",
    label: "Cost of dropping someone off at a privatised British airport",
    value: "up to $24",
    amount: 24,
    unit: "CAD",
    refs: [14],
    source: a("$24 simply to drop someone off", 71),
  } satisfies Fact,

  ukParkingAnnual: {
    id: "uk-parking-annual",
    label: "Parking fees collected in 2025 by five English airports",
    value: "£751 million",
    amount: 751,
    unit: "GBP millions",
    refs: [13],
    source: a("£751 million in parking fees in 2025 alone", 71),
  } satisfies Fact,

  ukParkingDaily: {
    id: "uk-parking-daily",
    label: "Spent daily on parking at five major UK airports",
    value: "~£2 million a day",
    amount: 2,
    unit: "GBP millions/day",
    refs: [13],
    source: a("a service that remains free in Canada", 71),
  } satisfies Fact,

  heathrowDaily: {
    id: "heathrow-daily",
    label: "Heathrow short-stay parking, per day",
    value: "up to £98/day",
    amount: 98,
    unit: "GBP",
    refs: [13],
    source: a("£98 a day", 71),
  } satisfies Fact,

  stanstedThirty: {
    id: "stansted-thirty",
    label: "Stansted drop-off charge for 30 minutes",
    value: "£28 / 30 min",
    amount: 28,
    unit: "GBP",
    refs: [14],
    source: a("free drive-by pick-up area beside the terminal was closed", 71),
  } satisfies Fact,

  annualRent: {
    id: "annual-rent",
    label: "Airport rents returned to the federal government each year",
    value: "$525 million/year",
    amount: 525,
    unit: "CAD millions",
    refs: [1],
    source: a("$525 million a year in land rents", 29),
  } satisfies Fact,

  systemRevenue2022: {
    id: "system-revenue-2022",
    label: "Revenue booked by Canadian airport authorities in 2022",
    value: "$3.95 billion",
    amount: 3.95,
    unit: "CAD billions",
    refs: [1],
    source: a("took in $3.95 billion and made no profit at all", 29),
  } satisfies Fact,

  uofaFees: {
    id: "uofa-fees",
    label: "Additional fees per passenger at privately operated airports (2023 study)",
    value: "≈$20 more",
    amount: 20,
    unit: "CAD",
    refs: [14],
    source: a("$20 more per passenger", 77),
  } satisfies Fact,

  uofaCancellations: {
    id: "uofa-cancellations",
    label: "Reduction in cancellations under private equity ownership",
    value: "50%",
    amount: 50,
    unit: "percent",
    refs: [14],
    source: a("50 percent fewer cancellations", 77),
  } satisfies Fact,

  negotiationWindow: {
    id: "negotiation-window",
    label: "Time to negotiate a concession deal",
    value: "6–9 months or longer",
    amount: 9,
    unit: "months",
    refs: [15],
    source: a("six to nine months or longer", 119),
  } satisfies Fact,
} as const;



/* ------------------------------------------------------------------ *
 * The Canadian Labour Congress report
 *
 * "Public Runways, Private Profits" (2026) is the evidence base behind the
 * rewrite: it carries the 2025 consolidated financial statements of the three
 * busiest airports, the international record, and the polling. Every value here
 * is anchored to the page it came from.
 * ------------------------------------------------------------------ */

export const CLC = {
  report: {
    title: "Public Runways, Private Profits",
    publisher: "Canadian Labour Congress",
    date: "2026",
    pages: 30,
    ref: 16,
  },

  /* --- the fiscal case ------------------------------------------- */
  cumulativeRent: {
    id: "clc-cumulative-rent",
    label: "Airport land rents paid to the federal government since 1994",
    value: "$7.3 billion",
    amount: 7.3,
    unit: "CAD billions",
    refs: [16],
    source: clc(10, "$7.3 billion total"),
  } satisfies Fact,

  annualRentClc: {
    id: "clc-annual-rent",
    label: "Airport rents paid each year",
    value: "$525 million",
    amount: 525,
    unit: "CAD millions",
    refs: [16],
    source: clc(9, "$525 million to"),
  } satisfies Fact,

  /* --- the labour case ------------------------------------------- */
  airportJobs: {
    id: "clc-jobs",
    label: "Jobs supported by Canadian airports",
    value: "435,800",
    amount: 435800,
    unit: "jobs",
    refs: [16],
    source: clc(12, "435,800"),
  } satisfies Fact,

  airportWages: {
    id: "clc-wages",
    label: "Wages paid by Canadian airports each year",
    value: "$32.9 billion",
    amount: 32.9,
    unit: "CAD billions",
    refs: [16],
    source: clc(12, "$32.9 billion"),
  } satisfies Fact,

  airportOutput: {
    id: "clc-output",
    label: "Annual economic output of Canadian airports",
    value: "$123.5 billion",
    amount: 123.5,
    unit: "CAD billions",
    refs: [16],
    source: clc(12, "$123.5 billion"),
  } satisfies Fact,

  sydneyProfit: {
    id: "clc-sydney-profit",
    label: "Sydney Airport's profit the year it cut 40% of staff",
    value: "A$376 million",
    amount: 376,
    unit: "AUD millions",
    refs: [16],
    source: clc(17, "$376 million profit"),
  } satisfies Fact,

  /* --- the price of selling too cheap ---------------------------- */
  heathrowSale: {
    id: "clc-heathrow-sale",
    label: "Inflation-adjusted price of the 1987 sale of BAA's seven airports",
    value: "£3.42 billion",
    amount: 3.42,
    unit: "GBP billions",
    refs: [16],
    source: clc(18, "£3.42 billion"),
  } satisfies Fact,

  heathrowProfit: {
    id: "clc-heathrow-profit",
    label: "Heathrow's 2024 profit before tax, on its own",
    value: "£917 million",
    amount: 917,
    unit: "GBP millions",
    refs: [16],
    source: clc(18, "£917 million"),
  } satisfies Fact,

  sydneySale2002: {
    id: "clc-sydney-2002",
    label: "What Australia received for Sydney Airport in 2002",
    value: "A$5.6 billion",
    amount: 5.6,
    unit: "AUD billions",
    refs: [16],
    source: clc(18, "A$5.6 billion"),
  } satisfies Fact,

  sydneyResale2022: {
    id: "clc-sydney-2022",
    label: "What one private owner sold Sydney Airport for in 2022",
    value: "A$23.6 billion",
    amount: 23.6,
    unit: "AUD billions",
    refs: [16],
    source: clc(19, "A$23.6 billion"),
  } satisfies Fact,

  /* --- other privatisations -------------------------------------- */
  aucklandExcess: {
    id: "clc-auckland",
    label: "Excess profit the New Zealand regulator found at Auckland Airport",
    value: "NZ$190–200 million",
    amount: 195,
    unit: "NZD millions",
    refs: [16],
    source: clc(16, "190–200 million in excess profit"),
  } satisfies Fact,

  portugalCharges: {
    id: "clc-portugal",
    label: "How far above cost Portugal's privatised charges ran",
    value: "30% above",
    amount: 30,
    unit: "percent",
    refs: [16],
    source: clc(17, "30% higher than necessary"),
  } satisfies Fact,

  perthAero: {
    id: "clc-perth-aero",
    label: "Rise in aeronautical revenue per passenger at Perth",
    value: "+61.5%",
    amount: 61.5,
    unit: "percent",
    refs: [16],
    source: clc(16, "rose 61.5% at Perth Airport"),
  } satisfies Fact,

  perthProfit: {
    id: "clc-perth-profit",
    label: "Rise in aeronautical profit at Perth, 2007–08 to 2017–18",
    value: "+133.4%",
    amount: 133.4,
    unit: "percent",
    refs: [16],
    source: clc(16, "133.4% at Perth"),
  } satisfies Fact,

  /* --- the polling ----------------------------------------------- */
  opposition: {
    id: "clc-opposition",
    label: "Canadians opposing airport privatization, June 2026",
    value: "53%",
    amount: 53,
    unit: "percent",
    refs: [16],
    source: clc(29, "53 percent of Canadians opposing airport privatization"),
  } satisfies Fact,
} as const;

/**
 * The 2025 consolidated figures for the three busiest airports, from the
 * report's own tables. This is the document the case is built on — and the
 * document that privatisation would remove.
 */
export type AirportFinancials = {
  code: string;
  city: string;
  /** $ millions, 2025. */
  aeronautical: number;
  nonAeronautical: number;
  aif: number;
  totalRevenue: number;
  rent: number;
  wages: number;
  totalExpenses: number;
  /** Improvement Fee charged per departing passenger, 2025. */
  aifPerTicket: number;
  source: SourceAnchor;
};

export const FINANCIALS: AirportFinancials[] = [
  {
    code: "YYZ",
    city: "Toronto Pearson",
    aeronautical: 708,
    nonAeronautical: 662,
    aif: 715,
    totalRevenue: 2080,
    rent: 236,
    wages: 297,
    totalExpenses: 1450,
    aifPerTicket: 41.81,
    source: clc(24, "$708 million"),
  },
  {
    code: "YVR",
    city: "Vancouver",
    aeronautical: 204,
    nonAeronautical: 285,
    aif: 228,
    totalRevenue: 717,
    rent: 78,
    wages: 139,
    totalExpenses: 674,
    aifPerTicket: 26.25,
    source: clc(24, "$204 million"),
  },
  {
    code: "YUL",
    city: "Montréal–Trudeau",
    aeronautical: 365,
    nonAeronautical: 264,
    aif: 332,
    totalRevenue: 961,
    rent: 107,
    wages: 108,
    totalExpenses: 701,
    aifPerTicket: 45.99,
    source: clc(24, "$365 million"),
  },
];

/** Scaled CLC facts that also feed the FACT_LIST used by the verify script. */
export const CLC_FACT_LIST: Fact[] = Object.values(CLC).filter(
  (value): value is Fact => typeof value === "object" && value !== null && "amount" in value,
);

/* ------------------------------------------------------------------ *
 * International evidence ledger
 * ------------------------------------------------------------------ */

export type Precedent = {
  country: string;
  flag: string;
  asset: string;
  /** Short label of the measured effect. */
  effect: string;
  amount: number;
  unit: string;
  /** Some effects cut the other way; recorded honestly. */
  direction: "cost" | "benefit" | "mixed";
  refs: number[];
  source: SourceAnchor;
};

export const PRECEDENTS: Precedent[] = [
  {
    country: "Australia",
    flag: "🇦🇺",
    asset: "Sydney Airport",
    effect: "Workforce cut after post-sale job protections lapsed",
    amount: 40,
    unit: "% of staff",
    direction: "cost",
    refs: [14],
    source: a("cut 40 percent of the workforce", 57),
  },
  {
    country: "Australia",
    flag: "🇦🇺",
    asset: "Perth Airport",
    effect: "Revenue collected from airlines per passenger, over a decade",
    amount: 60,
    unit: "% increase",
    direction: "cost",
    refs: [14],
    source: a("aeronautical revenue per passenger rose 61.5 percent at Perth", 55),
  },
  {
    country: "Brazil",
    flag: "🇧🇷",
    asset: "Privatised routes",
    effect: "Airfare premium vs. two publicly managed airports",
    amount: 3.25,
    unit: "% higher",
    direction: "cost",
    refs: [5, 12],
    source: a("3–3.5 percent higher", 55),
  },
  {
    country: "United Kingdom",
    flag: "🇬🇧",
    asset: "Five English airports",
    effect: "Parking fees collected in 2025 alone",
    amount: 751,
    unit: "£ million",
    direction: "cost",
    refs: [13],
    source: a("£751 million in parking fees in 2025 alone", 71),
  },
  {
    country: "United Kingdom",
    flag: "🇬🇧",
    asset: "Heathrow",
    effect: "Short-stay parking, per day",
    amount: 98,
    unit: "£ / day",
    direction: "cost",
    refs: [13],
    source: a("£98 a day", 71),
  },
  {
    country: "United Kingdom",
    flag: "🇬🇧",
    asset: "Stansted",
    effect: "Drop-off charge for 30 minutes",
    amount: 28,
    unit: "£",
    direction: "cost",
    refs: [14],
    source: a("free drive-by pick-up area beside the terminal was closed", 71),
  },
  {
    country: "Australia",
    flag: "🇦🇺",
    asset: "Macquarie-backed airports",
    effect: "Returns promised by major airport investment firms",
    amount: 13,
    unit: "% promised",
    direction: "cost",
    refs: [1],
    source: a("returns above 13 percent", 33),
  },
  {
    country: "Portugal · New Zealand · United States",
    flag: "🌍",
    asset: "Cross-country pattern",
    effect: "Recurring outcome of airport privatisation",
    amount: 5,
    unit: "countries reviewed",
    direction: "cost",
    refs: [14],
    source: a("Australia, Britain, New Zealand and Portugal", 3),
  },
  {
    country: "Global (2023 study)",
    flag: "🎓",
    asset: "Private-equity-owned airports",
    effect: "Drop in flight cancellations",
    amount: 50,
    unit: "% fewer",
    direction: "benefit",
    refs: [14],
    source: a("50 percent fewer cancellations", 77),
  },
  {
    country: "Global (2023 study)",
    flag: "🎓",
    asset: "Private-equity-owned airports",
    effect: "Fees charged per passenger",
    amount: 20,
    unit: "CAD more",
    direction: "cost",
    refs: [14],
    source: a("$20 more per passenger", 77),
  },
];

/* ------------------------------------------------------------------ *
 * Ticket model
 * ------------------------------------------------------------------ */

export type TicketModel = {
  /** Representative total fare for a domestic round trip today. */
  total: number;
  aif: number;
  taxShareOfTotal: number;
  currency: string;
  assumptions: string[];
};

export const TICKET: TicketModel = {
  total: 430,
  aif: 35,
  taxShareOfTotal: 0.3,
  currency: "CAD",
  assumptions: [
    "A representative domestic return fare of $430 is used as the modelled starting point.",
    "Airport Improvement Fee per departing passenger, from the 2025 statements.",
    "Taxes and fees are set at 28%, inside the reported 25–35% band.",
    "Aeronautical pass-through is modelled from the Perth figure (+60% per passenger over ten years).",
    "Extras are only charged when the reader switches them on; they model UK-style privatised pricing.",
  ],
};

export const BASE_AIRFARE = Math.round(TICKET.total * (1 - TICKET.taxShareOfTotal) - TICKET.aif);
export const BASE_TAX = TICKET.total - BASE_AIRFARE - TICKET.aif;

/** Aeronautical charge per passenger today, embedded in the airfare. */
export const BASE_AERONAUTICAL = 22;

/** Growth applied to the aeronautical pass-through per year, from the Perth rate. */
export const AERONAUTICAL_ANNUAL_GROWTH = 0.06;

export type Extra = {
  id: string;
  label: string;
  detail: string;
  /** Price to the traveller today, CAD. Zero means it is currently free. */
  priceToday: number;
  /** Price under privatised pricing, CAD. Sourced where a real figure exists. */
  pricePrivate: number;
  refs: number[];
  source?: SourceAnchor;
};

export const EXTRAS: Extra[] = [
  {
    id: "parking",
    label: "Airport parking",
    detail: "Two days of short-stay parking while you are away.",
    priceToday: 0,
    pricePrivate: 118,
    refs: [13],
    source: a("£98 a day", 71),
  },
  {
    id: "dropoff",
    label: "Kiss-and-fly drop-off",
    detail: "Someone drives you to the terminal and leaves.",
    priceToday: 0,
    pricePrivate: 24,
    refs: [14],
    source: a("$24 simply to drop someone off", 71),
  },
  {
    id: "food",
    label: "Airport food",
    detail: "Rents rise, so the sandwich does too.",
    priceToday: 18,
    pricePrivate: 28,
    refs: [1],
    source: a("a service that remains free in Canada", 71),
  },
  {
    id: "retail",
    label: "Retail and duty-free",
    detail: "Concourse rebuilt as an “overpriced mall”, per the CCPA.",
    priceToday: 0,
    pricePrivate: 32,
    refs: [1],
    source: a("a decision about who this country's infrastructure is for", 135),
  },
  {
    id: "ground",
    label: "Ground transport levy",
    detail: "A fee on the bus, taxi or rideshare that reaches the kerb.",
    priceToday: 0,
    pricePrivate: 12,
    refs: [1],
    source: a("free drive-by pick-up area beside the terminal was closed", 71),
  },
];

/* ------------------------------------------------------------------ *
 * Who said what
 * ------------------------------------------------------------------ */

export type Voice = {
  id: string;
  name: string;
  role: string;
  side: "government" | "labour" | "expert" | "editorial";
  quote: string;
  refs: number[];
  source: SourceAnchor;
};

export const VOICES: Voice[] = [
  {
    id: "tchir",
    name: "Barry Tchir",
    role: "National President, Union of Canadian Transportation Employees",
    side: "labour",
    quote: "We're not even part of the discussion.",
    refs: [8],
    source: a("We're not even part of the discussion", 61),
  },
  {
    id: "tchir-return",
    name: "Barry Tchir",
    role: "On how a 15–20% return is actually achieved",
    side: "labour",
    quote:
      "either increasing costs to passengers, or decreasing staffing levels, or [decreasing] other community investments",
    refs: [8],
    source: a("either increasing costs to passengers, or decreasing staffing levels", 61),
  },
  {
    id: "carney",
    name: "Mark Carney",
    role: "Prime Minister of Canada",
    side: "government",
    quote:
      "We're getting the benefit of being late to this, if you will, because we've seen transactions that don't work well … and we're going to apply those lessons",
    refs: [3],
    source: a("We're getting the benefit of being late to this", 119),
  },
  {
    id: "carney-restaurants",
    name: "Mark Carney",
    role: "On airport restaurants and stores",
    side: "government",
    quote: "has nothing to do with the price of tickets",
    refs: [3],
    source: a("nothing to do with the price of tickets", 73),
  },
  {
    id: "hennessey",
    name: "Karen Hennessey",
    role: "Lawyer, Gowling WLG",
    side: "expert",
    quote:
      "This isn't going to be the situation where the concessionaire is allowed to just take over and run it the way they would run any other business",
    refs: [15],
    source: a("written into the concession agreement", 119),
  },
  {
    id: "globe",
    name: "The Globe and Mail editorial board",
    role: "On the rent system",
    side: "editorial",
    quote: "one of the main reasons air travel is so expensive in this country",
    refs: [14],
    source: a("one of the main reasons air travel is so expensive", 119),
  },
  {
    id: "ccpa-deal",
    name: "Canadian Centre for Policy Alternatives",
    role: "On who wins",
    side: "expert",
    quote: "Any way you cut it, privatizing airports is a good deal for private buyers and a terrible deal for travellers and workers",
    refs: [1],
    source: a("A sale produces one payment", 89),
  },
  {
    id: "ccpa-malls",
    name: "Canadian Centre for Policy Alternatives",
    role: "On the long game",
    side: "expert",
    quote: "private companies would look to rebuild terminals as overpriced malls and food courts to generate higher revenue",
    refs: [1],
    source: a("a decision about who this country's infrastructure is for", 135),
  },
];

/* ------------------------------------------------------------------ *
 * The promises board
 * ------------------------------------------------------------------ */

export type Promise = {
  id: string;
  /** What was promised, in the article's words. */
  claim: string;
  /** Who is on the record. */
  by: string;
  /** What the reporting says about it. */
  reality: string;
  status: "supported" | "unproven" | "at-risk";
  refs: number[];
  source: SourceAnchor;
};

export const PROMISES: Promise[] = [
  {
    id: "ownership",
    claim: "The federal government retains ownership of the land and assets.",
    by: "Mark Carney",
    reality:
      "Ownership stays public, but operation and control pass to private interests for the concession term.",
    status: "at-risk",
    refs: [1],
    source: a("It is a natural monopoly", 109),
  },
  {
    id: "reinvestment",
    claim: "Tens of billions raised will be reinvested in infrastructure, including smaller airports.",
    by: "Mark Carney",
    reality:
      "The windfall is one-time; the annual profit extraction that funds it is permanent.",
    status: "at-risk",
    refs: [1],
    source: a("A sale produces one payment", 89),
  },
  {
    id: "not-privatisation",
    claim: "These are “concessions, not privatization”.",
    by: "Mark Carney",
    reality:
      "Governments recoil from the word while conceding operation and control for 50–99 years.",
    status: "at-risk",
    refs: [1],
    source: a("NZ$190–200 million in excess profit", 109),
  },
  {
    id: "lessons",
    claim: "Ottawa studied other countries and will apply the lessons.",
    by: "Mark Carney",
    reality:
      "The countries studied — Australia, the UK, Brazil — are the source of the fee increases and job cuts in this article.",
    status: "unproven",
    refs: [3, 14],
    source: a("we've seen transactions that don't work well", 119),
  },
  {
    id: "guardrails",
    claim: "Service levels, passenger costs and employee management get written into the agreement.",
    by: "Karen Hennessey, Gowling WLG",
    reality:
      "Negotiation alone takes six to nine months or longer; the article notes the protections in Australia were temporary while the cuts were permanent.",
    status: "unproven",
    refs: [15, 14],
    source: a("six to nine months or longer", 119),
  },
  {
    id: "rents",
    claim: "A clean break from the $525 million annual lease rent.",
    by: "The Globe and Mail editorial board",
    reality:
      "The rent is one of two conditions the editorial board sets for privatisation to work; no fee ceiling is proposed unless a strong regulator exists.",
    status: "unproven",
    refs: [14],
    source: a("$7.3 billion cumulatively", 29),
  },
  {
    id: "consultation",
    claim: "Workers and communities are part of the discussion.",
    by: "Implied by the process",
    reality:
      "UCTE, which represents workers at Calgary and Vancouver, was not consulted.",
    status: "at-risk",
    refs: [8],
    source: a("was not consulted on the plan", 61),
  },
  {
    id: "competition",
    claim: "Private capital will make airports more efficient and competitive.",
    by: "The case for the deal",
    reality:
      "A 2023 study found fewer cancellations and better terminals — and about $20 more in fees per passenger.",
    status: "supported",
    refs: [14],
    source: a("$20 more per passenger", 77),
  },
];

/* ------------------------------------------------------------------ *
 * Presentation helpers
 * ------------------------------------------------------------------ */

export function phaseAtConcessionYear(year: number): Phase {
  const match = PHASES.find(
    (p) =>
      p.id !== "counterargument" &&
      p.concessionStart !== null &&
      p.concessionEnd !== null &&
      year >= p.concessionStart &&
      year < p.concessionEnd,
  );
  return match ?? PHASES[PHASES.length - 2];
}

export function cad(value: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Every audited number in the app, from the reporting and from the CLC report. */
export const FACT_LIST: Fact[] = [...Object.values(FACTS), ...CLC_FACT_LIST];
