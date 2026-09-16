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
              <strong key={`s-${index}`} className="font-semibold text-ink">
                {run.value}
              </strong>
            );
          case "em":
            return (
              <em key={`e-${index}`} className="italic">
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
                className="text-blue underline decoration-blue/30 underline-offset-2 hover:decoration-blue"
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

/**
 * Renders the parsed article.md blocks. `**Label:**` paragraphs become a small
 * stacked field label with the body beneath it.
 */
export function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.type === "divider") return null;

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="space-y-3">
              {block.items.map((item, itemIndex) => (
                <li key={`item-${index}-${itemIndex}`} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-line"
                  />
                  <p className="prose-body">
                    <Runs runs={item.runs} />
                  </p>
                </li>
              ))}
            </ul>
          );
        }

        if (block.label) {
          return (
            <div key={`labelled-${index}`} className="sm:pl-5 sm:border-l sm:border-line">
              <p className="label-caps text-ink-4">{block.label}</p>
              <p className="prose-body mt-1">
                <Runs runs={block.runs} />
              </p>
            </div>
          );
        }

        return (
          <p key={`p-${index}`} className="prose-body">
            <Runs runs={block.runs} />
          </p>
        );
      })}
    </div>
  );
}
