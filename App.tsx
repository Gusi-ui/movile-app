import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Importar pantallas
import BalancesScreen from './src/screens/Balances';
import HomeScreen from './src/screens/Home';
import LoginScreen from './src/screens/Login';
import ProfileScreen from './src/screens/Profile';
import ScheduleScreen from './src/screens/Schedule';
import TodayScreen from './src/screens/Today';

const Tab = createBottomTabNavigator();

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // O un componente de loading
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#3b82f6',
            borderTopColor: '#3b82f6',
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#93c5fd',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Inicio',
          }}
        />
        <Tab.Screen
          name="Today"
          component={TodayScreen}
          options={{
            tabBarLabel: 'Hoy',
          }}
        />
        <Tab.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{
            tabBarLabel: 'Horarios',
          }}
        />
        <Tab.Screen
          name="Balances"
          component={BalancesScreen}
          options={{
            tabBarLabel: 'Balances',
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Perfil',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
