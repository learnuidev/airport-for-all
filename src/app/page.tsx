import { getArticle } from "@/lib/article.server";
import { ArticleProvider, TripProvider } from "@/components/editorial/ArticleContext";
import { ArticlePage } from "@/components/article/ArticlePage";

/**
 * The article is the home page. The interactive board lives at /chart.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  const { article, translated } = await getArticle();

  return (
    <ArticleProvider references={article.references}>
      <TripProvider initial={{ airport: "YUL" }}>
        <ArticlePage article={article} translated={translated} />
      </TripProvider>
    </ArticleProvider>
  );
}
