"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReadingProgress } from "@/lib/hooks";

const LINKS = [
  { href: "/", label: "Article" },
  { href: "/ticket", label: "Ticket calculator" },
  { href: "/airports", label: "Airports" },
  { href: "/projection", label: "Projection" },
  { href: "/sources", label: "Sources" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const progress = useReadingProgress();
  const isArticle = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-ink">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white" aria-hidden>
              <path d="M2.5 13.5 21 7.2c.6-.2 1.1.5.7 1l-5.1 6.2-3.4-1.1-1.1 3.4-1.9-3.4-4.4 1.5c-.6.2-1.1-.5-.7-1Z" />
            </svg>
          </span>
          <span className="font-display text-[0.95rem] font-semibold tracking-tight text-ink">
            Airport for All
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[0.82rem] transition",
                  active
                    ? "bg-paper-3 font-medium text-ink"
                    : "text-ink-3 hover:bg-paper-3 hover:text-ink",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {isArticle ? (
        <div className="h-0.5 w-full bg-line">
          <div
            className="h-full bg-accent transition-[width] duration-150"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      ) : null}
    </header>
  );
}
