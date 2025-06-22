import * as SQLite from 'expo-sqlite';
import { PointOfInterest, PointCategory } from '../types';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import pointsData from '../data/export.json';
import { geoJsonParser, GeoJsonData } from './GeoJsonParser';
import { pointsOfInterest as temporaryPoints } from '../data/points';

/**
 * --- Database Service (Module Pattern) ---
 * 
 * Этот модуль управляет всеми операциями с базой данных SQLite.
 * Он использует паттерн "ленивой асинхронной инициализации" на уровне модуля,
 * чтобы гарантировать, что база данных инициализируется только один раз,
 * и все операции автоматически ожидают ее готовности, предотвращая гонки потоков и блокировки.
 */

// Единственный промис инициализации, который гарантирует однократный запуск.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Получает промис базы данных, инициализируя его при первом вызове.
 */
function getDbPromise(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}

/**
 * Асинхронно инициализирует базу данных. Выполняется только один раз.
 */
async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    console.log('[DB] Запуск инициализации базы данных...');
    
    // Безопасно удаляем существующие базы данных (если они есть)
    try {
      await SQLite.deleteDatabaseAsync('audioguide.db');
      console.log('[DB] Старая база данных audioguide.db удалена');
    } catch (error) {
      console.log('[DB] База данных audioguide.db не найдена (это нормально при первом запуске)');
    }
    
    try {
      await SQLite.deleteDatabaseAsync('audioguide_fallback.db');
      console.log('[DB] Старая база данных audioguide_fallback.db удалена');
    } catch (error) {
      console.log('[DB] База данных audioguide_fallback.db не найдена (это нормально при первом запуске)');
    }
    
    // Создаем новую базу данных
    const db = await SQLite.openDatabaseAsync('audioguide.db', {
      enableChangeListener: false,
      useNewConnection: true,
    });
    
    await createTables(db);
    await loadAllDataWithBatches(db);
    console.log('[DB] База данных успешно инициализирована.');
    return db;
  } catch (error) {
    console.error('[DB] КРИТИЧЕСКАЯ ОШИБКА инициализации базы данных:', error);
    
    // Попробуем создать базу данных только с временными данными
    try {
      console.log('[DB] Попытка создания резервной базы с минимальными данными...');
      
      // Безопасно удаляем резервную базу (если она есть)
      try {
        await SQLite.deleteDatabaseAsync('audioguide_fallback.db');
      } catch (deleteError) {
        // Игнорируем ошибку, если файла не существует
      }
      
      const db = await SQLite.openDatabaseAsync('audioguide_fallback.db', {
        enableChangeListener: false,
        useNewConnection: true,
      });
      await createTables(db);
      await insertTemporaryDataDirect(db);
      console.log('[DB] Резервная база данных создана успешно.');
      return db;
    } catch (fallbackError) {
      console.error('[DB] Ошибка создания резервной базы данных:', fallbackError);
      
      // В крайнем случае создаем базу в памяти
      try {
        console.log('[DB] Создаем базу данных в памяти...');
        const memoryDb = await SQLite.openDatabaseAsync(':memory:');
        await createTables(memoryDb);
        await insertTemporaryDataDirect(memoryDb);
        console.log('[DB] База данных в памяти создана успешно.');
        return memoryDb;
      } catch (memoryError) {
        console.error('[DB] Критическая ошибка: не удалось создать даже базу в памяти:', memoryError);
        throw new Error('Полный сбой инициализации базы данных');
      }
    }
  }
}

/**
 * Создает таблицы в базе данных, если они не существуют.
 */
