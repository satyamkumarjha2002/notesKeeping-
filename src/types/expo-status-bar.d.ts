declare module 'expo-status-bar' {
  import { ReactNode } from 'react';
  
  export interface StatusBarProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
    hidden?: boolean;
    animated?: boolean;
    backgroundColor?: string;
    translucent?: boolean;
    networkActivityIndicatorVisible?: boolean;
  }

  export function StatusBar(props: StatusBarProps): ReactNode;
  
  export default StatusBar;
} 