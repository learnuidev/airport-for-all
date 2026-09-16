/**
 * One model, used by every chapter.
 *
 * The reader answers two questions (airport, ticket price). Everything the
 * article projects afterwards is derived here, so the numbers in chapter 3 agree
 * with the numbers in chapter 6.
 *
 * Anchors taken from article.md:
 *   - Airport Improvement Fee: $30–$40 a ticket, 37% of large-airport revenue.
 *   - Taxes and fees: 25–35% of a Canadian ticket. Set here at 28%.
 *   - Aeronautical charges: the slice of a fare that reaches the operator,
 *     rising at the rate that reproduces Perth's reported +60% per passenger
 *     over a decade.
 *   - Non-ticket charges ramp to the levels article.md documents in the UK:
 *     £98/day Heathrow parking, £28 for 30 minutes at Stansted, and the CCPA's
 *     warning that retail and food prices follow rents up.
 *   - Sydney's 40% workforce cut is the labour anchor.
 */

import { AIRPORTS, type Airport } from "@/lib/sourced";

export const AIF_PER_TICKET = 35;
export const TAX_SHARE = 0.28;
export const AERO_PER_TICKET = 22;

/** UK levels, CAD, once fully ramped. */
export const PARKING_UK_PER_DAY = 59;
export const DROP_OFF_UK = 24;
export const FOOD_TODAY_SHARE = 0.06;
export const FOOD_UK_SHARE = 0.19;

/** Years over which non-ticket charges reach UK levels. */
export const RAMP_START = 2;
export const RAMP_END = 10;

/** Perth: +60% per passenger across a decade, anchored at the tenth step. */
export const AERO_ANCHOR_YEARS = 9;
export const AERO_ANNUAL = Math.pow(1.6, 1 / AERO_ANCHOR_YEARS) - 1;
export const AERO_EASE = 0.02;
export const FARE_ANNUAL = 0.025;
export const STAFF_PER_MILLION = 62;
export const SYDNEY_CUT = 0.4;
export const HORIZON = 20;
export const ANNOUNCEMENT_YEAR = 2026;

export const airportByCode = (code: string): Airport | undefined =>
  AIRPORTS.find((item) => item.code === code);

/** Logistic ramp: 0 at or before start, 1 at or after end. */
export function ramp(year: number): number {
  if (year <= RAMP_START) return 0;
  if (year >= RAMP_END) return 1;
  const t = (year - RAMP_START) / (RAMP_END - RAMP_START);
  return t * t * (3 - 2 * t);
}

export type TripInput = {
  airport: Airport;
  ticket: number;
  days: number;
  travellers: number;
  dropOffMinutes: number;
};

export type YearCosts = {
  year: number;
  calendar: number;
  airfare: number;
  aif: number;
  aeronautical: number;
  taxes: number;
  food: number;
  parking: number;
  dropOff: number;
  /** Per-traveller ticket: airfare + AIF + aeronautical + taxes. */
  ticketTotal: number;
  /** Whole trip for the party: everything above, plus non-ticket charges. */
  tripTotal: number;
  /** Non-ticket charges only. */
  extrasTotal: number;
};

export function costsFor(input: TripInput, year: number): YearCosts {
  const { airport, ticket, days, travellers, dropOffMinutes } = input;

  const taxes = ticket * TAX_SHARE;
  const aeronauticalToday = Math.min(AERO_PER_TICKET, ticket * 0.25);
  const airfareToday = Math.max(0, ticket - AIF_PER_TICKET - aeronauticalToday - taxes);

  const aif = AIF_PER_TICKET * Math.pow(year < 3 ? 1.035 : 1.055, year);
  const aeronautical =
    year <= AERO_ANCHOR_YEARS
      ? aeronauticalToday * Math.pow(1 + AERO_ANNUAL, year)
      : aeronauticalToday * 1.6 * Math.pow(1 + AERO_EASE, year - AERO_ANCHOR_YEARS);
  const airfare = airfareToday * Math.pow(1 + FARE_ANNUAL, year);

  const ticketTotal = airfare + aif + aeronautical + taxes;

  // Non-ticket charges, per party.
  const shared = ramp(year);
  const food =
    (ticket * FOOD_TODAY_SHARE +
      (ticket * FOOD_UK_SHARE - ticket * FOOD_TODAY_SHARE) * shared) *
    travellers;
  const parking =
    airport.parkingPerDay * days + (PARKING_UK_PER_DAY * days - airport.parkingPerDay * days) * shared;
  const dropOff =
    dropOffMinutes > airport.freeDropOffMinutes ? DROP_OFF_UK * shared : 0;

  const extrasTotal = food + parking + dropOff;

  return {
    year,
    calendar: ANNOUNCEMENT_YEAR + year,
    airfare,
    aif,
    aeronautical,
    taxes,
    food,
    parking,
    dropOff,
    ticketTotal,
    extrasTotal,
    tripTotal: ticketTotal * travellers + extrasTotal,
  };
}

/** A series of years for charting. */
export function seriesFor(input: TripInput, years = HORIZON): YearCosts[] {
  return Array.from({ length: years + 1 }, (_, year) => costsFor(input, year));
}

export function staffEstimate(airport: Airport) {
  const staff = Math.round(airport.passengers * STAFF_PER_MILLION);
  return { staff, cut: Math.round(staff * SYDNEY_CUT) };
}

export function cad(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function compact(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${Math.round(value)}M`;
}
