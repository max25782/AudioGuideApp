import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
import { pointDetailScreenStyles } from '../styles';

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
        const audioPath = point.audioFilePath || `${point.id}.mp3`;
        const success = await audioService.playPointAudio(audioPath);
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
    <SafeAreaView style={pointDetailScreenStyles.container}>
      <ScrollView contentContainerStyle={pointDetailScreenStyles.scrollContent}>
        {/* Карта */}
        <View style={pointDetailScreenStyles.mapContainer}>
          <MapView
            style={pointDetailScreenStyles.map}
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
        <View style={pointDetailScreenStyles.infoContainer}>
          <Text style={[pointDetailScreenStyles.title, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
            {i18nService.getPointName(currentPoint.name)}
          </Text>
          <Text style={[pointDetailScreenStyles.category, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
            {getCategoryDisplayName(currentPoint.category)}
          </Text>
          <Text style={[pointDetailScreenStyles.description, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
            {i18nService.getPointDescription(currentPoint.description)}
          </Text>
          {currentPoint.isVisited && currentPoint.visitedAt && (
            <Text style={[pointDetailScreenStyles.visitedInfo, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
              🎯 Посещено: {new Date(currentPoint.visitedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Кнопки действий */}
        <View style={pointDetailScreenStyles.buttonsContainer}>
          {/* Аудио контролы */}
          <View style={pointDetailScreenStyles.audioControlsContainer}>
            <TouchableOpacity
              style={[pointDetailScreenStyles.actionButton, pointDetailScreenStyles.audioButton, isAudioPlaying && pointDetailScreenStyles.audioButtonPlaying]}
              onPress={handlePlayAudio}
            >
              <Text style={[pointDetailScreenStyles.buttonText, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
                {isAudioPlaying ? `⏹️ ${i18nService.t('stopAudio')}` : `🎵 ${i18nService.t('audioGuide')}`}
              </Text>
            </TouchableOpacity>

            {isAudioPlaying && (
              <View style={pointDetailScreenStyles.audioSecondaryControls}>
                <TouchableOpacity
                  style={[pointDetailScreenStyles.actionButton, pointDetailScreenStyles.pauseButton]}
                  onPress={handlePauseAudio}
                >
                  <Text style={[pointDetailScreenStyles.buttonText, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
                    ⏸️ {i18nService.t('pauseAudio')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[pointDetailScreenStyles.actionButton, pointDetailScreenStyles.stopButton]}
                  onPress={handleStopAudio}
                >
                  <Text style={[pointDetailScreenStyles.buttonText, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
                    ⏹️ {i18nService.t('stopAudio')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              pointDetailScreenStyles.actionButton, 
              currentPoint.isVisited ? pointDetailScreenStyles.removeVisitedButton : pointDetailScreenStyles.addVisitedButton
            ]}
            onPress={handleToggleVisited}
          >
            <Text style={[pointDetailScreenStyles.buttonText, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
              {currentPoint.isVisited ? '✓ Посещено' : '+ Отметить посещение'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[pointDetailScreenStyles.actionButton, pointDetailScreenStyles.navigateButton]}
            onPress={handleNavigate}
          >
            <Text style={[pointDetailScreenStyles.buttonText, i18nService.isRTL() && pointDetailScreenStyles.rtlText]}>
              🗺️ {i18nService.t('navigate')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

