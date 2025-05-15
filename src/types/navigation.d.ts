declare module '@react-navigation/stack' {
  import { ParamListBase } from '@react-navigation/native';
  
  export type StackNavigationProp<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = string
  > = {
    navigate<RouteName extends keyof ParamList>(
      ...args: [RouteName] | [RouteName, ParamList[RouteName]]
    ): void;
    reset(state: any): void;
    goBack(): void;
    setParams(params: Partial<ParamList[RouteName]>): void;
    replace<RouteName extends keyof ParamList>(
      ...args: [RouteName] | [RouteName, ParamList[RouteName]]
    ): void;
    push<RouteName extends keyof ParamList>(
      ...args: [RouteName] | [RouteName, ParamList[RouteName]]
    ): void;
    pop(count?: number): void;
    popToTop(): void;
  };
} 