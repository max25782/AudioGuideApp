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
        Alert.alert('Ошибка маршрута', 'Не удалось получить маршрут от Google Directions API');
        return;
      }
      const points = polyline.decode(data.routes[0].overview_polyline.points);
      if (!points.length) {
        console.log('Polyline decode error:', data.routes[0]);
        Alert.alert('Ошибка маршрута', 'Polyline пустой');
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
          Alert.alert('Ошибка', 'Не удалось воспроизвести аудиогид');
        } else {
          setIsAudioPlaying(true);
        }
      }
    } catch (error) {
      console.error('Ошибка воспроизведения аудио:', error);
      Alert.alert('Ошибка', 'Проблема с аудиофайлом');
    }
  };

  const handlePauseAudio = async () => {
    try {
      if (isAudioPlaying) {
        await audioService.pauseAudio();
        setIsAudioPlaying(false);
      }
    } catch (error) {
      console.error('Ошибка паузы аудио:', error);
      Alert.alert('Ошибка', 'Не удалось поставить на паузу');
    }
  };

  const handleStopAudio = async () => {
    try {
      await audioService.stopAudio();
      setIsAudioPlaying(false);
    } catch (error) {
      console.error('Ошибка остановки аудио:', error);
      Alert.alert('Ошибка', 'Не удалось остановить аудио');
    }
  };

  const handleNavigate = async () => {
    try {
      const isWazeAvailable = await wazeService.isWazeInstalled();
      
      if (isWazeAvailable) {
        await wazeService.openWazeNavigation(point.latitude, point.longitude);
      } else {
        await wazeService.openAlternativeMaps(point.latitude, point.longitude);
      }
    } catch (error) {
      console.error('Ошибка навигации:', error);
      Alert.alert('Ошибка', 'Не удалось открыть навигацию');
    }
  };

  const getCategoryDisplayName = (category: string): string => {
    const categoryNames: Record<string, string> = {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Карта */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: point.latitude,
              longitude: point.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            <Marker
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              title={point.name}
              description={point.description}
            />
            {userLocation && (
              <Marker
                coordinate={userLocation}
                pinColor="blue"
                title="המיקום שלי"
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
          <Text style={styles.title}>{point.name}</Text>
          <Text style={styles.category}>{getCategoryDisplayName(point.category)}</Text>
          <Text style={styles.description}>{point.description}</Text>
        </View>

        {/* Кнопки действий */}
        <View style={styles.buttonsContainer}>
          {/* Аудио контролы */}
          <View style={styles.audioControlsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.audioButton, isAudioPlaying && styles.audioButtonPlaying]}
              onPress={handlePlayAudio}
            >
              <Text style={styles.buttonText}>
                {isAudioPlaying ? '⏹️ Остановить' : '🎵 Слушать аудиогид'}
              </Text>
            </TouchableOpacity>

            {isAudioPlaying && (
              <View style={styles.audioSecondaryControls}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.pauseButton]}
                  onPress={handlePauseAudio}
                >
                  <Text style={styles.buttonText}>⏸️ Пауза</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.stopButton]}
                  onPress={handleStopAudio}
                >
                  <Text style={styles.buttonText}>⏹️ Стоп</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.navigateButton]}
            onPress={handleNavigate}
          >
            <Text style={styles.buttonText}>🗺️ Проложить маршрут</Text>
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 