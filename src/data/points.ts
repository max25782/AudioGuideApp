export interface PointOfInterest {
  id: string;
  name: string;
  description: string;
  category: 'historical' | 'religious' | 'children' | 'nature';
  latitude: number;
  longitude: number;
  audioFile: string;
}

export const pointsOfInterest: PointOfInterest[] = [
  {
    id: '1',
    name: 'שער האשפות (Dung Gate)',
    description: 'Один из ворот Старого города Иерусалима, ведущий к Западной стене',
    category: 'historical',
    latitude: 31.7748268,
    longitude: 35.2341728,
    audioFile: 'historical_center.mp3'
  },
  {
    id: '2',
    name: 'ירדנית (Yardenit)',
    description: 'Место крещения Иисуса Христа согласно христианской традиции',
    category: 'religious',
    latitude: 32.7109379,
    longitude: 35.5708638,
    audioFile: 'cathedral.mp3'
  },
  {
    id: '3',
    name: 'העיר העתיקה קיסריה (Caesarea Ancient City)',
    description: 'Город и порт, построенный Иродом Великим около 25-13 гг. до н.э.',
    category: 'historical',
    latitude: 32.5018388,
    longitude: 34.8924472,
    audioFile: 'historical_center.mp3'
  },
  {
    id: '4',
    name: 'הר חרמון (Mount Hermon)',
    description: 'Самая высокая вершина горы Хермон в пределах Израиля. Высота 2,236 метров над уровнем моря',
    category: 'nature',
    latitude: 33.3177984,
    longitude: 35.8036065,
    audioFile: 'nature_reserve.mp3'
  },
  {
    id: '5',
    name: 'סינמה פארק רעננה (Cinema Park Raanana)',
    description: 'Кинотеатр и развлекательный центр в Раанане',
    category: 'children',
    latitude: 32.1840291,
    longitude: 34.8531172,
    audioFile: 'children_park.mp3'
  },
  {
    id: '6',
    name: 'שחריה (Shahariya)',
    description: 'Древний город в южной части Израиля',
    category: 'historical',
    latitude: 31.6020749,
    longitude: 34.8107979,
    audioFile: 'historical_center.mp3'
  }
]; 