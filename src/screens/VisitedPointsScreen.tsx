import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import preprocessedDataService from '../services/PreprocessedDataService';
import userService from '../services/UserService';
import i18nService from '../services/I18nService';
import { audioService } from '../services/AudioService';
import { wazeService } from '../services/WazeService';
import likesService from '../services/LikesService';

import { PointOfInterest, RootStackParamList, PointCategory, User } from '../types';
import PointsList from '../components/PointsList';
import MapView from '../components/MapView';
import { visitedPointsScreenStyles } from '../styles';

type VisitedPointsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VisitedPoints'>;

export default function VisitedPointsScreen() {
  const navigation = useNavigation<VisitedPointsScreenNavigationProp>();
  
  // States
  const [visitedPoints, setVisitedPoints] = useState<PointOfInterest[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PointCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'stats'>('list');

  // Местоположение по умолчанию для карты
  const [mapLocation] = useState({
    latitude: 31.7683,
    longitude: 35.2137,
    accuracy: 0,
    timestamp: Date.now(),
  });

  useEffect(() => {
    loadVisitedPoints();
  }, []);

  const loadVisitedPoints = async () => {
    try {
      setIsLoading(true);
      
      // Получаем данные пользователя
      const currentUser = userService.getCurrentUser();
      setUser(currentUser);
      
      // Получаем посещенные точки
      const baseVisited = preprocessedDataService.getVisitedPoints();
      
      // Добавляем информацию о лайках к каждой точке
      const visited = baseVisited.map(point => ({
        ...point,
        likesCount: likesService.getLikesCount(point.id) || 0,
        isLikedByUser: userService.isPointLikedByUser(point.id) || false,
      }));
      
      setVisitedPoints(visited);
      
      console.log(`📊 Загружено ${visited.length} посещенных точек`);
      
    } catch (error) {
      console.error('Ошибка загрузки посещенных точек:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить посещенные точки');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVisitedPoints();
    setRefreshing(false);
  };

  const handlePointPress = (point: PointOfInterest) => {
    navigation.navigate('PointDetail', { point });
  };

  const handleToggleVisited = async (point: PointOfInterest) => {
    try {
      await preprocessedDataService.togglePointVisited(point.id, point.coordinates);
      await loadVisitedPoints(); // Перезагружаем список
    } catch (error) {
      console.error('Ошибка изменения статуса посещения:', error);
    }
  };

  const handleToggleLike = async (point: PointOfInterest) => {
    try {
      const newLikedStatus = await userService.togglePointLike(point.id);
      await loadVisitedPoints(); // Перезагружаем список
      console.log(`❤️ Точка ${point.id} ${newLikedStatus ? 'лайкнута' : 'лайк убран'}`);
    } catch (error) {
      console.error('Ошибка изменения лайка:', error);
      Alert.alert(i18nService.t('error'), 'Не удалось изменить лайк');
    }
  };

  const playAudio = async (point: PointOfInterest) => {
    try {
      const success = await audioService.playPointAudio(point.audioFilePath);
      if (!success) {
        Alert.alert('Ошибка', 'Аудиофайл недоступен');
      }
    } catch (error) {
      console.error('Ошибка воспроизведения аудио:', error);
      Alert.alert('Ошибка', 'Ошибка воспроизведения аудио');
    }
  };

  const openInWaze = async (point: PointOfInterest) => {
    try {
      const isWazeAvailable = await wazeService.isWazeInstalled();
      
      if (isWazeAvailable) {
        await wazeService.openWazeNavigation(point.latitude, point.longitude);
      } else {
        await wazeService.openAlternativeMaps(point.latitude, point.longitude);
      }
    } catch (error) {
      console.error('Ошибка навигации:', error);
      Alert.alert('Ошибка', 'Ошибка открытия навигации');
    }
  };

  const formatPointInfo = (point: PointOfInterest) => {
    const name = i18nService.getPointName(point.name);
    const description = i18nService.getPointDescription(point.description);
    
    return {
      title: name,
      subtitle: description.length > 100 ? description.substring(0, 100) + '...' : description,
      coords: `${point.coordinates.latitude.toFixed(4)}, ${point.coordinates.longitude.toFixed(4)}`
    };
  };

  const getCategoryColor = (category: PointCategory): string => {
    const colors: Record<PointCategory, string> = {
      historical: '#8B4513',
      religious: '#DAA520', 
      children: '#FF69B4',
      nature: '#32CD32',
      culture: '#9932CC',
      tourism: '#FF6347',
      architecture: '#4682B4',
      amenity: '#20B2AA',
      leisure: '#FF8C00'
    };
    return colors[category] || '#666';
  };

  const getCategoryName = (category: PointCategory): string => {
    return i18nService.t(category);
  };

  const getFilteredPoints = () => {
    if (selectedCategory === 'all') {
      return visitedPoints;
    }
    return visitedPoints.filter(point => point.category === selectedCategory);
  };

  const getVisitedCategories = (): PointCategory[] => {
    const categories = new Set<PointCategory>();
    visitedPoints.forEach(point => categories.add(point.category));
    return Array.from(categories);
  };

  const getStatsByCategory = () => {
    const stats: Record<PointCategory, number> = {
      historical: 0,
      religious: 0,
      children: 0,
      nature: 0,
      culture: 0,
      tourism: 0,
      architecture: 0,
      amenity: 0,
      leisure: 0,
    };

    visitedPoints.forEach(point => {
      if (stats[point.category] !== undefined) {
        stats[point.category]++;
      }
    });

    return Object.entries(stats)
      .filter(([_, count]) => count > 0)
      .map(([category, count]) => ({
        category: category as PointCategory,
        count,
        color: getCategoryColor(category as PointCategory),
        name: getCategoryName(category as PointCategory)
      }));
  };

  const clearAllVisited = () => {
    Alert.alert(
      'Очистить историю',
      'Вы уверены, что хотите удалить все посещенные точки?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.clearUserData();
              await userService.initializeUser();
              await loadVisitedPoints();
              Alert.alert('Готово', 'История посещений очищена');
            } catch (error) {
              console.error('Ошибка очистки данных:', error);
              Alert.alert('Ошибка', 'Не удалось очистить данные');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={visitedPointsScreenStyles.header}>
      <View style={visitedPointsScreenStyles.headerTop}>
        <TouchableOpacity 
          style={visitedPointsScreenStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={visitedPointsScreenStyles.backButtonText}>← {i18nService.t('back')}</Text>
        </TouchableOpacity>
        
        <Text style={visitedPointsScreenStyles.title}>{i18nService.t('visitedPoints')}</Text>
        
        <TouchableOpacity 
          style={visitedPointsScreenStyles.clearButton}
          onPress={clearAllVisited}
        >
          <Text style={visitedPointsScreenStyles.clearButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {user && (
        <View style={visitedPointsScreenStyles.userStats}>
          <Text style={visitedPointsScreenStyles.statsText}>
            Всего посещений: {user.totalVisits} | Уникальных мест: {visitedPoints.length}
          </Text>
          <Text style={visitedPointsScreenStyles.statsText}>
            С {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Переключатель режимов просмотра */}
      <View style={visitedPointsScreenStyles.viewModeContainer}>
        <TouchableOpacity
          style={[visitedPointsScreenStyles.viewModeButton, viewMode === 'list' && visitedPointsScreenStyles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[visitedPointsScreenStyles.viewModeText, viewMode === 'list' && visitedPointsScreenStyles.viewModeTextActive]}>
            📋 {i18nService.t('list')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[visitedPointsScreenStyles.viewModeButton, viewMode === 'map' && visitedPointsScreenStyles.viewModeButtonActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[visitedPointsScreenStyles.viewModeText, viewMode === 'map' && visitedPointsScreenStyles.viewModeTextActive]}>
            🗺️ {i18nService.t('map')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[visitedPointsScreenStyles.viewModeButton, viewMode === 'stats' && visitedPointsScreenStyles.viewModeButtonActive]}
          onPress={() => setViewMode('stats')}
        >
          <Text style={[visitedPointsScreenStyles.viewModeText, viewMode === 'stats' && visitedPointsScreenStyles.viewModeTextActive]}>
            📊 {i18nService.t('statistics')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Фильтр по категориям */}
      {(viewMode === 'list' || viewMode === 'map') && (
        <View style={visitedPointsScreenStyles.categoryFilter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                visitedPointsScreenStyles.categoryButton,
                selectedCategory === 'all' && visitedPointsScreenStyles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                visitedPointsScreenStyles.categoryButtonText,
                selectedCategory === 'all' && visitedPointsScreenStyles.categoryButtonTextActive
              ]}>
                {i18nService.t('all')} ({visitedPoints.length})
              </Text>
            </TouchableOpacity>
            
            {getVisitedCategories().map(category => {
              const count = visitedPoints.filter(p => p.category === category).length;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    visitedPointsScreenStyles.categoryButton,
                    { borderColor: getCategoryColor(category) },
                    selectedCategory === category && visitedPointsScreenStyles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    visitedPointsScreenStyles.categoryButtonText,
                    selectedCategory === category && visitedPointsScreenStyles.categoryButtonTextActive
                  ]}>
                    {getCategoryName(category)} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderStatistics = () => {
    const categoryStats = getStatsByCategory();
    
    return (
      <ScrollView style={visitedPointsScreenStyles.statsContainer}>
        <View style={visitedPointsScreenStyles.statsCard}>
          <Text style={visitedPointsScreenStyles.statsCardTitle}>📈 Общая статистика</Text>
          <View style={visitedPointsScreenStyles.statsRow}>
            <Text style={visitedPointsScreenStyles.statsLabel}>Всего посещений:</Text>
            <Text style={visitedPointsScreenStyles.statsValue}>{user?.totalVisits || 0}</Text>
          </View>
          <View style={visitedPointsScreenStyles.statsRow}>
            <Text style={visitedPointsScreenStyles.statsLabel}>Уникальных мест:</Text>
            <Text style={visitedPointsScreenStyles.statsValue}>{visitedPoints.length}</Text>
          </View>
          <View style={visitedPointsScreenStyles.statsRow}>
            <Text style={visitedPointsScreenStyles.statsLabel}>Категорий посещено:</Text>
            <Text style={visitedPointsScreenStyles.statsValue}>{categoryStats.length}</Text>
          </View>
        </View>

        <View style={visitedPointsScreenStyles.statsCard}>
          <Text style={visitedPointsScreenStyles.statsCardTitle}>🏷️ По категориям</Text>
          {categoryStats.map(({ category, count, color, name }) => (
            <View key={category} style={visitedPointsScreenStyles.categoryStatsRow}>
              <View style={visitedPointsScreenStyles.categoryStatsLeft}>
                <View style={[visitedPointsScreenStyles.categoryIndicator, { backgroundColor: color }]} />
                <Text style={visitedPointsScreenStyles.categoryStatsName}>{name}</Text>
              </View>
              <Text style={visitedPointsScreenStyles.categoryStatsCount}>{count}</Text>
            </View>
          ))}
        </View>

        {visitedPoints.length > 0 && (
          <View style={visitedPointsScreenStyles.statsCard}>
            <Text style={visitedPointsScreenStyles.statsCardTitle}>⏰ Последние посещения</Text>
            {visitedPoints
              .sort((a, b) => {
                if (!a.visitedAt || !b.visitedAt) return 0;
                return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
              })
              .slice(0, 5)
              .map(point => (
                <TouchableOpacity
                  key={point.id}
                  style={visitedPointsScreenStyles.recentVisitRow}
                  onPress={() => handlePointPress(point)}
                >
                  <Text style={visitedPointsScreenStyles.recentVisitName}>
                    {i18nService.getPointName(point.name)}
                  </Text>
                  <Text style={visitedPointsScreenStyles.recentVisitDate}>
                    {point.visitedAt ? new Date(point.visitedAt).toLocaleDateString() : ''}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderContent = () => {
    const filteredPoints = getFilteredPoints();
    
    if (isLoading) {
      return (
        <View style={visitedPointsScreenStyles.loadingContainer}>
          <Text style={visitedPointsScreenStyles.loadingText}>Загрузка посещенных мест...</Text>
        </View>
      );
    }

    if (visitedPoints.length === 0) {
      return (
        <View style={visitedPointsScreenStyles.emptyContainer}>
          <Text style={visitedPointsScreenStyles.emptyTitle}>🎯 Пока нет посещенных мест</Text>
          <Text style={visitedPointsScreenStyles.emptyText}>
            Исследуйте точки интереса, и они появятся здесь!
          </Text>
          <TouchableOpacity
            style={visitedPointsScreenStyles.exploreButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={visitedPointsScreenStyles.exploreButtonText}>🗺️ Исследовать</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (viewMode) {
      case 'map':
        return (
          <MapView
            currentLocation={mapLocation}
            points={filteredPoints}
            onPointPress={handlePointPress}
            getCategoryColor={getCategoryColor}
          />
        );
      
      case 'stats':
        return renderStatistics();
      
      default:
        return (
          <PointsList
            points={filteredPoints}
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
        );
    }
  };

  return (
    <SafeAreaView style={visitedPointsScreenStyles.container}>
      {renderHeader()}
      {renderContent()}
    </SafeAreaView>
  );
} 