import { PointCategory } from '../types';

// Этот интерфейс описывает, как выглядят данные после парсинга
export interface ParsedPoint {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: PointCategory;
  audioFilePath: string;
}

// Тип для GeoJSON данных для безопасности типов
export interface GeoJsonData {
  features: {
    properties: any;
    geometry: {
      type: string;
      coordinates: [number, number] | any;
    };
  }[];
}

class GeoJsonParser {
  /**
   * Парсит данные GeoJSON и преобразует их в массив точек интереса.
   * @param geoJsonData - Данные в формате GeoJSON.
   * @returns Массив обработанных точек.
   */
  public parse(geoJsonData: GeoJsonData): ParsedPoint[] {
    const parsedPoints: ParsedPoint[] = [];

    if (!geoJsonData || !geoJsonData.features) {
      console.warn('[GeoJsonParser] GeoJSON данные неверны или пусты.');
      return parsedPoints;
    }

    console.log(`[GeoJsonParser] Начинаем парсинг ${geoJsonData.features.length} объектов...`);

    for (const feature of geoJsonData.features) {
      const { properties, geometry } = feature;

      // Пропускаем объекты без свойств или с некорректной геометрией (нас интересуют только точки)
      if (!properties || !geometry || geometry.type !== 'Point' || !geometry.coordinates) {
        continue;
      }

      const [longitude, latitude] = geometry.coordinates;
      const category = this.determineCategory(properties);
      
      // Ищем название в разных полях
      const title = this.extractTitle(properties);
      const description = this.extractDescription(properties);
      
      const point: ParsedPoint = {
        title,
        description,
        latitude,
        longitude,
        category,
        audioFilePath: this.getAudioFileForCategory(category),
      };

      parsedPoints.push(point);
    }
    
    console.log(`[GeoJsonParser] ✅ Обработано ${parsedPoints.length} точек из ${geoJsonData.features.length} объектов.`);
    
    // Логируем статистику по категориям
    const categoryStats = this.getCategoryStatistics(parsedPoints);
    console.log('[GeoJsonParser] Статистика по категориям:', categoryStats);
    
    return parsedPoints;
  }

  /**
   * Извлекает название из различных полей properties.
   */
  private extractTitle(properties: any): string {
    // Порядок приоритета для названий
    const nameFields = [
      'name:en',        // Английское название
      'name:ru',        // Русское название  
      'name',           // Основное название
      'name:he',        // Еврейское название
      'title',          // Альтернативное поле
      '@id'             // В крайнем случае используем ID
    ];

    for (const field of nameFields) {
      if (properties[field] && typeof properties[field] === 'string') {
        return properties[field];
      }
    }

    return 'Неизвестное место';
  }

  /**
   * Извлекает описание из различных полей properties.
   */
  private extractDescription(properties: any): string {
    // Ищем описание в разных полях
    const descriptionFields = [
      'description',
      'description:ru',
      'description:en',
      'addr:city',
      'tourism'
    ];

    for (const field of descriptionFields) {
      if (properties[field] && typeof properties[field] === 'string') {
        return properties[field];
      }
    }

    return 'Описание отсутствует';
  }

  /**
   * Получает статистику по категориям для отладки.
   */
  private getCategoryStatistics(points: ParsedPoint[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const point of points) {
      stats[point.category] = (stats[point.category] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Определяет категорию точки на основе ее свойств OSM.
   * @param properties - Свойства точки из GeoJSON.
   * @returns Категория точки.
   */
  private determineCategory(properties: any): PointCategory {
    // Исторические объекты
    if (properties.historic || properties['historic:civilization'] || properties.archaeological_site) {
      return 'historical';
    }
    
    // Религиозные объекты
    if (properties.religion || properties.amenity === 'place_of_worship' || 
        properties.building === 'church' || properties.building === 'synagogue' || 
        properties.building === 'mosque' || properties.building === 'cathedral') {
      return 'religious';
    }
    
    // Природные объекты
    if (properties.natural || properties.leisure === 'nature_reserve' || 
        properties.leisure === 'park' || properties.landuse === 'forest') {
      return 'nature';
    }
    
    // Детские объекты
    if (properties.leisure === 'playground' || properties.amenity === 'kindergarten' || 
        properties.amenity === 'school' || properties.shop === 'toys') {
      return 'children';
    }
    
    // Культурные объекты
    if (properties.tourism === 'museum' || properties.amenity === 'theatre' || 
        properties.amenity === 'arts_centre' || properties.tourism === 'gallery' || 
        properties.amenity === 'cinema' || properties.amenity === 'library') {
      return 'culture';
    }
    
    // Архитектурные объекты
    if (properties.architecture || (properties.building && (properties['building:architecture'] || properties.architect)) ||
        properties.building === 'castle' || properties.building === 'tower') {
      return 'architecture';
    }
    
    // Туристические объекты (широкая категория)
    if (properties.tourism === 'attraction' || properties.tourism === 'zoo' || 
        properties.tourism === 'theme_park' || properties.tourism === 'viewpoint' ||
        properties.barrier === 'entrance' || properties.tourism) {
      return 'tourism';
    }
    
    return 'amenity';
  }

  /**
   * Возвращает путь к аудиофайлу для заданной категории.
   * @param category - Категория точки.
   * @returns Имя аудиофайла.
   */
  private getAudioFileForCategory(category: PointCategory): string {
    const audioFiles: { [key in PointCategory]?: string } = {
      historical: 'historical_center.mp3',
      religious: 'cathedral.mp3',
      children: 'children_park.mp3',
      nature: 'nature_reserve.mp3',
      culture: 'culture.mp3',
      tourism: 'tourism.mp3',
      architecture: 'architecture.mp3',
      amenity: 'amenity.mp3',
    };
    return audioFiles[category] || 'default.mp3';
  }
}

export const geoJsonParser = new GeoJsonParser(); 