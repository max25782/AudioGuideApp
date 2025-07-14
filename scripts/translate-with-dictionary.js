#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Пути к файлам
const DATA_FILE = path.join(__dirname, '../src/data/processed/points-with-multilingual-names.json');
const BACKUP_FILE = path.join(__dirname, '../src/data/processed/points-with-multilingual-names.backup.json');

// Словарь переводов для наиболее распространенных слов в географических названиях
const TRANSLATION_DICTIONARY = {
  // Горы и холмы
  'הר': { en: 'Mount', ru: 'Гора' },
  'הרי': { en: 'Mountains', ru: 'Горы' },
  'גבעה': { en: 'Hill', ru: 'Холм' },
  'גבעת': { en: 'Hill of', ru: 'Холм' },
  'תל': { en: 'Tel', ru: 'Тель' },
  'רכס': { en: 'Ridge', ru: 'Хребет' },
  'פסגה': { en: 'Peak', ru: 'Пик' },
  'כתף': { en: 'Shoulder', ru: 'Кетеф' },
  'שן': { en: 'Tooth', ru: 'Шен' },
  
  // Водные объекты
  'עין': { en: 'Spring', ru: 'Источник' },
  'עינות': { en: 'Springs', ru: 'Источники' },
  'נחל': { en: 'Stream', ru: 'Ручей' },
  'ים': { en: 'Sea', ru: 'Море' },
  'כנרת': { en: 'Kinneret', ru: 'Кинерет' },
  'ירדן': { en: 'Jordan', ru: 'Иордан' },
  'מבוע': { en: 'Spring', ru: 'Родник' },
  'מעיין': { en: 'Spring', ru: 'Родник' },
  
  // Города и поселения
  'קריה': { en: 'City', ru: 'Город' },
  'עיר': { en: 'City', ru: 'Город' },
  'כפר': { en: 'Village', ru: 'Деревня' },
  'מושב': { en: 'Moshav', ru: 'Мошав' },
  'קיבוץ': { en: 'Kibbutz', ru: 'Кибуц' },
  'מחנה': { en: 'Camp', ru: 'Лагерь' },
  'רמה': { en: 'Heights', ru: 'Высоты' },
  'רמת': { en: 'Heights of', ru: 'Высоты' },
  'יישוב': { en: 'Settlement', ru: 'Поселение' },
  
  // Направления
  'צפון': { en: 'North', ru: 'Север' },
  'דרום': { en: 'South', ru: 'Юг' },
  'מזרח': { en: 'East', ru: 'Восток' },
  'מערב': { en: 'West', ru: 'Запад' },
  'צפונית': { en: 'Northern', ru: 'Северная' },
  'דרומית': { en: 'Southern', ru: 'Южная' },
  'מזרחית': { en: 'Eastern', ru: 'Восточная' },
  'מערבית': { en: 'Western', ru: 'Западная' },
  
  // Религиозные и исторические места
  'שער': { en: 'Gate', ru: 'Ворота' },
  'שערים': { en: 'Gates', ru: 'Ворота' },
  'מקדש': { en: 'Temple', ru: 'Храм' },
  'בית': { en: 'House', ru: 'Дом' },
  'קבר': { en: 'Tomb', ru: 'Могила' },
  'מערה': { en: 'Cave', ru: 'Пещера' },
  'חורבה': { en: 'Ruin', ru: 'Руины' },
  'חורבות': { en: 'Ruins', ru: 'Руины' },
  'מצודה': { en: 'Fortress', ru: 'Крепость' },
  'מבצר': { en: 'Fort', ru: 'Форт' },
  
  // Природные объекты
  'יער': { en: 'Forest', ru: 'Лес' },
  'שדה': { en: 'Field', ru: 'Поле' },
  'עמק': { en: 'Valley', ru: 'Долина' },
  'בקעה': { en: 'Valley', ru: 'Долина' },
  'מדבר': { en: 'Desert', ru: 'Пустыня' },
  'סלע': { en: 'Rock', ru: 'Скала' },
  'אבן': { en: 'Stone', ru: 'Камень' },
  'חול': { en: 'Sand', ru: 'Песок' },
  'שמורה': { en: 'Reserve', ru: 'Заповедник' },
  'פארק': { en: 'Park', ru: 'Парк' },
  
  // Цвета
  'לבן': { en: 'White', ru: 'Белый' },
  'שחור': { en: 'Black', ru: 'Черный' },
  'אדום': { en: 'Red', ru: 'Красный' },
  'כחול': { en: 'Blue', ru: 'Синий' },
  'ירוק': { en: 'Green', ru: 'Зеленый' },
  'צהוב': { en: 'Yellow', ru: 'Желтый' },
  
  // Распространенные собственные имена
  'ירושלים': { en: 'Jerusalem', ru: 'Иерусалим' },
  'תל אביב': { en: 'Tel Aviv', ru: 'Тель-Авив' },
  'חיפה': { en: 'Haifa', ru: 'Хайфа' },
  'באר שבע': { en: 'Beer Sheva', ru: 'Беэр-Шева' },
  'נצרת': { en: 'Nazareth', ru: 'Назарет' },
  'צפת': { en: 'Safed', ru: 'Цфат' },
  'טבריה': { en: 'Tiberias', ru: 'Тверия' },
  'אילת': { en: 'Eilat', ru: 'Эйлат' },
  'עכו': { en: 'Acre', ru: 'Акко' },
  'יפו': { en: 'Jaffa', ru: 'Яффа' },
  
  // Библейские имена
  'אברהם': { en: 'Abraham', ru: 'Авраам' },
  'יצחק': { en: 'Isaac', ru: 'Ицхак' },
  'יעקב': { en: 'Jacob', ru: 'Яков' },
  'משה': { en: 'Moses', ru: 'Моисей' },
  'דוד': { en: 'David', ru: 'Давид' },
  'שלמה': { en: 'Solomon', ru: 'Соломон' },
  'מרים': { en: 'Miriam', ru: 'Мириам' },
  'רחל': { en: 'Rachel', ru: 'Рахель' },
  'לאה': { en: 'Leah', ru: 'Лея' },
  
  // Другие распространенные слова
  'חדש': { en: 'New', ru: 'Новый' },
  'ישן': { en: 'Old', ru: 'Старый' },
  'גדול': { en: 'Big', ru: 'Большой' },
  'קטן': { en: 'Small', ru: 'Маленький' },
  'ראשון': { en: 'First', ru: 'Первый' },
  'שני': { en: 'Second', ru: 'Второй' },
  'אחד': { en: 'One', ru: 'Один' },
  'שלושה': { en: 'Three', ru: 'Три' },
  'ארבעה': { en: 'Four', ru: 'Четыре' },
  'חמישה': { en: 'Five', ru: 'Пять' },
  'עליון': { en: 'Upper', ru: 'Верхний' },
  'תחתון': { en: 'Lower', ru: 'Нижний' },
  
  // Современные объекты
  'קניון': { en: 'Mall', ru: 'Торговый центр' },
  'בית חולים': { en: 'Hospital', ru: 'Больница' },
  'בית ספר': { en: 'School', ru: 'Школа' },
  'תחנה': { en: 'Station', ru: 'Станция' },
  'נמל': { en: 'Port', ru: 'Порт' },
  'שדה תעופה': { en: 'Airport', ru: 'Аэропорт' },
  'אוניברסיטה': { en: 'University', ru: 'Университет' },
  'מכללה': { en: 'College', ru: 'Колледж' },
  
  // Специальные места
  'מכתש': { en: 'Crater', ru: 'Кратер' },
  'רמון': { en: 'Ramon', ru: 'Рамон' },
  'נגב': { en: 'Negev', ru: 'Негев' },
  'גליל': { en: 'Galilee', ru: 'Галилея' },
  'גולן': { en: 'Golan', ru: 'Голан' },
  'כרמל': { en: 'Carmel', ru: 'Кармель' },
  'חרמון': { en: 'Hermon', ru: 'Хермон' },
  'ירדנית': { en: 'Yardenit', ru: 'Ярденит' },
  'קיסריה': { en: 'Caesarea', ru: 'Кейсария' },
  
  // Артикли и предлоги
  'ה': { en: 'The', ru: '' }, // Определенный артикль
  'של': { en: 'Of', ru: '' },
  'אל': { en: 'To', ru: 'К' },
  'מן': { en: 'From', ru: 'Из' },
  'על': { en: 'On', ru: 'На' },
  'תחת': { en: 'Under', ru: 'Под' },
  'ליד': { en: 'Near', ru: 'Рядом' },
  'בין': { en: 'Between', ru: 'Между' }
};

