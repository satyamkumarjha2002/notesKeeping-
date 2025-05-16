import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Text } from 'react-native';
import { storageAdapter } from '../utils/storageAdapter';

// Theme type and colors
export type ThemeType = 'dark' | 'light';

export const ThemeColors = {
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2A2A2A',
    primary: '#BB86FC',
    primaryVariant: '#3700B3',
    secondary: '#03DAC6',
    error: '#CF6679',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    onPrimary: '#000000',
    onSecondary: '#000000',
    onError: '#000000',
    border: '#333333',
    divider: '#333333',
    icon: '#BBBBBB',
    text: '#FFFFFF',
    textSecondary: '#BBBBBB',
    textTertiary: '#888888',
    cardShadow: '#000000',
    statusBar: 'light-content',
    ripple: 'rgba(255, 255, 255, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    disabled: '#666666',
    placeholder: '#888888',
  },
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    primary: '#6200EE',
    primaryVariant: '#3700B3',
    secondary: '#03DAC6',
    error: '#B00020',
    onBackground: '#000000',
    onSurface: '#000000',
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onError: '#FFFFFF',
    border: '#E0E0E0',
    divider: '#E0E0E0',
    icon: '#666666',
    text: '#000000',
    textSecondary: '#555555',
    textTertiary: '#888888',
    cardShadow: '#AAAAAA',
    statusBar: 'dark-content',
    ripple: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    disabled: '#BBBBBB',
    placeholder: '#AAAAAA',
  }
};

// Category colors that work with both themes
export const CategoryColors = {
  General: '#6200EE',
  Work: '#03DAC6',
  Personal: '#43A047',
  Ideas: '#FB8C00',
  Lists: '#E53935',
  Private: '#C2185B',
  'To-Do': '#5E35B1',
};

// AppContext interface
interface AppContextProps {
  theme: ThemeType;
  colors: typeof ThemeColors.dark | typeof ThemeColors.light;
  toggleTheme: () => void;
  getCategoryColor: (category: string) => string;
  isPinSet: boolean;
  setIsAuthenticated: (value: boolean) => void;
  verifyPin: (pin: string) => Promise<boolean>;
  setPinCode: (pin: string) => Promise<void>;
}

// Create context with default values
const AppContext = createContext<AppContextProps>({
  theme: 'dark',
  colors: ThemeColors.dark,
  toggleTheme: () => {},
  getCategoryColor: () => '',
  isPinSet: false,
  setIsAuthenticated: () => {},
  verifyPin: async () => false,
  setPinCode: async () => {},
});

// AppProvider props
interface AppProviderProps {
  children: ReactNode;
}

// AppProvider component
export const AppProvider = ({ children }: AppProviderProps) => {
  const [theme, setTheme] = useState<ThemeType>('dark');
  const [isPinSet, setIsPinSet] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Load saved theme from storage on initial render
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await storageAdapter.getItem('noteskeeping_theme');
        if (savedTheme) {
          setTheme(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  // Toggle between light and dark themes
  const toggleTheme = async () => {
    const newTheme: ThemeType = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    try {
      await storageAdapter.setItem('noteskeeping_theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };
  
  // Get the color for a specific category
  const getCategoryColor = (category: string): string => {
    return CategoryColors[category] || CategoryColors.General;
  };
  
  // Current theme colors
  const colors = ThemeColors[theme];
  
  // Verify PIN
  const verifyPin = async (pin: string): Promise<boolean> => {
    try {
      const storedPin = await storageAdapter.getItem('noteskeeping_pin');
      return storedPin === pin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  };

  // Set PIN code
  const setPinCode = async (pin: string): Promise<void> => {
    try {
      await storageAdapter.setItem('noteskeeping_pin', pin);
      setIsPinSet(true);
    } catch (error) {
      console.error('Error setting PIN:', error);
      throw error;
    }
  };
  
  // Context value
  const contextValue: AppContextProps = {
    theme,
    colors,
    toggleTheme,
    getCategoryColor,
    isPinSet,
    setIsAuthenticated,
    verifyPin,
    setPinCode,
  };
  
  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook for using the AppContext
export const useAppContext = () => useContext(AppContext);

export default AppContext; 