async function createTables(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS points_of_interest (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        category TEXT NOT NULL,
        audioFilePath TEXT NOT NULL
      );
    `;
    await db.execAsync(createTableQuery);
    
    // Создаем индексы для улучшения производительности
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_category ON points_of_interest(category);');
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_location ON points_of_interest(latitude, longitude);');
    
    console.log('[DB] Таблицы и индексы созданы успешно.');
  } catch (error) {
    console.error('[DB] Ошибка создания таблиц:', error);
    throw error;
  }
}

/**
 * Загружает все данные из GeoJSON батчами для избежания блокировок.
 */
async function loadAllDataWithBatches(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    console.log('[DB] Загрузка данных из GeoJSON...');
    
    // Динамически импортируем большие данные
    const { geoJsonParser } = await import('./GeoJsonParser');
    const pointsDataModule = await import('../data/export.json');
    
    const parsedPoints = geoJsonParser.parse(pointsDataModule.default as GeoJsonData);
    
    if (parsedPoints.length === 0) {
      console.warn('[DB] Данные GeoJSON пусты. Загружаем временные данные.');
      await insertTemporaryData(db);
      return;
    }

    console.log(`[DB] Найдено ${parsedPoints.length} точек. Начинаем пакетную загрузку...`);
    
    // Очищаем существующие данные
    await db.execAsync('DELETE FROM points_of_interest;');
    await db.execAsync(`DELETE FROM sqlite_sequence WHERE name='points_of_interest';`);
    
    // Загружаем данные батчами по 500 записей
    const batchSize = 500;
    const totalBatches = Math.ceil(parsedPoints.length / batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, parsedPoints.length);
      const batch = parsedPoints.slice(start, end);
      
      console.log(`[DB] Загружаем батч ${i + 1}/${totalBatches} (${batch.length} записей)...`);
      
      await db.withTransactionAsync(async () => {
        const statement = await db.prepareAsync(
          'INSERT INTO points_of_interest (title, description, latitude, longitude, category, audioFilePath) VALUES (?, ?, ?, ?, ?, ?)'
        );
        try {
          for (const point of batch) {
            await statement.executeAsync([
              point.title, 
              point.description, 
              point.latitude,
              point.longitude, 
              point.category, 
              point.audioFilePath
            ]);
          }
        } finally {
          await statement.finalizeAsync();
        }
      });
      
      // Небольшая пауза между батчами для предотвращения блокировок
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log(`[DB] ✅ Успешно загружено ${parsedPoints.length} точек в ${totalBatches} батчах.`);
    
  } catch (error) {
    console.error('[DB] Ошибка загрузки данных GeoJSON:', error);
    console.log('[DB] Переключаемся на временные данные...');
    await insertTemporaryData(db);
  }
}

/**
 * Вставляет временные данные (если GeoJSON пуст или недоступен).
 */
async function insertTemporaryData(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(
      'INSERT INTO points_of_interest (title, description, latitude, longitude, category, audioFilePath) VALUES (?, ?, ?, ?, ?, ?)'
    );
    try {
      for (const point of temporaryPoints) {
        await statement.executeAsync([
          point.name, point.description, point.latitude,
          point.longitude, point.category, point.audioFile
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

/**
 * Вставляет временные данные напрямую (для fallback режима).
 */
async function insertTemporaryDataDirect(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    const statement = await db.prepareAsync(
      'INSERT INTO points_of_interest (title, description, latitude, longitude, category, audioFilePath) VALUES (?, ?, ?, ?, ?, ?)'
    );
    try {
      for (const point of temporaryPoints) {
        await statement.executeAsync([
          point.name, point.description, point.latitude,
          point.longitude, point.category, point.audioFile
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
  });
}

// --- ПУБЛИЧНЫЙ API ---

/**
 * Получает все точки интереса из базы данных.
 * Автоматически ждет завершения инициализации.
 */
export async function getAllPoints(): Promise<PointOfInterest[]> {
  try {
    const db = await getDbPromise();
    const result = await db.getAllAsync<PointOfInterest>('SELECT * FROM points_of_interest');
    return result;
  } catch (error) {
    console.error('[DB] Ошибка получения всех точек:', error);
    return []; // Возвращаем пустой массив в случае ошибки
  }
}

/**
 * Получает точки интереса в заданном радиусе от указанной точки.
 * @param latitude - Широта центральной точки.
 * @param longitude - Долгота центральной точки.
 * @param radiusInMeters - Радиус поиска в метрах (по умолчанию 1000м).
 */
export async function getNearbyPoints(latitude: number, longitude: number, radiusInMeters: number = 1000): Promise<PointOfInterest[]> {
  try {
    const db = await getDbPromise();
    
    // Получаем все точки и фильтруем их по расстоянию
    // В идеале можно было бы использовать SQL с функциями расстояния, 
    // но SQLite не имеет встроенных функций для геолокации
    const allPoints = await db.getAllAsync<PointOfInterest>('SELECT * FROM points_of_interest');
    
    const nearbyPoints = allPoints.filter(point => {
      const distance = calculateDistance(latitude, longitude, point.latitude, point.longitude);
      return distance <= radiusInMeters;
    });
    
    console.log(`[DB] Найдено ${nearbyPoints.length} точек в радиусе ${radiusInMeters} метров от координат (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
    return nearbyPoints;
  } catch (error) {
    console.error('[DB] Ошибка получения близлежащих точек:', error);
    return [];
  }
}

