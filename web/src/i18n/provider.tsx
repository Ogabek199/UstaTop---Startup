"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getDictionary, type Dictionary, type Locale } from "./index";
import { useAuth } from "@/store/auth";

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const user = useAuth((s) => s.user);
  const [locale, setLocaleState] = useState<Locale>("uz");

  useEffect(() => {
    const saved = localStorage.getItem("ustatop-locale") as Locale | null;
    if (saved) setLocaleState(saved);
  }, []);

  useEffect(() => {
    if (user?.language) setLocaleState(user.language);
  }, [user?.language]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("ustatop-locale", l);
  };

  return (
    <I18nContext.Provider
      value={{ locale, t: getDictionary(locale), setLocale }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
