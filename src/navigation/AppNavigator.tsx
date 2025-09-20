import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import AssignmentsScreen from '../screens/AssignmentsScreen';
import AssignmentDetailScreen from '../screens/AssignmentDetailScreen';
import BalancesScreen from '../screens/BalancesScreen';
import CalendarScreen from '../screens/CalendarScreen';
import RouteScreen from '../screens/Route';
import { RootStackParamList } from '../types';
import { Colors } from '../constants/colors';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator(): React.ReactElement {
  const { state } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: Colors.textLight,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {state.isAuthenticated ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'SAD LAS Worker' }}
            />
            <Stack.Screen
              name="Assignments"
              component={AssignmentsScreen}
              options={{ title: 'Asignaciones' }}
            />
            <Stack.Screen
              name="AssignmentDetail"
              component={AssignmentDetailScreen}
              options={{ title: 'Detalle Asignación' }}
            />
            <Stack.Screen
              name="Balances"
              component={BalancesScreen}
              options={{ title: 'Balances' }}
            />
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ title: 'Calendario' }}
            />
            <Stack.Screen
              name="Notes"
              component={HomeScreen}
              options={{ title: 'Notas' }}
            />
            <Stack.Screen
              name="Route"
              component={RouteScreen}
              options={{ title: 'Ruta' }}
            />
            <Stack.Screen
              name="Profile"
              component={HomeScreen}
              options={{ title: 'Perfil' }}
            />
            <Stack.Screen
              name="Settings"
              component={HomeScreen}
              options={{ title: 'Configuración' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
