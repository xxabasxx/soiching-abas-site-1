import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import '../../public/i18n.js';

export type Language = 'fa' | 'en';
interface LanguageRuntime {
  getLanguage: () => Language;
  setLanguage: (language: Language) => void;
  t: (persian: string, english?: string) => string;
  href: (path: string) => string;
}
export const languageRuntime = (globalThis as typeof globalThis & { AbasI18n: LanguageRuntime }).AbasI18n;
const LanguageContext = createContext({ language: languageRuntime.getLanguage(), t: languageRuntime.t, setLanguage: languageRuntime.setLanguage, link: languageRuntime.href });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(languageRuntime.getLanguage());
  useEffect(() => {
    const update = () => setLanguage(languageRuntime.getLanguage());
    window.addEventListener('abas-language-change', update);
    return () => window.removeEventListener('abas-language-change', update);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
    document.title = language === 'en' ? 'ABAS SOFT | Power Supply Design Lab' : 'ABAS SOFT | آزمایشگاه طراحی منابع تغذیه';
  }, [language]);
  return <LanguageContext.Provider value={{ language, t: languageRuntime.t, setLanguage: languageRuntime.setLanguage, link: languageRuntime.href }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return <div className="language-switch" role="group" aria-label={language === 'en' ? 'Language' : 'زبان'} dir="ltr"><button type="button" lang="fa" aria-pressed={language === 'fa'} onClick={() => setLanguage('fa')}>فارسی</button><span aria-hidden="true">/</span><button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button></div>;
}