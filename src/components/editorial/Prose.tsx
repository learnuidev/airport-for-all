"use client";

import { Cite } from "./Cite";
import type { Block, InlineRun } from "@/lib/article";

function Runs({ runs }: { runs: InlineRun[] }) {
  return (
    <>
      {runs.map((run, index) => {
        switch (run.kind) {
          case "citation":
            return <Cite key={`c-${run.raw}-${index}`} id={run.refId} />;
          case "strong":
            return (
              <strong key={`s-${index}`} className="font-semibold">
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
                className="text-data-b underline decoration-data-b/40 underline-offset-2"
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
 * The article body. One column, one measure, no furniture — the way a newspaper
 * sets running text. `**Label:**` paragraphs from the source become a small
 * sans-serif kicker above an indented block, which is how the source structures
 * each year: what happens, the precedent, the Canadian projection.
 */
export function Prose({ blocks, lead = false }: { blocks: Block[]; lead?: boolean }) {
  let paragraphIndex = 0;

  return (
    <div>
      {blocks.map((block, index) => {
        if (block.type === "divider") return null;

        if (block.type === "list") {
          return (
            <ul key={`list-${index}`} className="my-6 space-y-4 border-y border-rule py-5">
              {block.items.map((item, itemIndex) => (
                <li key={`item-${index}-${itemIndex}`} className="serif-body">
                  <Runs runs={item.runs} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.label) {
          return (
            <div key={`labelled-${index}`} className="my-7 border-l-2 border-ink pl-4">
              <p className="font-sans text-[0.72rem] font-bold uppercase tracking-[0.08em] text-ink-3">
                {block.label}
              </p>
              <p className="serif-body mt-1.5">
                <Runs runs={block.runs} />
              </p>
            </div>
          );
        }

        const isLead = lead && paragraphIndex === 0;
        paragraphIndex += 1;

        return (
          <p
            key={`p-${index}`}
            className={`serif-body mb-5 ${isLead ? "dropcap" : ""}`}
          >
            <Runs runs={block.runs} />
          </p>
        );
      })}
    </div>
  );
}
