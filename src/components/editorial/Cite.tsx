"use client";

import { useCitations } from "./ArticleContext";

/**
 * Superscript reference marker, parsed from article.md's citation notation.
 * Styled the way newspapers set them: small, quiet, and a real link.
 */
export function Cite({ id }: { id: number }) {
  const { byId, setActive } = useCitations();
  const reference = byId.get(id);

  return (
    <sup className="ml-px align-super">
      <a
        href="#sources"
        onMouseEnter={() => setActive(id)}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive(id)}
        onBlur={() => setActive(null)}
        title={
          reference
            ? `${reference.publisher}. ${reference.title} (${reference.date})`
            : `Source ${id}`
        }
        className="font-sans text-[0.62rem] font-semibold text-data-b no-underline hover:underline"
      >
        {id}
      </a>
    </sup>
  );
}
