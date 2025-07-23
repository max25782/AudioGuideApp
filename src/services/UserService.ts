import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, VisitedPoint, UserSettings, PointOfInterest, PointCategory, UserLike } from '../types';
import likesService from './LikesService';

class UserService {
  private static instance: UserService;
  private currentUser: User | null = null;
  private userSettings: UserSettings | null = null;

  // Ключи для AsyncStorage
  private readonly USER_KEY = '@AudioGuide:user';
  private readonly SETTINGS_KEY = '@AudioGuide:settings';
  private readonly VISITED_POINTS_KEY = '@AudioGuide:visitedPoints';

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Инициализация пользователя при запуске приложения
   */
  async initializeUser(): Promise<User> {
    try {
      // Инициализируем сервис лайков
      await likesService.initialize();

      // Попытка загрузить существующего пользователя
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      
      if (userData) {
        this.currentUser = JSON.parse(userData);
        // Конвертируем строковые даты обратно в объекты Date
        if (this.currentUser) {
          this.currentUser.createdAt = new Date(this.currentUser.createdAt);
          this.currentUser.visitedPoints = this.currentUser.visitedPoints.map(point => ({
            ...point,
            visitedAt: new Date(point.visitedAt)
          }));
          
          // Обработка лайков для совместимости со старыми версиями
          if (!this.currentUser.likedPoints) {
            this.currentUser.likedPoints = [];
          }
          if (this.currentUser.totalLikes === undefined) {
            this.currentUser.totalLikes = 0;
          }
          
          // Конвертируем даты лайков
          this.currentUser.likedPoints = this.currentUser.likedPoints.map(like => ({
            ...like,
            likedAt: new Date(like.likedAt)
          }));
        }
      } else {
        // Создание нового пользователя
        this.currentUser = await this.createNewUser();
      }

      // Загрузка настроек
      await this.loadUserSettings();

      return this.currentUser!;
    } catch (error) {
      console.error('Ошибка инициализации пользователя:', error);
      // В случае ошибки создаем нового пользователя
      this.currentUser = await this.createNewUser();
      return this.currentUser;
    }
  }

  /**
   * Создание нового пользователя
   */
  private async createNewUser(): Promise<User> {
    const newUser: User = {
      id: this.generateUserId(),
      createdAt: new Date(),
      visitedPoints: [],
      totalVisits: 0,
      likedPoints: [],
      totalLikes: 0,
    };

    await this.saveUser(newUser);
    
    // Создание настроек по умолчанию
    const defaultSettings: UserSettings = {
      language: 'ru',
      autoPlayAudio: true,
      notificationsEnabled: true,
      trackingRadius: 150, // 150 метров
    };
    
    await this.saveUserSettings(defaultSettings);
    
    return newUser;
  }

