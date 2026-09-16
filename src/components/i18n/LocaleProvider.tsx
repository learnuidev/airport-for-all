"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { setupI18n } from "@/lib/i18n/client";
import { type Locale } from "@/lib/locales";

/**
 * Boots i18next once and keeps the document language in step. The locale comes
 * from a cookie read on the server, so the first paint is already translated.
 */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const i18n = setupI18n(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
