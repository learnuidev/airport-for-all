"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Reference } from "@/lib/article";
import { AIRPORTS, type Airport } from "@/lib/sourced";

/* ------------------------------------------------------------------ *
 * Citations
 * ------------------------------------------------------------------ */

type CitationValue = {
  byId: Map<number, Reference>;
  references: Reference[];
  /** Reference numbers highlighted across the page (hover / focus). */
  active: number | null;
  setActive: (id: number | null) => void;
};

const CitationContext = createContext<CitationValue | null>(null);

/* ------------------------------------------------------------------ *
 * The reader's own trip
 *
 * The article is built around two questions. Their answers live here so every
 * chapter can speak in the reader's own numbers rather than national averages.
 * ------------------------------------------------------------------ */

export type TripState = {
  airport: Airport | null;
  ticket: number;
  days: number;
  travellers: number;
  dropOffMinutes: number;
  /** Years since the concession was signed — drives every projection. */
  year: number;
};

const DEFAULT_TICKET = 430;

type TripValue = TripState & {
  setAirport: (code: string) => void;
  setTicket: (value: number) => void;
  setDays: (value: number) => void;
  setTravellers: (value: number) => void;
  setDropOffMinutes: (value: number) => void;
  setYear: (value: number) => void;
  /** True once question 1 has been answered. */
  hasAirport: boolean;
  reset: () => void;
};

const TripContext = createContext<TripValue | null>(null);

export function ArticleProvider({
  references,
  children,
}: {
  references: Reference[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const byId = useMemo(
    () => new Map(references.map((reference) => [reference.id, reference])),
    [references],
  );

  return (
    <CitationContext.Provider value={{ byId, references, active, setActive }}>
      {children}
    </CitationContext.Provider>
  );
}

/**
 * Holds the reader's two answers. Initial state is passed in so a linked board
 * (`/?airport=YYZ&ticket=430&year=10`) renders populated on first paint.
 */
export function TripProvider({
  initial,
  children,
}: {
  initial?: { airport?: string | null; ticket?: number | null; days?: number | null; travellers?: number | null; dropOffMinutes?: number | null; year?: number | null };
  children: ReactNode;
}) {
  const [airport, setAirportState] = useState<Airport | null>(() =>
    initial?.airport ? AIRPORTS.find((item) => item.code === initial.airport) ?? null : null,
  );
  const [ticket, setTicketState] = useState<number>(initial?.ticket ?? DEFAULT_TICKET);
  const [days, setDaysState] = useState<number>(initial?.days ?? 4);
  const [travellers, setTravellersState] = useState<number>(initial?.travellers ?? 1);
  const [dropOffMinutes, setDropOffState] = useState<number>(initial?.dropOffMinutes ?? 25);
  const [year, setYearState] = useState<number>(initial?.year ?? 0);

  const setAirport = useCallback((code: string) => {
    setAirportState(AIRPORTS.find((item) => item.code === code) ?? null);
  }, []);

  const reset = useCallback(() => {
    setAirportState(null);
    setTicketState(DEFAULT_TICKET);
    setDaysState(4);
    setTravellersState(1);
    setDropOffState(25);
    setYearState(0);
  }, []);

  const value: TripValue = {
    airport,
    ticket,
    days,
    travellers,
    dropOffMinutes,
    year,
    setAirport,
    setTicket: setTicketState,
    setDays: setDaysState,
    setTravellers: setTravellersState,
    setDropOffMinutes: setDropOffState,
    setYear: setYearState,
    hasAirport: airport !== null,
    reset,
  };

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useCitations(): CitationValue {
  const value = useContext(CitationContext);
  if (!value) throw new Error("useCitations must be used inside <ArticleProvider>");
  return value;
}

export function useTrip(): TripValue {
  const value = useContext(TripContext);
  if (!value) throw new Error("useTrip must be used inside <ArticleProvider>");
  return value;
}
