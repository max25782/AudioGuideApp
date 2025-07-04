import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

/**
 * Сервис для работы с аудиофайлами из облачного хранилища
 * Экономит место в приложении, загружает файлы по требованию
 */
class CloudAudioService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private currentAudioPath: string | null = null;
  private cacheDir: string;

  // Конфигурация облачного хранилища
  private readonly CLOUD_BASE_URL = 'https://your-cloud-storage.com/audio/';
  private readonly CACHE_DIR = 'audio-cache';
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB кэш

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
        console.log('[CloudAudioService] Кэш создан:', this.cacheDir);
      }
    } catch (error) {
      console.error('[CloudAudioService] Ошибка создания кэша:', error);
    }
  }

  /**
   * Получить локальный путь к аудиофайлу
   */
  private getLocalPath(filename: string): string {
    return `${this.cacheDir}${filename}`;
  }

  /**
   * Получить URL в облаке
   */
  private getCloudUrl(filename: string): string {
    return `${this.CLOUD_BASE_URL}${filename}`;
  }

  /**
   * Проверить, есть ли файл в кэше
   */
  private async isCached(filename: string): Promise<boolean> {
    try {
      const localPath = this.getLocalPath(filename);
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Загрузить файл из облака в кэш
   */
  private async downloadFromCloud(filename: string): Promise<boolean> {
    try {
      const cloudUrl = this.getCloudUrl(filename);
      const localPath = this.getLocalPath(filename);

      console.log(`[CloudAudioService] Загружаю ${filename} из облака...`);

      const downloadResult = await FileSystem.downloadAsync(cloudUrl, localPath);
      
      if (downloadResult.status === 200) {
        console.log(`[CloudAudioService] Файл ${filename} загружен (${Math.round(downloadResult.headers['content-length'] / 1024)}KB)`);
        
        // Очищаем старые файлы если кэш переполнен
        await this.cleanupCache();
        
        return true;
      } else {
        console.error(`[CloudAudioService] Ошибка загрузки ${filename}: ${downloadResult.status}`);
        return false;
      }
    } catch (error) {
      console.error(`[CloudAudioService] Ошибка загрузки ${filename}:`, error);
      return false;
    }
  }

  /**
   * Очистка кэша при переполнении
   */
  private async cleanupCache() {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (cacheInfo.exists && cacheInfo.size && cacheInfo.size > this.MAX_CACHE_SIZE) {
        console.log('[CloudAudioService] Кэш переполнен, очищаю старые файлы...');
        
        const files = await FileSystem.readDirectoryAsync(this.cacheDir);
        const fileInfos = await Promise.all(
          files.map(async (file) => {
            const path = this.getLocalPath(file);
            const info = await FileSystem.getInfoAsync(path);
            return { file, path, size: info.size || 0, modified: info.modificationTime || 0 };
          })
        );

        // Сортируем по времени изменения (старые сначала)
        fileInfos.sort((a, b) => a.modified - b.modified);

        // Удаляем старые файлы пока кэш не станет меньше лимита
        let currentSize = cacheInfo.size;
        for (const fileInfo of fileInfos) {
          if (currentSize <= this.MAX_CACHE_SIZE * 0.8) break; // Оставляем 20% запаса
          
          await FileSystem.deleteAsync(fileInfo.path);
          currentSize -= fileInfo.size;
          console.log(`[CloudAudioService] Удален старый файл: ${fileInfo.file}`);
        }
      }
    } catch (error) {
      console.error('[CloudAudioService] Ошибка очистки кэша:', error);
    }
  }

  /**
   * Загрузить аудиофайл (из кэша или облака)
   */
  async loadAudio(audioFilePath: string): Promise<boolean> {
    try {
      // Останавливаем текущее воспроизведение
      await this.stopAudio();

      const filename = audioFilePath.split('/').pop() || audioFilePath;
      let localPath: string;

      // Проверяем кэш
      if (await this.isCached(filename)) {
        localPath = this.getLocalPath(filename);
        console.log(`[CloudAudioService] Использую кэшированный файл: ${filename}`);
      } else {
        // Загружаем из облака
        const downloaded = await this.downloadFromCloud(filename);
        if (!downloaded) {
          console.warn(`[CloudAudioService] Не удалось загрузить ${filename}`);
          return false;
        }
        localPath = this.getLocalPath(filename);
      }

      // Создаем звуковой объект
      const { sound } = await Audio.Sound.createAsync({ uri: localPath });
      this.sound = sound;
      this.currentAudioPath = audioFilePath;

      // Настраиваем обработчики событий
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.isPlaying = status.isPlaying;
          
          if (status.didJustFinish) {
            this.isPlaying = false;
          }
        }
      });

      return true;
    } catch (error) {
      console.error('[CloudAudioService] Ошибка загрузки аудио:', error);
      return false;
    }
  }

  /**
   * Воспроизвести аудио
   */
  async playAudio(): Promise<boolean> {
    try {
      if (!this.sound) {
        console.warn('[CloudAudioService] Аудиофайл не загружен');
        return false;
      }

      await this.sound.playAsync();
      this.isPlaying = true;
      return true;
    } catch (error) {
      console.error('[CloudAudioService] Ошибка воспроизведения:', error);
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
      console.error('[CloudAudioService] Ошибка паузы:', error);
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
      console.error('[CloudAudioService] Ошибка остановки:', error);
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
      console.error('[CloudAudioService] Ошибка установки громкости:', error);
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
      console.error('[CloudAudioService] Ошибка перемотки:', error);
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
      console.error('[CloudAudioService] Ошибка получения длительности:', error);
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
      console.error('[CloudAudioService] Ошибка получения позиции:', error);
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
   * Очистить весь кэш
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await this.initCache();
      console.log('[CloudAudioService] Кэш очищен');
    } catch (error) {
      console.error('[CloudAudioService] Ошибка очистки кэша:', error);
    }
  }

  /**
   * Получить размер кэша
   */
  async getCacheSize(): Promise<number> {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.cacheDir);
      return cacheInfo.size || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Предзагрузить популярные аудиофайлы
   */
  async preloadPopularAudio(popularFiles: string[]): Promise<void> {
    console.log(`[CloudAudioService] Предзагружаю ${popularFiles.length} популярных файлов...`);
    
    for (const filename of popularFiles) {
      if (!(await this.isCached(filename))) {
        await this.downloadFromCloud(filename);
      }
    }
    
    console.log('[CloudAudioService] Предзагрузка завершена');
  }
}

export const cloudAudioService = new CloudAudioService(); 