import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserLike } from '../types';

interface PointLikesData {
  [pointId: string]: number; // количество лайков для каждой точки
}

class LikesService {
  private static instance: LikesService;
  private pointLikes: PointLikesData = {};
  
  // Ключи для AsyncStorage
  private readonly POINT_LIKES_KEY = '@AudioGuide:pointLikes';

  private constructor() {}

  static getInstance(): LikesService {
    if (!LikesService.instance) {
      LikesService.instance = new LikesService();
    }
    return LikesService.instance;
  }

  /**
   * Инициализация сервиса - загрузка данных о лайках
   */
  async initialize(): Promise<void> {
    try {
      // Проверяем доступность AsyncStorage
      await AsyncStorage.setItem('__test__', 'test');
      await AsyncStorage.removeItem('__test__');
      
      const likesData = await AsyncStorage.getItem(this.POINT_LIKES_KEY);
      if (likesData) {
        const parsed = JSON.parse(likesData);
        if (typeof parsed === 'object' && parsed !== null) {
          this.pointLikes = parsed;
        } else {
          this.pointLikes = {};
        }
      } else {
        this.pointLikes = {};
      }
      
      console.log('LikesService инициализирован успешно');
    } catch (error) {
      console.error('Ошибка загрузки данных о лайках, используем пустые данные:', error);
      this.pointLikes = {};
    }
  }

  /**
   * Сохранение данных о лайках
   */
  private async saveLikesData(): Promise<void> {
    try {
      if (!this.pointLikes || typeof this.pointLikes !== 'object') {
        console.warn('Попытка сохранить некорректные данные лайков');
        return;
      }
      
      await AsyncStorage.setItem(this.POINT_LIKES_KEY, JSON.stringify(this.pointLikes));
    } catch (error) {
      console.error('Ошибка сохранения данных о лайках (продолжаем работу):', error);
      // Не бросаем ошибку, чтобы не крашить приложение
    }
  }

  /**
   * Добавить лайк к точке
   */
  async addLike(pointId: string): Promise<number> {
    if (!this.pointLikes[pointId]) {
      this.pointLikes[pointId] = 0;
    }
    this.pointLikes[pointId]++;
    
    await this.saveLikesData();
    return this.pointLikes[pointId];
  }

  /**
   * Убрать лайк с точки
   */
  async removeLike(pointId: string): Promise<number> {
    if (this.pointLikes[pointId] && this.pointLikes[pointId] > 0) {
      this.pointLikes[pointId]--;
    }
    
    await this.saveLikesData();
    return this.pointLikes[pointId] || 0;
  }

  /**
   * Получить количество лайков для точки
   */
  getLikesCount(pointId: string): number {
    if (!this.pointLikes || typeof this.pointLikes !== 'object') {
      return 0;
    }
    return this.pointLikes[pointId] || 0;
  }

  /**
   * Получить все точки с лайками, отсортированные по популярности
   */
  getTopLikedPoints(limit?: number): Array<{ pointId: string; likesCount: number }> {
    const pointsWithLikes = Object.entries(this.pointLikes)
      .map(([pointId, likesCount]) => ({ pointId, likesCount }))
      .filter(({ likesCount }) => likesCount > 0)
      .sort((a, b) => b.likesCount - a.likesCount);

    return limit ? pointsWithLikes.slice(0, limit) : pointsWithLikes;
  }

  /**
   * Получить общее количество лайков в системе
   */
  getTotalLikesCount(): number {
    if (!this.pointLikes || typeof this.pointLikes !== 'object') {
      return 0;
    }
    return Object.values(this.pointLikes).reduce((total, count) => total + count, 0);
  }

  /**
   * Очистить все данные о лайках (для отладки)
   */
  async clearAllLikes(): Promise<void> {
    this.pointLikes = {};
    await this.saveLikesData();
  }

  /**
   * Получить статистику лайков
   */
  getLikesStatistics() {
    if (!this.pointLikes || typeof this.pointLikes !== 'object') {
      return {
        totalLikes: 0,
        pointsWithLikes: 0,
        averageLikes: 0,
        topPoint: null,
      };
    }

    const totalLikes = this.getTotalLikesCount();
    const pointsWithLikes = Object.keys(this.pointLikes).length;
    const averageLikes = pointsWithLikes > 0 ? totalLikes / pointsWithLikes : 0;
    const topPoint = this.getTopLikedPoints(1)[0];

    return {
      totalLikes,
      pointsWithLikes,
      averageLikes: Math.round(averageLikes * 100) / 100,
      topPoint: topPoint || null,
    };
  }
}

// Экспорт синглтона
export default LikesService.getInstance(); 