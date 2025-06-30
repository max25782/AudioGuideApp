import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { PointOfInterest, PointCategory } from '../types';

export interface PointsListProps {
  points: PointOfInterest[];
  onPointPress: (point: PointOfInterest) => void;
  onPlayAudio: (point: PointOfInterest) => void;
  onOpenInWaze: (point: PointOfInterest) => void;
  formatPointInfo: (point: PointOfInterest) => { title: string; subtitle: string; coords: string };
  getCategoryColor: (category: PointCategory) => string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function PointsList({
  points,
  onPointPress,
  onPlayAudio,
  onOpenInWaze,
  formatPointInfo,
  getCategoryColor,
  refreshing = false,
  onRefresh,
}: PointsListProps) {
  const renderPoint = ({ item }: { item: PointOfInterest }) => {
    const pointInfo = formatPointInfo(item);
    const categoryColor = getCategoryColor(item.category);

    return (
      <TouchableOpacity
        style={[styles.pointItem, { borderLeftColor: categoryColor }]}
        onPress={() => onPointPress(item)}
      >
        <View style={styles.pointInfo}>
          <Text style={styles.pointTitle}>{pointInfo.title}</Text>
          <Text style={styles.pointSubtitle}>{pointInfo.subtitle}</Text>
          <Text style={styles.pointCoords}>{pointInfo.coords}</Text>
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.audioButton]}
            onPress={() => onPlayAudio(item)}
          >
            <Text style={styles.buttonText}>🎵</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.wazeButton]}
            onPress={() => onOpenInWaze(item)}
          >
            <Text style={styles.buttonText}>🗺️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <Text style={styles.header}>Точки интереса ({points.length})</Text>
  );

  return (
    <FlatList
      data={points}
      keyExtractor={(item) => item.id}
      renderItem={renderPoint}
      ListHeaderComponent={renderHeader}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      style={styles.list}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  pointItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pointInfo: {
    flex: 1,
    marginRight: 10,
  },
  pointTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  pointSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  pointCoords: {
    fontSize: 12,
    color: '#999',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButton: {
    backgroundColor: '#4CAF50',
  },
  wazeButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 16,
  },
}); 