import 'react-native';

declare module 'react-native' {
  namespace Animated {
    interface AnimatedComponentProps<T> {
      style?: any;
      children?: React.ReactNode;
    }

    export interface AnimatedComponent<T> extends React.ComponentClass<AnimatedComponentProps<T>> {}

    export function createAnimatedComponent<T extends React.ComponentType<any>>(
      component: T
    ): AnimatedComponent<T>;

    export class View extends React.Component<AnimatedComponentProps<View>> {}
    export class Text extends React.Component<AnimatedComponentProps<Text>> {}
    export class Image extends React.Component<AnimatedComponentProps<Image>> {}
    export class ScrollView extends React.Component<AnimatedComponentProps<ScrollView>> {}
  }
} 