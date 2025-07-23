import { StyleSheet } from 'react-native';

export const pointDetailScreenStyles = StyleSheet.create({
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
  audioButtonPlaying: {
    backgroundColor: '#f44336',
  },
  audioControlsContainer: {
    marginBottom: 15,
  },
  audioSecondaryControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    flex: 1,
  },
  stopButton: {
    backgroundColor: '#f44336',
    flex: 1,
  },
  navigateButton: {
    backgroundColor: '#2196F3',
  },
  addVisitedButton: {
    backgroundColor: '#FF9800',
  },
  removeVisitedButton: {
    backgroundColor: '#4CAF50',
  },
  visitedInfo: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 10,
    fontStyle: 'italic',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rtlText: {
    textAlign: 'right',
  },
}); 