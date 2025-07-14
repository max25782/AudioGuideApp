import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { PointOfInterest, Location, PointCategory } from '../types';
import i18nService from '../services/I18nService';

export interface MapViewProps {
  currentLocation: Location;
  points: PointOfInterest[];
  onPointPress: (point: PointOfInterest) => void;
  getCategoryColor: (category: PointCategory) => string;
}

export default function MapViewComponent({
  currentLocation,
  points,
  onPointPress,
  getCategoryColor,
}: MapViewProps) {
  const region: Region = {
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={`${point.isVisited ? '✓ ' : ''}${i18nService.getPointName(point.name)}`}
            description={`${i18nService.getPointDescription(point.description).substring(0, 100)}${point.isVisited ? '\n🎯 Посещено' : ''}`}
            pinColor={point.isVisited ? '#4CAF50' : getCategoryColor(point.category)}
            opacity={point.isVisited ? 0.8 : 1.0}
            onPress={() => onPointPress(point)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    margin: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
}); 