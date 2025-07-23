import { StyleSheet } from 'react-native';

export const homeScreenStyles = StyleSheet.create({
  container: {
    marginTop: 20,
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  rtlText: {
    textAlign: 'right',
  },
  locationButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Контейнер для ряда кнопок действий
  actionButtonsRow: {
    flexDirection: 'row',
    marginHorizontal: 10,
    gap: 10,
  },
  // Контейнер для ряда кнопок посещенных с отступом сверху
  visitedButtonsRow: {
    flexDirection: 'row',
    marginHorizontal: 10,
    marginTop: 15,
    gap: 10,
  },
  // Стили для кнопки перехода к экрану посещенных
  visitedScreenButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  visitedScreenText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  visitedScreenArrow: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Стили для топ-экрана
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  statsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  statsText: {
    fontSize: 14,
    color: '#555',
    marginVertical: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 48,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 