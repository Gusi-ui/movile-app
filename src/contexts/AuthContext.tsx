import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Worker, AuthCredentials, AuthResponse } from '../types';
import { authenticateWorker } from '../lib/api';

const initialState = {
  isAuthenticated: false,
  currentWorker: null as Worker | null,
  isLoading: true,
  error: null as string | null,
};

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: Worker }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' };

function authReducer(
  state: typeof initialState,
  action: AuthAction
): typeof initialState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        currentWorker: action.payload,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        currentWorker: null,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        currentWorker: null,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface AuthContextType {
  state: typeof initialState;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const workerData = await AsyncStorage.getItem('worker');
      if (workerData) {
        const worker = JSON.parse(workerData);
        dispatch({ type: 'AUTH_SUCCESS', payload: worker });
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: '' });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'Error al verificar autenticación' });
    }
  };

  const login = async (credentials: AuthCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });

      const response = await authenticateWorker(credentials.email, credentials.password);

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data) {
        throw new Error('No se recibieron datos de autenticación');
      }

      const authResponse = response.data as AuthResponse;
      const worker = authResponse.worker;

      await AsyncStorage.setItem('worker', JSON.stringify(worker));
      if (authResponse.token) {
        await AsyncStorage.setItem('token', authResponse.token);
      }

      dispatch({ type: 'AUTH_SUCCESS', payload: worker });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error de autenticación';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['worker', 'token']);
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.error('Error during logout:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    state,
    login,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
