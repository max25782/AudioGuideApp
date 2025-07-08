const PreprocessedDataService = require('../src/services/PreprocessedDataService.ts').default;

// Создаем экземпляр сервиса
const service = new PreprocessedDataService();

// Получаем все точки
const allPoints = service.getAllPoints();
console.log(`📊 Всего точек в приложении: ${allPoints.length}`);

// Получаем статистику
const stats = service.getStatistics();
console.log('📈 Статистика:', stats);

// Проверяем категории
const categories = service.getCategories();
console.log('🏷️ Доступные категории:', categories);

// Подсчитываем точки по категориям
categories.forEach(category => {
  const categoryPoints = service.getPointsByCategory(category);
  console.log(`  ${category}: ${categoryPoints.length} точек`);
});

// Проверяем, есть ли точки с русскими описаниями (PBF points)
const pbfPoints = allPoints.filter(point => {
  return /[\u0400-\u04FF]/.test(point.description || '');
});

console.log(`\n🇷🇺 PBF точек с русскими описаниями: ${pbfPoints.length}`);

// Показываем несколько примеров PBF точек
if (pbfPoints.length > 0) {
  console.log('\nПримеры PBF точек:');
  pbfPoints.slice(0, 5).forEach((point, index) => {
    console.log(`${index + 1}. ${point.name} (${point.category})`);
  });
} 