import * as Location from 'expo-location';
import { Location as LocationType, PointOfInterest } from '../types';
import preprocessedDataService from './PreprocessedDataService';
import userService from './UserService';

class LocationService {
  private currentLocation: LocationType | null = null;
  private isTracking: boolean = false;
  private visitTrackingRadius: number = 150; // радиус в метрах для автоматической отметки посещения
  private checkedPoints: Set<string> = new Set(); // для избежания повторных проверок

  async getCurrentLocation(): Promise<LocationType | null> {
    try {
      // Запрашиваем разрешения
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Нет разрешения на доступ к местоположению');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };

      return this.currentLocation;
    } catch (error) {
      console.error('Ошибка получения текущего местоположения:', error);
      return null;
    }
  }

  /**
   * Получить ближайшие точки интереса
   */
  async getNearbyPoints(
    latitude: number,
    longitude: number,
    radiusInMeters: number = 1000
  ): Promise<PointOfInterest[]> {
    try {
      return preprocessedDataService.getNearbyPoints(latitude, longitude, radiusInMeters);
    } catch (error) {
      console.error('Ошибка получения ближайших точек:', error);
      return [];
    }
  }

  async startLocationTracking(callback: (location: LocationType) => void): Promise<void> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Нет разрешения на отслеживание местоположения');
      }

      this.isTracking = true;
      
      // Устанавливаем интервал для очистки кэша проверенных точек
      const cacheCleanupInterval = setInterval(() => {
        this.clearCheckedPointsCache();
      }, 3600000); // каждый час
      
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          const newLocation: LocationType = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };
          this.currentLocation = newLocation;
          
          // Проверяем посещения точек
          await this.checkForVisits(newLocation);
          
          callback(newLocation);
        }
      );

      // Очищаем интервал при остановке отслеживания
      this.stopLocationTracking = () => {
        this.isTracking = false;
        clearInterval(cacheCleanupInterval);
      };
      
    } catch (error) {
      console.error('Ошибка запуска отслеживания местоположения:', error);
      this.isTracking = false;
      throw error;
    }
  }

  stopLocationTracking(): void {
    this.isTracking = false;
  }

  getLastKnownLocation(): LocationType | null {
    return this.currentLocation;
  }

  isLocationTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Вычислить расстояние между двумя точками в метрах
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Проверка и автоматическая отметка посещенных точек
   */
  private async checkForVisits(currentLocation: LocationType): Promise<void> {
    try {
      // Получаем ближайшие точки в радиусе отслеживания
      const nearbyPoints = await this.getNearbyPoints(
        currentLocation.latitude,
        currentLocation.longitude,
        this.visitTrackingRadius
      );

      for (const point of nearbyPoints) {
        // Пропускаем уже посещенные или проверенные точки
        if (userService.isPointVisited(point.id) || this.checkedPoints.has(point.id)) {
          continue;
        }

        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          point.coordinates.latitude,
          point.coordinates.longitude
        );

        // Если пользователь в радиусе отслеживания
        if (distance <= this.visitTrackingRadius) {
          console.log(`📍 Пользователь находится рядом с точкой: ${point.id} (${distance.toFixed(0)}м)`);
          
          // Отмечаем точку как посещенную
          await userService.markPointAsVisited(
            point.id,
            point.coordinates,
            false // аудио не воспроизводилось автоматически
          );

          // Добавляем в список проверенных, чтобы избежать повторных уведомлений
          this.checkedPoints.add(point.id);

          console.log(`✅ Точка ${point.id} автоматически отмечена как посещенная`);
        }
      }
    } catch (error) {
      console.error('Ошибка при проверке посещений:', error);
    }
  }

  /**
   * Очистка кэша проверенных точек (вызывается периодически)
   */
  private clearCheckedPointsCache(): void {
    // Очищаем кэш каждый час, чтобы позволить повторные посещения
    this.checkedPoints.clear();
  }

  /**
   * Настройка радиуса отслеживания посещений
   */
  setVisitTrackingRadius(radius: number): void {
    this.visitTrackingRadius = radius;
  }

  /**
   * Получение текущего радиуса отслеживания
   */
  getVisitTrackingRadius(): number {
    return this.visitTrackingRadius;
  }
}

export { LocationService }; 