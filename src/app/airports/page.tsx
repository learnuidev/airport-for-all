import Link from "next/link";
import { getArticle } from "@/lib/article";
import { CitationsProvider } from "@/components/citations/CitationsContext";
import { AirportExplorer } from "@/components/tools/AirportExplorer";

export const metadata = {
  title: "Airport comparison — Airport for All",
  description:
    "The four Canadian airports named in the concession announcement, with modelled job exposure and revenue exposure.",
};

export default function AirportsPage() {
  const article = getArticle();

  return (
    <CitationsProvider references={article.references}>
      <main className="mx-auto max-w-4xl px-5 py-12">
        <Link href="/" className="text-[0.82rem] text-blue hover:underline">
          ← Back to the article
        </Link>

        <h1 className="mt-5 font-display text-[2rem] font-semibold tracking-[-0.01em] text-ink">
          The four airports
        </h1>
        <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-ink-2">
          Toronto Pearson, Vancouver International, Montréal–Trudeau and Calgary International.
          Two of them — Vancouver and Calgary — are represented by the union that says it was not
          consulted.
        </p>

        <div className="mt-8">
          <AirportExplorer />
        </div>
      </main>
    </CitationsProvider>
  );
}