  /**
   * Генерация уникального ID пользователя
   */
  private generateUserId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `user_${timestamp}_${randomStr}`;
  }

  /**
   * Сохранение пользователя в AsyncStorage
   */
  private async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
      this.currentUser = user;
    } catch (error) {
      console.error('Ошибка сохранения пользователя:', error);
      throw error;
    }
  }

  /**
   * Отметить посещение точки
   */
  async markPointAsVisited(
    pointId: string, 
    coordinates: { latitude: number; longitude: number },
    audioPlayed: boolean = false
  ): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Пользователь не инициализирован');
    }

    // Проверяем, не была ли точка уже посещена недавно (избегаем дублирования)
    const recentVisit = this.currentUser.visitedPoints.find(
      visit => visit.pointId === pointId && 
      (new Date().getTime() - visit.visitedAt.getTime()) < 3600000 // последний час
    );

    if (recentVisit) {
      return; // Точка уже была посещена недавно
    }

    const visitedPoint: VisitedPoint = {
      pointId,
      visitedAt: new Date(),
      coordinates,
      audioPlayed,
    };

    this.currentUser.visitedPoints.push(visitedPoint);
    this.currentUser.totalVisits++;

    await this.saveUser(this.currentUser);

    console.log(`Точка ${pointId} отмечена как посещенная`);
  }

  /**
   * Снять отметку посещения точки
   */
  async removePointFromVisited(pointId: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Пользователь не инициализирован');
    }

    const initialLength = this.currentUser.visitedPoints.length;
    this.currentUser.visitedPoints = this.currentUser.visitedPoints.filter(
      visit => visit.pointId !== pointId
    );

    // Обновляем счетчик, если точка была удалена
    const removedCount = initialLength - this.currentUser.visitedPoints.length;
    if (removedCount > 0) {
      this.currentUser.totalVisits = Math.max(0, this.currentUser.totalVisits - removedCount);
      await this.saveUser(this.currentUser);
      console.log(`Точка ${pointId} удалена из посещенных`);
    }
  }

  /**
   * Переключить статус посещения точки
   */
  async togglePointVisited(
    pointId: string, 
    coordinates: { latitude: number; longitude: number }
  ): Promise<boolean> {
    const isCurrentlyVisited = this.isPointVisited(pointId);
    
    if (isCurrentlyVisited) {
      await this.removePointFromVisited(pointId);
      return false;
    } else {
      await this.markPointAsVisited(pointId, coordinates, false);
      return true;
    }
  }

  /**
   * Проверка, была ли точка посещена
   */
  isPointVisited(pointId: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.visitedPoints.some(visit => visit.pointId === pointId);
  }

  /**
   * Получение всех посещенных точек
   */
  getVisitedPoints(): VisitedPoint[] {
    return this.currentUser?.visitedPoints || [];
  }

  /**
   * Получение статистики пользователя
   */
  getUserStats() {
    if (!this.currentUser) return null;

    const visitedByCategory: Record<PointCategory, number> = {
      historical: 0,
      religious: 0,
      children: 0,
      nature: 0,
      culture: 0,
      tourism: 0,
      architecture: 0,
      amenity: 0,
      leisure: 0,
    };

    // Подсчет по категориям (это потребует дополнительной информации о точках)
    
    return {
      totalVisits: this.currentUser.totalVisits,
      uniquePoints: this.currentUser.visitedPoints.length,
      memberSince: this.currentUser.createdAt,
      visitedByCategory,
    };
  }

  /**
   * Загрузка настроек пользователя
   */
  private async loadUserSettings(): Promise<void> {
    try {
      const settingsData = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (settingsData) {
        this.userSettings = JSON.parse(settingsData);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  }

  /**
   * Сохранение настроек пользователя
   */
  async saveUserSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
      this.userSettings = settings;
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      throw error;
    }
  }

  /**
   * Получение настроек пользователя
   */
  getUserSettings(): UserSettings | null {
    return this.userSettings;
  }

  /**
   * Получение текущего пользователя
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Очистка данных пользователя (для отладки или сброса)
   */
  async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([this.USER_KEY, this.SETTINGS_KEY, this.VISITED_POINTS_KEY]);
      this.currentUser = null;
      this.userSettings = null;
      console.log('Данные пользователя очищены');
    } catch (error) {
      console.error('Ошибка очистки данных пользователя:', error);
      throw error;
    }
  }

  /**
   * Экспорт данных пользователя
   */
  async exportUserData(): Promise<{ user: User; settings: UserSettings } | null> {
    if (!this.currentUser || !this.userSettings) return null;
    
    return {
      user: this.currentUser,
      settings: this.userSettings,
    };
  }

  /**
   * Поставить лайк точке
   */
  async likePoint(pointId: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Пользователь не инициализирован');
    }

    // Проверяем, не лайкнул ли пользователь уже эту точку
    const alreadyLiked = this.currentUser.likedPoints.some(like => like.pointId === pointId);
    if (alreadyLiked) {
      return;
    }

    // Добавляем лайк в данные пользователя
    const userLike: UserLike = {
      pointId,
      likedAt: new Date(),
    };

    this.currentUser.likedPoints.push(userLike);
    this.currentUser.totalLikes++;

    // Добавляем лайк в общую статистику
    await likesService.addLike(pointId);

    await this.saveUser(this.currentUser);
    console.log(`Пользователь поставил лайк точке ${pointId}`);
  }

  /**
   * Убрать лайк с точки
   */
  async unlikePoint(pointId: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Пользователь не инициализирован');
    }

    // Удаляем лайк из данных пользователя
    const initialLength = this.currentUser.likedPoints.length;
    this.currentUser.likedPoints = this.currentUser.likedPoints.filter(
      like => like.pointId !== pointId
    );

    // Обновляем счетчик, если лайк был удален
    const removedCount = initialLength - this.currentUser.likedPoints.length;
    if (removedCount > 0) {
      this.currentUser.totalLikes = Math.max(0, this.currentUser.totalLikes - removedCount);
      
      // Убираем лайк из общей статистики
      await likesService.removeLike(pointId);
      
      await this.saveUser(this.currentUser);
      console.log(`Пользователь убрал лайк с точки ${pointId}`);
    }
  }

  /**
   * Переключить лайк точки
   */
  async togglePointLike(pointId: string): Promise<boolean> {
    const isCurrentlyLiked = this.isPointLikedByUser(pointId);
    
    if (isCurrentlyLiked) {
      await this.unlikePoint(pointId);
      return false;
    } else {
      await this.likePoint(pointId);
      return true;
    }
  }

  /**
   * Проверка, лайкнул ли пользователь точку
   */
  isPointLikedByUser(pointId: string): boolean {
    if (!this.currentUser || !this.currentUser.likedPoints) return false;
    return this.currentUser.likedPoints.some(like => like.pointId === pointId);
  }

  /**
   * Получение всех лайкнутых пользователем точек
   */
  getLikedPoints(): UserLike[] {
    return this.currentUser?.likedPoints || [];
  }
}

// Экспорт синглтона
export default UserService.getInstance(); 