/**
 * Получает точки интереса по категории в заданном радиусе.
 * @param latitude - Широта центральной точки.
 * @param longitude - Долгота центральной точки.
 * @param category - Категория для фильтрации.
 * @param radiusInMeters - Радиус поиска в метрах (по умолчанию 1000м).
 */
export async function getNearbyPointsByCategory(latitude: number, longitude: number, category: string, radiusInMeters: number = 1000): Promise<PointOfInterest[]> {
  try {
    const db = await getDbPromise();
    
    // Сначала фильтруем по категории, затем по расстоянию
    const categoryPoints = await db.getAllAsync<PointOfInterest>(
      'SELECT * FROM points_of_interest WHERE category = ?',
      [category]
    );
    
    const nearbyPoints = categoryPoints.filter(point => {
      const distance = calculateDistance(latitude, longitude, point.latitude, point.longitude);
      return distance <= radiusInMeters;
    });
    
    console.log(`[DB] Найдено ${nearbyPoints.length} точек категории "${category}" в радиусе ${radiusInMeters} метров`);
    return nearbyPoints;
  } catch (error) {
    console.error(`[DB] Ошибка получения близлежащих точек категории "${category}":`, error);
    return [];
  }
}

/**
 * Вычисляет расстояние между двумя точками в метрах используя формулу Haversine.
 * @param lat1 - Широта первой точки.
 * @param lon1 - Долгота первой точки.
 * @param lat2 - Широта второй точки.
 * @param lon2 - Долгота второй точки.
 * @returns Расстояние в метрах.
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Радиус Земли в метрах
  const φ1 = lat1 * Math.PI / 180; // φ, λ в радианах
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // расстояние в метрах
  return d;
}

/**
 * Получает все уникальные категории из базы данных.
 * Автоматически ждет завершения инициализации.
 */
export async function getCategories(): Promise<PointCategory[]> {
  try {
    const db = await getDbPromise();
    const result = await db.getAllAsync<{ category: PointCategory }>('SELECT DISTINCT category FROM points_of_interest');
    return result.map((row) => row.category);
  } catch (error) {
    console.error('[DB] Ошибка получения категорий:', error);
    return []; // Возвращаем пустой массив в случае ошибки
  }
}

/**
 * Получает точки интереса по указанной категории.
 * @param category - Категория для фильтрации.
 */
export async function getPointsByCategory(category: string): Promise<PointOfInterest[]> {
  try {
    const db = await getDbPromise();
    // Используем параметризованный запрос для безопасности и избежания SQL-инъекций.
    const result = await db.getAllAsync<PointOfInterest>(
      'SELECT * FROM points_of_interest WHERE category = ?',
      [category]
    );
    return result;
  } catch (error) {
    console.error(`[DB] Ошибка получения точек для категории "${category}":`, error);
    return []; // Возвращаем пустой массив в случае ошибки
  }
}