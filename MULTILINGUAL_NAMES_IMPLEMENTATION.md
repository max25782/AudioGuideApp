# Реализация многоязычных названий точек интереса

## Обзор

Приложение теперь поддерживает многоязычные названия точек интереса в дополнение к многоязычным описаниям. Это позволяет пользователям видеть названия мест на своем языке.

## Статистика

- **Всего точек**: 5,684
- **Многоязычные названия**: 20 точек
- **Названия только на иврите**: 5,664 точки

## Структура данных

### Многоязычные названия
```json
{
  "id": "point_1",
  "name": {
    "he": "שער האשפות",
    "en": "Dung Gate", 
    "ru": "Шаар а-Ашпот"
  },
  "category": "tourism",
  "coordinates": {...},
  "description": {...}
}
```

### Названия только на иврите (legacy)
```json
{
  "id": "point_19",
  "name": "עין מלקוח",
  "category": "nature",
  "coordinates": {...},
  "description": {...}
}
```

## Примеры многоязычных названий

1. **שער האשפות** → EN: "Dung Gate", RU: "Шаар а-Ашпот"
2. **הר חרמון** → EN: "Mount Hermon", RU: "Гора Хермон"
3. **ירדנית** → EN: "Yardenit", RU: "Ярденит"
4. **העיר העתיקה קיסריה** → EN: "Ancient Caesarea", RU: "Древняя Кейсария"
5. **סינמה סיטי גלילות** → EN: "Cinema City Glilot", RU: "Синема Сити Глилот"

## Техническая реализация

### I18nService.getPointName()
```typescript
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
```

### Система fallback

1. **Текущий язык**: Показывает название на выбранном языке
2. **Иврит**: Если на текущем языке нет названия, показывает на иврите (оригинальный язык)
3. **Английский**: Если на иврите нет, показывает на английском
4. **Русский**: Если на английском нет, показывает на русском
5. **Fallback**: Если ничего нет, показывает "Название недоступно"

## Обновленные компоненты

### HomeScreen.tsx
```typescript
const formatPointInfo = (point: PointOfInterest) => {
  return {
    title: i18nService.getPointName(point.name), // Используем getPointName
    subtitle: getCategoryName(point.category),
    coords: `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
  };
};
```

### PointDetailScreen.tsx
```typescript
<Text style={[styles.title, i18nService.isRTL() && styles.rtlText]}>
  {i18nService.getPointName(point.name)}
</Text>
```

### MapView.tsx
```typescript
<Marker
  title={i18nService.getPointName(point.name)}
  description={i18nService.getPointDescription(point.description).substring(0, 100)}
  // ...
/>
```

## Поиск с поддержкой многоязычности

```typescript
searchPoints(query: string): PointOfInterest[] {
  const searchTerm = query.toLowerCase();
  return this.allPoints.filter(point => {
    // Поиск в названии
    if (typeof point.name === 'string') {
      return point.name.toLowerCase().includes(searchTerm);
    } else if (typeof point.name === 'object') {
      return (point.name.he && point.name.he.toLowerCase().includes(searchTerm)) ||
             (point.name.en && point.name.en.toLowerCase().includes(searchTerm)) ||
             (point.name.ru && point.name.ru.toLowerCase().includes(searchTerm));
    }
    
    // Поиск в категории
    return point.category.toLowerCase().includes(searchTerm);
  }).slice(0, 20);
}
```

## Использование

1. **Автоматическое переключение**: При смене языка интерфейса названия точек автоматически переключаются
2. **Совместимость**: Точки с названиями только на иврите продолжают работать
3. **Безопасность**: Все функции имеют защиту от ошибок и fallback варианты

## Расширение в будущем

Для добавления новых многоязычных названий:

1. Обновите `scripts/extract-multilingual-names.js`
2. Добавьте переводы в объект `nameTranslations`
3. Запустите скрипт: `node scripts/extract-multilingual-names.js`
4. Новые данные будут сохранены в `points-with-multilingual-names.json`

## Файлы

- **Данные**: `src/data/processed/points-with-multilingual-names.json`
- **Скрипт**: `scripts/extract-multilingual-names.js`
- **Сервис**: `src/services/I18nService.ts`
- **Загрузка**: `src/services/PreprocessedDataService.ts` 