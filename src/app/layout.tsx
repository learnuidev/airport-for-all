import type { Metadata } from "next";
import { Inter, Source_Serif_4, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { getArticle } from "@/lib/article.server";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_TAGS, isLocale } from "@/lib/locales";

// The headline comes from the source document, so metadata is read per request.
export const dynamic = "force-dynamic";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const article = getArticle();

export const metadata: Metadata = {
  title: article.title,
  description: article.deck,
  openGraph: { title: article.title, description: article.deck, type: "article" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookie = await cookies();
  const raw = cookie.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      data-locale={locale}
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        <a
          href="#lead"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:text-white"
        >
          Skip to the article
        </a>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
