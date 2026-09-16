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

type CitationsValue = {
  references: Reference[];
  byId: Map<number, Reference>;
  /** The source currently shown in the corner preview. */
  peek: number | null;
  setPeek: (id: number | null) => void;
};

const CitationsContext = createContext<CitationsValue | null>(null);

export function CitationsProvider({
  references,
  children,
}: {
  references: Reference[];
  children: ReactNode;
}) {
  const [peek, setPeekState] = useState<number | null>(null);
  const byId = useMemo(
    () => new Map(references.map((reference) => [reference.id, reference])),
    [references],
  );

  const setPeek = useCallback((id: number | null) => setPeekState(id), []);

  return (
    <CitationsContext.Provider value={{ references, byId, peek, setPeek }}>
      {children}
    </CitationsContext.Provider>
  );
}

export function useCitations(): CitationsValue {
  const context = useContext(CitationsContext);
  if (!context) throw new Error("useCitations must be used inside <CitationsProvider>");
  return context;
}
