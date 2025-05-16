import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';
import { ActivityIndicator, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Firebase config
import './src/config/firebase';
import { firebaseAuth } from './src/config/firebase';

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

// Main navigation component
const AppNavigator = () => {
  const { theme, colors } = useAppContext();
  
  return (
    <NavigationContainer>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="PinEntry" component={PinEntryScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="NoteEditor" component={NoteEditorScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Loading component
const LoadingScreen = ({ colors }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={{ marginTop: 16, color: colors.text }}>Loading...</Text>
  </View>
);

// Root app component with providers
export default function App() {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Prepare app resources and check authentication
    const prepare = async () => {
      try {
        // Check if Firebase auth is ready
        await new Promise((resolve) => {
          const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
            console.log('Firebase auth state initialized, user:', user ? 'logged in' : 'not logged in');
            unsubscribe();
            resolve(true);
          });
        });
        
        // Check stored auth state
        const storedAuthState = await AsyncStorage.getItem('noteskeeping_auth_state');
        console.log('Stored auth state in App.tsx:', storedAuthState);
        
        // Mark app as ready
        setIsReady(true);
      } catch (e) {
        console.warn('Error preparing app:', e);
        setIsReady(true); // Still mark as ready to avoid being stuck
      }
    };
    
    prepare();
  }, []);
  
  return (
    <SafeAreaProvider>
      <AppProvider>
        {!isReady ? (
          <LoadingScreen colors={require('./src/context/AppContext').ThemeColors.dark} />
        ) : (
          <NotesProvider>
            <AppNavigator />
          </NotesProvider>
        )}
      </AppProvider>
    </SafeAreaProvider>
  );
} 