/**
 * Создает резервную копию файла данных
 */
function createBackup() {
  try {
    const originalData = fs.readFileSync(DATA_FILE, 'utf8');
    fs.writeFileSync(BACKUP_FILE, originalData);
    console.log('✅ Резервная копия создана:', BACKUP_FILE);
  } catch (error) {
    console.error('❌ Ошибка создания резервной копии:', error);
    throw error;
  }
}

/**
 * Переводит текст с иврита используя словарь
 */
function translateWithDictionary(hebrewText, targetLang) {
  if (!hebrewText || typeof hebrewText !== 'string') {
    return hebrewText;
  }

  // Разбиваем текст на слова
  const words = hebrewText.split(/\s+/);
  const translatedWords = [];

  for (const word of words) {
    // Убираем знаки препинания для поиска в словаре
    const cleanWord = word.replace(/[.,;:!?()[\]{}"""'']/g, '');
    
    // Ищем в словаре
    if (TRANSLATION_DICTIONARY[cleanWord]) {
      const translation = TRANSLATION_DICTIONARY[cleanWord][targetLang];
      if (translation) {
        translatedWords.push(translation);
      } else {
        translatedWords.push(word); // Оставляем оригинал если нет перевода
      }
    } else {
      // Пытаемся найти части слова
      let found = false;
      for (const dictWord of Object.keys(TRANSLATION_DICTIONARY)) {
        if (cleanWord.includes(dictWord)) {
          const translation = TRANSLATION_DICTIONARY[dictWord][targetLang];
          if (translation) {
            // Заменяем найденную часть на перевод
            const translatedWord = cleanWord.replace(dictWord, translation);
            translatedWords.push(translatedWord);
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        translatedWords.push(word); // Оставляем оригинал
      }
    }
  }

  return translatedWords.join(' ').trim();
}

/**
 * Транслитерирует текст с иврита на латиницу
 */
function transliterate(hebrewText) {
  const transliterationMap = {
    'א': 'A', 'ב': 'B', 'ג': 'G', 'ד': 'D', 'ה': 'H', 'ו': 'V', 'ז': 'Z',
    'ח': 'Ch', 'ט': 'T', 'י': 'Y', 'כ': 'K', 'ל': 'L', 'מ': 'M', 'נ': 'N',
    'ס': 'S', 'ע': 'A', 'פ': 'P', 'צ': 'Tz', 'ק': 'Q', 'ר': 'R', 'ש': 'Sh',
    'ת': 'T', 'ך': 'K', 'ם': 'M', 'ן': 'N', 'ף': 'P', 'ץ': 'Tz'
  };

  let result = '';
  for (const char of hebrewText) {
    if (transliterationMap[char]) {
      result += transliterationMap[char];
    } else if (char.match(/[a-zA-Z0-9\s.,;:!?()[\]{}"""'']/)) {
      result += char; // Оставляем латинские символы как есть
    } else {
      result += char; // Оставляем другие символы как есть
    }
  }
  
  return result;
}

