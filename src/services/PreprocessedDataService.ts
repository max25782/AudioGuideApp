import { PointOfInterest, PointCategory } from '../types';
import userService from './UserService';

// Импортируем полные данные с многоязычными названиями (5,684 точки)
import pointsWithMultilingualNames from '../data/processed/points-with-multilingual-names.json';
// Импорт удален - используем только основной файл с данными
import namesStats from '../data/processed/names-stats.json';

// Типы для новых данных с многоязычными названиями
interface NewPointData {
  id: string;
  name: string | {
    ru?: string;
    he?: string;
    en?: string;
  };
  category: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description: {
    ru: string;
    he: string;
    en: string;
  };
}

// Функция для преобразования новых данных в PointOfInterest
function convertNewPointToTyped(raw: NewPointData): PointOfInterest {
  return {
    id: raw.id,
    name: raw.name, // Теперь поддерживает как строки, так и многоязычные объекты
    category: raw.category as PointCategory,
    coordinates: raw.coordinates,
    // Совместимость со старым API
    title: typeof raw.name === 'string' ? raw.name : raw.name.he || raw.name.en || raw.name.ru || 'Unknown',
    description: raw.description,
    audioFilePath: `${raw.id}.mp3`,
    latitude: raw.coordinates.latitude,
    longitude: raw.coordinates.longitude
  };
}

/**
 * Сервис для работы с новыми данными points-with-multilingual-names.json
 * Использует 5,684 точки из полного датасета с многоязычными названиями
 */
class PreprocessedDataService {
  private allPoints: PointOfInterest[];
  private categoryData: Partial<Record<PointCategory, PointOfInterest[]>>;
  private statistics = namesStats;

  constructor() {
    try {
      console.log('[PreprocessedDataService] Загружаю полные данные с многоязычными названиями (5,684 точек)...');
      
      // Используем полные данные с многоязычными названиями
      const rawData = pointsWithMultilingualNames as NewPointData[];
      this.allPoints = rawData.map(convertNewPointToTyped);
      
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
    return this.enrichPointsWithVisitStatus(this.allPoints);
  }

  /**
   * Обогащаем точки информацией о посещениях
   */
  private enrichPointsWithVisitStatus(points: PointOfInterest[]): PointOfInterest[] {
    return points.map(point => {
      const isVisited = userService.isPointVisited(point.id);
      const visitedPoint = userService.getVisitedPoints().find(v => v.pointId === point.id);
      
      return {
        ...point,
        isVisited,
        visitedAt: visitedPoint?.visitedAt
      };
    });
  }

  /**
   * Получить точки по категории
   */
  getPointsByCategory(category: PointCategory): PointOfInterest[] {
    try {
      console.log(`[PreprocessedDataService] Получаю точки категории: ${category}`);
      const categoryPoints = this.allPoints.filter(point => point.category === category);
      console.log(`[PreprocessedDataService] Найдено ${categoryPoints.length} точек категории ${category}`);
      return this.enrichPointsWithVisitStatus(categoryPoints);
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
    const nearbyPoints = this.allPoints
      .map(point => ({
        point,
        distance: this.calculateDistance(latitude, longitude, point.coordinates.latitude, point.coordinates.longitude)
      }))
      .filter(({ distance }) => distance <= radiusInMeters)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50) // Ограничиваем до 50 ближайших точек
      .map(({ point }) => point);

    return this.enrichPointsWithVisitStatus(nearbyPoints);
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
      totalPoints: this.statistics.totalPoints,
      categories: this.statistics.categories,
      dataSource: 'points-with-multilingual-names.json',
      extractedAt: this.statistics.extractedAt,
      multilingualNames: this.allPoints.filter(point => typeof point.name === 'object').length
    };
  }

  /**
   * Получить информацию о регионах (заглушка для совместимости)
   */
  getRegionsInfo() {
    return {
      total: 1,
      regions: ['Israel'],
      coverage: 'Весь Израиль (5,684 точек)'
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
   * Поиск точек по названию (поддерживает многоязычные названия)
   */
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

  /**
   * Получить случайные точки
   */
  getRandomPoints(count: number = 10): PointOfInterest[] {
    const shuffled = [...this.allPoints].sort(() => 0.5 - Math.random());
    return this.enrichPointsWithVisitStatus(shuffled.slice(0, count));
  }

  /**
   * Получить только посещенные пользователем точки
   */
  getVisitedPoints(): PointOfInterest[] {
    const visitedPointIds = userService.getVisitedPoints().map(v => v.pointId);
    const visitedPoints = this.allPoints.filter(point => visitedPointIds.includes(point.id));
    return this.enrichPointsWithVisitStatus(visitedPoints);
  }

  /**
   * Получить непосещенные точки в радиусе
   */
  getUnvisitedNearbyPoints(latitude: number, longitude: number, radiusInMeters: number = 10000): PointOfInterest[] {
    const nearbyPoints = this.getNearbyPoints(latitude, longitude, radiusInMeters);
    return nearbyPoints.filter(point => !point.isVisited);
  }

  /**
   * Получить статистику посещений по категориям
   */
  getVisitStatsByCategory(): Record<PointCategory, { visited: number; total: number }> {
    const stats: Record<PointCategory, { visited: number; total: number }> = {
      historical: { visited: 0, total: 0 },
      religious: { visited: 0, total: 0 },
      children: { visited: 0, total: 0 },
      nature: { visited: 0, total: 0 },
      culture: { visited: 0, total: 0 },
      tourism: { visited: 0, total: 0 },
      architecture: { visited: 0, total: 0 },
      amenity: { visited: 0, total: 0 },
      leisure: { visited: 0, total: 0 },
    };

    this.allPoints.forEach(point => {
      if (stats[point.category]) {
        stats[point.category].total++;
        if (userService.isPointVisited(point.id)) {
          stats[point.category].visited++;
        }
      }
    });

    return stats;
  }

  /**
   * Отметить точку как посещенную
   */
  async markPointAsVisited(pointId: string, coordinates: { latitude: number; longitude: number }, audioPlayed: boolean = false): Promise<void> {
    await userService.markPointAsVisited(pointId, coordinates, audioPlayed);
  }

  /**
   * Снять отметку посещения точки
   */
  async removePointFromVisited(pointId: string): Promise<void> {
    await userService.removePointFromVisited(pointId);
  }

  /**
   * Переключить статус посещения точки
   */
  async togglePointVisited(pointId: string, coordinates: { latitude: number; longitude: number }): Promise<boolean> {
    return await userService.togglePointVisited(pointId, coordinates);
  }
}

export default new PreprocessedDataService(); 