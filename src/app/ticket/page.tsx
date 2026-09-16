import Link from "next/link";
import { getArticle } from "@/lib/article";
import { CitationsProvider } from "@/components/citations/CitationsContext";
import { TicketCalculator } from "@/components/tools/TicketCalculator";
import { ReferenceNote } from "@/components/ui/ReferenceNote";
import { CitationMarker } from "@/components/citations/CitationMarker";

export const metadata = {
  title: "Ticket calculator — Airport for All",
  description:
    "Model what a Canadian airfare costs by year under a private airport concession, against the non-profit status quo.",
};

export default function TicketPage() {
  const article = getArticle();

  return (
    <CitationsProvider references={article.references}>
      <main className="mx-auto max-w-4xl px-5 py-12">
        <Link href="/" className="text-[0.82rem] text-blue hover:underline">
          ← Back to the article
        </Link>

        <h1 className="mt-5 font-display text-[2rem] font-semibold tracking-[-0.01em] text-ink">
          Ticket calculator
        </h1>
        <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-ink-2">
          Set the year and switch the charges on. One line is the airport as it runs today — a
          non-profit authority that returns its surplus to the airport. The other is a private
          concession that has to find a return.
        </p>

        <div className="mt-8">
          <TicketCalculator />
        </div>

        <section className="mt-8 card p-5">
          <h2 className="font-display text-[1.15rem] font-semibold text-ink">
            What is reported, what is modelled
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="label-caps text-ink-4">From article.md</p>
              <ul className="mt-2 space-y-2 text-[0.85rem] leading-relaxed text-ink-2">
                <li>
                  Airport Improvement Fee: $30–$40 per ticket, 37% of large-airport revenue.{" "}
                  <CitationMarker refId={1} />
                </li>
                <li>
                  Taxes and fees are already 25–35% of a Canadian ticket.{" "}
                  <CitationMarker refId={14} />
                </li>
                <li>
                  Perth: airline revenue per passenger rose more than 60% in a decade.{" "}
                  <CitationMarker refId={14} />
                </li>
                <li>
                  Brazil: 3–3.5% higher airfares on routes with a privatised airport.{" "}
                  <CitationMarker refId={5} />
                </li>
                <li>
                  UK: $24 drop-off, £98/day Heathrow parking, £751m collected in 2025.{" "}
                  <CitationMarker refId={13} />
                  <CitationMarker refId={14} />
                </li>
              </ul>
            </div>
            <div>
              <p className="label-caps text-ink-4">Modelled here</p>
              <ul className="mt-2 space-y-2 text-[0.85rem] leading-relaxed text-ink-3">
                <li>A representative $430 domestic return fare as the starting point.</li>
                <li>Aeronautical charges compounding at 6%/yr for the first decade.</li>
                <li>
                  Sydney&rsquo;s 40% workforce cut applied through a 55% labour-cost passthrough.
                </li>
                <li>Non-ticket charges reaching UK-style pricing between years 2 and 10.</li>
                <li>
                  A status-quo comparison growing fees and charges at ordinary inflation (2–2.5%).
                </li>
              </ul>
            </div>
          </div>
          <ReferenceNote>
            This is a direction-of-travel model built from the reported figures above, not a
            forecast. No published study projects Canadian airport concessions year by year.
          </ReferenceNote>
        </section>
      </main>
    </CitationsProvider>
  );
}
