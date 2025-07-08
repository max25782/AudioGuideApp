import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { pbfParserService } from '../services/PbfParserService';

interface PbfImporterProps {
  onPointsExtracted: (points: any[]) => void;
}

export const PbfImporter: React.FC<PbfImporterProps> = ({ onPointsExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const pickPbfFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/octet-stream',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      console.log('Selected file:', file);

      if (file.name && !file.name.toLowerCase().endsWith('.pbf')) {
        Alert.alert('Invalid File', 'Please select a .pbf file');
        return;
      }

      await processPbfFile(file.uri);

    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const processPbfFile = async (fileUri: string) => {
    setIsProcessing(true);
    setProgress(0);
    setStatus('Loading PBF file...');

    try {
      // Load the PBF file
      const loaded = await pbfParserService.loadPbfFile(fileUri);
      if (!loaded) {
        throw new Error('Failed to load PBF file');
      }

      setProgress(20);
      setStatus('Parsing PBF data...');

      // Parse the file
      const points = await pbfParserService.parsePbfFile();
      
      setProgress(80);
      setStatus('Processing extracted points...');

      // Filter and process points
      const validPoints = points.filter(point => 
        point.coordinates.latitude && 
        point.coordinates.longitude &&
        point.name &&
        point.category !== 'unknown'
      );

      setProgress(100);
      setStatus(`Extracted ${validPoints.length} points`);

      // Call the callback with extracted points
      onPointsExtracted(validPoints);

      Alert.alert(
        'Success', 
        `Successfully extracted ${validPoints.length} points from PBF file!`
      );

    } catch (error) {
      console.error('Error processing PBF file:', error);
      Alert.alert('Error', `Failed to process PBF file: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus('');
    }
  };

  const downloadSamplePbf = async () => {
    setIsProcessing(true);
    setStatus('Downloading sample PBF file...');

    try {
      // Example: Download a small sample PBF file
      const sampleUrl = 'https://download.geofabrik.de/asia/israel-latest.osm.pbf';
      const localUri = FileSystem.documentDirectory + 'sample.pbf';

      const downloadResumable = FileSystem.createDownloadResumable(
        sampleUrl,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setProgress(progress * 100);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result) {
        throw new Error('Failed to download sample file');
      }

      setStatus('Sample file downloaded successfully');
      Alert.alert('Success', 'Sample PBF file downloaded! You can now process it.');

    } catch (error) {
      console.error('Error downloading sample:', error);
      Alert.alert('Error', 'Failed to download sample file');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatus('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PBF File Importer</Text>
        <Text style={styles.subtitle}>
          Import points of interest from OpenStreetMap PBF files
        </Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={pickPbfFile}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? 'Processing...' : 'Select PBF File'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={downloadSamplePbf}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Download Sample PBF</Text>
        </TouchableOpacity>

        {isProcessing && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.statusText}>{status}</Text>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${progress}%` }]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>About PBF Files:</Text>
          <Text style={styles.infoText}>
            • PBF (Protocol Buffer Format) files contain OpenStreetMap data{'\n'}
            • They are more compact than XML files{'\n'}
            • You can download them from geofabrik.de or extract.bbbike.org{'\n'}
            • The app will extract points of interest with coordinates and tags
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Supported Categories:</Text>
          <Text style={styles.infoText}>
            • Historical sites (castles, forts, archaeological sites){'\n'}
            • Religious sites (synagogues, mosques, churches){'\n'}
            • Nature (parks, forests, beaches, mountains){'\n'}
            • Tourism (museums, galleries, attractions){'\n'}
            • Culture (cinemas, theatres, libraries){'\n'}
            • Children (playgrounds, schools){'\n'}
            • Architecture (monuments, memorials){'\n'}
            • Amenities (restaurants, cafes, shops)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  content: {
    padding: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 