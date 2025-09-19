import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Worker, AuthCredentials } from '../types';
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
      if (workerData && workerData !== 'undefined') {
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

      // El servidor devuelve {data: {data: {...}, error: null, status: 200}}
      // Necesitamos acceder a response.data.data
      const serverResponse = response.data as any;
      
      if (!serverResponse.data) {
        throw new Error(serverResponse.error || 'Error en la respuesta del servidor');
      }
      
      const authResponse = serverResponse.data;
      const worker = authResponse.worker;

      if (!worker) {
        throw new Error('No se recibió información del trabajador');
      }

      // Debug: Logs del proceso de login
      console.log('🔍 Respuesta de login completa:', response);
      console.log('🔍 Respuesta de login data:', response.data);
      console.log('🔍 AuthResponse corregido:', authResponse);
      console.log('👤 Worker:', worker);
      console.log('🔑 Token recibido:', authResponse.token ? 'Sí' : 'No');

      await AsyncStorage.setItem('worker', JSON.stringify(worker));
      
      // Guardar token si existe
      if (authResponse.token) {
        await AsyncStorage.setItem('auth_token', authResponse.token);
        console.log('✅ Token guardado en AsyncStorage');
      } else {
        console.log('❌ No hay token para guardar');
      }
      if (authResponse.refresh_token) {
        await AsyncStorage.setItem('refresh_token', authResponse.refresh_token);
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
