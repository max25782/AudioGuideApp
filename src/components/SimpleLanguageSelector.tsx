import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SupportedLanguage, languageNames } from '../locales';
import i18nService from '../services/I18nService';

export default function SimpleLanguageSelector() {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');

  useEffect(() => {
    setCurrentLanguage(i18nService.getCurrentLanguage());
  }, []);

  const handleLanguagePress = () => {
    // Cycle through languages: en -> ru -> he -> en
    const languages: SupportedLanguage[] = ['en', 'ru', 'he'];
    const currentIndex = languages.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % languages.length;
    const nextLanguage = languages[nextIndex];
    
    i18nService.setLanguage(nextLanguage);
    setCurrentLanguage(nextLanguage);
  };

  const getLanguageName = (lang: SupportedLanguage): string => {
    const names = {
      he: 'עברית',
      ru: 'Русский',
      en: 'English',
    };
    return names[lang] || 'English';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleLanguagePress}>
      <Text style={styles.text}>
        🌍 {getLanguageName(currentLanguage)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  text: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
}); 