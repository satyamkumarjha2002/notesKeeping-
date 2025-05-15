import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';

// Import context
import { AppProvider, useAppContext } from './src/context/AppContext';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import PinEntryScreen from './src/screens/PinEntryScreen';
import HomeScreen from './src/screens/HomeScreen';

// Define the root stack parameter list for type checking
export type RootStackParamList = {
  Splash: undefined;
  PinEntry: undefined;
  Home: undefined;
};

// Create the stack navigator
const Stack = createStackNavigator<RootStackParamList>();

// Fix TypeScript issues by casting components
const StatusBarComponent = StatusBar as any;
const NavigatorComponent = Stack.Navigator as any;
const ScreenComponent = Stack.Screen as any;

// Main navigation component
const AppNavigator = () => {
  const { theme } = useAppContext();
  
  return (
    <NavigationContainer>
      <StatusBarComponent style={theme === 'dark' ? 'light' : 'dark'} />
      <NavigatorComponent
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme === 'dark' ? '#2D3748' : '#F5F7FA' }
        }}
      >
        <ScreenComponent name="Splash" component={SplashScreen} />
        <ScreenComponent name="PinEntry" component={PinEntryScreen} />
        <ScreenComponent name="Home" component={HomeScreen} />
      </NavigatorComponent>
    </NavigationContainer>
  );
};

// Root app component with providers
export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
} 