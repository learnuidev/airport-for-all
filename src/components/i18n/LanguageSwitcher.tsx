"use client";

import { useTranslation } from "react-i18next";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/locales";
import { writeLocaleCookie } from "@/lib/i18n/client";

/**
 * Switches the reading language. The choice is written to a cookie and the page
 * reloads, so document language, formatting and every string move together.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.slice(0, 2) ?? "en") as Locale;

  return (
    <label className="flex items-center gap-1.5" title={t("language.switch")}>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-ink-4" aria-hidden>
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-2.6a15 15 0 0 0-1.2-3.2A8 8 0 0 1 18.9 8ZM12 4.1c.6.9 1.1 2 1.5 3.3h-3c.4-1.3.9-2.4 1.5-3.3ZM4.3 14a8 8 0 0 1 0-4h3a19 19 0 0 0 0 4Zm.8 2h2.6c.3 1.2.7 2.3 1.2 3.2A8 8 0 0 1 5.1 16Zm2.6-8H5.1a8 8 0 0 1 3.8-3.2A15 15 0 0 0 7.7 8ZM12 19.9c-.6-.9-1.1-2-1.5-3.3h3c-.4 1.3-.9 2.4-1.5 3.3Zm1.8-5.3H10.2a17 17 0 0 1 0-4h3.6a17 17 0 0 1 0 4Zm1.3 4.6c.5-.9.9-2 1.2-3.2h2.6a8 8 0 0 1-3.8 3.2Zm1.5-5.2a19 19 0 0 0 0-4h3a8 8 0 0 1 0 4Z" />
      </svg>
      <select
        aria-label={t("language.label")}
        value={current}
        onChange={(event) => {
          writeLocaleCookie(event.target.value as Locale);
          window.location.reload();
        }}
        className="cursor-pointer border-b border-ink bg-transparent py-0.5 font-sans text-[0.8rem] outline-none"
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale].long}
          </option>
        ))}
      </select>
    </label>
  );
}
