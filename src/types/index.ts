export type PointCategory = 'historical' | 'religious' | 'children' | 'nature' | 'culture' | 'tourism' | 'architecture' | 'unknown';

export interface PointOfInterest {
  id: string | number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  category: PointCategory;
  audioFilePath: string;
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