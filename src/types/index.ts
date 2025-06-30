export type PointCategory = 'historical' | 'religious' | 'children' | 'nature' | 'culture' | 'tourism' | 'architecture' | 'amenity' | 'leisure';

export interface PointOfInterest {
  id: string;
  name: string;
  category: PointCategory;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  // Обязательные поля для совместимости
  title: string;
  description: string;
  audioFilePath: string;
  latitude: number;
  longitude: number;
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

export type RootStackParamList = {
  Home: undefined;
  PointDetail: { point: PointOfInterest };
}; 