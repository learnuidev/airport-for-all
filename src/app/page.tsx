import { Suspense } from "react";
import { getArticle } from "@/lib/article.server";
import { Dashboard } from "@/components/dashboard/Dashboard";

/**
 * One page. The board carries the interaction; the written article opens over
 * it, so nothing is ever more than one screen away.
 */
export default function Page() {
  const article = getArticle();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="font-sans text-[0.84rem] text-ink-4">Loading the board…</p>
        </div>
      }
    >
      <Dashboard article={article} />
    </Suspense>
  );
}
