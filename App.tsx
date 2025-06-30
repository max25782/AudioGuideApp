import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from './src/screens/HomeScreen';
import PointDetailScreen from './src/screens/PointDetailScreen';
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
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
            title: 'Детали точки',
            headerBackTitle: 'Назад'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
