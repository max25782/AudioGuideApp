import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Alert, StatusBar, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import MapViewComponent from '../components/MapView';
import CategoryFilter from '../components/CategoryFilter';
import PointsList from '../components/PointsList';
import { PointOfInterest, Location, Category, PointCategory } from '../types';
import { getAllPoints, getCategories, getNearbyPoints, getNearbyPointsByCategory } from '../services/DatabaseService';
import { locationService } from '../services/LocationService';
import { audioService } from '../services/AudioService';
import { wazeService } from '../services/WazeService';

const HomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterest[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<PointOfInterest[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<PointOfInterest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPlayingPoint, setCurrentPlayingPoint] = useState<PointOfInterest | null>(null);

  const mapRef = useRef<MapView>(null);

  // Константа для радиуса поиска
  const SEARCH_RADIUS = 1000; // 1000 метров

  // Инициализация приложения
  useEffect(() => {
    initializeApp();
  }, []);

  // Эффект для анимации карты к текущему местоположению
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        1000 // Длительность анимации в мс
      );
    }
  }, [currentLocation]);

  // Эффект для обновления точек при изменении местоположения
  useEffect(() => {
    if (currentLocation) {
      updateNearbyPoints();
    }
  }, [currentLocation]);

  const initializeApp = async () => {
    try {
      // Сначала получаем местоположение
      const hasPermission = await locationService.requestPermissions();
      let location = null;
      if (hasPermission) {
        location = await locationService.getCurrentLocation();
      }

      if (location) {
        setCurrentLocation(location);
      } else {
        // Молча устанавливаем местоположение по умолчанию, если не удалось определить
        console.warn('Не удалось определить местоположение. Устанавливаем значение по умолчанию.');
        setCurrentLocation({ latitude: 32.168461,  longitude: 35.067126 });
      }

      // Получаем категории (это быстро)
      const categoryNames = await getCategories();
      const categoryObjects: Category[] = categoryNames.map((name: PointCategory) => ({
        id: name,
        name: getCategoryDisplayName(name),
        color: getCategoryColor(name),
      }));
      setCategories(categoryObjects);

      // Только теперь убираем загрузку
      setIsLoading(false);

    } catch (error) {
      console.error('Ошибка инициализации приложения:', error);
      Alert.alert('Ошибка', 'Не удалось инициализировать приложение');
      setIsLoading(false);
    }
  };

  const updateNearbyPoints = async () => {
    if (!currentLocation) return;

    try {
      console.log(`[HomeScreen] Обновляем точки в радиусе ${SEARCH_RADIUS} метров от текущего местоположения`);
      
      let nearbyPoints: PointOfInterest[];
      
      if (selectedCategory) {
        // Если выбрана категория, получаем точки этой категории в радиусе
        nearbyPoints = await getNearbyPointsByCategory(
          currentLocation.latitude, 
          currentLocation.longitude, 
          selectedCategory, 
          SEARCH_RADIUS
        );
      } else {
        // Иначе получаем все точки в радиусе
        nearbyPoints = await getNearbyPoints(
          currentLocation.latitude, 
          currentLocation.longitude, 
          SEARCH_RADIUS
        );
      }
      
      setPointsOfInterest(nearbyPoints);
      setFilteredPoints(nearbyPoints);
      
      console.log(`[HomeScreen] Отображаем ${nearbyPoints.length} близлежащих точек`);
    } catch (error) {
      console.error('Ошибка обновления близлежащих точек:', error);
      // В случае ошибки, устанавливаем пустой массив вместо краха приложения
      setPointsOfInterest([]);
      setFilteredPoints([]);
    }
  };

  const getCategoryColor = (category: PointCategory): string => {
    switch (category) {
      case 'historical':
        return '#4ECDC4';
      case 'religious':
        return '#45B7D1';
      case 'children':
        return '#96CEB4';
      case 'nature':
        return '#FFEAA7';
      case 'culture':
        return '#C39BD3';
      case 'tourism':
        return '#F7DC6F';
      case 'architecture':
        return '#E59866';
      default:
        return '#DDA0DD';
    }
  };

  // Новая функция для получения красивых названий категорий
  const getCategoryDisplayName = (category: PointCategory): string => {
    const names: { [key in PointCategory]: string } = {
      historical: 'Исторический',
      religious: 'Религиозный',
      children: 'Детский',
      nature: 'Природный',
      culture: 'Культура',
      tourism: 'Туризм',
      architecture: 'Архитектура',
      unknown: 'Неизвестно',
    };
    return names[category] || category;
  };

  // Функция для расчета расстояния (используется для оптимизации обновлений)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // расстояние в метрах
  };

  // Очистка при размонтировании компонента и запуск отслеживания
  useEffect(() => {
    const startTracking = () => {
      locationService.startLocationTracking((point) => {
        // Автоматическое воспроизведение аудио при приближении к точке
        handleNearbyPoint(point);
      });

      // Добавляем периодическое обновление местоположения и близлежащих точек
      const locationUpdateInterval = setInterval(async () => {
        try {
          const newLocation = await locationService.getCurrentLocation();
          if (newLocation && currentLocation) {
            // Обновляем только если местоположение изменилось значительно (более 50 метров)
            const distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              newLocation.latitude,
              newLocation.longitude
            );
            
            if (distance > 50) {
              console.log(`[HomeScreen] Местоположение изменилось на ${distance.toFixed(0)} метров, обновляем точки`);
              setCurrentLocation(newLocation);
              // updateNearbyPoints будет вызван автоматически через useEffect
            }
          }
        } catch (error) {
          console.error('Ошибка обновления местоположения:', error);
        }
      }, 30000); // Обновляем каждые 30 секунд

      // Сохраняем интервал для очистки при размонтировании компонента
      return () => {
        clearInterval(locationUpdateInterval);
        locationService.stopLocationTracking();
      };
    };

    const cleanup = startTracking();
    return cleanup;
  }, [currentLocation]); // Зависимость от currentLocation для корректной работы

  const handleNearbyPoint = async (point: PointOfInterest) => {
    Alert.alert(
      'Новая точка поблизости!',
      `Вы приблизились к "${point.title}". Воспроизвести аудиогид?`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Слушать', onPress: () => handlePlayAudio(point) },
      ]
    );
  };

  // Обработка выбора категории - теперь обновляет близлежащие точки
  const handleCategorySelect = async (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSelectedPoint(null);
    
    // Обновляем точки с новым фильтром категории
    if (currentLocation) {
      await updateNearbyPoints();
    }
  };

  const handleMarkerPress = (point: PointOfInterest) => {
    setSelectedPoint(point);
  };

  const handleMapPress = () => {
    setSelectedPoint(null);
  };

  const handlePointPress = (point: PointOfInterest) => {
    setSelectedPoint(point);
  };

  const handlePlayAudio = async (point: PointOfInterest) => {
    try {
      if (currentPlayingPoint?.id === point.id && isAudioPlaying) {
        // Останавливаем воспроизведение
        await audioService.pauseAudio();
        setIsAudioPlaying(false);
        setCurrentPlayingPoint(null);
      } else {
        // Останавливаем текущее воспроизведение
        if (isAudioPlaying) {
          await audioService.stopAudio();
        }

        // Воспроизводим новое аудио
        const audioFile = point.audioFilePath;
        if (!audioFile) {
          Alert.alert('Ошибка', 'Аудиофайл не найден для этой точки');
          return;
        }
        const success = await audioService.playPointAudio(audioFile);
        if (success) {
          setIsAudioPlaying(true);
          setCurrentPlayingPoint(point);
        } else {
          Alert.alert('Ошибка', 'Не удалось воспроизвести аудиофайл');
        }
      }
    } catch (error) {
      console.error('Ошибка воспроизведения аудио:', error);
      Alert.alert('Ошибка', 'Не удалось воспроизвести аудио');
    }
  };

  const handleWazePress = async (point: PointOfInterest) => {
    try {
      const success = await wazeService.openWazeNavigation(
        point.latitude,
        point.longitude
      );
      
      if (!success) {
        Alert.alert(
          'Waze не установлен',
          'Приложение Waze не установлено на вашем устройстве. Установить?',
          [
            { text: 'Отмена', style: 'cancel' },
            { text: 'Установить', onPress: () => wazeService.openAlternativeMaps(point.latitude, point.longitude) },
          ]
        );
      }
    } catch (error) {
      console.error('Ошибка открытия Waze:', error);
      Alert.alert('Ошибка', 'Не удалось открыть Waze');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка данных...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Карта */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          currentLocation={currentLocation}
          pointsOfInterest={filteredPoints}
          selectedPoint={selectedPoint}
          onMarkerPress={handleMarkerPress}
          onMapPress={handleMapPress}
        />
      </View>

      {/* Фильтр категорий */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {/* Список точек */}
      <View style={styles.listContainer}>
        <PointsList
          points={filteredPoints}
          onPointPress={handlePointPress}
          onWazePress={handleWazePress}
          onPlayAudio={handlePlayAudio}
          isAudioPlaying={isAudioPlaying}
          currentPlayingPoint={currentPlayingPoint}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    flex: 0.6,
  },
  listContainer: {
    flex: 0.4,
  },
});

export default HomeScreen; 