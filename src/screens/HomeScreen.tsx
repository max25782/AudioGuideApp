import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
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
import likesService from '../services/LikesService';

import { PointOfInterest, PointCategory, Location, RootStackParamList } from '../types';
import CategoryFilter from '../components/CategoryFilter';
import PointsList from '../components/PointsList';
import SimpleLanguageSelector from '../components/SimpleLanguageSelector';
import { homeScreenStyles } from '../styles';

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
  const [viewMode, setViewMode] = useState<'all' | 'nearby'>('all'); // Новое состояние для режима просмотра
  const [totalLikes, setTotalLikes] = useState(0); // Состояние для общего количества лайков
  
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
    const initialize = async () => {
      try {
        await initializeData();
        // Автоматически получаем местоположение при загрузке
        getCurrentLocation();
      } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        Alert.alert('Ошибка', 'Не удалось инициализировать приложение. Попробуйте перезапустить.');
        setIsLoading(false);
      }
    };

    initialize();
    
    // Listen for language changes
    const handleLanguageChange = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    try {
      i18nService.addLanguageChangeListener(handleLanguageChange);
    } catch (error) {
      console.error('Ошибка добавления языкового слушателя:', error);
    }
    
    return () => {
      try {
        i18nService.removeLanguageChangeListener(handleLanguageChange);
        // Останавливаем отслеживание местоположения при размонтировании
        if (isLocationTracking) {
          locationService.stopLocationTracking();
        }
      } catch (error) {
        console.error('Ошибка очистки:', error);
      }
    };
  }, []);

  // Функция для обновления точек после автоматического посещения
  const refreshPointsData = async () => {
    try {
      const basePoints = preprocessedDataService.getAllPoints();
      
      // Добавляем информацию о лайках к каждой точке
      const updatedPoints = basePoints.map(point => ({
        ...point,
        likesCount: likesService.getLikesCount(point.id) || 0,
        isLikedByUser: userService.isPointLikedByUser(point.id) || false,
      }));
      
      setAllPoints(updatedPoints);
      
      if (selectedCategory === 'all') {
        setPoints(updatedPoints);
      } else {
        const categoryPoints = preprocessedDataService.getPointsByCategory(selectedCategory);
        const updatedCategoryPoints = categoryPoints.map(point => ({
          ...point,
          likesCount: likesService.getLikesCount(point.id) || 0,
          isLikedByUser: userService.isPointLikedByUser(point.id) || false,
        }));
        setPoints(updatedCategoryPoints);
      }
    } catch (error) {
      console.error('Ошибка обновления точек:', error);
    }
  };

  const initializeData = async () => {
    try {
      setIsLoading(true);
      console.log('🚀', i18nService.t('dataInitialization'));
      
      // Сначала инициализируем сервис лайков
      await likesService.initialize();
      
      // Инициализируем пользователя
      const user = await userService.initializeUser();
      console.log('👤 Пользователь инициализирован:', user.id);
      console.log('📈 Всего посещений:', user.totalVisits);
      
      // Загружаем все точки из сервиса (теперь с информацией о посещениях)
      const basePoints = preprocessedDataService.getAllPoints();
      console.log('✅', i18nService.t('pointsLoaded', { count: basePoints.length }));
      
      // Добавляем информацию о лайках к каждой точке
      const loadedPoints = basePoints.map(point => ({
        ...point,
        likesCount: likesService.getLikesCount(point.id) || 0,
        isLikedByUser: userService.isPointLikedByUser(point.id) || false,
      }));
      
      const visitedCount = loadedPoints.filter(p => p.isVisited).length;
      const likedCount = loadedPoints.filter(p => p.isLikedByUser).length;
      console.log('🎯 Посещенных точек:', visitedCount);
      console.log('❤️ Лайкнутых точек:', likedCount);
      
      setAllPoints(loadedPoints);
      
      // Устанавливаем режим "все" по умолчанию
      setViewMode('all');
      setPoints(loadedPoints);
      
      // Получаем статистику
      const stats = preprocessedDataService.getStatistics();
      console.log('📊', i18nService.t('statistics'), stats);
      
      // Обновляем общее количество лайков
      setTotalLikes(likesService.getTotalLikesCount());
      
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

  const updateNearbyPointsWithCategory = async (
    categoryId: PointCategory | 'all', 
    mode: 'all' | 'nearby' = viewMode,
    lat?: number, 
    lon?: number
  ) => {
    try {
      let filteredPoints: PointOfInterest[] = [];
      
      if (mode === 'nearby' && currentLocation) {
        // Режим "ближайшие" - показываем только ближайшие точки
        if (categoryId === 'all') {
          filteredPoints = preprocessedDataService.getNearbyPoints(
            currentLocation.latitude, 
            currentLocation.longitude, 
            15000
          );
          console.log('🔍 Показываю ближайшие точки:', filteredPoints.length);
        } else {
          filteredPoints = preprocessedDataService.getNearbyPointsByCategory(
            currentLocation.latitude, 
            currentLocation.longitude, 
            categoryId, 
            15000
          );
          console.log('🔍 Показываю ближайшие точки категории', i18nService.t(categoryId) + ':', filteredPoints.length);
        }
      } else {
        // Режим "все" - показываем все точки
        if (categoryId === 'all') {
          filteredPoints = allPoints;
          console.log('🔍 Показываю все точки:', filteredPoints.length);
        } else {
          filteredPoints = preprocessedDataService.getPointsByCategory(categoryId);
          console.log('🔍 Показываю все точки категории', i18nService.t(categoryId) + ':', filteredPoints.length);
        }
      }
      
      // Добавляем информацию о лайках к отфильтрованным точкам
      const pointsWithLikes = filteredPoints.map(point => ({
        ...point,
        likesCount: likesService.getLikesCount(point.id) || 0,
        isLikedByUser: userService.isPointLikedByUser(point.id) || false,
      }));
      
      setPoints(pointsWithLikes);
      
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

  const handleToggleLike = async (point: PointOfInterest) => {
    try {
      const newLikedStatus = await userService.togglePointLike(point.id);
      
      // Обновляем список точек
      await refreshPointsData();
      
      // Обновляем общее количество лайков
      setTotalLikes(likesService.getTotalLikesCount());
      
      console.log(`❤️ Точка ${point.id} ${newLikedStatus ? 'лайкнута' : 'лайк убран'}`);
    } catch (error) {
      console.error('Ошибка изменения лайка:', error);
      Alert.alert(i18nService.t('error'), 'Не удалось изменить лайк');
    }
  };

  const showAllPoints = async () => {
    try {
      // Устанавливаем режим "все"
      setViewMode('all');
      
      // Используем обновленную функцию фильтрации с явным указанием режима
      await updateNearbyPointsWithCategory(selectedCategory, 'all');
      
      console.log('🔍 Переключен в режим "все точки"');
    } catch (error) {
      console.error('❌ Ошибка показа всех точек:', error);
    }
  };

  const showNearbyPoints = async (latitude: number, longitude: number) => {
    try {
      // Устанавливаем режим "ближайшие"
      setViewMode('nearby');
      
      // Используем обновленную функцию фильтрации с явным указанием режима
      await updateNearbyPointsWithCategory(selectedCategory, 'nearby');

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
    // Обновляем общее количество лайков
    setTotalLikes(likesService.getTotalLikesCount());
    setRefreshing(false);
  };

  const playAudio = async (point: PointOfInterest) => {
    try {
      const audioPath = point.audioFilePath || `${point.id}.mp3`;
      const success = await audioService.playPointAudio(audioPath);
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
      <SafeAreaView style={homeScreenStyles.container}>
        <View style={homeScreenStyles.loadingContainer}>
          <Text style={homeScreenStyles.loadingText}>{i18nService.t('dataInitialization')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={homeScreenStyles.container}>
      {/* Header */}
      <View style={homeScreenStyles.header}>
        <View style={homeScreenStyles.headerTop}>
          <Text style={[homeScreenStyles.title, i18nService.isRTL() && homeScreenStyles.rtlText]}>
            {i18nService.t('pointsOfInterest')}
          </Text>
          <SimpleLanguageSelector />
        </View>
        <Text style={[homeScreenStyles.subtitle, i18nService.isRTL() && homeScreenStyles.rtlText]}>
          {i18nService.t('pointsCount', { count: points.length })}
        </Text>
      </View>

      {/* Action Buttons Row */}
      <View style={homeScreenStyles.actionButtonsRow}>
        <TouchableOpacity 
          style={homeScreenStyles.locationButton}
          onPress={getCurrentLocation}
          disabled={isLocationLoading}
        >
          <Text style={[homeScreenStyles.locationButtonText, i18nService.isRTL() && homeScreenStyles.rtlText]}>
            {isLocationLoading ? i18nService.t('gettingLocation') : `📍 ${i18nService.t('nearbyPoints')}`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={homeScreenStyles.locationButton}
          onPress={showAllPoints}
        >
          <Text style={[homeScreenStyles.locationButtonText, i18nService.isRTL() && homeScreenStyles.rtlText]}>
            🌍 {i18nService.t('allPoints')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visited Points Button Row */}
      <View style={homeScreenStyles.visitedButtonsRow}>
        <TouchableOpacity
          style={homeScreenStyles.visitedScreenButton}
          onPress={() => navigation.navigate('VisitedPoints')}
        >
          <Text style={homeScreenStyles.visitedScreenText}>
            🎯 {i18nService.t('visited')} ({userService.getCurrentUser()?.totalVisits || 0})
          </Text>
          <Text style={homeScreenStyles.visitedScreenArrow}>→</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={homeScreenStyles.visitedScreenButton}
          onPress={() => navigation.navigate('TopPoints')}
        >
          <Text style={homeScreenStyles.visitedScreenText}>
            🔥 {i18nService.t('topPoints')} ({totalLikes})
          </Text>
          <Text style={homeScreenStyles.visitedScreenArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <CategoryFilter
        categories={getAvailableCategories()}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
        getCategoryName={getCategoryName}
        getCategoryColor={getCategoryColor}
      />

      {/* Map - временно отключен для улучшения производительности */}
      {/* <MapView
        currentLocation={mapLocation}
        points={points.slice(0, 50)} // Ограничиваем для производительности
        onPointPress={handlePointPress}
        getCategoryColor={getCategoryColor}
      /> */}

      {/* Points List - теперь без ScrollView */}
      <PointsList
        points={points}
        onPointPress={handlePointPress}
        onPlayAudio={playAudio}
        onOpenInWaze={openInWaze}
        onToggleVisited={handleToggleVisited}
        onToggleLike={handleToggleLike}
        formatPointInfo={formatPointInfo}
        getCategoryColor={getCategoryColor}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </SafeAreaView>
  );
}

