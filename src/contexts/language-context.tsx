'use client';

import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { languages } from '@/locales/languages';
import { urlParamsToState } from '@/lib/url-state-manager';

type Translation = { [key: string]: string };
type LanguageContextType = {
  language: string;
  setLanguage: (language: string) => void;
  translations: Translation;
  isLanguageLoading: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState('en');
  const [translations, setTranslations] = useState<Translation>({});
  const [isLanguageLoading, setIsLanguageLoading] = useState(true);
  const searchParams = useSearchParams();

  // Initialize language from URL or browser settings
  useEffect(() => {
    let initialLang = 'en';
    try {
        const parsedState = urlParamsToState(searchParams);
        if (parsedState.language) {
            initialLang = parsedState.language;
        } else {
            const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
            if (Object.keys(languages).includes(browserLang)) {
                initialLang = browserLang;
            }
        }
    } catch {
        // Fallback to browser language on parsing error
        const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';
        if (Object.keys(languages).includes(browserLang)) {
            initialLang = browserLang;
        }
    }
    
    setLanguageState(initialLang);
    setIsLanguageLoading(false);
  }, [searchParams]);
  
  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    setIsLanguageLoading(false);
  }, []);

  useEffect(() => {
    if (isLanguageLoading) return;
    const fetchTranslations = async () => {
      try {
        const module = await import(`@/locales/${language}.json`);
        setTranslations(module.default);
      } catch (error) {
        console.error(`Could not load translations for ${language}, falling back to English.`);
        try {
            const module = await import(`@/locales/en.json`);
            setTranslations(module.default);
        } catch (e) {
            console.error(`Could not load English translations.`);
        }
      }
    };
    fetchTranslations();
  }, [language, isLanguageLoading]);

  const contextValue = { language, setLanguage, translations, isLanguageLoading };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
