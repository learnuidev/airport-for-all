import type { ReactNode } from "react";

/** Small print under a figure: what is reported, what is modelled. */
export function ReferenceNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 border-t border-line pt-3 text-[0.74rem] leading-relaxed text-ink-4">
      {children}
    </p>
  );
}
