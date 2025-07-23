import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';
import PointDetailScreen from './src/screens/PointDetailScreen';
import VisitedPointsScreen from './src/screens/VisitedPointsScreen';
import TopPointsScreen from './src/screens/TopPointsScreen';
import { RootStackParamList } from './src/types';
import i18nService from './src/services/I18nService';
import likesService from './src/services/LikesService';

const Stack = createStackNavigator<RootStackParamList>();

// Компонент загрузки
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
      Загрузка...
    </Text>
  </View>
);

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Инициализируем сервисы
        await likesService.initialize();
        
        // Даем время для полной инициализации
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        // В случае ошибки все равно продолжаем
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="PointDetail" 
          component={PointDetailScreen}
          options={{
            headerShown: true,
            title: 'Детали точки', // Статический текст вместо i18nService.t()
            headerBackTitle: 'Назад'
          }}
        />
        <Stack.Screen 
          name="VisitedPoints" 
          component={VisitedPointsScreen}
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen 
          name="TopPoints" 
          component={TopPointsScreen}
          options={{
            headerShown: false
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
