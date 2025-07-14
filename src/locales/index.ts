import he from './he';
import ru from './ru';
import en from './en';

export const translations = {
  he,
  ru,
  en,
};

export type TranslationKey = keyof typeof he;
export type SupportedLanguage = 'he' | 'ru' | 'en';

export const supportedLanguages: SupportedLanguage[] = ['he', 'ru', 'en'];

export const languageNames = {
  he: 'עברית',
  ru: 'Русский',
  en: 'English',
};

export const isRTL = (language: SupportedLanguage): boolean => {
  return language === 'he';
}; 