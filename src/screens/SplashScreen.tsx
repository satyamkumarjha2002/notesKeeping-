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
      // Try to get auth state from storage first (for persistent login)
      const storedAuthState = await AsyncStorage.getItem(AUTH_STATE_KEY);
      
      // Direct check of Firebase auth state
      const user = firebaseAuth.currentUser;
      const isAuthenticated = !!user;
      
      // If user is authenticated, store this state for next app launch
      if (isAuthenticated) {
        await AsyncStorage.setItem(AUTH_STATE_KEY, 'true');
      }
      
      // Update auth state in context
      setIsAuthenticated(isAuthenticated);
      setAuthChecked(true);
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
        const isAuthenticated = !!firebaseAuth.currentUser;
        const storedAuthState = await AsyncStorage.getItem(AUTH_STATE_KEY);
        const wasAuthenticated = storedAuthState === 'true';
        
        // If user was previously authenticated or is currently authenticated
        if (isAuthenticated || wasAuthenticated) {
          // Always go to PIN entry screen if app has PIN setup
          if (isPinSet) {
            navigation.replace('PinEntry');
          } else {
            // No PIN setup yet, go to Home
            navigation.replace('Home');
          }
        } else {
          // Not authenticated, go to Auth screen
          navigation.replace('Auth');
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