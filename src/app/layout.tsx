import type { Metadata } from "next";
import { Inter, Source_Serif_4, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { getArticle } from "@/lib/article.server";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="antialiased">
        <a
          href="#lead"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:text-white"
        >
          Skip to the article
        </a>
        {children}
      </body>
    </html>
  );
}
