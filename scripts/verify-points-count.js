const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка количества точек в разных файлах:\n');

// Проверяем основной файл данных
try {
  const mainData = require('../src/data/processed/points-with-multilingual-names.json');
console.log(`📁 points-with-multilingual-names.json: ${mainData.length} точек`);
} catch (error) {
  console.log('❌ points-with-multilingual-names.json: файл не найден или ошибка');
}

  // Проверяем points-with-multilingual-names.json
  try {
    const namesCategories = require('../src/data/processed/points-with-multilingual-names.json');
    console.log(`📁 points-with-multilingual-names.json: ${namesCategories.length} точек`);
  
  // Проверяем PBF точки (с русскими описаниями)
  const pbfPoints = namesCategories.filter(point => {
    return /[\u0400-\u04FF]/.test(point.description || '');
  });
  console.log(`🇷🇺 PBF точек с русскими описаниями: ${pbfPoints.length}`);
  
} catch (error) {
  console.log('❌ points-with-multilingual-names.json: файл не найден или ошибка');
}

// Проверяем статистику
try {
  const stats = require('../src/data/processed/names-stats.json');
  console.log(`📊 names-stats.json: ${stats.totalPoints} точек`);
  console.log(`📅 Дата извлечения: ${stats.extractedAt}`);
  console.log(`📋 Источник данных: ${stats.dataSource}`);
} catch (error) {
  console.log('❌ names-stats.json: файл не найден или ошибка');
}

console.log('\n✅ Проверка завершена!'); 