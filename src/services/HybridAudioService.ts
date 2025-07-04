import { Audio } from 'expo-av';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

/**
 * Гибридный сервис для работы с аудио
 * Поддерживает локальные файлы, облачное хранилище и стриминг
 */
class HybridAudioService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private currentAudioPath: string | null = null;
  private cacheDir: string;

  // Конфигурация
  private readonly CLOUD_BASE_URL = 'https://your-cloud-storage.com/audio/';
  private readonly STREAMING_BASE_URL = 'https://your-streaming-service.com/audio/';
  private readonly CACHE_DIR = 'audio-cache';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB кэш

  // Статический маппинг для локальных файлов (только популярные)
  private readonly localAudioFiles: { [key: string]: any } = {
    // Только самые популярные точки (10-20 файлов)
    'point_1.mp3': require('../../assets/audio/point_1.mp3'),
    'point_2.mp3': require('../../assets/audio/point_2.mp3'),
    'point_3.mp3': require('../../assets/audio/point_3.mp3'),
    // Добавьте только самые важные файлы
  };

  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory}${this.CACHE_DIR}/`;
    this.initCache();
  }

  /**
   * Инициализация кэша
   */
  private async initCache() {
    try {
      const cacheExists = await FileSystem.getInfoAsync(this.cacheDir);
      if (!cacheExists.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
        console.log('[HybridAudioService] Кэш создан:', this.cacheDir);
      }
    } catch (error) {
      console.error('[HybridAudioService] Ошибка создания кэша:', error);
    }
  }

  /**
   * Определить источник аудио для файла
   */
  private getAudioSource(filename: string): 'local' | 'cloud' | 'streaming' {
    // Локальные файлы (только популярные)
    if (this.localAudioFiles[filename]) {
      return 'local';
    }
    
    // Облачное хранилище (большинство файлов)
    if (filename.startsWith('point_')) {
      return 'cloud';
    }
    
    // Стриминг для специальных файлов
    return 'streaming';
  }

  /**
   * Загрузить аудио из локального файла
   */
  private async loadLocalAudio(filename: string): Promise<boolean> {
    try {
      const asset = Asset.fromModule(this.localAudioFiles[filename]);
      await asset.downloadAsync();
      
      const { sound } = await Audio.Sound.createAsync(asset);
      this.sound = sound;
      this.currentAudioPath = filename;
      
      this.setupAudioHandlers();
      return true;
    } catch (error) {
      console.error(`[HybridAudioService] Ошибка загрузки локального файла ${filename}:`, error);
      return false;
    }
  }

  /**
   * Загрузить аудио из облака
   */
  private async loadCloudAudio(filename: string): Promise<boolean> {
    try {
      const localPath = `${this.cacheDir}${filename}`;
      
      // Проверяем кэш
      const cached = await FileSystem.getInfoAsync(localPath);
      if (cached.exists) {
        console.log(`[HybridAudioService] Использую кэшированный файл: ${filename}`);
      } else {
        // Загружаем из облака
        const cloudUrl = `${this.CLOUD_BASE_URL}${filename}`;
        console.log(`[HybridAudioService] Загружаю ${filename} из облака...`);
        
        const downloadResult = await FileSystem.downloadAsync(cloudUrl, localPath);
        if (downloadResult.status !== 200) {
          throw new Error(`HTTP ${downloadResult.status}`);
        }
        
        await this.cleanupCache();
      }
      
      const { sound } = await Audio.Sound.createAsync({ uri: localPath });
      this.sound = sound;
      this.currentAudioPath = filename;
      
      this.setupAudioHandlers();
      return true;
    } catch (error) {
      console.error(`[HybridAudioService] Ошибка загрузки из облака ${filename}:`, error);
      return false;
    }
  }

  /**
   * Загрузить аудио через стриминг
   */
  private async loadStreamingAudio(filename: string): Promise<boolean> {
    try {
      const streamingUrl = `${this.STREAMING_BASE_URL}${filename}`;
      console.log(`[HybridAudioService] Стриминг ${filename}...`);
      
      const { sound } = await Audio.Sound.createAsync({ uri: streamingUrl });
      this.sound = sound;
      this.currentAudioPath = filename;
      
      this.setupAudioHandlers();
      return true;
    } catch (error) {
      console.error(`[HybridAudioService] Ошибка стриминга ${filename}:`, error);
      return false;
    }
  }

  /**
   * Настройка обработчиков аудио
   */
  private setupAudioHandlers() {
    if (this.sound) {
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.isPlaying = status.isPlaying;
          
          if (status.didJustFinish) {
            this.isPlaying = false;
          }
        }
      });
    }
  }

  /**
   * Очистка кэша при переполнении
   */
  private async cleanupCache() {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (cacheInfo.exists && cacheInfo.size && cacheInfo.size > this.MAX_CACHE_SIZE) {
        console.log('[HybridAudioService] Кэш переполнен, очищаю старые файлы...');
        
        const files = await FileSystem.readDirectoryAsync(this.cacheDir);
        const fileInfos = await Promise.all(
          files.map(async (file) => {
            const path = `${this.cacheDir}${file}`;
            const info = await FileSystem.getInfoAsync(path);
            return { file, path, size: info.size || 0, modified: info.modificationTime || 0 };
          })
        );

        fileInfos.sort((a, b) => a.modified - b.modified);

        let currentSize = cacheInfo.size;
        for (const fileInfo of fileInfos) {
          if (currentSize <= this.MAX_CACHE_SIZE * 0.8) break;
          
          await FileSystem.deleteAsync(fileInfo.path);
          currentSize -= fileInfo.size;
        }
      }
    } catch (error) {
      console.error('[HybridAudioService] Ошибка очистки кэша:', error);
    }
  }

  /**
   * Загрузить аудиофайл
   */
  async loadAudio(audioFilePath: string): Promise<boolean> {
    try {
      await this.stopAudio();

      const filename = audioFilePath.split('/').pop() || audioFilePath;
      const source = this.getAudioSource(filename);

      console.log(`[HybridAudioService] Загружаю ${filename} из источника: ${source}`);

      switch (source) {
        case 'local':
          return await this.loadLocalAudio(filename);
        case 'cloud':
          return await this.loadCloudAudio(filename);
        case 'streaming':
          return await this.loadStreamingAudio(filename);
        default:
          console.warn(`[HybridAudioService] Неизвестный источник для ${filename}`);
          return false;
      }
    } catch (error) {
      console.error('[HybridAudioService] Ошибка загрузки аудио:', error);
      return false;
    }
  }

  /**
   * Воспроизвести аудио
   */
  async playAudio(): Promise<boolean> {
    try {
      if (!this.sound) {
        console.warn('[HybridAudioService] Аудиофайл не загружен');
        return false;
      }

      await this.sound.playAsync();
      this.isPlaying = true;
      return true;
    } catch (error) {
      console.error('[HybridAudioService] Ошибка воспроизведения:', error);
      return false;
    }
  }

  /**
   * Пауза
   */
  async pauseAudio(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('[HybridAudioService] Ошибка паузы:', error);
    }
  }

  /**
   * Остановка
   */
  async stopAudio(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
        this.isPlaying = false;
        this.currentAudioPath = null;
      }
    } catch (error) {
      console.error('[HybridAudioService] Ошибка остановки:', error);
    }
  }

  /**
   * Установка громкости
   */
  async setVolume(volume: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      }
    } catch (error) {
      console.error('[HybridAudioService] Ошибка установки громкости:', error);
    }
  }

  /**
   * Перемотка
   */
  async seekTo(position: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(position);
      }
    } catch (error) {
      console.error('[HybridAudioService] Ошибка перемотки:', error);
    }
  }

  /**
   * Проверить статус воспроизведения
   */
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Получить текущий путь
   */
  getCurrentAudioPath(): string | null {
    return this.currentAudioPath;
  }

  /**
   * Получить длительность
   */
  async getAudioDuration(): Promise<number> {
    try {
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          return status.durationMillis || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error('[HybridAudioService] Ошибка получения длительности:', error);
      return 0;
    }
  }

  /**
   * Получить текущую позицию
   */
  async getCurrentPosition(): Promise<number> {
    try {
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          return status.positionMillis || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error('[HybridAudioService] Ошибка получения позиции:', error);
      return 0;
    }
  }

  /**
   * Воспроизвести аудио для точки интереса
   */
  async playPointAudio(audioFilePath: string): Promise<boolean> {
    const loaded = await this.loadAudio(audioFilePath);
    if (loaded) {
      return await this.playAudio();
    }
    return false;
  }

  /**
   * Предзагрузить популярные аудиофайлы
   */
  async preloadPopularAudio(popularFiles: string[]): Promise<void> {
    console.log(`[HybridAudioService] Предзагружаю ${popularFiles.length} популярных файлов...`);
    
    for (const filename of popularFiles) {
      const source = this.getAudioSource(filename);
      
      if (source === 'cloud') {
        // Предзагружаем только облачные файлы
        const localPath = `${this.cacheDir}${filename}`;
        const cached = await FileSystem.getInfoAsync(localPath);
        
        if (!cached.exists) {
          await this.loadCloudAudio(filename);
        }
      }
    }
    
    console.log('[HybridAudioService] Предзагрузка завершена');
  }

  /**
   * Получить статистику использования
   */
  async getUsageStats() {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.cacheDir);
      const localFilesCount = Object.keys(this.localAudioFiles).length;
      
      return {
        localFiles: localFilesCount,
        cacheSize: cacheInfo.size || 0,
        cacheSizeMB: Math.round((cacheInfo.size || 0) / 1024 / 1024 * 100) / 100,
        maxCacheSizeMB: Math.round(this.MAX_CACHE_SIZE / 1024 / 1024 * 100) / 100
      };
    } catch (error) {
      return { localFiles: 0, cacheSize: 0, cacheSizeMB: 0, maxCacheSizeMB: 0 };
    }
  }

  /**
   * Очистить кэш
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await this.initCache();
      console.log('[HybridAudioService] Кэш очищен');
    } catch (error) {
      console.error('[HybridAudioService] Ошибка очистки кэша:', error);
    }
  }
}

export const hybridAudioService = new HybridAudioService(); 