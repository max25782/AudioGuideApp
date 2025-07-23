import { MultilingualDescription, MultilingualName } from '../services/I18nService';

export type PointCategory = 'historical' | 'religious' | 'children' | 'nature' | 'culture' | 'tourism' | 'architecture' | 'amenity' | 'leisure';

export interface PointOfInterest {
  id: string;
  name: string | MultilingualName;
  category: PointCategory;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Support both string and multilingual descriptions
  description: string | MultilingualDescription;
  // Обязательные поля для совместимости
  title?: string;
  audioFilePath?: string;
  latitude: number;
  longitude: number;
  // Статус посещения для текущего пользователя
  isVisited?: boolean;
  visitedAt?: Date;
  // Система лайков
  likesCount?: number;
  isLikedByUser?: boolean;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

// Интерфейс для отслеживания посещений
export interface VisitedPoint {
  pointId: string;
  visitedAt: Date;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Дополнительные данные о посещении
  duration?: number; // время пребывания в секундах
  audioPlayed?: boolean; // был ли воспроизведен аудиогид
}

// Интерфейс для лайков пользователя
export interface UserLike {
  pointId: string;
  likedAt: Date;
}

// Интерфейс пользователя
export interface User {
  id: string;
  createdAt: Date;
  visitedPoints: VisitedPoint[];
  totalVisits: number;
  favoriteCategory?: PointCategory;
  // Лайки пользователя
  likedPoints: UserLike[];
  totalLikes: number;
}

// Настройки приложения для пользователя
export interface UserSettings {
  language: string;
  autoPlayAudio: boolean;
  notificationsEnabled: boolean;
  trackingRadius: number; // радиус в метрах для автоматического отслеживания
}

export type RootStackParamList = {
  Home: undefined;
  PointDetail: { point: PointOfInterest };
  VisitedPoints: undefined;
  TopPoints: undefined;
}; 