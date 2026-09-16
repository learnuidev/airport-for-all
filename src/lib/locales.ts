/**
 * Supported locales. The chosen locale is stored in a cookie so the whole shell,
 * including the document language attribute, can be rendered server-side.
 */
export const LOCALES = ["en", "fr", "es", "zh"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "locale";

/** Shown in the language switcher, each in its own language. */
export const LOCALE_LABELS: Record<Locale, { short: string; long: string }> = {
  en: { short: "EN", long: "English" },
  fr: { short: "FR", long: "Français" },
  es: { short: "ES", long: "Español" },
  zh: { short: "中文", long: "简体中文" },
};

/** BCP 47 tags for Intl formatting. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-CA",
  fr: "fr-CA",
  es: "es-ES",
  zh: "zh-CN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
