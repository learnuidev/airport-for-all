"use client";

import { useCitations } from "./CitationsContext";

/**
 * A reference marker from article.md's bracket notation.
 *
 * Rendered as a quiet anchor into the source ledger rather than an interactive
 * control: there can be well over a hundred of them on one page, and a page of
 * buttons reads as noise. Hovering shows the publisher; clicking opens the
 * ledger entry.
 */
export function CitationMarker({ refId }: { refId: number }) {
  const { byId } = useCitations();
  const reference = byId.get(refId);

  return (
    <sup className="ml-px align-super">
      <a
        href={`/sources#source-${refId}`}
        title={
          reference
            ? `${reference.publisher} — ${reference.title} (${reference.date})`
            : `Source ${refId}`
        }
        className="rounded px-0.5 font-mono text-[0.62rem] font-medium leading-none text-ink-4 no-underline transition hover:bg-accent-soft hover:text-accent"
      >
        {refId}
      </a>
    </sup>
  );
}
