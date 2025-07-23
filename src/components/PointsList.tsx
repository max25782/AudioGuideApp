import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { PointOfInterest, PointCategory } from '../types';
import i18nService from '../services/I18nService';
import { pointsListStyles } from '../styles';

export interface PointsListProps {
  points: PointOfInterest[];
  onPointPress: (point: PointOfInterest) => void;
  onPlayAudio: (point: PointOfInterest) => void;
  onOpenInWaze: (point: PointOfInterest) => void;
  onToggleVisited: (point: PointOfInterest) => void;
  onToggleLike: (point: PointOfInterest) => void;
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
  onToggleVisited,
  onToggleLike,
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
        style={[
          styles.pointItem, 
          { borderLeftColor: categoryColor },
          item.isVisited && styles.visitedPointItem
        ]}
        onPress={() => onPointPress(item)}
      >
        <View style={styles.pointInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.pointTitle, i18nService.isRTL() && styles.rtlText]}>
              {pointInfo.title}
            </Text>
            {item.isVisited && (
              <View style={styles.visitedBadge}>
                <Text style={styles.visitedBadgeText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={[styles.pointSubtitle, i18nService.isRTL() && styles.rtlText]}>
            {pointInfo.subtitle}
          </Text>
          <Text style={[styles.pointCoords, i18nService.isRTL() && styles.rtlText]}>
            {pointInfo.coords}
          </Text>
          {item.isVisited && item.visitedAt && (
            <Text style={[styles.visitedDate, i18nService.isRTL() && styles.rtlText]}>
              Посещено: {new Date(item.visitedAt).toLocaleDateString()}
            </Text>
          )}
          
          {/* Показываем количество лайков, если они есть */}
          {(item.likesCount || 0) > 0 && (
            <Text style={[styles.likesCount, i18nService.isRTL() && styles.rtlText]}>
              ❤️ {item.likesCount} {i18nService.t('likes')}
            </Text>
          )}
        </View>
        
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.audioButton]}
            onPress={() => onPlayAudio(item)}
          >
            <Text style={styles.buttonText}>🎵</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton, 
              item.isVisited ? styles.removeVisitedButton : styles.addVisitedButton
            ]}
            onPress={() => onToggleVisited(item)}
          >
            <Text style={styles.buttonText}>
              {item.isVisited ? '✓' : '+'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton, 
              item.isLikedByUser ? styles.likedButton : styles.likeButton
            ]}
            onPress={() => onToggleLike(item)}
          >
            <Text style={styles.buttonText}>
              {item.isLikedByUser ? '❤️' : '🤍'}
            </Text>
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
    <Text style={[styles.header, i18nService.isRTL() && styles.rtlText]}>
      {i18nService.t('pointsCount', { count: points.length })}
    </Text>
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

const styles = pointsListStyles; 