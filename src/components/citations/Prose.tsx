"use client";

import { CitationMarker } from "./CitationMarker";
import type { Block, InlineRun } from "@/lib/article";

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        switch (run.kind) {
          case "citation":
            return <CitationMarker key={`c-${run.raw}-${index}`} refId={run.refId} />;
          case "strong":
            return (
              <strong
                key={`s-${index}`}
                className="font-semibold text-signal-400 [text-shadow:0_0_26px_color-mix(in_oklab,var(--color-signal-500)_28%,transparent)]"
              >
                {run.value}
              </strong>
            );
          case "em":
            return (
              <em key={`e-${index}`} className="italic text-fog-100">
                {run.value}
              </em>
            );
          case "link":
            return (
              <a
                key={`l-${index}`}
                href={run.href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-jet-400 underline decoration-jet-400/40 underline-offset-4 transition hover:decoration-jet-400"
              >
                {run.value}
              </a>
            );
          default:
            return <span key={`t-${index}`}>{run.value}</span>;
        }
      })}
    </>
  );
}

function LabelChip({ label }: { label: string }) {
  const tone =
    /what happens/i.test(label)
      ? "border-jet-400/40 bg-jet-500/10 text-jet-400"
      : /precedent/i.test(label)
        ? "border-haze-400/40 bg-haze-400/10 text-haze-400"
        : /projection/i.test(label)
          ? "border-signal-500/40 bg-signal-500/10 text-signal-400"
          : "border-ink-500 bg-ink-700/60 text-fog-400";

  return (
    <span
      className={`label-caps inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 ${tone}`}
    >
      {label}
    </span>
  );
}

export function Prose({
  blocks,
  className = "",
}: {
  blocks: Block[];
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === "divider") {
          return (
            <div
              key={`divider-${index}`}
              className="flex items-center gap-3 py-2"
              aria-hidden
            >
              <span className="h-px flex-1 bg-gradient-to-r from-transparent via-ink-500 to-transparent" />
              <span className="h-1 w-1 rotate-45 bg-ink-500" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent via-ink-500 to-transparent" />
            </div>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="grid gap-3 sm:grid-cols-1">
              {block.items.map((item, itemIndex) => (
                <li
                  key={`item-${index}-${itemIndex}`}
                  data-reveal
                  style={{ ["--reveal-delay" as string]: `${itemIndex * 70}ms` }}
                  className="group relative overflow-hidden rounded-2xl border border-ink-600/70 bg-ink-850/70 p-4 pl-12 transition hover:border-signal-500/40 hover:bg-ink-800/80"
                >
                  <span className="absolute left-4 top-4 font-mono text-xs text-signal-500/80">
                    {String(itemIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-signal-500/50 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <p className="text-[0.98rem] leading-7 text-fog-300">
                    <Runs runs={item.runs} />
                  </p>
                </li>
              ))}
            </ul>
          );
        }

        if (block.label) {
          return (
            <div
              key={`labelled-${index}`}
              data-reveal
              className="group grid gap-3 rounded-2xl border border-ink-600/50 bg-gradient-to-br from-ink-850/80 to-ink-900/60 p-4 sm:grid-cols-[9.5rem_1fr] sm:gap-5 sm:p-5"
            >
              <div className="sm:pt-0.5">
                <LabelChip label={block.label} />
              </div>
              <p className="text-[1.02rem] leading-8 text-fog-300 text-balance-pretty">
                <Runs runs={block.runs} />
              </p>
            </div>
          );
        }

        return (
          <p
            key={`p-${index}`}
            data-reveal
            className="text-[1.02rem] leading-8 text-fog-300 text-balance-pretty first:text-[1.08rem] first:text-fog-100"
          >
            <Runs runs={block.runs} />
          </p>
        );
      })}
    </div>
  );
}

export { Runs };
