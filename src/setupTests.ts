// AsyncStorage - using memory-based implementation for integration tests
jest.mock('@react-native-async-storage/async-storage', () => {
  let cache: { [key: string]: string } = {};
  return {
    setItem: async (key: string, value: string) => {
      cache[key] = value;
      return Promise.resolve();
    },
    getItem: async (key: string) => {
      return Promise.resolve(cache[key] || null);
    },
    removeItem: async (key: string) => {
      delete cache[key];
      return Promise.resolve();
    },
    multiRemove: async (keys: string[]) => {
      keys.forEach(key => delete cache[key]);
      return Promise.resolve();
    },
    clear: async () => {
      cache = {};
      return Promise.resolve();
    },
    getAllKeys: async () => {
      return Promise.resolve(Object.keys(cache));
    },
    multiGet: async (keys: string[]) => {
      return Promise.resolve(
        keys.map(key => [key, cache[key] || null] as [string, string | null])
      );
    },
    multiSet: async (keyValuePairs: [string, string][]) => {
      keyValuePairs.forEach(([key, value]) => {
        cache[key] = value;
      });
      return Promise.resolve();
    },
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = 'View';
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: (component: any) => component,
    Directions: {},
  };
});

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Global setup
declare const global: {
  __DEV__: boolean;
};
(global as any).__DEV__ = true;
