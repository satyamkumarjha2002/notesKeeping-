// Fix for expo-status-bar
declare module 'expo-status-bar' {
  import * as React from 'react';
  
  export interface StatusBarProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
    hidden?: boolean;
    animated?: boolean;
    backgroundColor?: string;
    translucent?: boolean;
  }
  
  export class StatusBar extends React.Component<StatusBarProps> {}
  
  export default StatusBar;
}

// Fix for React Navigation
declare module '@react-navigation/stack' {
  import * as React from 'react';
  
  interface StackNavigatorProps {
    initialRouteName?: string;
    screenOptions?: object;
    children?: React.ReactNode;
  }
  
  interface StackScreenProps {
    name: string;
    component: React.ComponentType<any>;
    options?: object;
  }
  
  export interface StackNavigator {
    Navigator: React.ComponentType<StackNavigatorProps>;
    Screen: React.ComponentType<StackScreenProps>;
  }
  
  export function createStackNavigator(): StackNavigator;
}

// Fix for React Native's Animated components
declare namespace ReactNative {
  namespace Animated {
    interface AnimatedViewProps {
      style?: any;
      children?: React.ReactNode;
    }
    
    interface AnimatedTextProps {
      style?: any;
      children?: React.ReactNode;
    }
    
    class View extends React.Component<AnimatedViewProps> {}
    class Text extends React.Component<AnimatedTextProps> {}
  }
} 