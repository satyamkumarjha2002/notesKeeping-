import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

// Define theme types
type ThemeType = 'light' | 'dark';

// Define the context shape
interface AppContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  theme: ThemeType;
  toggleTheme: () => void;
  isPinSet: boolean;
  setPinCode: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  appLoading: boolean;
}

// Create context with default values
const AppContext = createContext<AppContextType>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  theme: 'light',
  toggleTheme: () => {},
  isPinSet: false,
  setPinCode: async () => {},
  verifyPin: async () => false,
  appLoading: true,
});

// Fix TypeScript issues by casting components
const ContextProvider = AppContext.Provider as any;

// Context provider props
interface AppProviderProps {
  children: ReactNode;
}

// Storage keys
const THEME_KEY = 'noteskeeping_theme';
const PIN_KEY = 'noteskeeping_pin';

// Context provider component
export const AppProvider = ({ children }: AppProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState<ThemeType>('light');
  const [isPinSet, setIsPinSet] = useState(false);
  const [appLoading, setAppLoading] = useState(true);

  // Initialize app state
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load saved theme
        const savedTheme = await SecureStore.getItemAsync(THEME_KEY);
        if (savedTheme) {
          setTheme(savedTheme as ThemeType);
        }

        // Check if PIN is set
        const hasPin = await SecureStore.getItemAsync(PIN_KEY);
        setIsPinSet(!!hasPin);
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setAppLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Toggle between light and dark theme
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    try {
      await SecureStore.setItemAsync(THEME_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  // Set PIN code
  const setPinCode = async (pin: string) => {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
      setIsPinSet(true);
    } catch (error) {
      console.error('Error setting PIN:', error);
      throw error;
    }
  };

  // Verify PIN code
  const verifyPin = async (pin: string) => {
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_KEY);
      return storedPin === pin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  };

  // Context value
  const contextValue: AppContextType = {
    isAuthenticated,
    setIsAuthenticated,
    theme,
    toggleTheme,
    isPinSet,
    setPinCode,
    verifyPin,
    appLoading,
  };

  return (
    <ContextProvider value={contextValue}>
      {children}
    </ContextProvider>
  );
};

// Custom hook for using the app context
export const useAppContext = () => useContext(AppContext);

export default AppContext; 