/**
 * Обрабатывает переводы для одной точки
 */
function translatePoint(point, index, total) {
  // Если уже есть многоязычное имя, пропускаем
  if (typeof point.name === 'object') {
    console.log(`⏭️  ${index + 1}/${total} - ${point.id}: уже переведено`);
    return point;
  }

  const originalName = point.name;
  console.log(`🔄 ${index + 1}/${total} - ${point.id}: переводим "${originalName}"`);

  try {
    // Переводим на русский и английский
    const ruName = translateWithDictionary(originalName, 'ru');
    const enName = translateWithDictionary(originalName, 'en');
    
    // Если перевод не получился, используем транслитерацию
    const finalRuName = (ruName === originalName) ? transliterate(originalName) : ruName;
    const finalEnName = (enName === originalName) ? transliterate(originalName) : enName;

    // Создаем новый объект с переводами
    const translatedPoint = {
      ...point,
      name: {
        he: originalName, // Оригинальное имя на иврите
        ru: finalRuName,
        en: finalEnName
      }
    };

    console.log(`✅ ${index + 1}/${total} - ${point.id}: переведено`);
    console.log(`   HE: ${originalName}`);
    console.log(`   RU: ${finalRuName}`);
    console.log(`   EN: ${finalEnName}`);

    return translatedPoint;
  } catch (error) {
    console.error(`❌ ${index + 1}/${total} - ${point.id}: ошибка перевода`, error);
    return point; // Возвращаем оригинальную точку в случае ошибки
  }
}

