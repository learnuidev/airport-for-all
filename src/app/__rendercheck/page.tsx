// Temporary: renders the reading pane directly so it can be verified in the
// server output. Deleted once checked.
import { getArticleFor } from "@/lib/article.server";
import { ArticleProvider, TripProvider } from "@/components/editorial/ArticleContext";
import { ArticleOverlay } from "@/components/dashboard/ArticleOverlay";

export const dynamic = "force-dynamic";

export default function RenderCheck() {
  const { article } = getArticleFor("en");
  return (
    <ArticleProvider references={article.references}>
      <TripProvider initial={{ airport: "YUL" }}>
        <ArticleOverlay article={article} locale="en" translated onClose={() => {}} />
      </TripProvider>
    </ArticleProvider>
  );
}
