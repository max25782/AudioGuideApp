const fs = require('fs');
const path = require('path');

const audioDir = './assets/audio';
const audioServicePath = './src/services/AudioService.ts';

// Получаем список аудиофайлов
function getAudioFiles() {
  try {
    const files = fs.readdirSync(audioDir);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.m4a', '.aac'].includes(ext);
    });
  } catch (error) {
    console.error('Ошибка чтения папки аудио:', error);
    return [];
  }
}

// Создаем маппинг для AudioService
function generateAudioMapping(files) {
  const mapping = files.map(file => {
    const fileName = path.basename(file, path.extname(file));
    return `  '${file}': require('../../assets/audio/${file}'),`;
  }).join('\n');

  return `// Статический маппинг аудиофайлов
// Автоматически сгенерирован ${new Date().toLocaleString()}
const audioFiles: { [key: string]: any } = {
${mapping}
};`;
}

// Обновляем AudioService.ts
function updateAudioService(mapping) {
  try {
    let content = fs.readFileSync(audioServicePath, 'utf8');
    
    // Находим и заменяем блок с маппингом
    const startMarker = '// Статический маппинг аудиофайлов';
    const endMarker = '};';
    
    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker, startIndex) + endMarker.length;
    
    if (startIndex !== -1 && endIndex !== -1) {
      const beforeMapping = content.substring(0, startIndex);
      const afterMapping = content.substring(endIndex);
      
      content = beforeMapping + mapping + afterMapping;
      
      fs.writeFileSync(audioServicePath, content);
      console.log('✅ AudioService.ts обновлен');
    } else {
      console.error('❌ Не удалось найти блок маппинга в AudioService.ts');
    }
  } catch (error) {
    console.error('❌ Ошибка обновления AudioService.ts:', error);
  }
}

// Основная функция
function main() {
  console.log('🔍 Поиск аудиофайлов...');
  
  const audioFiles = getAudioFiles();
  
  if (audioFiles.length === 0) {
    console.log('📁 Аудиофайлы не найдены в папке assets/audio/');
    console.log('💡 Добавьте аудиофайлы и запустите скрипт снова');
    return;
  }
  
  console.log(`📋 Найдено ${audioFiles.length} аудиофайлов:`);
  audioFiles.forEach(file => console.log(`  - ${file}`));
  
  const mapping = generateAudioMapping(audioFiles);
  updateAudioService(mapping);
  
  console.log('\n🎉 Маппинг аудиофайлов обновлен!');
  console.log('📝 Теперь можно использовать аудио в приложении');
}

main(); 