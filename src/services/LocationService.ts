import * as Location from 'expo-location';
import { Location as LocationType, PointOfInterest } from '../types';
import { getAllPoints } from './DatabaseService';

class LocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private currentLocation: LocationType | null = null;
  private isTracking = false;
  private onNearbyPointCallback: ((point: PointOfInterest) => void) | null = null;
  private triggeredPoints = new Set<string | number>(); // Для отслеживания уже сработавших точек

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Ошибка запроса разрешений на геолокацию:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationType | null> {
    try {
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

  async startLocationTracking(onNearbyPoint: (point: PointOfInterest) => void): Promise<void> {
    if (this.isTracking) return;

    this.onNearbyPointCallback = onNearbyPoint;
    this.isTracking = true;
    this.triggeredPoints.clear();

    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Обновление каждые 5 секунд
        distanceInterval: 10, // Обновление при перемещении на 10 метров
      },
      (location) => {
        this.currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: location.timestamp,
        };

        this.checkNearbyPoints();
      }
    );
  }

  stopLocationTracking(): void {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
    this.onNearbyPointCallback = null;
  }

  private async checkNearbyPoints(): Promise<void> {
    if (!this.currentLocation || !this.onNearbyPointCallback) return;

    try {
      // Получаем ВСЕ точки из базы данных
      const allPoints = await getAllPoints();
      
      const nearbyPoints: PointOfInterest[] = [];
      
      // Фильтруем точки в коде, а не в SQL
      for (const point of allPoints) {
        const distance = this.calculateDistance(
          this.currentLocation.latitude,
          this.currentLocation.longitude,
          point.latitude,
          point.longitude
        );

        // Если расстояние меньше 1000 метров, добавляем в список
        if (distance <= 1000) {
          nearbyPoints.push(point);
        }
      }

      for (const point of nearbyPoints) {
        // Проверяем, не была ли точка уже активирована
        if (!this.triggeredPoints.has(point.id)) {
          this.triggeredPoints.add(point.id);
          this.onNearbyPointCallback(point);
        }
      }

      // Очищаем точки, которые больше не в радиусе (для возможности повторной активации)
      const nearbyPointIds = new Set(nearbyPoints.map(p => p.id));
      for (const id of this.triggeredPoints) {
        if (!nearbyPointIds.has(id)) {
          this.triggeredPoints.delete(id);
        }
      }
    } catch (error) {
      console.error('Ошибка проверки ближайших точек:', error);
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Радиус Земли в метрах
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Расстояние в метрах
  }

  getCurrentLocationData(): LocationType | null {
    return this.currentLocation;
  }

  isLocationTracking(): boolean {
    return this.isTracking;
  }
}

export const locationService = new LocationService(); 