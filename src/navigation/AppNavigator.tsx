import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { state } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#fff',
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
              component={HomeScreen}
              options={{ title: 'Asignaciones' }}
            />
            <Stack.Screen
              name="AssignmentDetail"
              component={HomeScreen}
              options={{ title: 'Detalle Asignación' }}
            />
            <Stack.Screen
              name="Balances"
              component={HomeScreen}
              options={{ title: 'Balances' }}
            />
            <Stack.Screen
              name="Notes"
              component={HomeScreen}
              options={{ title: 'Notas' }}
            />
            <Stack.Screen
              name="Route"
              component={HomeScreen}
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
