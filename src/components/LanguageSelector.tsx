import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { SupportedLanguage, languageNames } from '../locales';
import i18nService from '../services/I18nService';

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

const styles = StyleSheet.create({
  container: {
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  arrow: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  languageList: {
    maxHeight: 200,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedLanguage: {
    backgroundColor: '#e3f2fd',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
  },
  selectedLanguageText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  checkmark: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 