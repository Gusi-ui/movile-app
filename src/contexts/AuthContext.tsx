import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Worker, AuthCredentials } from '../types';
import {
  supabase,
  signIn,
  signOut,
  getCurrentWorker,
  diagnoseLoginIssue,
} from '../lib/supabase';
import logger from '../utils/logger';

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
  clearAllCache: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      logger.debug('🔍 VERIFICANDO ESTADO DE AUTENTICACIÓN...');

      // Verificar si hay una sesión activa en Supabase
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      logger.debug('📡 Sesión de Supabase:', session ? 'ACTIVA' : 'INACTIVA');

      if (error) {
        logger.error('❌ Error checking session:', error);
        // Si hay un error de refresh token, limpiar el almacenamiento
        if (error.message?.includes('Refresh Token')) {
          logger.debug('🧹 Clearing invalid refresh token...');
          await AsyncStorage.removeItem('worker');
          await supabase.auth.signOut();
        }
        dispatch({ type: 'AUTH_FAILURE', payload: '' });
        return;
      }

      if (session?.user) {
        logger.debug(
          '✅ Usuario autenticado en Supabase, obteniendo datos de la BD...'
        );
        // Obtener datos del worker desde la base de datos
        const worker = await getCurrentWorker();
        logger.debug('👤 Worker obtenido de Supabase:', worker);
        if (worker) {
          logger.debug('✅ Worker autenticado:', worker.name);
          dispatch({ type: 'AUTH_SUCCESS', payload: worker });
        } else {
          logger.warn('❌ Worker no encontrado en la base de datos');
          dispatch({ type: 'AUTH_FAILURE', payload: 'Worker no encontrado' });
        }
      } else {
        logger.debug('❌ No hay sesión activa');
        dispatch({ type: 'AUTH_FAILURE', payload: '' });
      }
    } catch (error) {
      logger.error('❌ Error checking auth status:', error);
      dispatch({
        type: 'AUTH_FAILURE',
        payload: 'Error al verificar autenticación',
      });
    }
  };

  const login = async (credentials: AuthCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });

      // Autenticar con Supabase
      const authData = await signIn(credentials.email, credentials.password);

      if (!authData.user) {
        throw new Error('No se pudo autenticar el usuario');
      }

      // Obtener datos del worker desde la base de datos
      const worker = await getCurrentWorker();

      if (!worker) {
        // Ejecutar diagnóstico para ayudar a identificar el problema
        logger.debug('🔍 Worker no encontrado, ejecutando diagnóstico...');
        await diagnoseLoginIssue(credentials.email);
        throw new Error(
          'Worker no encontrado o inactivo. Revisa la consola para más detalles.'
        );
      }

      // Guardar datos del worker en AsyncStorage
      await AsyncStorage.setItem('worker', JSON.stringify(worker));

      // Guardar token de sesión si existe
      if (authData.session?.access_token) {
        await AsyncStorage.setItem('token', authData.session.access_token);
        logger.debug('✅ Token guardado en AsyncStorage');
      }

      logger.debug('👤 Worker autenticado:', worker);
      dispatch({ type: 'AUTH_SUCCESS', payload: worker });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error de autenticación';
      logger.error('Error en login:', errorMessage);
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Cerrar sesión en Supabase
      await signOut();

      // Limpiar AsyncStorage
      await AsyncStorage.multiRemove(['worker', 'token', 'refresh_token']);

      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      logger.error('Error during logout:', error);
      // Aún así limpiar el estado local
      await AsyncStorage.multiRemove(['worker', 'token', 'refresh_token']);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const clearAllCache = async (): Promise<void> => {
    try {
      logger.debug('🧹 INICIANDO LIMPIEZA COMPLETA DE CACHÉ...');

      // 1. Verificar qué hay en AsyncStorage antes de limpiar
      const workerData = await AsyncStorage.getItem('worker');
      logger.debug('📋 Datos de worker antes de limpiar:', workerData);

      // 2. Limpiar AsyncStorage completamente
      await AsyncStorage.clear();
      logger.debug('✅ AsyncStorage limpiado');

      // 3. Cerrar sesión en Supabase de forma agresiva
      await supabase.auth.signOut();
      logger.debug('✅ Sesión de Supabase cerrada');

      // 4. Limpiar cualquier caché del navegador (si estamos en web)
      if (typeof window !== 'undefined') {
        // Limpiar localStorage y sessionStorage también
        window.localStorage.clear();
        window.sessionStorage.clear();
        logger.debug('✅ Storage del navegador limpiado');
      }

      // 5. Resetear el estado
      dispatch({ type: 'AUTH_LOGOUT' });
      logger.debug('✅ Estado de autenticación reseteado');

      // 6. Forzar recarga de la página en web
      if (typeof window !== 'undefined') {
        logger.debug('🔄 Forzando recarga de la página...');
        window.location.reload();
      }

      logger.debug('🎉 LIMPIEZA COMPLETA FINALIZADA');
    } catch (error) {
      logger.error('❌ Error limpiando caché:', error);
    }
  };

  const value = {
    state,
    login,
    logout,
    clearError,
    clearAllCache,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
