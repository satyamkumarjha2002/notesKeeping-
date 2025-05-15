import '@react-navigation/stack';

declare module '@react-navigation/stack' {
  import { ComponentType } from 'react';
  
  export interface StackNavigatorProps {
    initialRouteName?: string;
    screenOptions?: any;
    children?: React.ReactNode;
  }

  export interface StackNavigator {
    Navigator: ComponentType<StackNavigatorProps>;
    Screen: ComponentType<any>;
  }

  export function createStackNavigator<T extends Record<string, object | undefined>>(): StackNavigator;
} 