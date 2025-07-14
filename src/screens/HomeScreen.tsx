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
import i18nService from '../services/I18nService';
import userService from '../services/UserService';

import { PointOfInterest, PointCategory, Location, RootStackParamList } from '../types';
import CategoryFilter from '../components/CategoryFilter';
import MapView from '../components/MapView';
import PointsList from '../components/PointsList';
import SimpleLanguageSelector from '../components/SimpleLanguageSelector';

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
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  
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
    
    // Listen for language changes
    const handleLanguageChange = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    i18nService.addLanguageChangeListener(handleLanguageChange);
    
    return () => {
      i18nService.removeLanguageChangeListener(handleLanguageChange);
      // Останавливаем отслеживание местоположения при размонтировании
      if (isLocationTracking) {
        locationService.stopLocationTracking();
      }
    };
  }, []);

  // Функция для обновления точек после автоматического посещения
  const refreshPointsData = async () => {
    try {
      const updatedPoints = preprocessedDataService.getAllPoints();
      setAllPoints(updatedPoints);
      
      if (selectedCategory === 'all') {
        setPoints(updatedPoints);
      } else {
        const categoryPoints = preprocessedDataService.getPointsByCategory(selectedCategory);
        setPoints(categoryPoints);
      }
    } catch (error) {
      console.error('Ошибка обновления точек:', error);
    }
  };

  const initializeData = async () => {
    try {
      setIsLoading(true);
      console.log('🚀', i18nService.t('dataInitialization'));
      
      // Инициализируем пользователя
      const user = await userService.initializeUser();
      console.log('👤 Пользователь инициализирован:', user.id);
      console.log('📈 Всего посещений:', user.totalVisits);
      
      // Загружаем все точки из сервиса (теперь с информацией о посещениях)
      const loadedPoints = preprocessedDataService.getAllPoints();
      console.log('✅', i18nService.t('pointsLoaded', { count: loadedPoints.length }));
      
      const visitedCount = loadedPoints.filter(p => p.isVisited).length;
      console.log('🎯 Посещенных точек:', visitedCount);
      
      setAllPoints(loadedPoints);
      setPoints(loadedPoints);
      
      // Получаем статистику
      const stats = preprocessedDataService.getStatistics();
      console.log('📊', i18nService.t('statistics'), stats);
      
    } catch (error) {
      console.error('❌', i18nService.t('initializationError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('dataLoadError'));
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
        console.log('📍', i18nService.t('currentLocation'), location);
        
        // Показываем ближайшие точки после получения местоположения
        await showNearbyPoints(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('❌', i18nService.t('locationError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('locationNotAvailable'));
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
        console.log('🔍', i18nService.t('showingAllPoints', { count: nearbyPoints.length }));
      } else {
        // Для конкретных категорий показываем только эту категорию
        nearbyPoints = preprocessedDataService.getPointsByCategory(categoryId);
        console.log('🔍', i18nService.t('showingPointsForCategory', { 
          count: nearbyPoints.length, 
          category: i18nService.t(categoryId) 
        }));
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

  const handleToggleVisited = async (point: PointOfInterest) => {
    try {
      const newVisitedStatus = await preprocessedDataService.togglePointVisited(
        point.id, 
        point.coordinates
      );
      
      // Обновляем список точек
      await refreshPointsData();
      
      console.log(`🎯 Точка ${point.id} ${newVisitedStatus ? 'добавлена в' : 'удалена из'} посещенные`);
    } catch (error) {
      console.error('Ошибка изменения статуса посещения:', error);
    }
  };

  const showNearbyPoints = async (latitude: number, longitude: number) => {
    try {
      let nearbyPoints: PointOfInterest[] = [];
      
      if (selectedCategory === 'all') {
        nearbyPoints = preprocessedDataService.getNearbyPoints(latitude, longitude, 15000);
        console.log('🔍', i18nService.t('showingNearbyPoints', { count: nearbyPoints.length }));
      } else {
        nearbyPoints = preprocessedDataService.getNearbyPointsByCategory(latitude, longitude, selectedCategory, 15000);
        console.log('🔍', i18nService.t('showingPointsForCategory', { 
          count: nearbyPoints.length, 
          category: i18nService.t(selectedCategory) 
        }));
      }
      
      setPoints(nearbyPoints);

      // Запускаем отслеживание местоположения для автоматической отметки посещений
      if (!isLocationTracking) {
        try {
          setIsLocationTracking(true);
          await locationService.startLocationTracking((newLocation) => {
            setCurrentLocation(newLocation);
            // Периодически обновляем данные о точках
            refreshPointsData();
          });
          console.log('📍 Отслеживание посещений запущено');
        } catch (error) {
          console.error('Ошибка запуска отслеживания посещений:', error);
          setIsLocationTracking(false);
        }
      }
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
      if (success) {
        // Отмечаем точку как посещенную с воспроизведенным аудио
        await preprocessedDataService.markPointAsVisited(
          point.id, 
          point.coordinates, 
          true // аудио было воспроизведено
        );
        
        // Обновляем список точек, чтобы отобразить изменения
        const updatedPoints = preprocessedDataService.getAllPoints();
        setAllPoints(updatedPoints);
        
        // Обновляем отфильтрованные точки
        if (selectedCategory === 'all') {
          setPoints(updatedPoints);
        } else {
          const categoryPoints = preprocessedDataService.getPointsByCategory(selectedCategory);
          setPoints(categoryPoints);
        }
        
        console.log('🎵 Точка отмечена как посещенная с аудио:', point.id);
      } else {
        Alert.alert(i18nService.t('error'), i18nService.t('audioNotAvailable'));
      }
    } catch (error) {
      console.error('❌', i18nService.t('audioError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('audioPlaybackError'));
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
          i18nService.t('wazeNotInstalled'),
          i18nService.t('openInOtherApp'),
          [
            { text: i18nService.t('cancel'), style: 'cancel' },
            { text: i18nService.t('install'), onPress: () => wazeService.openAlternativeMaps(point.latitude, point.longitude) },
          ]
        );
      }
    } catch (error) {
      console.error('❌', i18nService.t('navigationError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('navigationError'));
    }
  };

  const formatPointInfo = (point: PointOfInterest) => {
    return {
      title: i18nService.getPointName(point.name),
      subtitle: getCategoryName(point.category),
      coords: `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`
    };
  };

  const getCategoryName = (category: PointCategory): string => {
    return i18nService.t(category);
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
          <Text style={styles.loadingText}>{i18nService.t('dataInitialization')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, i18nService.isRTL() && styles.rtlText]}>
            {i18nService.t('pointsOfInterest')}
          </Text>
          <SimpleLanguageSelector />
        </View>
        <Text style={[styles.subtitle, i18nService.isRTL() && styles.rtlText]}>
          {i18nService.t('pointsCount', { count: points.length })}
        </Text>
      </View>

      {/* Location Button */}
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={getCurrentLocation}
        disabled={isLocationLoading}
      >
        <Text style={[styles.locationButtonText, i18nService.isRTL() && styles.rtlText]}>
          {isLocationLoading ? i18nService.t('gettingLocation') : `📍 ${i18nService.t('nearbyPoints')}`}
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
          
          {/* Кнопка для показа только посещенных точек */}
          <TouchableOpacity
            style={[
              styles.visitedFilterButton,
              selectedCategory === 'visited' && styles.visitedFilterButtonActive
            ]}
            onPress={() => {
              if (selectedCategory === 'visited') {
                setSelectedCategory('all');
                setPoints(allPoints);
              } else {
                setSelectedCategory('visited' as any);
                const visitedPoints = preprocessedDataService.getVisitedPoints();
                setPoints(visitedPoints);
              }
            }}
          >
            <Text style={[
              styles.visitedFilterText,
              selectedCategory === 'visited' && styles.visitedFilterTextActive
            ]}>
              🎯 Посещенные ({userService.getCurrentUser()?.totalVisits || 0})
            </Text>
          </TouchableOpacity>

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
        onToggleVisited={handleToggleVisited}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  rtlText: {
    textAlign: 'right',
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
  // Стили для кнопки посещенных точек
  visitedFilterButton: {
    margin: 10,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visitedFilterButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  visitedFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  visitedFilterTextActive: {
    color: '#fff',
  },
}); 