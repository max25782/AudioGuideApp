import * as SQLite from 'expo-sqlite';
import { PointOfInterest, PointCategory } from '../types';

/**
 * SQLite сервис для работы с точками интереса
 * Более эффективен для больших объемов данных
 */
class SQLiteDataService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  constructor() {
    this.initDatabase();
  }

  /**
   * Инициализация базы данных
   */
  private async initDatabase() {
    try {
      console.log('[SQLiteDataService] Инициализация базы данных...');
      
      this.db = await SQLite.openDatabaseAsync('points_of_interest.db');
      
      // Создаем таблицу если не существует
      await this.createTables();
      
      // Проверяем, есть ли данные
      const count = await this.getPointsCount();
      
      if (count === 0) {
        console.log('[SQLiteDataService] База данных пуста, импортирую данные...');
        await this.importData();
      }
      
      this.isInitialized = true;
      console.log(`[SQLiteDataService] База данных готова, ${count} точек`);
      
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка инициализации БД:', error);
    }
  }

  /**
   * Создание таблиц
   */
  private async createTables() {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS points_of_interest (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        description TEXT,
        audioFilePath TEXT,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создаем индексы для быстрого поиска
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_category ON points_of_interest(category);
      CREATE INDEX IF NOT EXISTS idx_coordinates ON points_of_interest(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_name ON points_of_interest(name);
    `);

    console.log('[SQLiteDataService] Таблицы и индексы созданы');
  }

  /**
   * Импорт данных из JSON
   */
  private async importData() {
    if (!this.db) return;

    try {
      // Импортируем данные из JSON файла
      const pointsData = require('../data/processed/points-with-audio.json');
      
      console.log(`[SQLiteDataService] Импортирую ${pointsData.length} точек...`);
      
      // Начинаем транзакцию для быстрого импорта
      await this.db.execAsync('BEGIN TRANSACTION;');
      
      for (const point of pointsData) {
        await this.db.execAsync(`
          INSERT INTO points_of_interest (
            id, name, category, latitude, longitude, 
            description, audioFilePath, title
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `, [
          point.id,
          point.name,
          point.category,
          point.coordinates.latitude,
          point.coordinates.longitude,
          point.description,
          point.audioFilePath,
          point.title
        ]);
      }
      
      await this.db.execAsync('COMMIT;');
      console.log('[SQLiteDataService] Импорт завершен');
      
    } catch (error) {
      await this.db.execAsync('ROLLBACK;');
      console.error('[SQLiteDataService] Ошибка импорта:', error);
    }
  }

  /**
   * Получить количество точек
   */
  private async getPointsCount(): Promise<number> {
    if (!this.db) return 0;

    const result = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM points_of_interest;');
    return result?.count || 0;
  }

  /**
   * Получить все точки
   */
  async getAllPoints(): Promise<PointOfInterest[]> {
    if (!this.db || !this.isInitialized) return [];

    try {
      const result = await this.db.getAllAsync(`
        SELECT * FROM points_of_interest 
        ORDER BY name 
        LIMIT 1000;
      `);
      
      return result.map(this.mapRowToPoint);
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка получения всех точек:', error);
      return [];
    }
  }

  /**
   * Получить точки по категории
   */
  async getPointsByCategory(category: PointCategory): Promise<PointOfInterest[]> {
    if (!this.db || !this.isInitialized) return [];

    try {
      const result = await this.db.getAllAsync(`
        SELECT * FROM points_of_interest 
        WHERE category = ? 
        ORDER BY name;
      `, [category]);
      
      return result.map(this.mapRowToPoint);
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка получения точек по категории:', error);
      return [];
    }
  }

  /**
   * Получить точки рядом с местоположением (геопространственный запрос)
   */
  async getNearbyPoints(
    latitude: number, 
    longitude: number, 
    radiusInMeters: number = 10000
  ): Promise<PointOfInterest[]> {
    if (!this.db || !this.isInitialized) return [];

    try {
      // Приблизительный расчет границ (1 градус ≈ 111 км)
      const latDelta = radiusInMeters / 111000;
      const lonDelta = radiusInMeters / (111000 * Math.cos(latitude * Math.PI / 180));
      
      const result = await this.db.getAllAsync(`
        SELECT *, 
          (6371000 * acos(cos(radians(?)) * cos(radians(latitude)) * 
           cos(radians(longitude) - radians(?)) + 
           sin(radians(?)) * sin(radians(latitude)))) as distance
        FROM points_of_interest 
        WHERE latitude BETWEEN ? - ? AND ? + ?
          AND longitude BETWEEN ? - ? AND ? + ?
        HAVING distance <= ?
        ORDER BY distance 
        LIMIT 50;
      `, [
        latitude, longitude, latitude,
        latitude, latDelta, latitude, latDelta,
        longitude, lonDelta, longitude, lonDelta,
        radiusInMeters
      ]);
      
      return result.map(this.mapRowToPoint);
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка получения ближайших точек:', error);
      return [];
    }
  }

  /**
   * Поиск точек по названию
   */
  async searchPoints(query: string): Promise<PointOfInterest[]> {
    if (!this.db || !this.isInitialized) return [];

    try {
      const searchTerm = `%${query}%`;
      const result = await this.db.getAllAsync(`
        SELECT * FROM points_of_interest 
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY name 
        LIMIT 20;
      `, [searchTerm, searchTerm]);
      
      return result.map(this.mapRowToPoint);
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка поиска точек:', error);
      return [];
    }
  }

  /**
   * Получить статистику
   */
  async getStatistics() {
    if (!this.db || !this.isInitialized) {
      return { totalPoints: 0, categories: {} };
    }

    try {
      const totalResult = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM points_of_interest;');
      const categoryResult = await this.db.getAllAsync(`
        SELECT category, COUNT(*) as count 
        FROM points_of_interest 
        GROUP BY category 
        ORDER BY count DESC;
      `);
      
      const categories = {};
      categoryResult.forEach(row => {
        categories[row.category] = row.count;
      });
      
      return {
        totalPoints: totalResult?.count || 0,
        categories,
        dataSource: 'SQLite Database',
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка получения статистики:', error);
      return { totalPoints: 0, categories: {} };
    }
  }

  /**
   * Получить случайные точки
   */
  async getRandomPoints(count: number = 10): Promise<PointOfInterest[]> {
    if (!this.db || !this.isInitialized) return [];

    try {
      const result = await this.db.getAllAsync(`
        SELECT * FROM points_of_interest 
        ORDER BY RANDOM() 
        LIMIT ?;
      `, [count]);
      
      return result.map(this.mapRowToPoint);
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка получения случайных точек:', error);
      return [];
    }
  }

  /**
   * Преобразование строки БД в объект PointOfInterest
   */
  private mapRowToPoint(row: any): PointOfInterest {
    return {
      id: row.id,
      name: row.name,
      category: row.category as PointCategory,
      coordinates: {
        latitude: row.latitude,
        longitude: row.longitude
      },
      title: row.title || row.name,
      description: row.description || '',
      audioFilePath: row.audioFilePath || '',
      latitude: row.latitude,
      longitude: row.longitude
    };
  }

  /**
   * Очистка базы данных
   */
  async clearDatabase() {
    if (!this.db) return;

    try {
      await this.db.execAsync('DELETE FROM points_of_interest;');
      console.log('[SQLiteDataService] База данных очищена');
    } catch (error) {
      console.error('[SQLiteDataService] Ошибка очистки БД:', error);
    }
  }

  /**
   * Закрытие соединения с БД
   */
  async closeDatabase() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      console.log('[SQLiteDataService] Соединение с БД закрыто');
    }
  }
}

export const sqliteDataService = new SQLiteDataService(); 