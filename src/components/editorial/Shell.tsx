"use client";

import type { ReactNode } from "react";

/** The measure, used inside the reading overlay. */
export function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[42rem] px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Wide({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-5xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

/** Chart furniture for the reading overlay. The interactive board does not use it. */
export function Figure({
  title,
  source,
  children,
}: {
  title: string;
  deck?: string;
  aside?: ReactNode;
  source?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <figure>
      <div className="border-t border-ink pt-3">
        <h3 className="max-w-[38rem] font-sans text-[0.98rem] font-bold leading-snug">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
      {source ? (
        <p className="mt-3 border-t border-rule pt-2 font-sans text-[0.74rem] leading-relaxed text-ink-4">
          {source}
        </p>
      ) : null}
    </figure>
  );
}

/** Gallup-style stat callout, used sparingly in the reading overlay. */
export function StatCallout({
  value,
  label,
  tone = "ink",
}: {
  value: string;
  label: string;
  detail?: string;
  tone?: "ink" | "red" | "blue" | "green";
}) {
  return (
    <div className="border-t-2 border-ink pt-3">
      <p
        className={[
          "font-serif text-[2.2rem] font-bold leading-none tabular",
          tone === "red"
            ? "text-data-a"
            : tone === "blue"
              ? "text-data-b"
              : tone === "green"
                ? "text-data-d"
                : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-1.5 font-sans text-[0.82rem] font-semibold leading-snug">{label}</p>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">{children}</div>;
}
