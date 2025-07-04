import { PointOfInterest, PointCategory } from '../types';

// Импортируем данные с аудио путями
import pointsWithAudio from '../data/processed/points-with-audio.json';
// Импорт удален - используем только основной файл с данными
import namesStats from '../data/processed/names-stats.json';

// Типы для новых данных с описаниями
interface NewPointData {
  id: string;
  name: string;
  category: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description: string;
}

// Функция для преобразования новых данных в PointOfInterest
function convertNewPointToTyped(raw: NewPointData): PointOfInterest {
  return {
    id: raw.id,
    name: raw.name,
    category: raw.category as PointCategory,
    coordinates: raw.coordinates,
    // Совместимость со старым API
    title: raw.name,
    description: raw.description,
    audioFilePath: `${raw.category}.mp3`,
    latitude: raw.coordinates.latitude,
    longitude: raw.coordinates.longitude
  };
}

/**
 * Сервис для работы с новыми данными names-categories.json
 * Использует 5,681 точку из export.json
 */
class PreprocessedDataService {
  private allPoints: PointOfInterest[];
  private categoryData: Partial<Record<PointCategory, PointOfInterest[]>>;
  private statistics = namesStats;

  constructor() {
    try {
      console.log('[PreprocessedDataService] Загружаю новые данные (5,681 точек)...');
      
      // Используем данные с аудио путями (уже в правильном формате)
      this.allPoints = pointsWithAudio as PointOfInterest[];
      
      console.log(`[PreprocessedDataService] Загружено ${this.allPoints.length} точек`);
      
      // Группируем точки по категориям
      this.categoryData = {};
      const allCategories: PointCategory[] = ['historical', 'religious', 'children', 'nature', 'culture', 'tourism', 'architecture', 'amenity', 'leisure'];
      
      for (const category of allCategories) {
        this.categoryData[category] = this.allPoints.filter(point => point.category === category);
      }
      
      const availableCategories = Object.keys(this.categoryData);
      console.log(`[PreprocessedDataService] Доступные категории: ${availableCategories.join(', ')}`);
      
    } catch (error: any) {
      console.error('[PreprocessedDataService] Ошибка загрузки новых данных:', error);
      this.allPoints = [];
      this.categoryData = {};
    }
  }

  /**
   * Получить все точки
   */
  getAllPoints(): PointOfInterest[] {
    return this.allPoints;
  }

  /**
   * Получить точки по категории
   */
  getPointsByCategory(category: PointCategory): PointOfInterest[] {
    try {
      console.log(`[PreprocessedDataService] Получаю точки категории: ${category}`);
      const categoryPoints = this.allPoints.filter(point => point.category === category);
      console.log(`[PreprocessedDataService] Найдено ${categoryPoints.length} точек категории ${category}`);
      return categoryPoints;
    } catch (error) {
      console.error('[PreprocessedDataService] Ошибка получения точек по категории:', error);
      return [];
    }
  }

  /**
   * Получить все доступные категории
   */
  getCategories(): PointCategory[] {
    return Object.keys(this.categoryData) as PointCategory[];
  }

  /**
   * Получить точки рядом с местоположением
   */
  getNearbyPoints(latitude: number, longitude: number, radiusInMeters: number = 10000): PointOfInterest[] {
    return this.allPoints
      .map(point => ({
        point,
        distance: this.calculateDistance(latitude, longitude, point.coordinates.latitude, point.coordinates.longitude)
      }))
      .filter(({ distance }) => distance <= radiusInMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50) // Ограничиваем до 50 ближайших точек
      .map(({ point }) => point);
  }

  /**
   * Получить точки рядом с местоположением для определенной категории
   */
  getNearbyPointsByCategory(
    latitude: number, 
    longitude: number, 
    category: PointCategory, 
    radiusInMeters: number = 10000
  ): PointOfInterest[] {
    const categoryPoints = this.getPointsByCategory(category);
    
    return categoryPoints
      .map(point => ({
        point,
        distance: this.calculateDistance(latitude, longitude, point.coordinates.latitude, point.coordinates.longitude)
      }))
      .filter(({ distance }) => distance <= radiusInMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 30) // Ограничиваем до 30 ближайших точек категории
      .map(({ point }) => point);
  }

  /**
   * Получить топ точки (самые близкие к центру Израиля)
   */
  getTop50ForLocation(latitude: number = 31.5, longitude: number = 35.0): PointOfInterest[] {
    return this.getNearbyPoints(latitude, longitude, 50000).slice(0, 50);
  }

  /**
   * Получить статистику
   */
  getStatistics() {
    return {
      totalPoints: this.statistics.totalExtracted,
      categories: this.statistics.categoryBreakdown,
      dataSource: 'names-categories.json (export.json)',
      extractedAt: this.statistics.extractedAt
    };
  }

  /**
   * Получить информацию о регионах (заглушка для совместимости)
   */
  getRegionsInfo() {
    return {
      total: 1,
      regions: ['Israel'],
      coverage: 'Весь Израиль (5,681 точек)'
    };
  }

  /**
   * Вычислить расстояние между двумя точками (формула гаверсина)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Поиск точек по названию
   */
  searchPoints(query: string): PointOfInterest[] {
    const searchTerm = query.toLowerCase();
    return this.allPoints.filter(point => 
      point.name.toLowerCase().includes(searchTerm) ||
      point.category.toLowerCase().includes(searchTerm)
    ).slice(0, 20);
  }

  /**
   * Получить случайные точки
   */
  getRandomPoints(count: number = 10): PointOfInterest[] {
    const shuffled = [...this.allPoints].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export default new PreprocessedDataService(); 