import { I18n } from 'i18n-js';
import { translations, SupportedLanguage, TranslationKey } from '../locales';

// Type for multilingual description
export interface MultilingualDescription {
  ru: string;
  he: string;
  en: string;
}

// Type for multilingual name
export interface MultilingualName {
  ru?: string;
  he?: string;
  en?: string;
}

class I18nService {
  private i18n: I18n;
  private currentLanguage: SupportedLanguage = 'en';
  private listeners: Array<(language: SupportedLanguage) => void> = [];

  constructor() {
    this.i18n = new I18n(translations);
    this.i18n.enableFallback = true;
    this.i18n.defaultLocale = 'en';
    this.initialize();
  }

  private initialize(): void {
    // Start with English as default
    this.setLanguage('en');
  }

  private isSupportedLanguage(language: string): boolean {
    return ['he', 'ru', 'en'].includes(language);
  }

  public setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    this.i18n.locale = language;
    
    // Notify listeners
    this.listeners.forEach(listener => listener(language));
  }

  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public t(key: TranslationKey, params?: Record<string, any>): string {
    try {
      const translation = this.i18n.t(key, params);
      // Ensure we always return a string
      if (typeof translation === 'string') {
        return translation;
      }
      // If translation is missing or not a string, return the key
      console.warn(`Translation for "${key}" is not a string:`, translation);
      return String(key);
    } catch (error) {
      console.error(`Translation error for key "${key}":`, error);
      return String(key);
    }
  }

  public getPointDescription(description: string | MultilingualDescription): string {
    // If it's a string, return as is (legacy format)
    if (typeof description === 'string') {
      return description;
    }
    
    // If it's a multilingual object, return the description in current language
    if (description && typeof description === 'object') {
      const currentDesc = description[this.currentLanguage];
      if (currentDesc && typeof currentDesc === 'string') {
        return currentDesc;
      }
      
      // Fallback to English if current language not available
      if (description.en && typeof description.en === 'string') {
        return description.en;
      }
      
      // Fallback to any available language
      if (description.ru && typeof description.ru === 'string') {
        return description.ru;
      }
      
      if (description.he && typeof description.he === 'string') {
        return description.he;
      }
    }
    
    // Final fallback
    return this.t('descriptionNotAvailable');
  }

  public getPointName(name: string | MultilingualName): string {
    // Handle undefined/null cases
    if (!name) {
      return this.t('nameNotAvailable');
    }
    
    // If it's a string, return as is (legacy format)
    if (typeof name === 'string') {
      return name;
    }
    
    // If it's a multilingual object, return the name in current language
    if (name && typeof name === 'object') {
      const currentName = name[this.currentLanguage];
      if (currentName && typeof currentName === 'string') {
        return currentName;
      }
      
      // Fallback to Hebrew (original language)
      if (name.he && typeof name.he === 'string') {
        return name.he;
      }
      
      // Fallback to English
      if (name.en && typeof name.en === 'string') {
        return name.en;
      }
      
      // Fallback to Russian
      if (name.ru && typeof name.ru === 'string') {
        return name.ru;
      }
    }
    
    // Final fallback
    return this.t('nameNotAvailable');
  }

  public isRTL(): boolean {
    return this.currentLanguage === 'he';
  }

  public addLanguageChangeListener(listener: (language: SupportedLanguage) => void): void {
    this.listeners.push(listener);
  }

  public removeLanguageChangeListener(listener: (language: SupportedLanguage) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
}

export const i18nService = new I18nService();
export default i18nService; 