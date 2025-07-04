const fs = require('fs');

// Читаем данные точек
const pointsData = require('../src/data/processed/points-with-audio.json');

/**
 * Генерирует текст аудиогида для точки интереса
 */
function generateAudioScript(point) {
  const categoryNames = {
    historical: 'историческое место',
    religious: 'религиозный объект',
    children: 'детское развлечение',
    nature: 'природная достопримечательность',
    culture: 'культурный объект',
    tourism: 'туристическое место',
    architecture: 'архитектурный памятник',
    amenity: 'удобство',
    leisure: 'место для досуга'
  };

  const categoryName = categoryNames[point.category] || point.category;

  return `Добро пожаловать в ${point.name}!

Это ${categoryName}, расположенный в Израиле.

${point.description}

Здесь вы можете узнать больше об истории этого места, его архитектуре и интересных фактах.

Спасибо за внимание!`;
}

/**
 * Создает файлы с текстами для аудиогидов
 */
function createAudioScripts() {
  console.log('🎤 Создание текстов для аудиогидов...\n');

  // Создаем папку для текстов
  const scriptsDir = './audio-scripts';
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir);
  }

  // Генерируем тексты для первых 10 точек
  const samplePoints = pointsData.slice(0, 10);
  
  samplePoints.forEach((point, index) => {
    const script = generateAudioScript(point);
    const filename = `${scriptsDir}/${point.id}_script.txt`;
    
    fs.writeFileSync(filename, script, 'utf8');
    
    console.log(`✅ ${point.id}: ${point.name}`);
    console.log(`   Файл: ${filename}`);
    console.log(`   Длительность: ~2-3 минуты\n`);
  });

  console.log(`📝 Создано ${samplePoints.length} текстов для аудиогидов`);
  console.log(`📁 Папка: ${scriptsDir}`);
  console.log('\n🎯 Следующие шаги:');
  console.log('1. Запишите аудио для каждого текста');
  console.log('2. Сохраните в формате MP3 (128-256 kbps)');
  console.log('3. Именуйте файлы: point_1.mp3, point_2.mp3, и т.д.');
  console.log('4. Поместите в папку assets/audio/');
}

/**
 * Создает шаблон для профессиональной записи
 */
function createProfessionalTemplate() {
  console.log('\n🎙️ Шаблон для профессиональной записи:\n');

  const template = `# Шаблон аудиогида

## Общие требования:
- Формат: MP3
- Битрейт: 128-256 kbps
- Частота: 44.1 kHz
- Каналы: Моно или Стерео
- Длительность: 1-3 минуты

## Структура каждого аудиогида:

### 1. Приветствие (5-10 сек)
"Добро пожаловать в [название места]!"

### 2. Название места (5 сек)
"Это [название на иврите] - [название на русском]"

### 3. Категория (5 сек)
"Это [категория] в Израиле"

### 4. Описание (30-60 сек)
[Описание места из данных]

### 5. Интересные факты (30-60 сек)
[Дополнительная информация]

### 6. Практическая информация (15-30 сек)
"Здесь вы можете [что можно делать]"

### 7. Прощание (5-10 сек)
"Спасибо за внимание! Наслаждайтесь посещением!"

## Рекомендации по записи:
- Говорите четко и медленно
- Делайте паузы между предложениями
- Используйте интонацию для выделения важного
- Записывайте в тихом помещении
- Используйте качественный микрофон
`;

  fs.writeFileSync('./audio-scripts/recording-template.md', template, 'utf8');
  console.log('✅ Создан шаблон: audio-scripts/recording-template.md');
}

/**
 * Создает список для TTS сервисов
 */
function createTTSScript() {
  console.log('\n🤖 Создание текста для TTS сервисов...\n');

  const ttsScripts = pointsData.slice(0, 5).map(point => {
    const shortDescription = point.description.length > 200 
      ? point.description.substring(0, 200) + '...'
      : point.description;

    return {
      id: point.id,
      name: point.name,
      text: `Добро пожаловать в ${point.name}. ${shortDescription}`,
      language: 'ru-RU',
      voice: 'female',
      duration: '~1-2 minutes'
    };
  });

  const ttsFile = './audio-scripts/tts-scripts.json';
  fs.writeFileSync(ttsFile, JSON.stringify(ttsScripts, null, 2), 'utf8');

  console.log('✅ Создан файл для TTS: audio-scripts/tts-scripts.json');
  console.log('\n🌐 Рекомендуемые TTS сервисы:');
  console.log('- Google Text-to-Speech');
  console.log('- Amazon Polly');
  console.log('- Microsoft Azure Speech');
  console.log('- ElevenLabs (высокое качество)');
}

// Запуск
createAudioScripts();
createProfessionalTemplate();
createTTSScript(); 