"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sourced_exports = {};
__export(sourced_exports, {
  AERONAUTICAL_ANNUAL_GROWTH: () => AERONAUTICAL_ANNUAL_GROWTH,
  AIRPORTS: () => AIRPORTS,
  AIRPORT_TOTAL_PASSENGERS: () => AIRPORT_TOTAL_PASSENGERS,
  ANNOUNCEMENT_YEAR: () => ANNOUNCEMENT_YEAR,
  BASE_AERONAUTICAL: () => BASE_AERONAUTICAL,
  BASE_AIRFARE: () => BASE_AIRFARE,
  BASE_TAX: () => BASE_TAX,
  CONCESSION_TERM: () => CONCESSION_TERM,
  EXTRAS: () => EXTRAS,
  FACTS: () => FACTS,
  FACT_LIST: () => FACT_LIST,
  PHASES: () => PHASES,
  PRECEDENTS: () => PRECEDENTS,
  PROMISES: () => PROMISES,
  TICKET: () => TICKET,
  VOICES: () => VOICES,
  cad: () => cad,
  phaseAtConcessionYear: () => phaseAtConcessionYear
});
module.exports = __toCommonJS(sourced_exports);
const a = (quote, line) => ({ quote, line });
const AIRPORTS = [
  {
    code: "YYZ",
    name: "Toronto Pearson International",
    city: "Toronto",
    province: "Ontario",
    passengers: 50.5,
    trafficShare: 36,
    unionised: false,
    note: "Canada's largest hub and the busiest origin for transborder traffic."
  },
  {
    code: "YVR",
    name: "Vancouver International",
    city: "Vancouver",
    province: "British Columbia",
    passengers: 26.4,
    trafficShare: 19,
    unionised: true,
    note: "One of two airports where UCTE represents workers, per article.md."
  },
  {
    code: "YUL",
    name: "Montr\xE9al\u2013Trudeau International",
    city: "Montr\xE9al",
    province: "Qu\xE9bec",
    passengers: 21.4,
    trafficShare: 15,
    unionised: false,
    note: "The plan drew a distinct reaction in Qu\xE9bec: \u201Cun changement radical\u201D."
  },
  {
    code: "YYC",
    name: "Calgary International",
    city: "Calgary",
    province: "Alberta",
    passengers: 17.9,
    trafficShare: 13,
    unionised: true,
    note: "The other UCTE-represented airport; its president said \u201Cwe're not even part of the discussion\u201D."
  }
];
const AIRPORT_TOTAL_PASSENGERS = AIRPORTS.reduce((t, x) => t + x.passengers, 0);
const ANNOUNCEMENT_YEAR = 2026;
const PHASES = [
  {
    id: "year-1-2",
    heading: "Year 1\u20132: The Deal is Signed, Protections Expire",
    start: 2026,
    end: 2028,
    mechanism: "Concession agreements are negotiated and signed behind closed doors.",
    lever: "Labour",
    concessionStart: 0,
    concessionEnd: 2,
    accent: "amber"
  },
  {
    id: "year-3-5",
    heading: "Year 3\u20135: The First Fee Increases",
    start: 2029,
    end: 2031,
    mechanism: "New operators \u201Coptimise\u201D revenue, starting with aeronautical charges.",
    lever: "Aeronautical charges",
    concessionStart: 3,
    concessionEnd: 5,
    accent: "lime"
  },
  {
    id: "year-5-10",
    heading: 'Year 5\u201310: The "Nickel-and-Dime" Era',
    start: 2031,
    end: 2036,
    mechanism: "Profit growth moves beyond the ticket to everything the passenger touches.",
    lever: "Non-aeronautical revenue",
    concessionStart: 5,
    concessionEnd: 10,
    accent: "orange"
  },
  {
    id: "year-10-15",
    heading: "Year 10\u201315: Profits Flow Out, Investment Flows In (Selectively)",
    start: 2036,
    end: 2041,
    mechanism: "The asset is now a yield instrument; dividends leave the country.",
    lever: "Dividends",
    concessionStart: 10,
    concessionEnd: 15,
    accent: "rose"
  },
  {
    id: "year-15-25",
    heading: "Year 15\u201325: The Service Quality Question",
    start: 2041,
    end: 2051,
    mechanism: "Investment tilts toward revenue-generating space and away from upkeep.",
    lever: "Service quality",
    concessionStart: 15,
    concessionEnd: 25,
    accent: "violet"
  },
  {
    id: "year-25-plus",
    heading: "Year 25+: The Monopoly Locks In",
    start: 2051,
    end: null,
    mechanism: "A 50\u201399 year concession leaves no viable exit and no democratic handle.",
    lever: "Governance",
    concessionStart: 25,
    concessionEnd: 99,
    accent: "slate"
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
    accent: "cyan"
  }
];
const CONCESSION_TERM = { min: 50, max: 99 };
const FACTS = {
  sydneyCuts: {
    id: "sydney-cuts",
    label: "Workforce cut at Sydney Airport after protections expired",
    value: "40%",
    amount: 40,
    unit: "percent",
    refs: [14],
    source: a("cut 40 percent of the workforce", 15)
  },
  revenueRequirement: {
    id: "revenue-requirement",
    label: "Extra revenue private investors need for competitive returns",
    value: "15\u201320%",
    amount: 17.5,
    unit: "percent",
    refs: [14],
    source: a("15 to 20 percent more revenue", 17)
  },
  macquarieReturns: {
    id: "macquarie-returns",
    label: "Returns promised by major airport investment firms",
    value: "over 13%",
    amount: 13,
    unit: "percent",
    refs: [1],
    source: a("promised returns of over 13 percent", 57)
  },
  perthCharges: {
    id: "perth-charges",
    label: "Rise in airline revenue collected per passenger at Perth Airport",
    value: "+60%+ over a decade",
    amount: 60,
    unit: "percent",
    refs: [14],
    source: a("rose by more than 60 percent over a decade", 27)
  },
  brazilAirfares: {
    id: "brazil-airfares",
    label: "Airfare premium on routes with a privatised airport (Brazil)",
    value: "3\u20133.5%",
    amount: 3.25,
    unit: "percent",
    refs: [5],
    source: a("3\u20133.5 percent higher", 27)
  },
  aifShare: {
    id: "aif-share",
    label: "Airport Improvement Fees as a share of large-airport revenue",
    value: "37%",
    amount: 37,
    unit: "percent",
    refs: [1],
    source: a("which make up 37 per cent of their revenue", 29)
  },
  aifPerTicket: {
    id: "aif-per-ticket",
    label: "Airport Improvement Fee per ticket today",
    value: "$30\u2013$40",
    amount: 35,
    unit: "CAD",
    refs: [1],
    source: a("$30 to $40 per ticket", 29)
  },
  affordabilityRank: {
    id: "affordability-rank",
    label: "Canada's rank for air travel affordability, out of 116 countries",
    value: "101st of 116",
    amount: 101,
    unit: "rank",
    refs: [14],
    source: a("ranks 101st out of 116 countries", 31)
  },
  taxShare: {
    id: "tax-share",
    label: "Share of a Canadian ticket made up of taxes and fees",
    value: "25\u201335%",
    amount: 30,
    unit: "percent",
    refs: [14],
    source: a("taxes and fees comprising 25\u201335 percent of ticket costs", 31)
  },
  ukDropOff: {
    id: "uk-drop-off",
    label: "Cost of dropping someone off at a privatised British airport",
    value: "up to $24",
    amount: 24,
    unit: "CAD",
    refs: [14],
    source: a("dropping someone off can cost as much as **$24**", 41)
  },
  ukParkingAnnual: {
    id: "uk-parking-annual",
    label: "Parking fees collected in 2025 by five English airports",
    value: "\xA3751 million",
    amount: 751,
    unit: "GBP millions",
    refs: [13],
    source: a("collected **\xA3751 million** in parking fees in 2025", 42)
  },
  ukParkingDaily: {
    id: "uk-parking-daily",
    label: "Spent daily on parking at five major UK airports",
    value: "~\xA32 million a day",
    amount: 2,
    unit: "GBP millions/day",
    refs: [13],
    source: a("**\xA32 million a day**", 43)
  },
  heathrowDaily: {
    id: "heathrow-daily",
    label: "Heathrow short-stay parking, per day",
    value: "up to \xA398/day",
    amount: 98,
    unit: "GBP",
    refs: [13],
    source: a("Heathrow charges up to **\xA398 per day**", 42)
  },
  stanstedThirty: {
    id: "stansted-thirty",
    label: "Stansted drop-off charge for 30 minutes",
    value: "\xA328 / 30 min",
    amount: 28,
    unit: "GBP",
    refs: [14],
    source: a("\xA328 for 30 minutes at Stansted", 41)
  },
  annualRent: {
    id: "annual-rent",
    label: "Airport rents returned to the federal government each year",
    value: "$525 million/year",
    amount: 525,
    unit: "CAD millions",
    refs: [1],
    source: a("roughly **$525 million annually**", 85)
  },
  systemRevenue2022: {
    id: "system-revenue-2022",
    label: "Revenue booked by Canadian airport authorities in 2022",
    value: "$3.95 billion",
    amount: 3.95,
    unit: "CAD billions",
    refs: [1],
    source: a("the $3.95 billion they brought in in 2022", 85)
  },
  uofaFees: {
    id: "uofa-fees",
    label: "Additional fees per passenger at privately operated airports (2023 study)",
    value: "\u2248$20 more",
    amount: 20,
    unit: "CAD",
    refs: [14],
    source: a("increased fees by about $20 more per passenger", 71)
  },
  uofaCancellations: {
    id: "uofa-cancellations",
    label: "Reduction in cancellations under private equity ownership",
    value: "50%",
    amount: 50,
    unit: "percent",
    refs: [14],
    source: a("**50 percent decrease in flight cancellations**", 205)
  },
  negotiationWindow: {
    id: "negotiation-window",
    label: "Time to negotiate a concession deal",
    value: "6\u20139 months or longer",
    amount: 9,
    unit: "months",
    refs: [15],
    source: a("six to nine months or longer", 99)
  }
};
const FACT_LIST = Object.values(FACTS);
const PRECEDENTS = [
  {
    country: "Australia",
    flag: "\u{1F1E6}\u{1F1FA}",
    asset: "Sydney Airport",
    effect: "Workforce cut after post-sale job protections lapsed",
    amount: 40,
    unit: "% of staff",
    direction: "cost",
    refs: [14],
    source: a("cut 40 percent of the workforce", 15)
  },
  {
    country: "Australia",
    flag: "\u{1F1E6}\u{1F1FA}",
    asset: "Perth Airport",
    effect: "Revenue collected from airlines per passenger, over a decade",
    amount: 60,
    unit: "% increase",
    direction: "cost",
    refs: [14],
    source: a("rose by more than 60 percent over a decade", 27)
  },
  {
    country: "Brazil",
    flag: "\u{1F1E7}\u{1F1F7}",
    asset: "Privatised routes",
    effect: "Airfare premium vs. two publicly managed airports",
    amount: 3.25,
    unit: "% higher",
    direction: "cost",
    refs: [5, 12],
    source: a("3\u20133.5 percent higher", 27)
  },
  {
    country: "United Kingdom",
    flag: "\u{1F1EC}\u{1F1E7}",
    asset: "Five English airports",
    effect: "Parking fees collected in 2025 alone",
    amount: 751,
    unit: "\xA3 million",
    direction: "cost",
    refs: [13],
    source: a("collected **\xA3751 million** in parking fees in 2025", 42)
  },
  {
    country: "United Kingdom",
    flag: "\u{1F1EC}\u{1F1E7}",
    asset: "Heathrow",
    effect: "Short-stay parking, per day",
    amount: 98,
    unit: "\xA3 / day",
    direction: "cost",
    refs: [13],
    source: a("Heathrow charges up to **\xA398 per day**", 42)
  },
  {
    country: "United Kingdom",
    flag: "\u{1F1EC}\u{1F1E7}",
    asset: "Stansted",
    effect: "Drop-off charge for 30 minutes",
    amount: 28,
    unit: "\xA3",
    direction: "cost",
    refs: [14],
    source: a("\xA328 for 30 minutes at Stansted", 41)
  },
  {
    country: "Australia",
    flag: "\u{1F1E6}\u{1F1FA}",
    asset: "Macquarie-backed airports",
    effect: "Returns promised by major airport investment firms",
    amount: 13,
    unit: "% promised",
    direction: "cost",
    refs: [1],
    source: a("promised returns of over 13 percent", 57)
  },
  {
    country: "Portugal \xB7 New Zealand \xB7 United States",
    flag: "\u{1F30D}",
    asset: "Cross-country pattern",
    effect: "Recurring outcome of airport privatisation",
    amount: 5,
    unit: "countries reviewed",
    direction: "cost",
    refs: [14],
    source: a("Australia, New Zealand, Portugal, the United Kingdom, and the United States", 59)
  },
  {
    country: "Global (2023 study)",
    flag: "\u{1F393}",
    asset: "Private-equity-owned airports",
    effect: "Drop in flight cancellations",
    amount: 50,
    unit: "% fewer",
    direction: "benefit",
    refs: [14],
    source: a("**50 percent decrease in flight cancellations**", 205)
  },
  {
    country: "Global (2023 study)",
    flag: "\u{1F393}",
    asset: "Private-equity-owned airports",
    effect: "Fees charged per passenger",
    amount: 20,
    unit: "CAD more",
    direction: "cost",
    refs: [14],
    source: a("increased fees by about $20 more per passenger", 71)
  }
];
const TICKET = {
  total: 430,
  aif: 35,
  taxShareOfTotal: 0.3,
  currency: "CAD",
  assumptions: [
    "A representative domestic return fare of $430 is used as the modelled starting point.",
    "Airport Improvement Fee of $35 sits inside article.md's reported $30\u2013$40 range.",
    "Taxes and fees are set at 30%, inside article.md's reported 25\u201335% band.",
    "Aeronautical pass-through is modelled from the Perth figure (+60% per passenger over ten years).",
    "Extras are only charged when the reader switches them on; they model UK-style privatised pricing."
  ]
};
const BASE_AIRFARE = Math.round(TICKET.total * (1 - TICKET.taxShareOfTotal) - TICKET.aif);
const BASE_TAX = TICKET.total - BASE_AIRFARE - TICKET.aif;
const BASE_AERONAUTICAL = 22;
const AERONAUTICAL_ANNUAL_GROWTH = 0.06;
const EXTRAS = [
  {
    id: "parking",
    label: "Airport parking",
    detail: "Two days of short-stay parking while you are away.",
    priceToday: 0,
    pricePrivate: 118,
    refs: [13],
    source: a("Heathrow charges up to **\xA398 per day**", 42)
  },
  {
    id: "dropoff",
    label: "Kiss-and-fly drop-off",
    detail: "Someone drives you to the terminal and leaves.",
    priceToday: 0,
    pricePrivate: 24,
    refs: [14],
    source: a("dropping someone off can cost as much as **$24**", 41)
  },
  {
    id: "food",
    label: "Airport food",
    detail: "Rents rise, so the sandwich does too.",
    priceToday: 18,
    pricePrivate: 28,
    refs: [1],
    source: a("retail prices to food prices", 47)
  },
  {
    id: "retail",
    label: "Retail and duty-free",
    detail: "Concourse rebuilt as an \u201Coverpriced mall\u201D, per the CCPA.",
    priceToday: 0,
    pricePrivate: 32,
    refs: [1],
    source: a("rebuild terminals as overpriced malls and food courts", 73)
  },
  {
    id: "ground",
    label: "Ground transport levy",
    detail: "A fee on the bus, taxi or rideshare that reaches the kerb.",
    priceToday: 0,
    pricePrivate: 12,
    refs: [1],
    source: a("from parking to ground transport", 47)
  }
];
const VOICES = [
  {
    id: "tchir",
    name: "Barry Tchir",
    role: "National President, Union of Canadian Transportation Employees",
    side: "labour",
    quote: "We're not even part of the discussion.",
    refs: [8],
    source: a("We're not even part of the discussion", 19)
  },
  {
    id: "tchir-return",
    name: "Barry Tchir",
    role: "On how a 15\u201320% return is actually achieved",
    side: "labour",
    quote: "either increasing costs to passengers, or decreasing staffing levels, or [decreasing] other community investments",
    refs: [8],
    source: a("either increasing costs to passengers, or decreasing staffing levels", 19)
  },
  {
    id: "carney",
    name: "Mark Carney",
    role: "Prime Minister of Canada",
    side: "government",
    quote: "We're getting the benefit of being late to this, if you will, because we've seen transactions that don't work well \u2026 and we're going to apply those lessons",
    refs: [3],
    source: a("We're getting the benefit of being late to this", 97)
  },
  {
    id: "carney-restaurants",
    name: "Mark Carney",
    role: "On airport restaurants and stores",
    side: "government",
    quote: "has nothing to do with the price of tickets",
    refs: [3],
    source: a("has nothing to do with the price of tickets", 49)
  },
  {
    id: "hennessey",
    name: "Karen Hennessey",
    role: "Lawyer, Gowling WLG",
    side: "expert",
    quote: "This isn't going to be the situation where the concessionaire is allowed to just take over and run it the way they would run any other business",
    refs: [15],
    source: a("This isn't going to be the situation where the concessionaire", 99)
  },
  {
    id: "globe",
    name: "The Globe and Mail editorial board",
    role: "On the rent system",
    side: "editorial",
    quote: "one of the main reasons air travel is so expensive in this country",
    refs: [14],
    source: a("one of the main reasons air travel is so expensive", 95)
  },
  {
    id: "ccpa-deal",
    name: "Canadian Centre for Policy Alternatives",
    role: "On who wins",
    side: "expert",
    quote: "Any way you cut it, privatizing airports is a good deal for private buyers and a terrible deal for travellers and workers",
    refs: [1],
    source: a("a good deal for private buyers and a terrible deal", 61)
  },
  {
    id: "ccpa-malls",
    name: "Canadian Centre for Policy Alternatives",
    role: "On the long game",
    side: "expert",
    quote: "private companies would look to rebuild terminals as overpriced malls and food courts to generate higher revenue",
    refs: [1],
    source: a("rebuild terminals as overpriced malls and food courts", 73)
  }
];
const PROMISES = [
  {
    id: "ownership",
    claim: "The federal government retains ownership of the land and assets.",
    by: "Mark Carney",
    reality: "Ownership stays public, but operation and control pass to private interests for the concession term.",
    status: "at-risk",
    refs: [1],
    source: a("private interests gain its operation and control", 83)
  },
  {
    id: "reinvestment",
    claim: "Tens of billions raised will be reinvested in infrastructure, including smaller airports.",
    by: "Mark Carney",
    reality: "The windfall is one-time; the annual profit extraction that funds it is permanent.",
    status: "at-risk",
    refs: [1],
    source: a("will be a one-time windfall", 61)
  },
  {
    id: "not-privatisation",
    claim: "These are \u201Cconcessions, not privatization\u201D.",
    by: "Mark Carney",
    reality: "article.md notes governments recoil from the word while conceding operation and control for 50\u201399 years.",
    status: "at-risk",
    refs: [1],
    source: a("While governments will recoil from any suggestion", 83)
  },
  {
    id: "lessons",
    claim: "Ottawa studied other countries and will apply the lessons.",
    by: "Mark Carney",
    reality: "The countries studied \u2014 Australia, the UK, Brazil \u2014 are the source of the fee increases and job cuts in this article.",
    status: "unproven",
    refs: [3, 14],
    source: a("we've seen transactions that don't work well", 97)
  },
  {
    id: "guardrails",
    claim: "Service levels, passenger costs and employee management get written into the agreement.",
    by: "Karen Hennessey, Gowling WLG",
    reality: "Negotiation alone takes six to nine months or longer; the article notes the protections in Australia were temporary while the cuts were permanent.",
    status: "unproven",
    refs: [15, 14],
    source: a("six to nine months or longer", 99)
  },
  {
    id: "rents",
    claim: "A clean break from the $525 million annual lease rent.",
    by: "The Globe and Mail editorial board",
    reality: "The rent is one of two conditions the editorial board sets for privatisation to work; no fee ceiling is proposed unless a strong regulator exists.",
    status: "unproven",
    refs: [14],
    source: a("$525 million annually", 95)
  },
  {
    id: "consultation",
    claim: "Workers and communities are part of the discussion.",
    by: "Implied by the process",
    reality: "UCTE, which represents workers at Calgary and Vancouver, was not consulted.",
    status: "at-risk",
    refs: [8],
    source: a("was not consulted on the plan", 19)
  },
  {
    id: "competition",
    claim: "Private capital will make airports more efficient and competitive.",
    by: "The case for the deal",
    reality: "A 2023 study found fewer cancellations and better terminals \u2014 and about $20 more in fees per passenger.",
    status: "supported",
    refs: [14],
    source: a("increased fees by about $20 more per passenger", 71)
  }
];
function phaseAtConcessionYear(year) {
  const match = PHASES.find(
    (p) => p.id !== "counterargument" && p.concessionStart !== null && p.concessionEnd !== null && year >= p.concessionStart && year < p.concessionEnd
  );
  return match ?? PHASES[PHASES.length - 2];
}
function cad(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0
  }).format(value);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AERONAUTICAL_ANNUAL_GROWTH,
  AIRPORTS,
  AIRPORT_TOTAL_PASSENGERS,
  ANNOUNCEMENT_YEAR,
  BASE_AERONAUTICAL,
  BASE_AIRFARE,
  BASE_TAX,
  CONCESSION_TERM,
  EXTRAS,
  FACTS,
  FACT_LIST,
  PHASES,
  PRECEDENTS,
  PROMISES,
  TICKET,
  VOICES,
  cad,
  phaseAtConcessionYear
});
