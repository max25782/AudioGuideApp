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

  // Получаем маршрут через Directions API
  useEffect(() => {
    const fetchRoute = async () => {
      if (!userLocation) {
        console.log('userLocation is null');
        return;
      }
      // Use environment variable or secure storage for API key
      const apiKey = process.env.GOOGLE_MAPS_API_KEY || __DEV__ ? 'DEMO_KEY' : '';
      if (!apiKey || apiKey === 'DEMO_KEY') {
        console.warn('Google Maps API key not configured');
        Alert.alert('Конфигурация', 'API ключ Google Maps не настроен');
        return;
      }
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
      const success = await audioService.playPointAudio(point.audioFilePath);
      if (!success) {
        Alert.alert('Ошибка', 'Не удалось воспроизвести аудиогид');
      }
    } catch (error) {
      console.error('Ошибка воспроизведения аудио:', error);
      Alert.alert('Ошибка', 'Проблема с аудиофайлом');
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
          <TouchableOpacity
            style={[styles.actionButton, styles.audioButton]}
            onPress={handlePlayAudio}
          >
            <Text style={styles.buttonText}>🎵 Слушать аудиогид</Text>
          </TouchableOpacity>

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
  navigateButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 