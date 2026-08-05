'use client';

import { useLanguage } from '@/contexts/language-context';

export const useTranslation = () => {
  const { translations } = useLanguage();

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return { t };
};
