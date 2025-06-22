import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { PointOfInterest } from '../types';

interface PointsListProps {
  points: PointOfInterest[];
  onPointPress: (point: PointOfInterest) => void;
  onWazePress: (point: PointOfInterest) => void;
  onPlayAudio: (point: PointOfInterest) => void;
  isAudioPlaying: boolean;
  currentPlayingPoint: PointOfInterest | null;
}

const PointsList: React.FC<PointsListProps> = ({
  points,
  onPointPress,
  onWazePress,
  onPlayAudio,
  isAudioPlaying,
  currentPlayingPoint,
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'historical':
        return '#4ECDC4';
      case 'religious':
        return '#45B7D1';
      case 'children':
        return '#96CEB4';
      case 'nature':
        return '#FFEAA7';
      case 'culture':
        return '#C39BD3';
      case 'tourism':
        return '#F7DC6F';
      case 'architecture':
        return '#E59866';
      default:
        return '#DDA0DD';
    }
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'historical':
        return 'Исторический';
      case 'religious':
        return 'Религиозный';
      case 'children':
        return 'Детский';
      case 'nature':
        return 'Природный';
      case 'culture':
        return 'Культура';
      case 'tourism':
        return 'Туризм';
      case 'architecture':
        return 'Архитектура';
      default:
        return category;
    }
  };

  const renderPoint = ({ item }: { item: PointOfInterest }) => {
    const isCurrentlyPlaying = currentPlayingPoint?.id === item.id && isAudioPlaying;
    
    return (
      <TouchableOpacity
        style={styles.pointItem}
        onPress={() => onPointPress(item)}
      >
        <View style={styles.pointHeader}>
          <Text style={styles.pointTitle}>{item.title}</Text>
          <View style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(item.category) }
          ]}>
            <Text style={styles.categoryText}>{getCategoryDisplayName(item.category)}</Text>
          </View>
        </View>
        
        <Text style={styles.pointDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.pointActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.playButton]}
            onPress={() => onPlayAudio(item)}
          >
            <Text style={styles.actionButtonText}>
              {isCurrentlyPlaying ? '⏸️ Пауза' : '▶️ Слушать'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.wazeButton]}
            onPress={() => onWazePress(item)}
          >
            <Text style={styles.actionButtonText}>🗺️ Waze</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Точки в этой категории не найдены</Text>
      <Text style={styles.emptySubText}>Попробуйте выбрать другую категорию</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ближайшие точки</Text>
      <FlatList
        data={points}
        renderItem={renderPoint}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
    flexGrow: 1,
  },
  pointItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pointTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  pointDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  pointActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  playButton: {
    backgroundColor: '#28a745',
  },
  wazeButton: {
    backgroundColor: '#007bff',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
  },
});

export default PointsList; 