#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Путь к файлу данных
const DATA_FILE = path.join(__dirname, '../src/data/processed/points-with-multilingual-names.json');

try {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  
  // Статистика
  const totalPoints = data.length;
  const translatedPoints = data.filter(p => typeof p.name === 'object');
  const stringPoints = data.filter(p => typeof p.name === 'string');
  
  console.log('📊 Статистика переводов:');
  console.log(`   Всего точек: ${totalPoints}`);
  console.log(`   С переводами: ${translatedPoints.length}`);
  console.log(`   Только строковые: ${stringPoints.length}`);
  console.log('');
  
  // Проверяем 10 случайных точек
  const randomPoints = data.slice(50, 60);
  console.log('🔍 Проверка переводов 10 случайных точек:');
  console.log('');
  
  randomPoints.forEach((point, i) => {
    if (typeof point.name === 'object') {
      console.log(`${i+1}. ${point.id}:`);
      console.log(`   HE: ${point.name.he}`);
      console.log(`   RU: ${point.name.ru}`);
      console.log(`   EN: ${point.name.en}`);
      console.log('');
    } else {
      console.log(`${i+1}. ${point.id}: ${point.name} (не переведено)`);
      console.log('');
    }
  });
  
  // Проверяем точки с хорошими переводами
  const goodTranslations = translatedPoints.filter(p => 
    p.name.ru !== p.name.he && 
    p.name.en !== p.name.he &&
    p.name.ru.length > 2 && 
    p.name.en.length > 2
  );
  
  console.log(`✅ Точки с хорошими переводами: ${goodTranslations.length}`);
  console.log(`⚠️  Точки требующие улучшения: ${translatedPoints.length - goodTranslations.length}`);
  console.log('');
  
  // Примеры хороших переводов
  console.log('🌟 Примеры хороших переводов:');
  goodTranslations.slice(0, 5).forEach((point, i) => {
    console.log(`${i+1}. ${point.id}:`);
    console.log(`   HE: ${point.name.he}`);
    console.log(`   RU: ${point.name.ru}`);
    console.log(`   EN: ${point.name.en}`);
    console.log('');
  });
  
} catch (error) {
  console.error('❌ Ошибка при проверке переводов:', error);
} 