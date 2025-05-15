import 'react';

declare module 'react' {
  interface Context<T> {
    Provider: Provider<T>;
    Consumer: Consumer<T>;
    displayName?: string;
  }

  interface Provider<T> {
    new (props: ProviderProps<T>): React.Component<ProviderProps<T>>;
    (props: ProviderProps<T>): React.ReactElement | null;
  }

  interface Consumer<T> {
    new (props: ConsumerProps<T>): React.Component<ConsumerProps<T>>;
    (props: ConsumerProps<T>): React.ReactElement | null;
  }

  interface ProviderProps<T> {
    value: T;
    children?: React.ReactNode;
  }

  interface ConsumerProps<T> {
    children: (value: T) => React.ReactNode;
  }
} 