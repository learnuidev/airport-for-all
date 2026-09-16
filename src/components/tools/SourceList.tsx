"use client";

import { useMemo, useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import type { Reference } from "@/lib/article";

const KIND_LABEL: Record<string, string> = {
  "think-tank": "Think tank",
  labour: "Labour",
  news: "News",
  academic: "Academic",
  government: "Government",
  legal: "Legal",
};

export function SourceList({ references }: { references: Reference[] }) {
  const [filter, setFilter] = useState<"all" | "cited" | "listed">("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return references.filter((reference) => {
      if (filter === "cited" && !reference.cited) return false;
      if (filter === "listed" && reference.cited) return false;
      if (!needle) return true;
      return `${reference.publisher} ${reference.title} ${reference.date}`
        .toLowerCase()
        .includes(needle);
    });
  }, [references, filter, query]);

  const citedCount = references.filter((reference) => reference.cited).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: `All (${references.length})` },
            { id: "cited", label: `Cited (${citedCount})` },
            { id: "listed", label: `Listed only (${references.length - citedCount})` },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={[
              "cursor-pointer rounded-md px-3 py-1.5 text-[0.8rem] transition",
              filter === option.id
                ? "bg-paper-3 font-medium text-ink"
                : "text-ink-3 hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search sources…"
          className="ml-auto min-w-[12rem] flex-1 rounded-md border border-line bg-paper px-3 py-1.5 text-[0.82rem] text-ink placeholder:text-ink-4 outline-none focus:border-blue/50"
        />
      </div>

      <ol className="mt-5 space-y-2">
        {visible.map((reference) => (
          <li key={reference.id} id={`source-${reference.id}`} className="card scroll-mt-24 p-4">
            <div className="flex items-start gap-3">
              <CitationMarker refId={reference.id} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9rem] font-medium text-ink">{reference.publisher}</span>
                  <span className="label-caps rounded bg-paper-3 px-2 py-0.5 text-ink-3">
                    {KIND_LABEL[reference.kind] ?? reference.kind}
                  </span>
                  {reference.cited ? null : (
                    <span className="label-caps rounded bg-paper-3 px-2 py-0.5 text-ink-4">
                      listed only
                    </span>
                  )}
                  {reference.legacyId ? (
                    <span className="font-mono text-[0.68rem] text-ink-4">
                      ref list №{reference.legacyId}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[0.88rem] leading-snug text-ink-2">{reference.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[0.72rem] text-ink-4">{reference.date}</span>
                  {reference.url ? (
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[0.75rem] text-blue hover:underline"
                    >
                      Open source ↗
                    </a>
                  ) : (
                    <span className="font-mono text-[0.72rem] text-ink-4">no link in article.md</span>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
        {!visible.length ? (
          <li className="card p-6 text-center text-[0.85rem] text-ink-4">
            No sources match that filter.
          </li>
        ) : null}
      </ol>
    </div>
  );
}
