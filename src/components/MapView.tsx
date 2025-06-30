import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { PointOfInterest, Location, PointCategory } from '../types';

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
            title={point.name}
            description={point.description}
            pinColor={getCategoryColor(point.category)}
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