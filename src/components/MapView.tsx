import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { PointOfInterest, Location } from '../types';

interface MapViewProps {
  currentLocation: Location | null;
  pointsOfInterest: PointOfInterest[];
  selectedPoint: PointOfInterest | null;
  onMarkerPress: (point: PointOfInterest) => void;
  onMapPress: () => void;
}

const MapViewComponent: React.FC<MapViewProps> = ({
  currentLocation,
  pointsOfInterest,
  selectedPoint,
  onMarkerPress,
  onMapPress,
}) => {
  const getInitialRegion = () => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    // Дефолтные координаты (Израиль - центр)
    return {
      latitude: 31.7683,
      longitude: 35.2137,
      latitudeDelta: 2.0,
      longitudeDelta: 2.0,
    };
  };

  const getMarkerColor = (point: PointOfInterest) => {
    if (selectedPoint && selectedPoint.id === point.id) {
      return '#FF6B6B'; // Красный для выбранной точки
    }
    
    // Цвета по категориям (английские названия)
    switch (point.category) {
      case 'historical':
        return '#4ECDC4';
      case 'religious':
        return '#45B7D1';
      case 'children':
        return '#96CEB4';
      case 'nature':
        return '#FFEAA7';
      case 'culture':
        return '#C39BD3'; // Фиолетовый
      case 'tourism':
        return '#F7DC6F'; // Желтый
      case 'architecture':
        return '#E59866'; // Оранжевый
      default:
        return '#DDA0DD';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getInitialRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onPress={onMapPress}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        showsPointsOfInterest={false}
        showsBuildings={true}
        showsTraffic={false}
        mapType="standard"
        moveOnMarkerPress={false}
        liteMode={false}
      >
        {/* Маркеры точек интереса */}
        {pointsOfInterest.map((point) => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={point.title}
            description={point.description}
            pinColor={getMarkerColor(point)}
            onPress={() => onMarkerPress(point)}
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default MapViewComponent; 