"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Locale, LanguageCode } from './locales';
import { LANGUAGES } from './locales';
import { loadLocale } from './locales';

const LANGUAGE_STORAGE_KEY = 'sky_scan_language';
const LANGUAGE_CHOSEN_KEY = 'sky_scan_language_chosen';

interface I18nContextType {
  locale: Locale | null;
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  availableLanguages: typeof LANGUAGES;
  isRTL: boolean;
  showLanguageDialog: boolean;
  setShowLanguageDialog: (show: boolean) => void;
  isFirstLaunch: boolean;
}

const I18nContext = createContext<I18nContextType>({
  locale: null,
  language: 'ru',
  setLanguage: async () => {},
  t: (key: string) => key,
  availableLanguages: LANGUAGES,
  isRTL: false,
  showLanguageDialog: false,
  setShowLanguageDialog: () => {},
  isFirstLaunch: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale | null>(null);
  const [language, setLang] = useState<LanguageCode>('ru');
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [mounted, setMounted] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
      const chosen = localStorage.getItem(LANGUAGE_CHOSEN_KEY);
      const lang = saved && LANGUAGES.some(l => l.code === saved) ? saved : 'ru';
      
      const mod = await loadLocale(lang);
      setLocale(mod);
      setLang(lang);
      
      document.documentElement.lang = mod.code;
      document.documentElement.dir = mod.dir;

      if (!chosen) {
        setIsFirstLaunch(true);
        setShowLanguageDialog(true);
      }
    };
    init();
  }, []);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    const mod = await loadLocale(code);
    setLocale(mod);
    setLang(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, 'true');
    document.documentElement.lang = mod.code;
    document.documentElement.dir = mod.dir;
    setIsFirstLaunch(false);
    setShowLanguageDialog(false);
  }, []);

  const t = useCallback((key: string): string => {
    if (!locale) return key;
    return locale.messages[key] || key;
  }, [locale]);

  if (!mounted) {
    return (
      <div style={{ display: 'contents' }}>{children}</div>
    );
  }

  const currentLang = LANGUAGES.find(l => l.code === language);

  return (
    <I18nContext.Provider value={{
      locale,
      language,
      setLanguage,
      t,
      availableLanguages: LANGUAGES,
      isRTL: currentLang?.dir === 'rtl',
      showLanguageDialog,
      setShowLanguageDialog,
      isFirstLaunch,
    }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
