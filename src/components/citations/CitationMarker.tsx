"use client";

import { useCitations } from "./CitationsContext";

/**
 * A citation marker rendered from the bracket notation in article.md.
 * Clicking it pins the source in the ledger; hovering previews it.
 */
export function CitationMarker({ refId }: { refId: number }) {
  const { byId, togglePin, setHovered, highlighted, pinned } = useCitations();
  const reference = byId.get(refId);
  const isPinned = pinned.includes(refId);

  if (!reference) {
    return (
      <sup className="ml-0.5 text-[0.6rem] text-fog-600" title={`Unresolved citation ${refId}`}>
        [{refId}]
      </sup>
    );
  }

  return (
    <sup className="relative ml-0.5 inline-block align-super">
      <button
        type="button"
        onClick={() => togglePin(refId, true)}
        onMouseEnter={() => setHovered(refId)}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered(refId)}
        onBlur={() => setHovered(null)}
        aria-label={`Source ${refId}: ${reference.publisher}`}
        aria-pressed={isPinned}
        className={[
          "group/cite relative inline-flex min-w-[1.15rem] cursor-pointer items-center justify-center rounded-[5px] px-[3px]",
          "font-mono text-[0.6rem] font-semibold leading-[1.05] tabular transition",
          isPinned
            ? "bg-signal-500 text-ink-950 shadow-[0_0_20px_-4px_var(--color-signal-500)]"
            : highlighted.has(refId)
              ? "bg-signal-500/25 text-signal-400"
              : "bg-ink-600/70 text-fog-400 hover:bg-signal-500/30 hover:text-signal-400",
        ].join(" ")}
      >
        {refId}
      </button>
    </sup>
  );
}
