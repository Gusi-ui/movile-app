import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../AuthContext';
import * as api from '../../lib/api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock API
jest.mock('../../lib/api');

const TestComponent = () => {
  const { state } = useAuth();
  
  return (
    <View>
      {state.isAuthenticated ? (
        <Text testID="authenticated">
          Welcome {state.currentWorker?.name}
        </Text>
      ) : (
        <Text testID="not-authenticated">Please login</Text>
      )}
    </View>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', async () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should show not authenticated while loading
    await waitFor(() => {
      expect(getByTestId('not-authenticated')).toBeTruthy();
    });
  });

  it('should restore authentication from AsyncStorage', async () => {
    const mockWorker = {
      id: '1',
      email: 'test@example.com',
      name: 'Test Worker',
      role: 'worker' as const,
      is_active: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    await AsyncStorage.setItem('worker', JSON.stringify(mockWorker));

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('authenticated')).toBeTruthy();
    });
  });

  it('should handle successful login', async () => {
    const mockWorker = {
      id: '1',
      email: 'test@example.com',
      name: 'Test Worker',
      role: 'worker' as const,
      is_active: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    };

    const mockResponse = {
      data: {
        worker: mockWorker,
        token: 'mock-token',
        message: 'Login successful',
      },
      error: null,
      status: 200,
    };

    (api.authenticateWorker as jest.Mock).mockResolvedValueOnce(mockResponse);

    const TestLoginComponent = () => {
      const { login, state } = useAuth();
      
      const handleLogin = () => {
        login({ email: 'test@example.com', password: 'password' });
      };

      return (
        <View>
          <TouchableOpacity testID="login-button" onPress={handleLogin}>
            <Text>Login</Text>
          </TouchableOpacity>
          {state.isAuthenticated && (
            <Text testID="authenticated">Welcome {state.currentWorker?.name}</Text>
          )}
        </View>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <TestLoginComponent />
      </AuthProvider>
    );

    const loginButton = getByTestId('login-button');
    
    await act(async () => {
      fireEvent.press(loginButton);
    });

    await waitFor(() => {
      expect(getByTestId('authenticated')).toBeTruthy();
    });

    expect(api.authenticateWorker).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle login error', async () => {
    (api.authenticateWorker as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));

    const TestLoginComponent = () => {
      const { login, state } = useAuth();
      
      const handleLogin = async () => {
        await login({ email: 'test@example.com', password: 'wrong-password' });
      };

      return (
        <View>
          <TouchableOpacity testID="login-button" onPress={handleLogin}>
            <Text>Login</Text>
          </TouchableOpacity>
          {state.error && (
            <Text testID="error">{state.error}</Text>
          )}
          {state.isLoading && (
            <Text testID="loading">Loading...</Text>
          )}
        </View>
      );
    };

    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <TestLoginComponent />
      </AuthProvider>
    );

    const loginButton = getByTestId('login-button');
    
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(queryByTestId('error')).toBeTruthy();
    }, { timeout: 3000 });
  });
});
