import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import preprocessedDataService from '../services/PreprocessedDataService';
import { LocationService } from '../services/LocationService';
import { audioService } from '../services/AudioService';
import { wazeService } from '../services/WazeService';

import { PointOfInterest, PointCategory, Location, RootStackParamList } from '../types';
import CategoryFilter from '../components/CategoryFilter';
import MapView from '../components/MapView';
import PointsList from '../components/PointsList';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  
  // States
  const [points, setPoints] = useState<PointOfInterest[]>([]);
  const [allPoints, setAllPoints] = useState<PointOfInterest[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PointCategory | 'all'>('all');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Местоположение по умолчанию - центр Израиля (Иерусалим)
  const [mapLocation, setMapLocation] = useState<Location>({
    latitude: 31.7683,
    longitude: 35.2137,
    accuracy: 0,
    timestamp: Date.now(),
  });

  // Services
  const locationService = new LocationService();

  useEffect(() => {
    initializeData();
    // Автоматически получаем местоположение при загрузке
    getCurrentLocation();
  }, []);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 Инициализация данных...');
      
      // Загружаем все точки из сервиса
      const loadedPoints = preprocessedDataService.getAllPoints();
      console.log(`✅ Загружено ${loadedPoints.length} точек`);
      
      setAllPoints(loadedPoints);
      setPoints(loadedPoints);
      
      // Получаем статистику
      const stats = preprocessedDataService.getStatistics();
      console.log('📊 Статистика:', stats);
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        setMapLocation(location);
        console.log('📍 Текущее местоположение:', location);
        
        // Показываем ближайшие точки после получения местоположения
        await showNearbyPoints(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('❌ Ошибка получения местоположения:', error);
      Alert.alert('Ошибка', 'Не удалось получить местоположение');
    } finally {
      setIsLocationLoading(false);
    }
  };

  const updateNearbyPointsWithCategory = async (categoryId: PointCategory | 'all', lat?: number, lon?: number) => {
    try {
      let nearbyPoints: PointOfInterest[] = [];
      
      if (categoryId === 'all') {
        // Для "Все" всегда показываем все точки
        nearbyPoints = allPoints;
        console.log(`🔍 Показываю все ${nearbyPoints.length} точек`);
      } else {
        // Для конкретных категорий показываем только эту категорию
        nearbyPoints = preprocessedDataService.getPointsByCategory(categoryId);
        console.log(`🔍 Найдено ${nearbyPoints.length} точек для категории: ${categoryId}`);
      }
      
      setPoints(nearbyPoints);
      
    } catch (error) {
      console.error('❌ Ошибка обновления точек:', error);
    }
  };

  const handleCategorySelect = async (categoryId: PointCategory | 'all') => {
    setSelectedCategory(categoryId);
    await updateNearbyPointsWithCategory(categoryId);
  };

  const handlePointPress = (point: PointOfInterest) => {
    navigation.navigate('PointDetail', { point });
  };

  const showNearbyPoints = async (latitude: number, longitude: number) => {
    try {
      let nearbyPoints: PointOfInterest[] = [];
      
      if (selectedCategory === 'all') {
        nearbyPoints = preprocessedDataService.getNearbyPoints(latitude, longitude, 15000);
        console.log(`🔍 Показываю ${nearbyPoints.length} ближайших точек`);
      } else {
        nearbyPoints = preprocessedDataService.getNearbyPointsByCategory(latitude, longitude, selectedCategory, 15000);
        console.log(`🔍 Показываю ${nearbyPoints.length} ближайших точек категории: ${selectedCategory}`);
      }
      
      setPoints(nearbyPoints);
    } catch (error) {
      console.error('❌ Ошибка получения ближайших точек:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeData();
    if (currentLocation) {
      await showNearbyPoints(currentLocation.latitude, currentLocation.longitude);
    }
    setRefreshing(false);
  };

  const playAudio = async (point: PointOfInterest) => {
    try {
      const success = await audioService.playPointAudio(point.audioFilePath);
      if (!success) {
        Alert.alert('Ошибка', 'Не удалось воспроизвести аудио');
      }
    } catch (error) {
      console.error('❌ Ошибка воспроизведения аудио:', error);
      Alert.alert('Ошибка', 'Проблема с аудио файлом');
    }
  };

  const openInWaze = async (point: PointOfInterest) => {
    try {
      // Проверяем доступность Waze
      const isWazeAvailable = await wazeService.isWazeInstalled();
      
      if (isWazeAvailable) {
        await wazeService.openWazeNavigation(point.latitude, point.longitude);
      } else {
        // Предлагаем альтернативу
        Alert.alert(
          'Waze не установлен',
          'Открыть в другом навигационном приложении?',
          [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Установить', onPress: () => wazeService.openAlternativeMaps(point.latitude, point.longitude) },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Ошибка открытия навигации:', error);
      Alert.alert('Ошибка', 'Не удалось открыть навигацию');
    }
  };

  const formatPointInfo = (point: PointOfInterest) => {
    return {
      title: point.name,
      subtitle: getCategoryName(point.category),
      coords: `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
    };
  };

  const getCategoryName = (category: PointCategory): string => {
    const categoryNames: Record<PointCategory, string> = {
      historical: 'История',
      religious: 'Религия',
      children: 'Детские',
      nature: 'Природа',
      culture: 'Культура',
      tourism: 'Туризм',
      architecture: 'Архитектура',
      amenity: 'Удобства',
      leisure: 'Досуг',
    };

    return categoryNames[category] || category;
  };

  const getCategoryColor = (category: PointCategory): string => {
    const colors: Record<PointCategory, string> = {
      historical: '#8B4513',
      religious: '#4169E1', 
      children: '#FF69B4',
      nature: '#228B22',
      culture: '#9932CC',
      tourism: '#FF4500',
      architecture: '#696969',
      amenity: '#20B2AA',
      leisure: '#32CD32',
    };

    return colors[category] || '#666666';
  };

  const getAvailableCategories = (): PointCategory[] => {
    return preprocessedDataService.getCategories();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Загрузка данных...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Аудиогид Израиля</Text>
        <Text style={styles.subtitle}>{points.length} точек интереса</Text>
      </View>

      {/* Location Button */}
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={getCurrentLocation}
        disabled={isLocationLoading}
      >
        <Text style={styles.locationButtonText}>
          {isLocationLoading ? 'Определение местоположения...' : '📍 Показать ближайшие'}
        </Text>
      </TouchableOpacity>

      {/* Category Filter */}
      <CategoryFilter
        categories={getAvailableCategories()}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        getCategoryName={getCategoryName}
        getCategoryColor={getCategoryColor}
      />

      {/* Map - всегда показываем */}
      <MapView
        currentLocation={mapLocation}
        points={points.slice(0, 50)} // Ограничиваем для производительности
        onPointPress={handlePointPress}
        getCategoryColor={getCategoryColor}
      />

      {/* Points List - теперь без ScrollView */}
      <PointsList
        points={points}
        onPointPress={handlePointPress}
        onPlayAudio={playAudio}
        onOpenInWaze={openInWaze}
        formatPointInfo={formatPointInfo}
        getCategoryColor={getCategoryColor}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  locationButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
}); 