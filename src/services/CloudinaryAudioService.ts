import { Audio } from 'expo-av';

interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey?: string;
}

interface AudioFileInfo {
  id: string;
  name: string;
  category: string;
  localPath?: string;
  cloudUrl?: string;
  duration?: number;
}

class CloudinaryAudioService {
  private config: CloudinaryConfig;
  private sound: Audio.Sound | null = null;
  private isPlaying = false;

  constructor(config: CloudinaryConfig) {
    this.config = config;
  }

  /**
   * Upload audio file to Cloudinary
   */
  async uploadAudioFile(audioFile: AudioFileInfo): Promise<string> {
    try {
      console.log(`☁️ Uploading audio: ${audioFile.name}`);

      if (!audioFile.localPath) {
        throw new Error('Local audio file path is required');
      }

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: audioFile.localPath,
        type: 'audio/mpeg',
        name: `${audioFile.id}.mp3`
      } as any);
      formData.append('upload_preset', this.config.uploadPreset);
      formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio
      formData.append('folder', 'audioguide'); // Organize files in folder
      formData.append('public_id', audioFile.id); // Custom file name

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/video/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const cloudUrl = result.secure_url;

      console.log(`✅ Audio uploaded: ${cloudUrl}`);
      return cloudUrl;

    } catch (error) {
      console.error('❌ Error uploading audio:', error);
      throw error;
    }
  }

  /**
   * Upload multiple audio files
   */
  async uploadMultipleAudioFiles(audioFiles: AudioFileInfo[]): Promise<Map<string, string>> {
    const uploadResults = new Map<string, string>();
    
    console.log(`☁️ Uploading ${audioFiles.length} audio files...`);

    for (const audioFile of audioFiles) {
      try {
        const cloudUrl = await this.uploadAudioFile(audioFile);
        uploadResults.set(audioFile.id, cloudUrl);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to upload ${audioFile.name}:`, error);
      }
    }

    console.log(`✅ Uploaded ${uploadResults.size} out of ${audioFiles.length} files`);
    return uploadResults;
  }

  /**
   * Play audio from CDN URL
   */
  async playAudioFromUrl(url: string): Promise<boolean> {
    try {
      // Stop current audio
      await this.stopAudio();

      console.log(`🎵 Playing audio from CDN: ${url}`);

      // Create sound from URL
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      this.sound = sound;

      // Set up event handlers
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.isPlaying = status.isPlaying;
          if (status.didJustFinish) {
            this.isPlaying = false;
          }
        }
      });

      // Play the audio
      await this.sound.playAsync();
      this.isPlaying = true;
      
      return true;

    } catch (error) {
      console.error('❌ Error playing CDN audio:', error);
      return false;
    }
  }

  /**
   * Pause audio
   */
  async pauseAudio(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('❌ Error pausing audio:', error);
    }
  }

  /**
   * Stop audio
   */
  async stopAudio(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('❌ Error stopping audio:', error);
    }
  }

  /**
   * Get audio duration from CDN
   */
  async getAudioDuration(url: string): Promise<number> {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();
      
      return (status as any).durationMillis || 0;
    } catch (error) {
      console.error('❌ Error getting audio duration:', error);
      return 0;
    }
  }

  /**
   * Check if audio is playing
   */
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Generate CDN URL for audio file
   */
  generateAudioUrl(audioId: string, format: string = 'mp3'): string {
    return `https://res.cloudinary.com/${this.config.cloudName}/video/upload/f_${format}/audioguide/${audioId}`;
  }

  /**
   * Delete audio file from CDN
   */
  async deleteAudioFile(publicId: string): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        throw new Error('API key required for deletion');
      }

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/video/destroy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_id: `audioguide/${publicId}`,
            api_key: this.config.apiKey,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Deletion failed: ${response.statusText}`);
      }

      console.log(`✅ Audio deleted: ${publicId}`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting audio:', error);
      return false;
    }
  }
}

export default CloudinaryAudioService; 