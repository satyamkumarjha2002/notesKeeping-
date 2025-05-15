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