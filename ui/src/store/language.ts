import { create } from 'zustand';

export type LangCode = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'bn' | 'gu' | 'kn';

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  { code: 'mr', label: 'Marathi', native: '\u092e\u0930\u093e\u0920\u0940' },
  { code: 'ta', label: 'Tamil', native: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd' },
  { code: 'te', label: 'Telugu', native: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41' },
  { code: 'bn', label: 'Bengali', native: '\u09ac\u09be\u0982\u09b2\u09be' },
  { code: 'gu', label: 'Gujarati', native: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0' },
  { code: 'kn', label: 'Kannada', native: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1' },
];

interface LanguageStore {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
}

const STORAGE_KEY = 'nirdosh_lang';

function getInitialLang(): LangCode {
  const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (saved && LANGUAGES.some(l => l.code === saved)) return saved;
  return 'en';
}

export const useLanguage = create<LanguageStore>((set) => ({
  lang: getInitialLang(),
  setLang: (lang: LangCode) => {
    set({ lang });
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  },
}));

document.documentElement.setAttribute('lang', getInitialLang());
