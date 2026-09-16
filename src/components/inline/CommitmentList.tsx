"use client";

import { useState } from "react";
import { CitationMarker } from "@/components/citations/CitationMarker";
import { ReferenceNote } from "@/components/ui/ReferenceNote";
import { PROMISES } from "@/lib/sourced";

const STATUS = {
  supported: { label: "Backed by evidence", className: "bg-green-soft text-green" },
  unproven: { label: "Unproven", className: "bg-paper-3 text-ink-3" },
  "at-risk": { label: "At risk", className: "bg-accent-soft text-accent" },
} as const;

/**
 * The commitment tracker, kept to a single scannable list: one claim, one
 * status, and the detail only if the reader asks for it.
 */
export function CommitmentList() {
  const [openId, setOpenId] = useState<string | null>(null);
  const counts = {
    supported: PROMISES.filter((item) => item.status === "supported").length,
    unproven: PROMISES.filter((item) => item.status === "unproven").length,
    "at-risk": PROMISES.filter((item) => item.status === "at-risk").length,
  };

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-[1.05rem] font-semibold text-ink">
            Eight commitments, held against the record
          </h3>
          <p className="text-[0.76rem] text-ink-4">
            {counts["at-risk"]} at risk · {counts.unproven} unproven · {counts.supported} backed
          </p>
        </div>
        <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-paper-3">
          <span
            className="bg-green"
            style={{ width: `${(counts.supported / PROMISES.length) * 100}%` }}
          />
          <span
            className="bg-line-strong"
            style={{ width: `${(counts.unproven / PROMISES.length) * 100}%` }}
          />
          <span
            className="bg-accent"
            style={{ width: `${(counts["at-risk"] / PROMISES.length) * 100}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-line">
        {PROMISES.map((promise) => {
          const isOpen = openId === promise.id;
          const status = STATUS[promise.status];
          return (
            <li key={promise.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : promise.id)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-paper-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.88rem] leading-snug text-ink">
                    {promise.claim}
                  </span>
                  <span className="mt-0.5 block text-[0.74rem] text-ink-4">— {promise.by}</span>
                </span>
                <span
                  className={`label-caps shrink-0 rounded px-2 py-1 ${status.className}`}
                >
                  {status.label}
                </span>
                <span aria-hidden className="mt-0.5 text-ink-4">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? (
                <div className="bg-paper-2 px-4 pb-4 pt-1">
                  <p className="text-[0.85rem] leading-relaxed text-ink-2">{promise.reality}</p>
                  <span className="mt-2 flex items-center gap-1.5">
                    <span className="font-mono text-[0.66rem] text-ink-4">source</span>
                    {promise.refs.map((ref) => (
                      <CitationMarker key={`${promise.id}-${ref}`} refId={ref} />
                    ))}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

    </div>
  );
}
