import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';

// Import Firebase config
import './src/config/firebase';

// Import context
import { AppProvider, useAppContext } from './src/context/AppContext';
import { NotesProvider } from './src/context/NotesContext';

// Import screens
import SplashScreen from './src/screens/SplashScreen';
import PinEntryScreen from './src/screens/PinEntryScreen';
import HomeScreen from './src/screens/HomeScreen';
import NoteEditorScreen from './src/screens/NoteEditorScreen';
import AuthScreen from './src/screens/AuthScreen';

// Define Note type for type checking
export interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  category: string;
  isPrivate: boolean;
}

// Define the root stack parameter list for type checking
export type RootStackParamList = {
  Splash: undefined;
  PinEntry: undefined;
  Home: { 
    savedNote?: Note;
  };
  NoteEditor: {
    note?: Note;
    isPrivate?: boolean;
  };
  Auth: undefined;
};

// Create the stack navigator
const Stack = createStackNavigator<RootStackParamList>();

// Fix TypeScript issues by casting components
const StatusBarComponent = StatusBar as any;
const NavigatorComponent = Stack.Navigator as any;
const ScreenComponent = Stack.Screen as any;

// Main navigation component
const AppNavigator = () => {
  const { theme, colors } = useAppContext();
  
  return (
    <NavigationContainer>
      <StatusBarComponent style={theme === 'dark' ? 'light' : 'dark'} />
      <NavigatorComponent
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background }
        }}
      >
        <ScreenComponent name="Splash" component={SplashScreen} />
        <ScreenComponent name="PinEntry" component={PinEntryScreen} />
        <ScreenComponent name="Home" component={HomeScreen} />
        <ScreenComponent name="NoteEditor" component={NoteEditorScreen} />
        <ScreenComponent name="Auth" component={AuthScreen} />
      </NavigatorComponent>
    </NavigationContainer>
  );
};

// Root app component with providers
export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NotesProvider>
          <AppNavigator />
        </NotesProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
} 