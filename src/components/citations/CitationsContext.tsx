"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Reference } from "@/lib/article";

/* ------------------------------------------------------------------ *
 * Shared citation state: which sources are "open" anywhere on the page,
 * and which one the reader is hovering.
 * ------------------------------------------------------------------ */

type CitationsValue = {
  references: Reference[];
  byId: Map<number, Reference>;
  /** Ids pinned open in the source ledger. */
  pinned: number[];
  togglePin: (id: number, additive?: boolean) => void;
  clearPins: () => void;
  hovered: number | null;
  setHovered: (id: number | null) => void;
  /** Scrolls the ledger panel to a source and pins it. */
  reveal: (id: number) => void;
  /** Ids highlighted right now (pinned, hovered, or scrolled-to). */
  highlighted: Set<number>;
};

const CitationsContext = createContext<CitationsValue | null>(null);

export function CitationsProvider({
  references,
  children,
}: {
  references: Reference[];
  children: ReactNode;
}) {
  const [pinned, setPinned] = useState<number[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [flashed, setFlashed] = useState<number[]>([]);

  const byId = useMemo(
    () => new Map(references.map((reference) => [reference.id, reference])),
    [references],
  );

  const togglePin = useCallback((id: number, additive = false) => {
    setPinned((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : additive
          ? [...current, id]
          : [id],
    );
  }, []);

  const clearPins = useCallback(() => setPinned([]), []);

  const reveal = useCallback((id: number) => {
    setPinned((current) => (current.includes(id) ? current : [...current, id]));
    setFlashed((current) => (current.includes(id) ? current : [...current, id]));
    window.setTimeout(() => {
      document.getElementById(`source-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 30);
    window.setTimeout(() => {
      setFlashed((current) => current.filter((value) => value !== id));
    }, 2400);
  }, []);

  // Press Escape to clear the selection.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPinned([]);
        setHovered(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const highlighted = useMemo(() => {
    const set = new Set<number>(pinned);
    if (hovered !== null) set.add(hovered);
    flashed.forEach((id) => set.add(id));
    return set;
  }, [pinned, hovered, flashed]);

  const value: CitationsValue = {
    references,
    byId,
    pinned,
    togglePin,
    clearPins,
    hovered,
    setHovered,
    reveal,
    highlighted,
  };

  return <CitationsContext.Provider value={value}>{children}</CitationsContext.Provider>;
}

export function useCitations(): CitationsValue {
  const context = useContext(CitationsContext);
  if (!context) throw new Error("useCitations must be used inside <CitationsProvider>");
  return context;
}

export function useReference(id: number): Reference | undefined {
  const { byId } = useCitations();
  return byId.get(id);
}
