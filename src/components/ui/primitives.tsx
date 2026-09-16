"use client";

import type { ReactNode } from "react";
import { FACTS } from "@/lib/sourced";

type Tone = "signal" | "jet" | "runway" | "alarm" | "haze" | "fog";

const TONE_CLASSES: Record<Tone, string> = {
  signal: "border-signal-500/40 bg-signal-500/10 text-signal-400",
  jet: "border-jet-400/40 bg-jet-500/10 text-jet-400",
  runway: "border-runway-400/40 bg-runway-500/10 text-runway-400",
  alarm: "border-alarm-400/40 bg-alarm-500/10 text-alarm-400",
  haze: "border-haze-400/40 bg-haze-400/10 text-haze-400",
  fog: "border-ink-500 bg-ink-700/60 text-fog-400",
};

export function Pill({
  children,
  tone = "fog",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`label-caps inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * A single audited number. `factId` indexes FACTS in src/lib/sourced.ts, which
 * carries the citation marker and the article.md line the claim came from.
 */
export function DataCallout({
  factId,
  tone = "signal",
  footnote,
  className = "",
}: {
  factId: keyof typeof FACTS;
  tone?: Tone;
  footnote?: ReactNode;
  className?: string;
}) {
  const fact = FACTS[factId];
  return (
    <figure
      className={`relative overflow-hidden rounded-2xl border border-ink-600/70 bg-ink-850/80 p-4 ${className}`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-px ${
          tone === "signal"
            ? "bg-gradient-to-r from-transparent via-signal-500 to-transparent"
            : tone === "runway"
              ? "bg-gradient-to-r from-transparent via-runway-400 to-transparent"
              : tone === "jet"
                ? "bg-gradient-to-r from-transparent via-jet-400 to-transparent"
                : "bg-gradient-to-r from-transparent via-alarm-400 to-transparent"
        }`}
      />
      <div
        className={`font-display text-3xl font-bold tracking-tight tabular ${
          tone === "runway" ? "text-runway-400" : tone === "jet" ? "text-jet-400" : "text-signal-400"
        }`}
      >
        {fact.value}
      </div>
      <figcaption className="mt-2 text-[0.82rem] leading-6 text-fog-400">
        {fact.label}
        {footnote ? <span className="text-fog-600"> {footnote}</span> : null}
      </figcaption>
    </figure>
  );
}

export function StatStrip({
  items,
  className = "",
}: {
  items: { label: string; value: string; sub?: string; tone?: Tone }[];
  className?: string;
}) {
  return (
    <dl
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-600/70 bg-ink-600/40 sm:grid-cols-4 ${className}`}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-ink-900/90 p-4">
          <dt className="label-caps text-fog-500">{item.label}</dt>
          <dd
            className={`mt-2 font-display text-2xl font-bold tabular ${
              item.tone === "signal"
                ? "text-signal-400"
                : item.tone === "runway"
                  ? "text-runway-400"
                  : item.tone === "alarm"
                    ? "text-alarm-400"
                    : item.tone === "jet"
                      ? "text-jet-400"
                      : "text-fog-100"
            }`}
          >
            {item.value}
          </dd>
          {item.sub ? (
            <p className="mt-1 text-xs leading-5 text-fog-500">{item.sub}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function SectionFrame({
  eyebrow,
  title,
  lede,
  children,
  className = "",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative ${className}`}>
      <header data-reveal className="mb-6 flex flex-col gap-3">
        {eyebrow ? <div>{eyebrow}</div> : null}
        <h2 className="font-display text-3xl font-bold tracking-tight text-fog-100 sm:text-4xl">
          {title}
        </h2>
        {lede ? (
          <p className="max-w-3xl text-[1.02rem] leading-8 text-fog-400 text-balance-pretty">
            {lede}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
