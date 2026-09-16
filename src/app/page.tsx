import { Suspense } from "react";
import { getArticle } from "@/lib/article.server";
import { Dashboard } from "@/components/dashboard/Dashboard";

// Read the markdown on every request so a link always reflects the current source.
export const dynamic = "force-dynamic";

/**
 * One page. The board carries the interaction; the written article opens over
 * it, so nothing is ever more than one screen away.
 */
export default async function Page() {
  const { article, locale, translated } = await getArticle();


  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-sans text-[0.84rem] text-ink-4">Loading the board…</p>
        </div>
      }
    >
      <Dashboard article={article} locale={locale} translated={translated} />
    </Suspense>
  );
}
