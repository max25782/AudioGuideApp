import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';

import { PointOfInterest, RootStackParamList } from '../types';
import { audioService } from '../services/AudioService';
import { wazeService } from '../services/WazeService';
import i18nService from '../services/I18nService';
import preprocessedDataService from '../services/PreprocessedDataService';

type PointDetailScreenRouteProp = {
  key: string;
  name: string;
  params: {
    point: PointOfInterest;
  };
};

type PointDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PointDetail'>;

export default function PointDetailScreen() {
  const route = useRoute<PointDetailScreenRouteProp>();
  const navigation = useNavigation<PointDetailScreenNavigationProp>();
  const { point } = route.params;

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<PointOfInterest>(point);

  // Инициализируем точку с актуальным статусом посещения
  useEffect(() => {
    const initializePoint = async () => {
      // Получаем обновленные данные точки с информацией о посещении
      const allPoints = preprocessedDataService.getAllPoints();
      const updatedPoint = allPoints.find(p => p.id === point.id);
      if (updatedPoint) {
        setCurrentPoint(updatedPoint);
      }
    };
    
    initializePoint();
  }, [point.id]);

  // Получаем текущее местоположение пользователя
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // Проверяем статус аудио каждую секунду
  useEffect(() => {
    const audioStatusInterval = setInterval(() => {
      setIsAudioPlaying(audioService.isAudioPlaying());
    }, 1000);

    return () => clearInterval(audioStatusInterval);
  }, []);

  // Получаем маршрут через Directions API
  useEffect(() => {
    const fetchRoute = async () => {
      if (!userLocation) {
        console.log('userLocation is null');
        return;
      }
      const apiKey = 'AIzaSyDF3H6Q_xtm5f3xAeIC4V2UZ9En6wqRllM';
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation.latitude},${userLocation.longitude}&destination=${point.latitude},${point.longitude}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data.routes || !data.routes.length) {
        console.log('Directions API error:', data);
        Alert.alert(i18nService.t('routeError'), i18nService.t('routeNotFound'));
        return;
      }
      const points = polyline.decode(data.routes[0].overview_polyline.points);
      if (!points.length) {
        console.log('Polyline decode error:', data.routes[0]);
        Alert.alert(i18nService.t('routeError'), i18nService.t('routeNotFound'));
        return;
      }
      const coords = points.map(([latitude, longitude]: [number, number]) => ({ latitude, longitude }));
      setRouteCoords(coords);
      console.log('Маршрут построен:', coords.length, 'точек');
    };
    fetchRoute();
  }, [userLocation, point]);

  const handlePlayAudio = async () => {
    try {
      if (isAudioPlaying) {
        // Если аудио уже играет, останавливаем его
        await audioService.stopAudio();
        setIsAudioPlaying(false);
      } else {
        // Если аудио не играет, запускаем его
        const success = await audioService.playPointAudio(point.audioFilePath);
        if (!success) {
          Alert.alert(i18nService.t('error'), i18nService.t('audioNotAvailable'));
        } else {
          setIsAudioPlaying(true);
        }
      }
    } catch (error) {
      console.error(i18nService.t('audioError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('audioPlaybackError'));
    }
  };

  const handlePauseAudio = async () => {
    try {
      if (isAudioPlaying) {
        await audioService.pauseAudio();
        setIsAudioPlaying(false);
      }
    } catch (error) {
      console.error(i18nService.t('audioError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('audioNotAvailable'));
    }
  };

  const handleStopAudio = async () => {
    try {
      await audioService.stopAudio();
      setIsAudioPlaying(false);
    } catch (error) {
      console.error(i18nService.t('audioError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('audioNotAvailable'));
    }
  };

  const handleNavigate = async () => {
    try {
      const isWazeAvailable = await wazeService.isWazeInstalled();
      
      if (isWazeAvailable) {
        await wazeService.openWazeNavigation(currentPoint.latitude, currentPoint.longitude);
      } else {
        await wazeService.openAlternativeMaps(currentPoint.latitude, currentPoint.longitude);
      }
    } catch (error) {
      console.error(i18nService.t('navigationError'), error);
      Alert.alert(i18nService.t('error'), i18nService.t('navigationError'));
    }
  };

  const handleToggleVisited = async () => {
    try {
      const newVisitedStatus = await preprocessedDataService.togglePointVisited(
        currentPoint.id, 
        currentPoint.coordinates
      );
      
      // Обновляем локальное состояние точки
      const updatedPoint = {
        ...currentPoint,
        isVisited: newVisitedStatus,
        visitedAt: newVisitedStatus ? new Date() : undefined
      };
      
      setCurrentPoint(updatedPoint);
      
      console.log(`🎯 Точка ${currentPoint.id} ${newVisitedStatus ? 'добавлена в' : 'удалена из'} посещенные`);
    } catch (error) {
      console.error('Ошибка изменения статуса посещения:', error);
      Alert.alert('Ошибка', 'Не удалось изменить статус посещения');
    }
  };

  const getCategoryDisplayName = (category: string): string => {
    return i18nService.t(category as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Карта */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: currentPoint.latitude,
              longitude: currentPoint.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            <Marker
              coordinate={{
                latitude: currentPoint.latitude,
                longitude: currentPoint.longitude,
              }}
              title={`${currentPoint.isVisited ? '✓ ' : ''}${i18nService.getPointName(currentPoint.name)}`}
              description={`${i18nService.getPointDescription(currentPoint.description).substring(0, 100)}${currentPoint.isVisited ? '\n🎯 Посещено' : ''}`}
              pinColor={currentPoint.isVisited ? '#4CAF50' : 'red'}
            />
            {userLocation && (
              <Marker
                coordinate={userLocation}
                pinColor="blue"
                title={i18nService.t('myLocation')}
                description=""
              />
            )}
            {routeCoords.length > 0 && (
              <Polyline
                coordinates={routeCoords}
                strokeWidth={4}
                strokeColor="blue"
              />
            )}
          </MapView>
        </View>

        {/* Информация о точке */}
        <View style={styles.infoContainer}>
          <Text style={[styles.title, i18nService.isRTL() && styles.rtlText]}>
            {i18nService.getPointName(currentPoint.name)}
          </Text>
          <Text style={[styles.category, i18nService.isRTL() && styles.rtlText]}>
            {getCategoryDisplayName(currentPoint.category)}
          </Text>
          <Text style={[styles.description, i18nService.isRTL() && styles.rtlText]}>
            {i18nService.getPointDescription(currentPoint.description)}
          </Text>
          {currentPoint.isVisited && currentPoint.visitedAt && (
            <Text style={[styles.visitedInfo, i18nService.isRTL() && styles.rtlText]}>
              🎯 Посещено: {new Date(currentPoint.visitedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Кнопки действий */}
        <View style={styles.buttonsContainer}>
          {/* Аудио контролы */}
          <View style={styles.audioControlsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.audioButton, isAudioPlaying && styles.audioButtonPlaying]}
              onPress={handlePlayAudio}
            >
              <Text style={[styles.buttonText, i18nService.isRTL() && styles.rtlText]}>
                {isAudioPlaying ? `⏹️ ${i18nService.t('stopAudio')}` : `🎵 ${i18nService.t('audioGuide')}`}
              </Text>
            </TouchableOpacity>

            {isAudioPlaying && (
              <View style={styles.audioSecondaryControls}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.pauseButton]}
                  onPress={handlePauseAudio}
                >
                  <Text style={[styles.buttonText, i18nService.isRTL() && styles.rtlText]}>
                    ⏸️ {i18nService.t('pauseAudio')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.stopButton]}
                  onPress={handleStopAudio}
                >
                  <Text style={[styles.buttonText, i18nService.isRTL() && styles.rtlText]}>
                    ⏹️ {i18nService.t('stopAudio')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              currentPoint.isVisited ? styles.removeVisitedButton : styles.addVisitedButton
            ]}
            onPress={handleToggleVisited}
          >
            <Text style={[styles.buttonText, i18nService.isRTL() && styles.rtlText]}>
              {currentPoint.isVisited ? '✓ Посещено' : '+ Отметить посещение'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.navigateButton]}
            onPress={handleNavigate}
          >
            <Text style={[styles.buttonText, i18nService.isRTL() && styles.rtlText]}>
              🗺️ {i18nService.t('navigate')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mapContainer: {
    height: 250,
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  buttonsContainer: {
    padding: 20,
    gap: 15,
  },
  actionButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  audioButton: {
    backgroundColor: '#4CAF50',
  },
  audioButtonPlaying: {
    backgroundColor: '#f44336',
  },
  audioControlsContainer: {
    marginBottom: 15,
  },
  audioSecondaryControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    flex: 1,
  },
  stopButton: {
    backgroundColor: '#f44336',
    flex: 1,
  },
  navigateButton: {
    backgroundColor: '#2196F3',
  },
  addVisitedButton: {
    backgroundColor: '#FF9800',
  },
  removeVisitedButton: {
    backgroundColor: '#4CAF50',
  },
  visitedInfo: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
    fontStyle: 'italic',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rtlText: {
    textAlign: 'right',
  },
}); 