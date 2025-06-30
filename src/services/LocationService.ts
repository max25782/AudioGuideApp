import * as Location from 'expo-location';
import { Location as LocationType, PointOfInterest } from '../types';
import preprocessedDataService from './PreprocessedDataService';

class LocationService {
  private currentLocation: LocationType | null = null;
  private isTracking: boolean = false;

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
      
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation: LocationType = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };
          this.currentLocation = newLocation;
          callback(newLocation);
        }
      );
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
}

export { LocationService }; 