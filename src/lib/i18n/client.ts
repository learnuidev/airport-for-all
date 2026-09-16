"use client";

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_TAGS, isLocale, type Locale } from "@/lib/locales";

import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import zh from "@/locales/zh.json";

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  zh: { translation: zh },
} as const;

let initialised = false;

/** Creates (once) and returns the shared i18next instance. */
export function setupI18n(locale: Locale) {
  if (!initialised) {
    void i18next.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      supportedLngs: Object.keys(resources),
      interpolation: { escapeValue: false },
      returnNull: false,
    });
    initialised = true;
  } else if (i18next.language !== locale) {
    void i18next.changeLanguage(locale);
  }
  return i18next;
}

export function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return isLocale(match?.[1]) ? (match[1] as Locale) : DEFAULT_LOCALE;
}

export function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export { LOCALE_TAGS };
