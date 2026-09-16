import { Suspense } from "react";
import { getArticle } from "@/lib/article.server";
import { Dashboard } from "@/components/dashboard/Dashboard";

/** The interactive board: information on the left, chart on the right, years along the bottom. */
export const dynamic = "force-dynamic";

export default async function ChartPage() {
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