/**
 * Главная функция для перевода всех точек
 */
function translateAllPoints() {
  console.log('🚀 Начинаю перевод всех точек с помощью словаря...');

  try {
    // Создаем резервную копию
    createBackup();

    // Загружаем данные
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`📊 Загружено ${data.length} точек`);

    // Фильтруем точки без переводов
    const pointsToTranslate = data.filter(point => typeof point.name === 'string');
    const pointsAlreadyTranslated = data.filter(point => typeof point.name === 'object');

    console.log(`📈 Статистика:`);
    console.log(`   Уже переведено: ${pointsAlreadyTranslated.length}`);
    console.log(`   Требует перевода: ${pointsToTranslate.length}`);

    if (pointsToTranslate.length === 0) {
      console.log('✅ Все точки уже переведены!');
      return;
    }

    // Переводим все точки
    const translatedPoints = pointsToTranslate.map((point, index) => 
      translatePoint(point, index, pointsToTranslate.length)
    );

    // Объединяем переведенные точки с уже переведенными
    const allTranslatedPoints = [...pointsAlreadyTranslated, ...translatedPoints];

    // Сохраняем результат
    fs.writeFileSync(DATA_FILE, JSON.stringify(allTranslatedPoints, null, 2));

    console.log('\n✅ Перевод завершен!');
    console.log(`📊 Итоговая статистика:`);
    console.log(`   Всего точек: ${allTranslatedPoints.length}`);
    console.log(`   С переводами: ${allTranslatedPoints.filter(p => typeof p.name === 'object').length}`);
    console.log(`   Без переводов: ${allTranslatedPoints.filter(p => typeof p.name === 'string').length}`);

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    
    // Восстанавливаем из резервной копии
    if (fs.existsSync(BACKUP_FILE)) {
      console.log('🔄 Восстанавливаю из резервной копии...');
      const backupData = fs.readFileSync(BACKUP_FILE, 'utf8');
      fs.writeFileSync(DATA_FILE, backupData);
      console.log('✅ Данные восстановлены из резервной копии');
    }

    throw error;
  }
}

/**
 * Функция для тестирования перевода на небольшом количестве точек
 */
function testTranslation() {
  console.log('🧪 Тестирование перевода словарем на 5 точках...');

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const pointsToTest = data.filter(point => typeof point.name === 'string').slice(0, 5);

    console.log(`🔍 Тестируем перевод на ${pointsToTest.length} точках:`);
    
    for (let i = 0; i < pointsToTest.length; i++) {
      const point = pointsToTest[i];
      const translatedPoint = translatePoint(point, i, pointsToTest.length);
      
      if (typeof translatedPoint.name === 'object') {
        console.log(`✅ Тест ${i + 1}: успешно`);
      } else {
        console.log(`❌ Тест ${i + 1}: неудачно`);
      }
    }

    console.log('\n✅ Тестирование завершено!');
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Обработка аргументов командной строки
if (process.argv.includes('--test')) {
  testTranslation();
} else if (process.argv.includes('--help')) {
  console.log(`
📖 Использование:
  node translate-with-dictionary.js          - Перевести все точки
  node translate-with-dictionary.js --test   - Тестировать перевод на 5 точках
  node translate-with-dictionary.js --help   - Показать справку

📋 Описание:
  Скрипт переводит названия точек с иврита на русский и английский языки используя встроенный словарь.
  Для слов, не найденных в словаре, выполняется транслитерация.
  Создает резервную копию данных перед началом работы.
  
🔧 Возможности:
  - Словарь содержит ${Object.keys(TRANSLATION_DICTIONARY).length} наиболее распространенных слов
  - Поддержка составных слов и частичного совпадения
  - Транслитерация для неизвестных слов
  - Безопасность: создание резервной копии и восстановление при ошибках
  `);
} else {
  translateAllPoints();
} 