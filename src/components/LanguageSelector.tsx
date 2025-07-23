import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SupportedLanguage, languageNames } from '../locales';
import i18nService from '../services/I18nService';
import { languageSelectorStyles } from '../styles';

interface LanguageSelectorProps {
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export default function LanguageSelector({ onLanguageChange }: LanguageSelectorProps) {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setCurrentLanguage(i18nService.getCurrentLanguage());
    
    const handleLanguageChange = (language: SupportedLanguage) => {
      setCurrentLanguage(language);
      onLanguageChange?.(language);
    };

    i18nService.addLanguageChangeListener(handleLanguageChange);
    
    return () => {
      i18nService.removeLanguageChangeListener(handleLanguageChange);
    };
  }, [onLanguageChange]);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    i18nService.setLanguage(language);
    setModalVisible(false);
  };

  const languages: SupportedLanguage[] = ['he', 'ru', 'en'];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectorText}>
          {languageNames[currentLanguage]}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {i18nService.t('selectLanguage')}
            </Text>
            
            <ScrollView style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language}
                  style={[
                    styles.languageOption,
                    currentLanguage === language && styles.selectedLanguage,
                  ]}
                  onPress={() => handleLanguageSelect(language)}
                >
                  <Text
                    style={[
                      styles.languageText,
                      currentLanguage === language && styles.selectedLanguageText,
                    ]}
                  >
                    {languageNames[language]}
                  </Text>
                  {currentLanguage === language && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>
                {i18nService.t('close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = languageSelectorStyles; 