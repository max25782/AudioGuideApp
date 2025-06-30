import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker } from 'react-native-maps';

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
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              title={point.name}
              description={point.description}
            />
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