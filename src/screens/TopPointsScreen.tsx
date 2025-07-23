import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import preprocessedDataService from '../services/PreprocessedDataService';
import likesService from '../services/LikesService';
import userService from '../services/UserService';
import { audioService } from '../services/AudioService';
import { wazeService } from '../services/WazeService';
import i18nService from '../services/I18nService';

import { PointOfInterest, PointCategory, RootStackParamList } from '../types';
import PointsList from '../components/PointsList';
import { homeScreenStyles } from '../styles';

type TopPointsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TopPoints'>;

export default function TopPointsScreen() {
  const navigation = useNavigation<TopPointsScreenNavigationProp>();
  
  // States
  const [topPoints, setTopPoints] = useState<PointOfInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    loadTopPoints();
    
    // Listen for language changes
    const handleLanguageChange = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    i18nService.addLanguageChangeListener(handleLanguageChange);
    
    return () => {
      i18nService.removeLanguageChangeListener(handleLanguageChange);
    };
  }, []);

  const loadTopPoints = async () => {
    try {
      setIsLoading(true);
      console.log('🔥 Загружаю лучшие точки...');
      
      // Получаем топ точек по лайкам
      const topLikedPoints = likesService.getTopLikedPoints(50); // топ 50
      
      if (topLikedPoints.length === 0) {
        setTopPoints([]);
        return;
      }
      
      // Получаем данные о точках
      const allPoints = preprocessedDataService.getAllPoints();
      const topPointsWithData: PointOfInterest[] = [];
      
      for (const { pointId, likesCount } of topLikedPoints) {
        const point = allPoints.find(p => p.id === pointId);
        if (point) {
          const enhancedPoint: PointOfInterest = {
            ...point,
            likesCount: likesCount || 0,
            isLikedByUser: userService.isPointLikedByUser(pointId) || false,
          };
          topPointsWithData.push(enhancedPoint);
        }
      }
      
      setTopPoints(topPointsWithData);
      console.log('✅ Загружено лучших точек:', topPointsWithData.length);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки лучших точек:', error);
      Alert.alert(i18nService.t('error'), i18nService.t('dataLoadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointPress = (point: PointOfInterest) => {
    navigation.navigate('PointDetail', { point });
  };

  const handleToggleVisited = async (point: PointOfInterest) => {
    try {
      await preprocessedDataService.togglePointVisited(
        point.id, 
        point.coordinates
      );
      
      // Обновляем список точек
      await loadTopPoints();
      
      console.log(`🎯 Точка ${point.id} изменен статус посещения`);
    } catch (error) {
      console.error('Ошибка изменения статуса посещения:', error);
    }
  };

  const handleToggleLike = async (point: PointOfInterest) => {
    try {
      const newLikedStatus = await userService.togglePointLike(point.id);
      
      // Обновляем список точек
      await loadTopPoints();
      
      console.log(`❤️ Точка ${point.id} ${newLikedStatus ? 'лайкнута' : 'лайк убран'}`);
    } catch (error) {
      console.error('Ошибка изменения лайка:', error);
      Alert.alert(i18nService.t('error'), 'Не удалось изменить лайк');
    }
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
          true
        );
        
        // Обновляем список точек
        await loadTopPoints();
        
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
      const isWazeAvailable = await wazeService.isWazeInstalled();
      
      if (isWazeAvailable) {
        await wazeService.openWazeNavigation(point.latitude, point.longitude);
      } else {
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTopPoints();
    setRefreshing(false);
  };

  const getStatistics = () => {
    const stats = likesService.getLikesStatistics();
    return stats;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={homeScreenStyles.container}>
        <View style={homeScreenStyles.loadingContainer}>
          <Text style={homeScreenStyles.loadingText}>{i18nService.t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = getStatistics();

  return (
    <SafeAreaView style={homeScreenStyles.container}>
      {/* Header */}
      <View style={homeScreenStyles.header}>
        <View style={homeScreenStyles.headerTop}>
          <TouchableOpacity
            style={homeScreenStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={homeScreenStyles.backButtonText}>← {i18nService.t('back')}</Text>
          </TouchableOpacity>
          <Text style={[homeScreenStyles.title, i18nService.isRTL() && homeScreenStyles.rtlText]}>
            🔥 {i18nService.t('topPoints')}
          </Text>
        </View>
        
        <Text style={[homeScreenStyles.subtitle, i18nService.isRTL() && homeScreenStyles.rtlText]}>
          {i18nService.t('topPointsCount', { count: topPoints.length })}
        </Text>
        
        {/* Statistics */}
        <View style={homeScreenStyles.statsContainer}>
          <Text style={[homeScreenStyles.statsText, i18nService.isRTL() && homeScreenStyles.rtlText]}>
            📊 {i18nService.t('totalLikes')}: {stats?.totalLikes || 0}
          </Text>
          {stats?.topPoint && (
            <Text style={[homeScreenStyles.statsText, i18nService.isRTL() && homeScreenStyles.rtlText]}>
              👑 {i18nService.t('mostLiked')}: {stats.topPoint.likesCount} {i18nService.t('likes')}
            </Text>
          )}
        </View>
      </View>

      {/* Empty State */}
      {topPoints.length === 0 ? (
        <View style={homeScreenStyles.emptyContainer}>
          <Text style={homeScreenStyles.emptyTitle}>🤍</Text>
          <Text style={homeScreenStyles.emptyText}>
            {i18nService.t('noLikedPointsYet')}
          </Text>
          <Text style={homeScreenStyles.emptySubtext}>
            {i18nService.t('likePointsToSeeThemHere')}
          </Text>
        </View>
      ) : (
        /* Points List */
        <PointsList
          points={topPoints}
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
      )}
    </SafeAreaView>
  );
} 