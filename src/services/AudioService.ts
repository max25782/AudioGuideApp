import { Audio } from 'expo-av';
import { Asset } from 'expo-asset';

// Статический маппинг аудиофайлов
// Примечание: аудиофайлы должны быть добавлены в папку assets/audio/
const audioFiles: { [key: string]: any } = {
  // Примеры для первых точек интереса
  'point_1.mp3': require('../../assets/audio/point_1.mp3'),
  'point_2.mp3': require('../../assets/audio/point_2.mp3'),
  'point_3.mp3': require('../../assets/audio/point_3.mp3'),
  'point_4.mp3': require('../../assets/audio/point_4.mp3'),
  'point_5.mp3': require('../../assets/audio/point_5.mp3'),
  'point_6.mp3': require('../../assets/audio/point_6.mp3'),
  'point_7.mp3': require('../../assets/audio/point_7.mp3'),
  'point_8.mp3': require('../../assets/audio/point_8.mp3'),
  'point_9.mp3': require('../../assets/audio/point_9.mp3'),
  'point_10.mp3': require('../../assets/audio/point_10.mp3'),
  
  // Добавьте остальные файлы по мере их создания
  // 'point_11.mp3': require('../../assets/audio/point_11.mp3'),
  // 'point_12.mp3': require('../../assets/audio/point_12.mp3'),
  // и так далее...
};

class AudioService {
  private sound: Audio.Sound | null = null;
  private isPlaying = false;
  private currentAudioPath: string | null = null;

  async loadAudio(audioFilePath: string): Promise<boolean> {
    try {
      // Останавливаем текущее воспроизведение
      await this.stopAudio();

      // Проверяем, существует ли аудиофайл в маппинге
      if (!audioFiles[audioFilePath]) {
        console.warn(`Аудиофайл не найден: ${audioFilePath}. Добавьте файл в папку assets/audio/ и обновите маппинг в AudioService.ts`);
        return false;
      }

      // Загружаем аудиофайл из assets
      const asset = Asset.fromModule(audioFiles[audioFilePath]);
      await asset.downloadAsync();

      // Создаем новый звуковой объект
      const { sound } = await Audio.Sound.createAsync(asset);
      this.sound = sound;
      this.currentAudioPath = audioFilePath;

      // Настраиваем обработчики событий
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.isPlaying = status.isPlaying;
          
          // Если воспроизведение завершено
          if (status.didJustFinish) {
            this.isPlaying = false;
          }
        }
      });

      return true;
    } catch (error) {
      console.error('Ошибка загрузки аудиофайла:', error);
      return false;
    }
  }

  async playAudio(): Promise<boolean> {
    try {
      if (!this.sound) {
        console.warn('Аудиофайл не загружен');
        return false;
      }

      await this.sound.playAsync();
      this.isPlaying = true;
      return true;
    } catch (error) {
      console.error('Ошибка воспроизведения аудио:', error);
      return false;
    }
  }

  async pauseAudio(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
        this.isPlaying = false;
      }
    } catch (error) {
      console.error('Ошибка паузы аудио:', error);
    }
  }

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
      console.error('Ошибка остановки аудио:', error);
    }
  }

  async setVolume(volume: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      }
    } catch (error) {
      console.error('Ошибка установки громкости:', error);
    }
  }

  async seekTo(position: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(position);
      }
    } catch (error) {
      console.error('Ошибка перемотки аудио:', error);
    }
  }

  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentAudioPath(): string | null {
    return this.currentAudioPath;
  }

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
      console.error('Ошибка получения длительности аудио:', error);
      return 0;
    }
  }

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
      console.error('Ошибка получения текущей позиции аудио:', error);
      return 0;
    }
  }

  // Метод для воспроизведения аудио по пути к точке интереса
  async playPointAudio(audioFilePath: string): Promise<boolean> {
    const loaded = await this.loadAudio(audioFilePath);
    if (loaded) {
      return await this.playAudio();
    }
    return false;
  }
}

export const audioService = new AudioService(); 