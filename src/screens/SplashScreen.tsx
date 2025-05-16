import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { useNotesContext } from '../context/NotesContext';
import { firebaseAuth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface SplashScreenProps {
  navigation: SplashScreenNavigationProp;
}

// Fix TypeScript issues by casting components
const AnimatedView = Animated.View as any;

// Key for storing authentication state
const AUTH_STATE_KEY = 'noteskeeping_auth_state';

const SplashScreen = ({ navigation }: SplashScreenProps) => {
  const { isPinSet, setIsAuthenticated } = useAppContext();
  const { syncWithCloud } = useNotesContext();
  const [authChecked, setAuthChecked] = useState(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication state...');
        // Get stored auth state first
        const storedAuthState = await AsyncStorage.getItem(AUTH_STATE_KEY);
        console.log('Stored auth state:', storedAuthState);
        
        // Check if user explicitly signed out
        const wasSignedOut = await AsyncStorage.getItem('user_signed_out');
        console.log('Was signed out flag:', wasSignedOut);
        
        // Direct check of Firebase auth state
        const user = firebaseAuth.currentUser;
        console.log('Firebase currentUser:', user ? 'exists' : 'null');
        
        // Only consider the user as signed out if they explicitly signed out
        if (wasSignedOut === 'true') {
          console.log('User explicitly signed out, clearing auth state');
          await AsyncStorage.removeItem(AUTH_STATE_KEY);
          setIsAuthenticated(false);
        } else if (user || storedAuthState === 'true') {
          // User is authenticated if they have an active Firebase session OR
          // they were previously authenticated (unless explicitly signed out)
          console.log('User is authenticated, setting auth state');
          await AsyncStorage.setItem(AUTH_STATE_KEY, 'true');
          await AsyncStorage.removeItem('user_signed_out');
          setIsAuthenticated(true);
        } else {
          // User is not authenticated
          console.log('User is not authenticated');
          setIsAuthenticated(false);
        }
        
        setAuthChecked(true);
      } catch (error) {
        console.error('Error checking auth state:', error);
        // Default to previous auth state on error
        const storedAuthState = await AsyncStorage.getItem(AUTH_STATE_KEY);
        setIsAuthenticated(storedAuthState === 'true');
        setAuthChecked(true);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after animations
    const timer = setTimeout(async () => {
      if (authChecked) {
        try {
          console.log('Preparing navigation after splash...');
          // Check if user explicitly signed out
          const wasSignedOut = await AsyncStorage.getItem('user_signed_out');
          console.log('Was signed out flag (nav):', wasSignedOut);
          
          // Check current authentication state
          const isAuthenticated = !!firebaseAuth.currentUser;
          const storedAuthState = await AsyncStorage.getItem(AUTH_STATE_KEY);
          console.log('Stored auth state (nav):', storedAuthState);
          
          // Only redirect to Auth if explicitly signed out or never authenticated
          if (wasSignedOut === 'true') {
            // If user explicitly signed out, go to Auth screen
            console.log('User was signed out, navigating to Auth screen');
            navigation.replace('Auth');
          } 
          // If Firebase says user is authenticated or they were previously authenticated
          else if (isAuthenticated || storedAuthState === 'true') {
            console.log('User is authenticated, proceeding to app');
            // Always go to PIN entry screen if app has PIN setup
            if (isPinSet) {
              navigation.replace('PinEntry');
            } else {
              // No PIN setup yet, go to Home
              navigation.replace('Home');
            }
          } 
          // First time user or never authenticated
          else {
            console.log('No authentication found, going to Auth screen');
            navigation.replace('Auth');
          }
        } catch (error) {
          console.error('Error in navigation logic:', error);
          // On error, check stored auth state as fallback
          const storedAuthState = await AsyncStorage.getItem(AUTH_STATE_KEY);
          
          if (storedAuthState === 'true') {
            // If previously authenticated, continue to app
            if (isPinSet) {
              navigation.replace('PinEntry');
            } else {
              navigation.replace('Home');
            }
          } else {
            // Default to Auth screen if no stored state
            navigation.replace('Auth');
          }
        }
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, navigation, authChecked, isPinSet]);

  return (
    <View style={styles.container}>
      <AnimatedView
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* App Logo - placeholder for now */}
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.appName}>NotesKeeping</Text>
        <Text style={styles.tagline}>Secure Notes, Your Way</Text>
      </AnimatedView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: '#718096',
  },
});

export default SplashScreen; 