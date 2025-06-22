import * as Linking from 'expo-linking';

class WazeService {
  /**
   * Открывает Waze с навигацией к указанной точке
   * @param latitude - широта
   * @param longitude - долгота
   * @param navigate - нужно ли сразу начать навигацию (по умолчанию true)
   */
  async openWazeNavigation(
    latitude: number,
    longitude: number,
    navigate: boolean = true
  ): Promise<boolean> {
    try {
      const url = `waze://?ll=${latitude},${longitude}&navigate=${navigate ? 'yes' : 'no'}`;
      
      // Проверяем, установлен ли Waze
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        // Если Waze не установлен, открываем страницу в App Store/Google Play
        const storeUrl = this.getWazeStoreUrl();
        await Linking.openURL(storeUrl);
        return false;
      }
    } catch (error) {
      console.error('Ошибка открытия Waze:', error);
      return false;
    }
  }

  /**
   * Открывает Waze с отображением точки без навигации
   * @param latitude - широта
   * @param longitude - долгота
   */
  async openWazeMap(latitude: number, longitude: number): Promise<boolean> {
    return this.openWazeNavigation(latitude, longitude, false);
  }

  /**
   * Открывает Waze с поиском по адресу
   * @param query - поисковый запрос
   */
  async openWazeSearch(query: string): Promise<boolean> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `waze://?q=${encodedQuery}`;
      
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      } else {
        const storeUrl = this.getWazeStoreUrl();
        await Linking.openURL(storeUrl);
        return false;
      }
    } catch (error) {
      console.error('Ошибка поиска в Waze:', error);
      return false;
    }
  }

  /**
   * Получает URL для установки Waze в зависимости от платформы
   */
  private getWazeStoreUrl(): string {
    // В реальном приложении здесь можно использовать Platform.OS
    // для определения платформы и возврата соответствующего URL
    return 'https://waze.com/get';
  }

  /**
   * Проверяет, установлен ли Waze на устройстве
   */
  async isWazeInstalled(): Promise<boolean> {
    try {
      const url = 'waze://';
      return await Linking.canOpenURL(url);
    } catch (error) {
      console.error('Ошибка проверки установки Waze:', error);
      return false;
    }
  }

  /**
   * Открывает альтернативные карты, если Waze не установлен
   * @param latitude - широта
   * @param longitude - долгота
   * @param title - название места
   */
  async openAlternativeMaps(
    latitude: number,
    longitude: number,
    title?: string
  ): Promise<boolean> {
    try {
      // Пробуем Google Maps
      const googleMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      await Linking.openURL(googleMapsUrl);
      return true;
    } catch (error) {
      console.error('Ошибка открытия альтернативных карт:', error);
      return false;
    }
  }
}

export const wazeService = new WazeService(); 