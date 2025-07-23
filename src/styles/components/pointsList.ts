import { StyleSheet } from 'react-native';

export const pointsListStyles = StyleSheet.create({
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
  addVisitedButton: {
    backgroundColor: '#FF9800',
  },
  removeVisitedButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 16,
  },
  rtlText: {
    textAlign: 'right',
  },
  // Стили для посещенных точек
  visitedPointItem: {
    backgroundColor: '#f0f8ff',
    borderColor: '#4CAF50',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  visitedBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitedBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  visitedDate: {
    fontSize: 11,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Стили для лайков
  likesCount: {
    fontSize: 11,
    color: '#E91E63',
    marginTop: 2,
    fontWeight: '500',
  },
  likeButton: {
    backgroundColor: '#FFC107',
  },
  likedButton: {
    backgroundColor: '#E91E63',
  },
}); 